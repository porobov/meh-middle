const { MyContract } = require("./src/chain.js")
/*
let db = new DB(credentials)
let renderer = new Renderer()
let downloader = new WWWj

lastDbBlock = db.getLastBlock()
*/
async function main() {
	let eventName = "NewImage"
	let firstBlock = 0
	let contractName = "MillionEther"
	let contractAddress = "0x15dbdB25f870f21eaf9105e68e249E0426DaE916"

	let contract = new MyContract(contractName, contractAddress)
	let newEvents = await contract.getEvents(eventName, firstBlock)
	console.log(newEvents)
	/*
	// checking if any events are present (both ads and buyBlock)
	// and saving them to db
	if (newEvents) {
		db.addEvents(newEvents.decodedEvents)
	}
	db.saveBlockNumber(newEvents.blockNumber)

	// download images and save to db
	adsNoImages = db.getAdsNoImages()
	let adsGotChanges = false
	for (ad in adsNoImages) {
		// try to download previously failed images (
		ad.fullImage = downloader.download(ad.imageUrl)
		if (successfullyDownloaded) {
			gotChanges = true
		}
		let width = modulo(ad.toX - ad.fromX) // TODO see old middle using modulo, because contract allows mixing coords
		let height = modulo(ad.toY - ad.fromY)
		ad.resizedImage = renderer.resizeImage(ad.fullImage, width, height)
		ad.fullImage = ""
		db.saveAd(ad)
	}



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
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
	console.error(error);
	process.exit(1);
});