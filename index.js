const { MillionEther } = require("./src/chain.js")
const { DB } = require("./src/db.js")
const hre = require("hardhat");
const { WebGateway } = require("./src/web.js")
let db = new DB(hre.config.dbConf)
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

    await db.connect()
    let adsNoImages = await db.getAdsNoImages()
    console.log(adsNoImages)
    await db.close()
    */
    let wg = new WebGateway()
    let imageSourceUrl = 'http://i.imgur.com/nU2IQqY.png'
    let downloadResult = await wg.downloadImage(imageSourceUrl)
    wg.saveImageBufferToDisk(downloadResult.binary, "1." + downloadResult.extension)
    // download images and save to db
    /*let adsGotChanges = false
    for (ad in adsNoImages) {
        // also try to download previously failed images (
        console.log("image size:", getImageSize(ad.adUrl))
        /*
        ad.fullImage = downloader.download(ad.adUrl)
        // do not download files more than 10 Mb
        if (successfullyDownloaded && isCorrectFormat) {
            gotChanges = true
        }
        let width = modulo(ad.toX - ad.fromX) // TODO see old middle using modulo, because contract allows mixing coords
        let height = modulo(ad.toY - ad.fromY)
        ad.resizedImage = renderer.resizeImage(ad.fullImage, width, height)
        ad.fullImage = ""
        db.saveAd(ad)
    }*/

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
