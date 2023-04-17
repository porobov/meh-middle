const { MillionEther } = require("./src/chain.js")
const { DB } = require("./src/db.js")
const hre = require("hardhat");
const { WebGateway } = require("./src/web.js")
const { ImageEditor } = require("./src/imageEditor.js")
const { AdsSnapshot } = require("./src/snapshots.js")
const { logger } = require("./src/logger.js");
const { add } = require("winston");
NEXT_RETRY_DELAY = 1000 * 60 * 5 // 5 minutes
MAX_NUM_OF_DOWNLOAD_ATTEMPTS = 5
STATUSCODES_ALLOWING_RETRY = [ 408, 502, 503, 504, 429 ]
THUMBNAIL_PARAMS = {
    width: 400,
    height: 400
}
DEFAULT_BG_PATH = "./static/bg.png"

function getDimensions(adRecord) {
    return {
        width: (1 + adRecord.toX - adRecord.fromX),
        height: (1 + adRecord.toY - adRecord.fromY)
    }
}

async function main() {
    // get latest block
    let db = new DB(hre.config.dbConf)
    await db.connect()
    let eventName = "NewImage"
    let [ fromBlock, lbError ] = await db.getLatestBlockForEvent(eventName)
    logger.info(`${eventName} event latest block in DB is ${fromBlock}`)
    
    // get events
    let contractName = "MillionEther"
    let contractAddress = "0x15dbdB25f870f21eaf9105e68e249E0426DaE916"
    let contract = new MillionEther(contractName, contractAddress)
    // logger.info(`Checking ${eventName} event starting from block ${fromBlock}`)
    let newEvents = await contract.getEvents(eventName, fromBlock)
    logger.info(`Received ${newEvents.decodedEvents.length} new events till block ${newEvents.blockNumber}`)

    // save new events to db
    if (newEvents.decodedEvents.length > 0) {
        const [ insertsCount, insertError ] = await db.addAds(newEvents.decodedEvents)
        logger.info(`${ insertsCount } new events were written to db`)
    }

    // save block number for event    
    let [savedSuccessfully, saveError] = await db.saveLatestBlockForEvent(eventName, newEvents.blockNumber)
    if (savedSuccessfully) {
        logger.info(`Saved block ${newEvents.blockNumber} for ${eventName} event to db`)
    }

    // get ads with no images (not downloaded)
    let [ ads, adsLoadError ] = await db.getAdsNoImages()
    logger.info(`Got ${ads.length} ads with no images.`)

    // download images and save to db
    let wg = new WebGateway()
    for (ad of ads) {
        ad.updates = {}
        logger.info(`Downloading image for ad ID ${ad.ID} from ${ad.imageSourceUrl}...`)
        let [ downloadResult, error ] = await wg.downloadImage(ad.imageSourceUrl)
        if (downloadResult) { 
            // full image binary is a temporary value. It shouldn't be save to db
            ad.fullImageBinary = downloadResult.binary
            ad.updates.imageExtension = downloadResult.extension
            logger.info(`Downloaded ${downloadResult.extension} image`)
        } else {
            if (Object.hasOwn(error, 'response') 
                && Object.hasOwn(error.response, 'status')
                && STATUSCODES_ALLOWING_RETRY.includes(error.response.status)
            ) {
                // try later for the errors above
                let numOfTries = 0
                if(Object.hasOwn(ad, "numOfTries") && ad.numOfTries >= 0) {
                    numOfTries = ad.numOfTries
                }
                numOfTries ++
                ad.updates.numOfTries = numOfTries
                ad.updates.nextTryTimestamp = Date.now() + NEXT_RETRY_DELAY * 2 ** (numOfTries - 1)
                // stop trying to download
                if (ad.numOfTries >= MAX_NUM_OF_DOWNLOAD_ATTEMPTS) {
                    ad.updates.failedToDownLoad = true
                }
                logger.info(`Could not download (status code: ${error.response.status}). Will try later. Attempts: ${numOfTries}`)
            } else {
                // stop downloading attempts if received this flag
                ad.updates.failedToDownLoad = true
                logger.info(`Failed to download`) 
            }
        ad.updates.error = JSON.stringify(error) // , Object.getOwnPropertyNames(error))
        }

        // resize images
        if (ad.fullImageBinary) {
            let ie = new ImageEditor({})
            // image for thumbnail will fit configured size
            let [ imageBuffer, error ] = await ie.fitInside(
                ad.fullImageBinary,
                THUMBNAIL_PARAMS.width,
                THUMBNAIL_PARAMS.height,
                'inside',
                true)
            ad.updates.imageThumb = imageBuffer // null if error
            // image for pixelMap will resize ignoring aspect ratio
            // will also enlarge image if too small
            ad.updates.width = getDimensions(ad).width
            ad.updates.height = getDimensions(ad).height
            ;[ imageBuffer, error ] = await ie.fitInside(
                ad.fullImageBinary,
                ad.updates.width,
                ad.updates.height,
                'fill',
                false)
            ad.updates.imageForPixelMap = imageBuffer // null if error
            logger.info(`Created image for pixel map`)

            // single write of error for both resizes
            if ( error ) {
                ad.updates.error = JSON.stringify(error, Object.getOwnPropertyNames(error))
            }
            // clear full image binary
            ad.fullImageBinary = ""
        }
    }
    let [ updatesCount , updateError ] = await db.appendImagesToAds(ads)
    await db.close()
    logger.info(`Updated ${updatesCount} images in the db`)


    // CONSTRUCT ADS BIG BIC

    // getting earliest ad snapshot 
    const snapshotOptions = { defaultBgPath: DEFAULT_BG_PATH }
    const adsSnapshot = new AdsSnapshot(
        await db.getSnapshotBeforeID('infinity'), // returns {} if no snapshots are present
        snapshotOptions  // options
        )

    // checking if got timestamp higher than of the snapshot, but with lower ID
    // if so find an older snapshot
    // (relevant to images that were uploaded after retries)
    const earliestID = await db.getEarliestAdIdAfterTimestamp(
        adsSnapshot.getLatestAdDownloadTimestamp())
    if (earliestID < adsSnapshot.getLatestAdID()) { 
        adsSnapshot = new AdsSnapshot(
            await db.getSnapshotBeforeID(earliestID),
            snapshotOptions)
    }

    // retrieve ads with higher ID, sorted by ID
    // (returns cursor)
    const addsToBeAdded  = await db.getAdsFromID(adsSnapshot.getLatestAdID())
    for await (const ad of addsToBeAdded) {
        adsSnapshot.overlay(ad)  // overlay new ads
    }
    // save new snapshot to db
    if ( adsSnapshot.gotOverlays() ) {
        const newSnapshot =  {
            latestAdId: adsSnapshot.getLatestAdID(),
            linksMapJSON: adsSnapshot.getLinksMapJSON(),
            bigPicBinary: await adsSnapshot.getMergedBigPic()
        }
        await db.saveAdsSnapshot(newSnapshot)
    }



    // UPLOAD BIG PIC AND LINKS MAP
    
    const snapshot = await db.getSnapshotBeforeID('infinity')
    const adsBigPicUrl = ""
    if ( snapshot && snapshot.isServing == false ) {
        ;[ adsBigPicUrl, uploadError ] = await uploader.uploadAdsSnapshotPic(snapshot.bigPicBinary)
    }


    // PREPARE AND PUBLISH SITE DATA

    if ( adsBigPicUrl ) {
        const siteData = snapshot
        siteData.adsBigPicUrl = adsBigPicUrl

        const [isServing, pubErr ] = await uploader.publish(JSON.stringify(siteData))
        snapshot.isServing = isServing
        await db.updateSnapshot(snapshot)
    }

    await db.close()
}



main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
