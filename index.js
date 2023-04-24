const { MillionEther } = require("./src/chain.js")
const { DB } = require("./src/db.js")
const hre = require("hardhat");
const { WebGateway } = require("./src/web.js")
const { ImageEditor } = require("./src/imageEditor.js")
const { AdsSnapshot, BuySellSnapshot } = require("./src/snapshots.js")
const { logger } = require("./src/logger.js");

// TODO tidy up configs
NEXT_RETRY_DELAY = 1000 * 60 * 5 // 5 minutes - will retry to download. Next attempt will be twice long
MAX_NUM_OF_DOWNLOAD_ATTEMPTS = 5  // number of download attempts for image
STATUSCODES_ALLOWING_RETRY = [ 408, 502, 503, 504, 429 ]  // downloader will try to download images again
THUMBNAIL_PARAMS = {
    width: 400,
    height: 400
}
DEFAULT_BG_PATH = "./static/bg.png" // path to bg image for pixelmap
const NEW_IMAGE_EVENT_NAME = hre.config.dbConf.newImageEventName
const BUY_SELL_EVENT_NAME = hre.config.dbConf.buySellEventName
const MAIN_LOOP_INTERVAL_MS = 5000  // actually a pause between cycles
let db = new DB(hre.config.dbConf)

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
        response.nextTryTimestamp = Date.now() + NEXT_RETRY_DELAY * 2 ** (newNumOfTries - 1)
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
    logger.info(`${ NEW_IMAGE_EVENT_NAME } event latest block in DB is ${fromBlock}`)
    
    // get events
    let newEvents = await contract.getEvents(NEW_IMAGE_EVENT_NAME, fromBlock)
    logger.info(`Received ${newEvents.decodedEvents.length} new events till block ${newEvents.blockNumber}`)
    const formatedEvents = newEvents.decodedEvents.map(ev => {
      return {
        ID: ev.ID.toNumber(),
        // fixing smart contract bug. Coordinates may be mixed up
        fromX: ev.fromX < ev.toX ? ev.fromX : ev.toX,
        fromY: ev.fromY < ev.toY ? ev.fromY : ev.toY,
        toX: ev.toX > ev.fromX ? ev.toX : ev.fromX,
        toY: ev.toY > ev.fromY ? ev.toY : ev.fromY,
        adText: ev.adText,
        adUrl: ev.adUrl,
        imageSourceUrl: ev.imageSourceUrl,
        numOfTries: 0,  // num of download tries for ad image
        failedToDownLoad: false,  // flag. If image failed to download
        nextTryTimestamp: 0,  // next download attempt timestamp
      }
    })

    // save new events and block number to db
    if (formatedEvents.length > 0 &&  newEvents.blockNumber > 0 ) {
        const insertsCount = await db.addAdsEvents(formatedEvents)
        logger.info(`${ insertsCount } new events were written to db`)
        let saved = await db.saveLatestBlockForEvent(NEW_IMAGE_EVENT_NAME, newEvents.blockNumber)
        logger.info(`${ saved ? "Saved" : "FAILED TO SAVE" } block ${newEvents.blockNumber} for ${NEW_IMAGE_EVENT_NAME} event to db`)
    }

    // NEWSTATUS

    // get latest block for events
    let buySellFromBlock = await db.getLatestBlockForEvent(BUY_SELL_EVENT_NAME)
    
    // get events
    let buySellEvents = await contract.getEvents(BUY_SELL_EVENT_NAME, buySellFromBlock)
    logger.info(
        `Received ${ buySellEvents.decodedEvents.length } 
        new ${ BUY_SELL_EVENT_NAME } events 
        from block ${ buySellFromBlock } to ${ buySellEvents.blockNumber }`)

    const formatedBuySellEvents = buySellEvents.decodedEvents.map(ev => {
        return {
          ID: ev.ID.toNumber(),
          // fixing smart contract bug. Coordinates may be mixed up
          fromX: ev.fromX < ev.toX ? ev.fromX : ev.toX,
          fromY: ev.fromY < ev.toY ? ev.fromY : ev.toY,
          toX: ev.toX > ev.fromX ? ev.toX : ev.fromX,
          toY: ev.toY > ev.fromY ? ev.toY : ev.fromY,
          price: ev.price.toString() // toString here, because values can be too bog for DB
        }
      })

    // save new events and block number to db
    if ( formatedBuySellEvents.length > 0 && buySellEvents.blockNumber > 0 ) {
        const insertsCount = await db.addBuySellEvents(formatedBuySellEvents)
        logger.info(`${ insertsCount } new ${ BUY_SELL_EVENT_NAME } events were written to db`)
        let saved = await db.saveLatestBlockForEvent(BUY_SELL_EVENT_NAME, buySellEvents.blockNumber)
        logger.info(`${ saved ? "Saved" : "FAILED TO SAVE" } block ${buySellEvents.blockNumber} for ${ BUY_SELL_EVENT_NAME } event to db`)
    }




    // PREPARE DATA FOR ADS SNAPSHOT

    // get ads with no images (not downloaded)
    let ads = await db.getAdsNoImages()
    logger.info(`Got ${ads.length} ads with no images.`)

    // download images and save to db
    let wg = new WebGateway()
    for await (const ad of ads) {
        ad.updates = {}
        logger.info(`Downloading image for ad ID ${ad.ID} from ${ad.imageSourceUrl}...`)
        let [ downloadResult, error ] = await wg.downloadImage(ad.imageSourceUrl)
        const fullImageBinary = null
        if (downloadResult) { 
            // full image binary is a temporary value. It shouldn't be save to db
            fullImageBinary = downloadResult.binary
            ad.updates.imageExtension = downloadResult.extension
            ad.updates.downloadTimestamp = Date.now()
            logger.info(`Downloaded ${downloadResult.extension} image`)
        } else {
            // if failed to download, decide if we want to retry later
            Object.assign(ad.updates, constructRetryParams(error, ad.numOfTries))
            ad.updates.error = JSON.stringify(error)  // need to show error to user
            if ( ad.updates.failedToDownLoad ) {
                logger.warn(`Failed to download image for ad ID ${ ad.ID }. Source: ${ ad.imageSourceUrl }`)
            }
        }

        // resize images
        if ( fullImageBinary ) {
            let ie = new ImageEditor({ thumbnailParams: THUMBNAIL_PARAMS })
            // image for thumbnail will fit configured size
            ad.updates.imageThumb = await ie.getImageThumbBinary(ad) 
            // image for pixelMap will resize ignoring aspect ratio
            // will also enlarge image if too small
            ad.updates.imageForPixelMap = await ie.getImageForPixelMap(ad)
            logger.info(`Created pixel map image for ad`)
        }
    }
    let updatesCount = await db.appendImagesToAds(ads)
    if ( updatesCount > 0 ) {
        logger.info(`Updated ${ updatesCount } images in the db`)
    }




    // CONSTRUCT ADS SNAPSHOT
    // will do noting if no new ads are present

    // getting earliest ad snapshot 
    const snapshotOptions = { defaultBgPath: DEFAULT_BG_PATH }
    const adsSnapshot = new AdsSnapshot(
        await db.getAdsSnapshotBeforeID('infinity'), // returns {} if no snapshots are present
        snapshotOptions  // options
        )

    // checking if got timestamp higher than of the snapshot, but with lower ID
    // if so find an older snapshot
    // (relevant to images that were uploaded after retries)
    const earliestID = await db.getEarliestAdIdAfterTimestamp(
        adsSnapshot.getLatestAdDownloadTimestamp())
    if (earliestID < adsSnapshot.getLatestAdID()) { 
        adsSnapshot = new AdsSnapshot(
            await db.getAdsSnapshotBeforeID(earliestID),
            snapshotOptions)
    }

    // retrieve ads with higher ID, sorted  by ID
    // (returns cursor)
    const adsToBeAdded = await db.getAdsFromID(adsSnapshot.getLatestAdID())
    for await (const ad of adsToBeAdded) {
        adsSnapshot.overlay(ad)  // overlay new ads
    }
    // save new snapshot to db (saving only fully processed snapshots)
    if ( adsSnapshot.gotOverlays() ) {
        const newSnapshot =  {
            latestAdId: adsSnapshot.getLatestAdID(), // TODO return 0 if err
            linksMapJSON: adsSnapshot.getLinksMapJSON(),  // TODO return '[]' if err
            bigPicBinary: await adsSnapshot.getMergedBigPic(),  // TODO return null if err
            adsBigPicUrl: await uploader.uploadAdsSnapshotPic(bigPicBinary) // return url or nulladsBigPicUrl
        }
        // check snapshot validity (important as we are not catching upload errors)
        if (
            newSnapshot.latestAdId > 0
            && newSnapshot.linksMapJSON != '[]'
            && newSnapshot.bigPicBinary != null
            && newSnapshot.adsBigPicUrl != null
        ) {
            if (await db.saveAdsSnapshot(newSnapshot)) {
                logger.info(`Saved snapshot with latest ad ID: ${newSnapshot.latestAdId}`)
            }
        } else {
            logger.error(`Snapshot got overlays, but some values are null. Latest buySell ID: ${newSnapshot.latestAdId}`)
        }
    }


    // CONSTRUCT BUY SELL SNAPSHOT 

    const buySellSnapshot = new BuySellSnapshot(
        await db.getLatestBuySellSnapshot(), // returns {} if no snapshots are present
        )

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
            latestBuySellId: buySellSnapshot.getLatestTransactionID(),  //  TODO null if err
            ownershipMapJSON: buySellSnapshot.getOwnershipMapJSON(),  //  TODO '[]' if err
        }
        // Check values 
        if (newSnapshot.latestBuySellId != null && newSnapshot.ownershipMapJSON != '[]') {
            if (await db.saveBuySellSnapshot(newSnapshot)) {
                logger.info(`Saved buySell snapshot. Latest buySell ID: ${ newSnapshot.latestBuySellId }`)
            }
        } else {
            logger.error(`Snapshot got overlays, but some values are null. Latest buySell ID: ${ newSnapshot.latestBuySellId }`)
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
        const isServing = await uploader.publish(JSON.stringify(siteData))
        if (isServing) {
            logger.info(`Site data publised. Latest blocks checked: 
                        NewImage: ${siteData.newImageLatestCheckedBlock}, 
                        BuySell: ${siteData.buySellLatestCheckedBlock} `)
        }
    } else {
        logger.error("Built wrong site data. Some values are absent", siteData)
    }
}

async function main() {
    
    logger.info(`STARTING APP`)
    // register SIGINT event
    process.on('SIGINT', async () => {
        console.log('Terminating...')
        process.exit(0)
    })

    async function interval() {
        try {
            logger.info(`================= STARTING NEW CYCLE =================`)
            await db.connect()
            await mainLoop()
        } catch (e) {
            throw e
        } finally {
            await db.close()
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
