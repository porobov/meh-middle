const { logger } = require("ethers")
const { ImageEditor } = require("./imageEditor.js")

// TODO make it for ads snapshot as well
function _addToJsonMap(bgJson, coords, entry) {
    let parsedMap = JSON.parse(bgJson)
    for (let x = coords.fromX; x == coords.toX; x++) {
        for (let y = coords.fromY; y == coords.toY; y++) {
            if (!parsedMap[x]) { parsedMap[x] = [] }
            parsedMap[x][y] = entry
        }
    }
    return JSON.stringify(parsedMap)
}

class AdsSnapshot {

    // construct from the same fields as in export (retrieved from db)
    // expects an empty object if no snapshots exist yet
    constructor(previousSnapshot, options) {
        this.bg = previousSnapshot
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

    // overlays an ad over given snapshot
    // is collecting new ads into buffer array for subsequent merge
    async overlay(ad) {
        if (this.mergedBigPic) {
            throw new Error("Cannot overlay - merged big pic already")}
        // input, top and left are params for shark image processor
        const ie = new ImageEditor({})
        const newOverlay = { 
            // put 1 px if imageForPixelMap is null
            input: ad.imageForPixelMap ? ad.imageForPixelMap : await ie.blankImage(1,1),
            top: (ad.fromY - 1) * 10,
            left: (ad.fromX - 1) * 10
        }
        this.overlays.push(newOverlay)
        console.log(newOverlay)
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
            if ( this.bgBinary == null ) {
                this.bgBinary =
                    await ie.createBackgroundImage(this.defaultBgPath)
            }
            this.mergedBigPic = await ie.overlayAds(
                this.bgBinary,
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
            { price: ownershipMapJSON.price }
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