const { MillionEther } = require("./src/chain.js")
const { DB } = require("./src/db.js")
const hre = require("hardhat");
const { WebGateway } = require("./src/web.js")
const { ImageEditor } = require("./src/imageEditor.js")
const { AdsSnapshot, BuySellSnapshot } = require("./src/snapshots.js")
const { logger } = require("./src/logger.js")

// config
const config = hre.config.dbConf
const MAX_NUM_OF_DOWNLOAD_ATTEMPTS = config.maxNumOfDownloadAttempts
const STATUSCODES_ALLOWING_RETRY = config.statusCodesAllowingRetry
const DEFAULT_BG_PATH = config.default_bg_path
const NEW_IMAGE_EVENT_NAME = config.newImageEventName
const BUY_SELL_EVENT_NAME = config.buySellEventName
const MAIN_LOOP_INTERVAL_MS = config.mainLoopIntervalMs

let db = new DB(config)

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



async function mainLoop() {
    let contractName = "MillionEther"
    let contractAddress = "0x15dbdB25f870f21eaf9105e68e249E0426DaE916"
    let contract = new MillionEther(contractName, contractAddress)


    // DOWNLOAD EVENTS

    // NEWIMAGES

    let fromBlock = await db.getLatestBlockForEvent(NEW_IMAGE_EVENT_NAME)
    if ( fromBlock == null ) { return }
    
    // get events
    let newEvents = await contract.getEvents(NEW_IMAGE_EVENT_NAME, fromBlock)
    if ( newEvents == null ) { return }

    const formatedEvents = newEvents.decodedEvents.map(ev => {
      return {
        ID: ev.args.ID.toNumber(),
        // fixing smart contract bug. Coordinates may be mixed up
        fromX: ev.args.fromX < ev.args.toX ? ev.args.fromX : ev.args.toX,
        fromY: ev.args.fromY < ev.args.toY ? ev.args.fromY : ev.args.toY,
        toX: ev.args.toX > ev.args.fromX ? ev.args.toX : ev.args.fromX,
        toY: ev.args.toY > ev.args.fromY ? ev.args.toY : ev.args.fromY,
        adText: ev.args.adText,
        adUrl: ev.args.adUrl,
        imageSourceUrl: ev.args.imageSourceUrl,
        numOfTries: 0,  // num of download tries for ad image
        failedToDownLoad: false,  // flag. If image failed to download
        nextTryTimestamp: 0,  // next download attempt timestamp
        downloadTimestamp: 0,  // image download status change timestamp to be precise
      }
    })

    logger.info(
`Received ${formatedEvents.length} \
new ${ NEW_IMAGE_EVENT_NAME } events \
from block ${ fromBlock } to ${newEvents.blockNumber}`)

    // save new events and block number to db
    let insertsCount = 0
    if (formatedEvents.length > 0 && newEvents.blockNumber > 0 ) {
        insertsCount = await db.addAdsEvents(formatedEvents)
        logger.info(`${ insertsCount } new ${ NEW_IMAGE_EVENT_NAME } events were written to db`)
        // TODO block number is not saved if no events are present (same for buy sell)
        // TODO do not save block number if insertCount mismatch
    }

    if (formatedEvents.length == insertsCount && newEvents.blockNumber > 0 ) {
        let saved = await db.saveLatestBlockForEvent(NEW_IMAGE_EVENT_NAME, newEvents.blockNumber)
        logger.info(`${ saved ? "Saved" : "FAILED TO SAVE" } block ${newEvents.blockNumber} for ${NEW_IMAGE_EVENT_NAME} event to db`)
    } else {
        logger.error(`Retrieved from chain and saved ${NEW_IMAGE_EVENT_NAME} events mismatch`)
    }

    // NEWSTATUS

    // get latest block for events
    let buySellFromBlock = await db.getLatestBlockForEvent(BUY_SELL_EVENT_NAME)
    if ( buySellFromBlock == null ) { return }
    
    // get events
    let buySellEvents = await contract.getEvents(BUY_SELL_EVENT_NAME, buySellFromBlock)

    const formatedBuySellEvents = buySellEvents.decodedEvents.map(ev => {
        return {
          ID: ev.args.ID.toNumber(),
          // fixing smart contract bug. Coordinates may be mixed up
          fromX: ev.args.fromX < ev.args.toX ? ev.args.fromX : ev.args.toX,
          fromY: ev.args.fromY < ev.args.toY ? ev.args.fromY : ev.args.toY,
          toX: ev.args.toX > ev.args.fromX ? ev.args.toX : ev.args.fromX,
          toY: ev.args.toY > ev.args.fromY ? ev.args.toY : ev.args.fromY,
          price: ev.args.price.toString() // toString here, because values can be too bog for DB
        }
      })

      logger.info(
`Received ${ formatedBuySellEvents.length } \
new ${ BUY_SELL_EVENT_NAME } events \
from block ${ buySellFromBlock } to ${ buySellEvents.blockNumber }`)

    // save new events and block number to db
    let bsInsertsCount = 0
    if ( formatedBuySellEvents.length > 0 && buySellEvents.blockNumber > 0 ) {
        bsInsertsCount = await db.addBuySellEvents(formatedBuySellEvents)
        logger.info(`${ bsInsertsCount } new ${ BUY_SELL_EVENT_NAME } events were written to db`)
    }

    if (formatedBuySellEvents.length == bsInsertsCount && buySellEvents.blockNumber > 0 ) {
        let saved = await db.saveLatestBlockForEvent(BUY_SELL_EVENT_NAME, buySellEvents.blockNumber)
        logger.info(`${ saved ? "Saved" : "FAILED TO SAVE" } block ${buySellEvents.blockNumber} for ${ BUY_SELL_EVENT_NAME } event to db`)
    } else {
        logger.error(`Retrieved from chain and saved ${ BUY_SELL_EVENT_NAME } events mismatch`)
    }


    // PREPARE DATA FOR ADS SNAPSHOT

    // get ads with no images (not downloaded)
    let ads = await db.getAdsNoImages()
    let adUpdates = []
    logger.info(`Got ads with no images.`)

    // download images and save to db
    let wg = new WebGateway(config)
    for await (const ad of ads) {
        let updates = {}
        logger.info(`Downloading image for ad ID ${ad.ID} from ${ad.imageSourceUrl}...`)
        let [ downloadResult, error ] = await wg.downloadImage(ad.imageSourceUrl)
        let fullImageBinary = null
        if (downloadResult) { 
            // full image binary is a temporary value. It shouldn't be save to db
            // TODO check this out binary got its own fields
            fullImageBinary = downloadResult.binary
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

    // TODO do not fix invalid input error yet
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
            linksMapJSON: adsSnapshot.getLinksMapJSON(),
            bigPicBinary: bigPicBinary,  // is used as background
            adsBigPicUrl: bigPicBinary ? await wg.uploadAdsSnapshotPic(bigPicBinary) : null
        }
        // logger.info(`Built new Ads snapshot with latest event ID ${ newSnapshot.latestEventId }`)
        // check snapshot validity (important as we are not catching upload errors)
        // these are zero snapshot params (see db)
        if (
            // not checking for latestDownloadTimestamp is it ok?
            newSnapshot.latestEventId > 0
            && newSnapshot.linksMapJSON != '[]'
            && newSnapshot.bigPicBinary != null
            && newSnapshot.adsBigPicUrl != null
        ) {
            if (await db.saveAdsSnapshot(newSnapshot)) {
                // TODO cannot see an actually saved snapshot in mongo interface (retrieving results for site data works fine)
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
        buySellSnapshot.overlay(buySellTx)
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
        chain: "mainnet",
        middleWareID: "SF",
        timestamp: Date.now()
    }
    // check that all inportant values are present
    if (
        siteData.adsSnapshot != {}
        && siteData.buySellSnapshot != {}
        && siteData.newImageLatestCheckedBlock > 0
        && siteData.buySellLatestCheckedBlock > 0
    ) {
        const isServing = await wg.publish(JSON.stringify(siteData, null, 2))
        if (isServing) {
            logger.info(`Site data publised. Latest blocks checked: \
NewImage: ${siteData.newImageLatestCheckedBlock}, \
BuySell: ${siteData.buySellLatestCheckedBlock} `)
        }
    } else {
        logger.error("Built wrong site data. Some values are absent", siteData)
    }
}

async function main() {
    
    logger.info(`STARTING APP (JUST LOGGING AS ERROR. ALL FINE)`)  // logging as error to see it in telegram
    // register SIGINT event
    process.on('SIGINT', async () => {
        console.log('Terminating...')
        process.exit(0)
    })

    async function interval() {
        try {
            logger.info(`================= STARTING NEW CYCLE =================`)
            if ( await db.connect() ) {
                await mainLoop()
            }
        } catch (e) {
            throw e
        } finally {
            await db.close()
            logger.debug(`================= CLOSING DB =================`)
        }
        setTimeout(await interval(), MAIN_LOOP_INTERVAL_MS)
    }

    await interval()
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
