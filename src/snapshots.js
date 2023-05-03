const { ImageEditor } = require("./imageEditor.js")


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
        let parsedLinksMap = JSON.parse(linksMapJSON)
        for (let x = newAd.fromX; x = newAd.toX; x++ ) {
            for (let y = newAd.fromY; y = newAd.toY; y++ ) {
                parsedLinksMap[x][y] = {
                    adText: newAd.adText,
                    adUrl: newAd.adUrl,
                    imageSourceUrl: newAd.imageSourceUrl
                }
            }
        }
        return JSON.stringify(parsedLinksMap)
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
        this.overlays.push({ 
            input: ad.imageForPixelMap,
            top: (ad.fromY - 1) * 10,
            left: (ad.fromX - 1) * 10
        })
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
            if (!this.bgBinary) {
                this.bgBinary =
                    await ie.createBackgroundImage(this.defaultBgPath)
            }
            this.mergedBigPic = await ie.overlayAd(
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
        this.isMerged = false
        this._gotOverlays = false
        this.latestTransactionID = previousSnapshot.latestTransactionID
        this.ownershipMapJSON = previousSnapshot.ownershipMapJSON
    }

    _addToOwnershipMapJSON(ownershipMapJSON, buySellTx) {
        let parsedOwnershipMap = JSON.parse(ownershipMapJSON)
        for (let x = buySellTx.fromX; x = buySellTx.toX; x++ ) {
            for (let y = buySellTx.fromY; y = buySellTx.toY; y++ ) {
                parsedOwnershipMap[x][y] = {
                    price: buySellTx.price
                }
            }
        }
        return JSON.stringify(parsedOwnershipMap)
    }

    overlay(buySellTx) {
        if (this.isMerged) {
            throw new Error("Cannot overlay - merged already")}
        this.ownershipMapJSON = this._addToOwnershipMapJSON(
            this.ownershipMapJSON,
            buySellTx)
        this._gotOverlays = true
        this.latestTransactionID = buySellTx.ID
    }

    gotOverlays() {
        return this._gotOverlays
    }

    getLatestTransactionID() {
        return this.latestTransactionID
    }

    getOwnershipMapJSON(){
        return this.ownershipMapJSON 
    }

}

module.exports = {
    AdsSnapshot,
    BuySellSnapshot,
  }