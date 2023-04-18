const { MillionEther } = require("./src/chain.js")
const { DB } = require("./src/db.js")
const hre = require("hardhat");
const { WebGateway } = require("./src/web.js")
const { ImageEditor } = require("./src/imageEditor.js")
const { AdsSnapshot } = require("./src/snapshots.js")
const { logger } = require("./src/logger.js");
NEXT_RETRY_DELAY = 1000 * 60 * 5 // 5 minutes
MAX_NUM_OF_DOWNLOAD_ATTEMPTS = 5
STATUSCODES_ALLOWING_RETRY = [ 408, 502, 503, 504, 429 ]
THUMBNAIL_PARAMS = {
    width: 400,
    height: 400
}
DEFAULT_BG_PATH = "./static/bg.png"
const NEW_IMAGE_EVENT_NAME = "NewImage"
const BUY_SELL_EVENT_NAME = "NewStatus"


// analyzes error of image download
function getRetryParams(error, numOfTries) {
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
        logger.info(`Failed to download`) 
    }
    return response
}



async function main() {
    let contractName = "MillionEther"
    let contractAddress = "0x15dbdB25f870f21eaf9105e68e249E0426DaE916"
    let contract = new MillionEther(contractName, contractAddress)
    let db = new DB(hre.config.dbConf)
    await db.connect()
    



    // PREPARE DATA FOR ADS SNAPSHOT
    
    let [ fromBlock, lbError ] = await db.getLatestBlockForEvent(NEW_IMAGE_EVENT_NAME)
    logger.info(`${NEW_IMAGE_EVENT_NAME} event latest block in DB is ${fromBlock}`)
    
    // get events
    let newEvents = await contract.getEvents(NEW_IMAGE_EVENT_NAME, fromBlock)
    logger.info(`Received ${newEvents.decodedEvents.length} new events till block ${newEvents.blockNumber}`)

    // save new events to db
    if (newEvents.decodedEvents.length > 0) {
        const [ insertsCount, insertError ] = await db.addAds(newEvents.decodedEvents)
        logger.info(`${ insertsCount } new events were written to db`)
    }

    // save block number for event    
    let [savedSuccessfully, saveError] = await db.saveLatestBlockForEvent(NEW_IMAGE_EVENT_NAME, newEvents.blockNumber)
    if (savedSuccessfully) {
        logger.info(`Saved block ${newEvents.blockNumber} for ${NEW_IMAGE_EVENT_NAME} event to db`)
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
        const fullImageBinary = null
        if (downloadResult) { 
            // full image binary is a temporary value. It shouldn't be save to db
            fullImageBinary = downloadResult.binary
            ad.updates.imageExtension = downloadResult.extension
            ad.updates.downloadTimestamp = Date.now()
            logger.info(`Downloaded ${downloadResult.extension} image`)
        } else {
            // if failed to download, decide if we want to retry later
            Object.assign(ad.updates, getRetryParams(error, ad.numOfTries))
            ad.updates.error = JSON.stringify(error) // , Object.getOwnPropertyNames(error))
        }

        // resize images
        if ( fullImageBinary ) {
            let ie = new ImageEditor({ thumbnailParams: THUMBNAIL_PARAMS })
            // image for thumbnail will fit configured size
            ;[ ad.updates.imageThumb, error ] = await ie.getImageThumbBinary(ad) 
            // image for pixelMap will resize ignoring aspect ratio
            // will also enlarge image if too small
            ;[ ad.updates.imageForPixelMap, error ] = await ie.getImageForPixelMap(ad)
            logger.info(`Created image for pixel map`)
            // single write of error for both resizes
            if ( error ) {
                ad.updates.error = JSON.stringify(error, Object.getOwnPropertyNames(error))
            }
            // clear full image binary
        }
    }
    let [ updatesCount , updateError ] = await db.appendImagesToAds(ads)
    logger.info(`Updated ${updatesCount} images in the db`)




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

    // retrieve ads with higher ID, sorted by ID
    // (returns cursor)
    const addsToBeAdded  = await db.getAdsFromID(adsSnapshot.getLatestAdID())
    for await (const ad of addsToBeAdded) {
        adsSnapshot.overlay(ad)  // overlay new ads
    }
    // save new snapshot to db (saving only fully processed snapshots)
    if ( adsSnapshot.gotOverlays() ) {
        // upload big pic and links map
        const bigPicBinary = await adsSnapshot.getMergedBigPic() 
        const adsBigPicUrl = ""
        ;[ adsBigPicUrl, uploadError ] = await uploader.uploadAdsSnapshotPic(bigPicBinary)
        const newSnapshot =  {
            latestAdId: adsSnapshot.getLatestAdID(),
            linksMapJSON: adsSnapshot.getLinksMapJSON(),
            bigPicBinary: bigPicBinary,
            adsBigPicUrl: adsBigPicUrl
        }
        await db.saveAdsSnapshot(newSnapshot)
    }


    
    // PUBLISH SITE DATA
    // pushes data on every cycle
    const latestAdsSnapshot = await db.getAdsSnapshotBeforeID('infinity')
    const latestBuySellSnapshot = await db.getBuySellSnapshotBeforeID('infinity')
    const [ buySellLatestCheckedBlock, bsErr] = await db.getLatestBlockForEvent(BUY_SELL_EVENT_NAME)
    const siteData = {
        adsSnapshot: latestAdsSnapshot,
        buySellSnapshot: latestBuySellSnapshot,
        newImageLatestCheckedBlock: newEvents.blockNumber,
        buySellLatestCheckedBlock: buySellLatestCheckedBlock,
        mehContractAddress: contractAddress,
    }
    const [isServing, pubErr ] = await uploader.publish(JSON.stringify(siteData))

    await db.close()
}



main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
