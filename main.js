
let db = new DB(credentials)
let chain = new Chain(creds)
let renderer = new Renderer()
let downloader = new WWW

lastDbBlock = db.getLastBlock()
newEvents = chain.getEvents(fromBlock = lastDBblock)

// checking if any events are present (both ads and buyBlock)
// and saving them to db
if (newEvents.gotEvents()) {
	db.addEvents(newEvents.decodedEvents)
	
}
db.saveBlockNumber(newEvents.blockNumber)

// download images and save to db
adsNoImages = db.getAdsNoImages()
let adsGotChanges = false
for (ad in adsNoImages) {
	// try to download previously failed images (
	ad.image = downloader.download(ad.imageUrl)
	if (successfullyDownloaded) {
		gotChanges = true
	}
	db.saveAd(ad)
}

// construct adsBigBic
// if no image is present will fill with black and add error to block data
lastAdsBlock = db.getLastAdsBlock() // TODO change to db.isAdsSnapshotOutdated()
lastAdsBigPic = db.getlastAdsBigPic()
unprocesseAds = db.getAdsWithChanges()
if (lastadsBlock > lastAdsBigPic || adsGotChanges) {
	ads = db.getAds()  // get all ads(or only previous snapshot)
	bigPicAds = renderer.render(ads)
	bigAdsUrl = uploader.uploadBigAds(bigPicAds.image)
	bigPicAds.data.bigAdsUrl = bigAdsUrl 
	db.saveBigAdsSnapshot(bigPicAds) // also saves id
}

// publish to site
lastPublishedAdsSnapshot = db.getPublishedAdsSnapshot() /// db.getUnpublishedAdsSnapshot()
latestSnapshot = db.getLatestAdsSnapshot()
if (lastPublishedAdsSnapshot < latestSnapshot) {
	publisher.publish(latestSnapshot)
}





