const { MillionEther } = require("./chain.js")
const hre = require("hardhat");
const { WebGateway } = require("./web.js")
const { ImageEditor } = require("./imageEditor.js")
const { AdsSnapshot, BuySellSnapshot } = require("./snapshots.js")
const { logger } = require("./logger.js")
const { 
    mixedCoordinatesFilter,
    sellEventFilter,
    newAreaStatus2016mapper,
    logBuys2018mapper,
    transfer2018mapper,
    newImage2016mapper,
    logAds2018mapper 
} = require("./events.js")
// config
const config = hre.config.dbConf
const MAX_NUM_OF_DOWNLOAD_ATTEMPTS = config.maxNumOfDownloadAttempts
const STATUSCODES_ALLOWING_RETRY = config.statusCodesAllowingRetry
const DEFAULT_BG_PATH = config.default_bg_path
const NEW_IMAGE_EVENT_NAME = config.newImageEventName
const BUY_SELL_EVENT_NAME = config.buySellEventName


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
        const newEvents = await contract.getEvents(eventName, fromBlock, toBlock)
        if ( newEvents == null ) { return null }
        const formatedEvents = newEvents.decodedEvents.filter(mixedCoordinatesFilter).filter(sellEventFilter).map(mapper)
        logger.debug(
`Received ${formatedEvents.length} \
new ${ eventName } events \
from block ${ fromBlock } to ${newEvents.blockNumber}`)
        return [formatedEvents, newEvents.blockNumber]
    }

    // save new events and block number to db
    async function saveEventsToDB(toBlock, eventName, formatedEvents, db) {
        let insertsCount = 0
        if (formatedEvents.length > 0 && toBlock > 0 ) {
            // TODO adding events must be parametric
            insertsCount = await db.addEvents(formatedEvents, eventName)
            logger.info(`${ insertsCount } new ${ eventName } events were written to db`)
        }

        if (formatedEvents.length == insertsCount && toBlock > 0 ) {
            let saved = await db.saveLatestBlockForEvent(eventName, toBlock)
            logger.debug(`${ saved ? "Saved" : "FAILED TO SAVE" } block ${toBlock} for ${eventName} event to db`)
        } else {
            logger.error(`Retrieved from chain and saved ${eventName} events mismatch`)
        }
    }

async function mainLoop(db) {
    let contractName = config.contractName
    let contractAddress = config.contractAddress
    let contract = new MillionEther(contractName, contractAddress)
    let oldMehContract = new MillionEther(contractName, contractAddress)


    // SYNC EVENTS
    async function syncEvents(eventName, contract, mapper) {
        let fromBlock = await db.getLatestBlockForEvent(eventName)
        if ( fromBlock == null ) { return null }
        // using fromBlock + 1 to make sure no overlap happens
        const [formatedEvents, toBlock] = await getFormatedEvents(eventName, contract, mapper, fromBlock + 1)
        if ( formatedEvents == null ) { return null }
        await saveEventsToDB(toBlock, eventName, formatedEvents, db)
    }
    // NEWIMAGES (oldMeh)
    await syncEvents(NEW_IMAGE_EVENT_NAME, oldMehContract, newImage2016mapper)
    // NEWSTATUS (oldMeh)
    await syncEvents(BUY_SELL_EVENT_NAME, oldMehContract, newAreaStatus2016mapper)


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
            logger.info(`Downloaded ${downloadResult.extension} image`)
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
                logger.info(`Created pixel map image for ad`)
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
        const bigPicBinary = await adsSnapshot.getMergedBigPic()
        const newSnapshot =  {
            latestEventId: adsSnapshot.getLatestAdID(),
            latestDownloadTimestamp: adsSnapshot.getLatestAdDownloadTimestamp(),
            picMapJSON: adsSnapshot.getLinksMapJSON(),
            bigPicBinary: bigPicBinary,  // is used as background
            adsBigPicUrl: bigPicBinary ? await wg.uploadAdsSnapshotPic(bigPicBinary) : null
        }
        // check snapshot validity (important as we are not catching upload errors)
        // these are zero snapshot params (see db)
        if (
            // not checking for latestDownloadTimestamp is it ok?
            newSnapshot.latestEventId > 0
            && newSnapshot.picMapJSON != '{}'
            && newSnapshot.bigPicBinary != null
            && newSnapshot.adsBigPicUrl != null
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
    if (previousBSSnapshot == null) { return }  // can happen on error
    const buySellSnapshot = new BuySellSnapshot(previousBSSnapshot)

    // retrieve events with higher ID, sorted  by ID
    // (returns cursor)
    const transactionsToBeAdded = 
        await db.getTransactionsFromID(buySellSnapshot.getLatestTransactionID())
    for await (const buySellTx of transactionsToBeAdded) {
        await buySellSnapshot.overlay(buySellTx)
    }
    // save new snapshot to db (saving only fully processed snapshots)
    if ( buySellSnapshot.gotOverlays() ) {
        // upload big pic and links map
        const newSnapshot =  {
            latestEventId: buySellSnapshot.getLatestTransactionID(),
            ownershipMapJSON: buySellSnapshot.getOwnershipMapJSON(),
        }
        // check snapshot validity (important as we are not catching upload errors)
        // these are zero snapshot params (see db)
        if (
            newSnapshot.latestEventId != null 
            && newSnapshot.ownershipMapJSON != '[]'
        ) {
            if (await db.saveBuySellSnapshot(newSnapshot)) {
                logger.info(`Saved buySell snapshot. Latest buySell ID: ${ newSnapshot.latestEventId }`)
            }
        } else {
            logger.error(`Buy sell snapshot got overlays, but some values are null. Latest buySell ID: ${ newSnapshot.latestEventId }`)
        }
    }
    


    // PUBLISH SITE DATA
    // pushes data on every cycle
    // gets all fields from db (independant of the above code)
    const siteData = {
        adsSnapshot: await db.getAdsSnapshotBeforeID('infinity'),
        buySellSnapshot: await db.getLatestBuySellSnapshot(),
        newImageLatestCheckedBlock: await db.getLatestBlockForEvent(NEW_IMAGE_EVENT_NAME),
        buySellLatestCheckedBlock: await db.getLatestBlockForEvent(BUY_SELL_EVENT_NAME),
        mehContractAddress: contractAddress,
        chainID: hre.network.config.chainId,
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
        const keyName = siteData.middleWareID + siteData.chainID + config.dbName
        const isServing = await wg.publish(
                JSON.stringify(siteData, null, 2),
                keyName)
        if (isServing) {
            logger.info(`====== Publised to ${ keyName }. Latest blocks checked for \
NewImage: ${siteData.newImageLatestCheckedBlock}, \
BuySell: ${siteData.buySellLatestCheckedBlock} ======`)
        }
    } else {
        logger.error("Built wrong site data. Some values are absent", siteData)
    }
}

module.exports = {
    getFormatedEvents,
    saveEventsToDB,
    mainLoop
  }
