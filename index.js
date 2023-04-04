const { MillionEther } = require("./src/chain.js")
const { DB } = require("./src/db.js")
const hre = require("hardhat");
const { WebGateway } = require("./src/web.js")
const { ImageEditor } = require("./src/imageEditor.js")
let db = new DB(hre.config.dbConf)
NEXT_RETRY_DELAY = 1000 * 60 * 5 // 5 minutes
MAX_NUM_OF_DOWNLOAD_ATTEMPTS = 5
STATUSCODES_ALLOWING_RETRY = [ 408, 502, 503, 504, 429 ]
THUMBNAIL_PARAMS = {
    width: 400,
    height: 400
}
/*
let renderer = new Renderer()
let downloader = new WWW
*/
function getDimensions(adRecord) {
    return {
        width: (1 + adRecord.toX - adRecord.fromX),
        height: (1 + adRecord.toY - adRecord.fromY)
    }
}
async function main() {
    // get latest block
    await db.connect()
    let eventName = "NewImage"
    let [ fromBlock, lbError ] = await db.getLatestBlockForEvent(eventName)
    console.log(`${eventName} event latest block in DB is ${fromBlock}`)
    
    // get events
    let contractName = "MillionEther"
    let contractAddress = "0x15dbdB25f870f21eaf9105e68e249E0426DaE916"
    let contract = new MillionEther(contractName, contractAddress)
    console.log(`Checking ${eventName} event starting from block ${fromBlock}`)
    let newEvents = await contract.getEvents(eventName, fromBlock)
    console.log(`Got ${newEvents.decodedEvents.length} new events till block ${newEvents.blockNumber}`)

    // save new events to db
    if (newEvents.decodedEvents.length > 0) {
        const [ insertResults, insertError ] = await db.addAds(newEvents.decodedEvents)
        console.log(`${insertResults.insertedCount} events were inserted`)
    }

    // save block number for event    
    let [saveResult, saveError] = await db.saveLatestBlockForEvent(eventName, newEvents.blockNumber)
    console.log(saveResult)

    // download images and save to db
    let [ ads, adsLoadError ] = await db.getAdsNoImages()
    console.log("ads from db count", ads.length)

    let wg = new WebGateway()
    for (ad of ads) {
        ad.updates = {}
        let [ downloadResult, error ] = await wg.downloadImage(ad.imageSourceUrl)
        if (downloadResult) { 
            // full image binary is a temporary value. It shouldn't be save to db
            ad.fullImageBinary = downloadResult.binary
            ad.updates.imageExtension = downloadResult.extension
        } else {
            if (Object.hasOwn(error, 'response') 
                && Object.hasOwn(error.response, 'status')
                && STATUSCODES_ALLOWING_RETRY.includes(error.response.status)
            ) {
                // try later for the errors above
                if(Object.hasOwn(ad, "numOfTries") && ad.numOfTries >= 0) {
                    ad.numOfTries ++
                } else {
                    ad.numOfTries = 1
                }
                ad.nextTryTimestamp = Date.now() + NEXT_RETRY_DELAY * 2 ** ad.numOfTries
                // stop trying to download
                if (ad.numOfTries >= MAX_NUM_OF_DOWNLOAD_ATTEMPTS) {
                    ad.updates.failedToDownLoad = true
                }
            } else {
                // stop downloading attempts if received this flag
                ad.updates.failedToDownLoad = true
            }
        ad.updates.error = JSON.stringify(error, Object.getOwnPropertyNames(error))
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

            // single write of error for both resizes
            if ( error ) { ad.updates.error = error }
            // clear full image binary
            ad.fullImageBinary = ""
        }
    }
    // TODO when should db connected and closed
    let [ updateResult, updateError ] = await db.appendImagesToAds(ads)
    await db.close()
    console.log(updateResult)
}


/*

// construct adsBigBic
// if no image is present will fill with black and add error to block data
gotUnprocessedAds = db.gotUnprocessedAds()
if (gotUnprocessedAds || adsGotChanges) {
    ads = db.getAds()  // get all ads(or only previous snapshot)
    adsBigPic = renderer.render(ads)
    adsBigPicUrl = uploader.uploadBigAds(adsBigPic.image)
    adsBigPic.snapshot.adsBigPicUrl = bigAdsUrl 
    db.saveBigAdsSnapshot(adsBigPic) // also saves id
    db.saveLatestProcessedAdsId(adsBigPic.latestProcessedAdsId)
}

// publish ads snapshot to site
snapshot = db.getLatestUnpublishedAdsSnapshot()
if (snapshot) {
    publisher.publish(snapshot)
    snapshot.published = true
    db.write.snapshot
}

*/


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
