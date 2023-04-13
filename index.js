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
    // TODO retrieve latest snapshot taking into account images that were
    // uploaded after retries

    // getting earliest ad with 

    const latestSnapshot = db.getLatestAdsSnapshot() // returns {} if no snapshots are present
    const snapshotOptions = { defaultBgPath: DEFAULT_BG_PATH }
    const newAdsSnapshot = !snapshotError ? new AdsSnapshot(latestSnapshot, snapshotOptions) : null
    // checking if got timestamp higher than of the snapshot, but with lower ID
    const laggards = db.getLaggards(
        newAdsSnapshot.getLatestAdID(),
        newAdsSnapshot.getLatestAdDownloadTimestamp())
    // retrieve all ids like that and find lowest
    // if so find an older snapshot
        
    const addsToBeAdded = db.getAdsFrom(newAdsSnapshot.getLatestAdID())

    // TODO limit max batch for adsTobeadded
    // overlay new ads
    for (ad in addsToBeAdded) {
        await newAdsSnapshot.overlay(ad) // will build picture and links map
    }

    // upload new bigPic
    const [ adsBigPicUrl, uploadError ] = [null, null]
    if ( newAdsSnapshot.gotNewOverlays() ) {
        ;[ adsBigPicUrl, uploadError ] = uploader.uploadAdsSnapshotPic(await newAdsSnapshot.getUpdatedBigPic()) // null or url
    }

    // save snapshot to db
    if ( adsBigPicUrl ) {
        newAdsSnapshot.addBigPicUrl(adsBigPicUrl)
        db.saveAdsSnapshot(await newAdsSnapshot.exportFields())
    }
}

// publish ads snapshot to site
snapshot = db.getLatestUnpublishedAdsSnapshot()
if (snapshot) {
    publisher.publish(snapshot)
    snapshot.published = true
    db.write.snapshot
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
