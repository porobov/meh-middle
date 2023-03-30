const { MillionEther } = require("./src/chain.js")
const { DB } = require("./src/db.js")
const hre = require("hardhat");
const { WebGateway } = require("./src/web.js")
let db = new DB(hre.config.dbConf)
NEXT_RETRY_DELAY = 1000 * 60 * 5 // 5 minutes
MAX_NUM_OF_DOWNLOAD_ATTEMPTS = 5
/*
let renderer = new Renderer()
let downloader = new WWW
*/
async function main() {
/*
    // get latest block
    await db.connect()
    let eventName = "NewImage"
    let fromBlock = await db.getLatestBlockForEvent(eventName)
    await db.close()
    console.log(`${eventName} event latest block in DB is ${fromBlock}`)
    
    // get events
    let contractName = "MillionEther"
    let contractAddress = "0x15dbdB25f870f21eaf9105e68e249E0426DaE916"
    let contract = new MillionEther(contractName, contractAddress)
    console.log(`Checking ${eventName} event starting from block ${fromBlock}`)
    let newEvents = await contract.getEvents(eventName, fromBlock)
    console.log(`Got ${newEvents.decodedEvents.length} new events till block ${newEvents.blockNumber}`)

    // save new events to db
    await db.connect()
    if (newEvents.decodedEvents.length > 0) {
        const insertResults = await db.addAds(newEvents.decodedEvents)
        console.log(`${insertResults.insertedCount} events were inserted`)
    }

    // save block numer for event    
    await db.saveLatestBlockForEvent(eventName, newEvents.blockNumber)
    console.log(`Saved new latest block to db`)
    await db.close()

    */
    await db.connect()
    let ads = await db.getAdsNoImages()
    console.log("ads from db count", ads.length)
    await db.close()

    let wg = new WebGateway()
    // download images and save to db
    let adsGotChanges = false
    for (ad of ads) {
        let [ downloadResult, error ] = await wg.downloadImage(ad.imageSourceUrl)
        if (downloadResult) { 
            // full image binary is a temporary value. It shouldn't be save to db
            ad.fullImageBinary = downloadResult.binary
            ad.imageExtension = downloadResult.extension
        } else {
            if (Object.hasOwn(error, 'response') 
                && Object.hasOwn(error.response, 'status')
                && (
                    (error.response.status == 408)
                    || (error.response.status == 502)
                    || (error.response.status == 503)
                    || (error.response.status == 504)
                    || (error.response.status == 429)
                    )
            ) {
                // try later for the errors above
                if(Object.hasOwn(ad, "numOfTries") && ad.numOfTries >= 0) {
                    ad.numOfTries ++
                } else {
                    ad.numOfTries = 1
                }
                ad.nextRetryTimestamp = Date.now() + NEXT_RETRY_DELAY * 2 ** ad.numOfTries
                // stop trying to download
                if (ad.numOfTries >= MAX_NUM_OF_DOWNLOAD_ATTEMPTS) {
                    ad.failedToDownLoad = true
                }
            } else {
                // stop downloading attempts if received this flag
                ad.failedToDownLoad = true
            }
        }

        // console.log(downloadResult.extension)
        // do not download files more than 10 Mb
        /*
        if (successfullyDownloaded && isCorrectFormat) {
            gotChanges = true
        }
        let width = modulo(ad.toX - ad.fromX) // TODO see old middle using modulo, because contract allows mixing coords
        let height = modulo(ad.toY - ad.fromY)
        ad.resizedImage = renderer.resizeImage(ad.fullImage, width, height)
        ad.fullImage = ""
    
    */
    }
    // db.appendImagesToAds(ads)
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
