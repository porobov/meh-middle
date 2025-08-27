const { MillionEther } = require("./chain.js")
const hre = require("hardhat");
const { ethers } = require("hardhat")
const { WebGateway } = require("./web.js")
const { ImageEditor } = require("./imageEditor.js")
const { AdsSnapshot, BuySellSnapshot } = require("./snapshots.js")
const { logger } = require("./logger.js")
const wrapperAbi = require('../contracts/wrapper_abi.js');
const { 
    mixedCoordinatesFilter,
    sellEventFilter,
    newAreaStatus2016mapper,
    newImage2016mapper,
    transfer2024wrapper,
    transfer2018mapper,
    logAds2018mapper,
} = require("./events.js")
// config
const config = hre.config.dbConf
const MAX_NUM_OF_DOWNLOAD_ATTEMPTS = config.maxNumOfDownloadAttempts
const STATUSCODES_ALLOWING_RETRY = config.statusCodesAllowingRetry
const DEFAULT_BG_PATH = config.default_bg_path
const CHAIN_ID = hre.network.config.chainId 
const CHAIN_NAME = hre.network.config.chainName
const ENV_TYPE = config.envType

// analyzes error of image download
function constructRetryParams(error, numOfTries) {
    const response = {}
    if (Object.hasOwn(error, 'response') 
        && Object.hasOwn(error.response, 'status')
        && STATUSCODES_ALLOWING_RETRY.includes(error.response.status)
    ) {
        // try later for the errors above
        const newNumOfTries = numOfTries + 1
        response.numOfTries = newNumOfTries
        response.nextTryTimestamp = Date.now() + config.nextRetryDelay * 2 ** (newNumOfTries - 1)
        // stop trying to download
        if (newNumOfTries >= MAX_NUM_OF_DOWNLOAD_ATTEMPTS) {
            response.failedToDownLoad = true
        }
        logger.info(`Could not download (status code: ${error.response.status}). Will try later. Attempts: ${ newNumOfTries }`)
    } else {
        // stop downloading attempts if received this flag
        response.failedToDownLoad = true
    }
    return response
}

    async function getFormatedEvents(eventName, contract, mapper, fromBlock, toBlock) {
        // alchemy returns error when fromBlock cannot be found (different nodes got different block height)
        const newEvents = await contract.getEvents(eventName, fromBlock, toBlock)
        if ( newEvents == null ) { return [[], null] } // can return -32000 when the specified fromBlock/toBlock isn’t available yet or due to node lag/reorgs.
        const formatedEvents = newEvents.decodedEvents.filter(mixedCoordinatesFilter).filter(sellEventFilter).map(mapper)
        // logging
        const group = x => x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); // "5,477,473" [4][8]
        const slug36 = x => (typeof x === 'bigint' ? x : BigInt(x)).toString(36); // e.g., "3q8vx" [9]
        logger.debug(
            `Received ${formatedEvents.length} `
            + `new ${eventName} events `
            + `from block ${group(fromBlock)} (${slug36(fromBlock)}) `
            + `to ${group(newEvents.blockNumber)} (${slug36(newEvents.blockNumber)})`
        );
        return [formatedEvents, newEvents.blockNumber]
    }

    // save new events and block number to db
    async function saveEventsToDB(toBlock, eventName, formatedEvents, db) {
        let insertsCount = 0
        if (formatedEvents.length > 0 && toBlock > 0 ) {
            insertsCount = await db.addEvents(formatedEvents, eventName)
            logger.info(`${ insertsCount } new ${ eventName } events were written to db`)
        }
        if (formatedEvents.length != insertsCount) {
            logger.error(`Retrieved from chain and saved ${eventName} events mismatch`)
        }
        let saved = await db.saveLatestBlockForEvent(eventName, toBlock)
        logger.debug(`${saved ? "Saved" : "FAILED TO SAVE"} block ${toBlock} for ${eventName} event to db`)
    }

// SYNC EVENTS
// If stopAtBlock is provided, will stop at that block (needed for legacy
// contracts)
async function syncEvents(eventName, contract, mapper, db, stopAtBlock = Number.MAX_SAFE_INTEGER) {
    let fromBlock = await db.getLatestBlockForEvent(eventName)
    if ( fromBlock == null || fromBlock == stopAtBlock ) { return null }
    // dealing with alchemy limit on number of blocks to query at once
    let toQueryBlock = await ethers.provider.getBlockNumber()
    if ( toQueryBlock - fromBlock >= config.maxBlocksRetrieved) {
        toQueryBlock = fromBlock + config.maxBlocksRetrieved
    }
    // using fromBlock + 1 to make sure no overlap happens
    const [formatedEvents, toBlock] = await getFormatedEvents(eventName, contract, mapper, fromBlock + 1, toQueryBlock)
    if ( toBlock == null ) { return null } // do not save events if error occured
    await saveEventsToDB(toBlock, eventName, formatedEvents, db)
}

async function mainLoop(db) {

    let contractName = config.contractName
    let contractAddress = config.contractAddress[CHAIN_ID]
    let [operatorWallet] = await ethers.getSigners()
    let oldMehContract = new MillionEther(contractName, contractAddress)
    const signer = (await hre.ethers.getSigners())[0]
    // TODO no wrapper yet on mainnet - handle it

    let wrapperContract = new MillionEther(
        "Wrapper",  // not used anywhere
        config.wrapperAddress[CHAIN_ID],  // not used
        new ethers.Contract(
            config.wrapperAddress[CHAIN_ID],
            wrapperAbi.abi,
            operatorWallet
        ))

    let meh2018 = new MillionEther(
        contractName,
        config.meh2018AddressMain[CHAIN_ID],
        new ethers.Contract(
            config.meh2018AddressMain[CHAIN_ID],
            config.meh2018Abi,
            signer))
    
    const stopAtBlock = config.backgoundEventsBlockNumber[CHAIN_ID]
    await syncEvents(config.transferEventName, meh2018, transfer2018mapper, db, stopAtBlock)
    await syncEvents(config.logAdsEventName, meh2018, logAds2018mapper, db, stopAtBlock)

    // NEWIMAGES (oldMeh)
    await syncEvents(config.newImageEventName, oldMehContract, newImage2016mapper, db)
    // NEWSTATUS (oldMeh)
    await syncEvents(config.buySellEventName, oldMehContract, newAreaStatus2016mapper, db)
    // Transfer (wrapper)
    // checking if using real wrapper address
    if (
        CHAIN_ID == 1 &&
        config.wrapperAddress[CHAIN_ID] == "0x15dbdB25f870f21eaf9105e68e249E0426DaE916"
    ) {
        logger.warn(`On mainnet, but no wrapper yet here`)
    } else {
        await syncEvents(config.transferEventName, wrapperContract, transfer2024wrapper, db)
    }

    // PREPARE DATA FOR ADS SNAPSHOT

    // get ads with no images (not downloaded)
    let ads = await db.getAdsNoImages()
    let adUpdates = []

    // download images and save to db
    let wg = new WebGateway(config)
    for await (const ad of ads) {
        let updates = {}
        logger.info(`Downloading image for ad ID ${ad.ID} from ${ad.imageSourceUrl}...`)
        let [ downloadResult, error ] = await wg.downloadImage(ad.imageSourceUrl)
        let fullImageBinary = null
        if (downloadResult) { 
            fullImageBinary = downloadResult.binary  // note .binary here
            updates.imageExtension = downloadResult.extension
            logger.debug(`Downloaded ${downloadResult.extension} image`)
        } else {
            // if failed to download, decide if we want to retry later
            Object.assign(updates, constructRetryParams(error, ad.numOfTries))
            updates.error = JSON.stringify(error)  // need to show error to user
            if ( updates.failedToDownLoad ) {
                logger.error(`Failed to download image for ad ID ${ ad.ID }. Source: ${ ad.imageSourceUrl }`)
            }
        }

        // add timestamp on first download attempt in any case
        // so that the ad can make it to the pixelmap (see snapshot construction)
        if ( ad.downloadTimestamp == 0 ) {
            updates.downloadTimestamp = Date.now()
        }

        // resize images
        if ( fullImageBinary ) {
            let ie = new ImageEditor(config)
            // image for thumbnail will fit configured size
            const thumb = await ie.getImageThumbBinary(fullImageBinary, ad)
            // image for pixelMap will resize ignoring aspect ratio
            // will also enlarge image if too small
            const px = await ie.getImageForPixelMap(fullImageBinary, ad)
            if ( thumb && px ) {
                // adding ts again for the case when laggards get downloaded and resized
                // this is actually real successful download ts
                updates.downloadTimestamp = Date.now() 
                logger.debug(`Created pixel map image for ad`)
            } else {
                updates.failedToDownLoad = true  // to prevent it from download tries
                updates.error = "Failed to resize image. Will be excluded from pixel map (only the image itself)"
            }
            updates.imageThumb = thumb
            updates.imageForPixelMap = px
        }

        adUpdates.push({
            ID: ad.ID,
            updates: updates,
        })
    }

    let updatesCount = await db.appendImagesToAds(adUpdates)
    if ( updatesCount > 0 ) {
        logger.info(`Updated ${ updatesCount } images in the db`)
    }




    // CONSTRUCT ADS SNAPSHOT
    // will do noting if no new ads are present

    // getting earliest ad snapshot 
    const snapshotOptions = { defaultBgPath: DEFAULT_BG_PATH }
    let previousSnapshot = await db.getAdsSnapshotBeforeID('infinity')
    if (previousSnapshot == null) { return }  // can happen on error
    let adsSnapshot = new AdsSnapshot( previousSnapshot, snapshotOptions )

    // checking if got timestamp higher than of the snapshot, but with lower ID
    // if so find an older snapshot
    // (relevant to images that were uploaded after retries)
    const earliestID = await db.getEarliestAdIdAfterTimestamp(
        adsSnapshot.getBGLatestAdDownloadTimestamp())
    if (earliestID && earliestID < adsSnapshot.getBGLatestAdID()) {
        let prevSnapshot = await db.getAdsSnapshotBeforeID(earliestID)
        if (prevSnapshot == null) { return }
        adsSnapshot = new AdsSnapshot(prevSnapshot, snapshotOptions)
        logger.info(`Ad ID ${earliestID} is earlier than the last in current snapshot. Using snapshot ${adsSnapshot.getBGLatestAdID()} as background.`)
    }

    // retrieve ads with higher ID, sorted  by ID
    // (returns cursor)
    const adsToBeAdded = await db.getAdsFromID(adsSnapshot.getBGLatestAdID())
    let adsCount = 0
    for await (const ad of adsToBeAdded) {
        await adsSnapshot.overlay(ad)  // overlay new ads
        adsCount++
    }
    logger.debug(`Got ${ adsCount } ads to overlay`)
    // save new snapshot to db (saving only fully processed snapshots)
    if ( adsSnapshot.gotOverlays() ) {
        const binary = await adsSnapshot.getMergedBigPic()
        wg.saveSnapshotPic(binary, "adsSnapshot.png")
        const newSnapshot =  {
            latestEventId: adsSnapshot.getLatestAdID(),
            latestDownloadTimestamp: adsSnapshot.getLatestAdDownloadTimestamp(),
            picMapJSON: adsSnapshot.getLinksMapJSON(),
            bigPicBinary: binary,
        }
        // check snapshot validity (important as we are not catching upload errors)
        // these are zero snapshot params (see db)
        if (
            // not checking for latestDownloadTimestamp is it ok?
            newSnapshot.latestEventId > 0
            && newSnapshot.picMapJSON != '{}'
            && newSnapshot.bigPicBinary != null
        ) {
            if (await db.saveAdsSnapshot(newSnapshot)) {
                logger.info(`Saved snapshot with latest ad ID: ${newSnapshot.latestEventId}`)
            }
        } else {
            logger.error(`Ads snapshot got overlays, but some values are null. Latest buySell ID: ${newSnapshot.latestEventId}`)
        }
    }


    // CONSTRUCT BUY SELL SNAPSHOT 

    const previousBSSnapshot = await db.getLatestBuySellSnapshot()
    if (previousBSSnapshot == null) { 
        logger.error(`Could not retrieve latest BS snapshot with getLatestBuySellSnapshot()`)
        return 
    }  // can happen on error
    const buySellSnapshot = new BuySellSnapshot(previousBSSnapshot)

    // retrieve events with higher ID, sorted  by ID
    // (returns cursor)
    const transactionsToBeAdded = 
        await db.getTransactionsFromID(buySellSnapshot.getLatestAdID())
    for await (const buySellTx of transactionsToBeAdded) {
        await buySellSnapshot.overlay(buySellTx)
    }
    // save new snapshot to db (saving only fully processed snapshots)
    if ( buySellSnapshot.gotOverlays() ) {
        const binary = await buySellSnapshot.getMergedBigPic()
        wg.saveSnapshotPic(binary, "buySellSnapshot.png")
        const newSnapshot =  {
            latestEventId: buySellSnapshot.getLatestAdID(),
            picMapJSON: buySellSnapshot.getLinksMapJSON(),
            bigPicBinary: binary,
        }
        // check snapshot validity (important as we are not catching upload errors)
        // these are zero snapshot params (see db)
        if (
            newSnapshot.latestEventId != null 
            && newSnapshot.picMapJSON != '{}'
            && newSnapshot.bigPicBinary != null
        ) {
            if (await db.saveBuySellSnapshot(newSnapshot)) {
                logger.info(`Saved buySell snapshot. Latest buySell ID: ${ newSnapshot.latestEventId }`)
            }
        } else {
            logger.error(`Buy sell snapshot got overlays, but some values are null. Latest buySell ID: ${ newSnapshot.latestEventId }`)
        }
    }
    


    // PUBLISH SITE DATA
    // pushes data on every cycle to Cloudflare KV storage
    // gets all fields from db (independant of the above code)
    // described in meh-ressurections README
    // publishing only when snapshots are changed. 
    if ( adsSnapshot.gotOverlays() || buySellSnapshot.gotOverlays() ) {
        const siteData = {
            adsSnapshot: await db.getAdsSnapshotBeforeID('infinity'),
            buySellSnapshot: await db.getLatestBuySellSnapshot(),
            newImageLatestCheckedBlock: await db.getLatestBlockForEvent(config.newImageEventName),
            buySellLatestCheckedBlock: await db.getLatestBlockForEvent(config.buySellEventName),
            mehContractAddress: contractAddress,
            chainID: CHAIN_ID,
            envType: ENV_TYPE,
            middleWareID: config.middleWareID,
            timestamp: Date.now()
        }
        // check that all inportant values are present
        if (
            siteData.adsSnapshot != {}
            && siteData.buySellSnapshot != {}
            && siteData.newImageLatestCheckedBlock > 0
            && siteData.buySellLatestCheckedBlock > 0
        ) {
            // for CHAIN_NAME see chainName in hardhat.config.js
            // for ENV_TYPE see .env file
            const keyName = CHAIN_NAME + "-" + ENV_TYPE
            const isServing = await wg.publish(siteData, keyName)
            const cfUrl = "https://muddy-truth-5b42.porobov-p3798.workers.dev/?myKey="
            if (isServing) {
                logger.info(`== Publised to ${cfUrl + keyName}. Latest blocks \
NewImage: ${siteData.newImageLatestCheckedBlock}, \
BuySell: ${siteData.buySellLatestCheckedBlock} ==`)
            }
        } else {
            logger.error("Built wrong site data. Some values are absent", siteData)
        }
    } else {
        logger.debug("No changes in snapshots. Nothing to push to KV storage")
    }
}

module.exports = {
    getFormatedEvents,
    saveEventsToDB,
    mainLoop,
    syncEvents
  }
