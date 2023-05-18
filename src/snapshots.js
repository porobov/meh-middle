const { logger } = require("ethers")
const { ImageEditor } = require("./imageEditor.js")

function _blockID(x, y) {
    return (y - 1) * 100 + x;
  }

function _addToJsonMap(bgJson, coords, entry) {
    let parsedMap = JSON.parse(bgJson)
    for (let x = coords.fromX; x == coords.toX; x++) {
        for (let y = coords.fromY; y == coords.toY; y++) {
            let blockID = _blockID(x, y)
            parsedMap[blockID] = { x: x, y: y , ...entry}
        }
    }
    return JSON.stringify(parsedMap, null, 2)
}

class AdsSnapshot {

    // construct from the same fields as in export (retrieved from db)
    // expects an empty object if no snapshots exist yet
    constructor(previousSnapshot, options) {
        this.bg = previousSnapshot
        this.latestDownloadTimestamp = this.bg.latestDownloadTimestamp
        this.latestEventId = previousSnapshot.latestEventId
        this.linksMapJSON = previousSnapshot.linksMapJSON
        this.bgBinary = previousSnapshot.bigPicBinary
        this.defaultBgPath = options.defaultBgPath
        this.overlays = []
    }

    _addToLinksMapJSON(linksMapJSON, newAd) {
        return _addToJsonMap(
            linksMapJSON,
            newAd,
            {
                adText: newAd.adText,
                adUrl: newAd.adUrl,
                imageSourceUrl: newAd.imageSourceUrl
            }
        )
    }

    getBGLatestAdID(){
        return this.bg.latestEventId
    }

    getLatestAdID(){
        return this.latestEventId
    }

    getBGLatestAdDownloadTimestamp() {
        return this.bg.latestDownloadTimestamp
    }

    getLatestAdDownloadTimestamp() {
        return this.latestDownloadTimestamp
    }

    // overlays an ad over given snapshot
    // is collecting new ads into buffer array for subsequent merge
    async overlay(ad) {
        if (this.mergedBigPic) {
            throw new Error("Cannot overlay - merged big pic already")}
        // input, top and left are params for shark image processor
        const ie = new ImageEditor({})
        const newOverlay = { 
            // put 1 px if imageForPixelMap is null
            // note: buffer key is 
            input: ad.imageForPixelMap ? ad.imageForPixelMap.buffer : await ie.blankImage(1,1),
            top: (ad.fromY - 1) * 10,
            left: (ad.fromX - 1) * 10
        }
        this.overlays.push(newOverlay)
        this.linksMapJSON = this._addToLinksMapJSON(this.linksMapJSON, ad)
        this.latestEventId = ad.ID
        if ( ad.downloadTimestamp > this.latestDownloadTimestamp ) {
            this.latestDownloadTimestamp = ad.downloadTimestamp
        }
    }

    gotOverlays() {
        return (this.overlays.length > 0)
    }

    // merge all images to one
    async getMergedBigPic(){
        if (!this.mergedBigPic) {
            let ie = new ImageEditor({})
            this.mergedBigPic = await ie.overlayAds(
                this.bgBinary.buffer,
                this.overlays
            )
        }
        return this.mergedBigPic
    }

    getLinksMapJSON() {
        return this.linksMapJSON
    }
}

class BuySellSnapshot {
    constructor(previousSnapshot) {
        this.bg = previousSnapshot
        this._gotOverlays = false
        this.latestEventId = previousSnapshot.latestEventId
        this.ownershipMapJSON = previousSnapshot.ownershipMapJSON
    }


    _addToOwnershipMapJSON(ownershipMapJSON, buySellTx) {
        return _addToJsonMap(
            ownershipMapJSON,
            buySellTx,
            { price: buySellTx.price }
        )
    }

    overlay(buySellTx) {
        this.ownershipMapJSON = this._addToOwnershipMapJSON(
            this.ownershipMapJSON,
            buySellTx)
        this._gotOverlays = true
        this.latestEventId = buySellTx.ID
    }

    gotOverlays() {
        return this._gotOverlays
    }

    getBGLatestTransactionID() {
        return this.bg.latestEventId
    }

    getLatestTransactionID() {
        return this.latestEventId
    }

    getOwnershipMapJSON(){
        return this.ownershipMapJSON 
    }

}

module.exports = {
    AdsSnapshot,
    BuySellSnapshot,
  }