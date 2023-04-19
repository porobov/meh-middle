const { ImageEditor } = require("./src/imageEditor.js")

function buildLinksMapJSON(linksMapJSON, newAd) {
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
class AdsSnapshot {

    // construct from the same fields as in export (retrieved from db)
    // expects an empty object if no snapshots exist yet
    constructor(previousSnapshot, options) {
        this.defaultBgPath = options.defaultBgPath
        this.overlays = []
        // spec for the snapshot record
        let emptySnapshot = {
                latestAdId: 0, // this is also unique ID of the snapshot
                bigPicUrl: null,
                bigPicBinary: null,
                linksMapJSON: '[]'
            }
        this.newSnapshot = emptySnapshot
        if (Object.hasOwn(previousSnapshot, "latestAdId")) {
            this.previousSnapshot = previousSnapshot
        } else {
            this.previousSnapshot = emptySnapshot
        }
        this.latestAdId = this.previousSnapshot.latestAdId
    }

    getLatestAdID(){
        return this.latestAdId
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
        this.newSnapshot.linksMapJSON = buildLinksMapJSON(this.previousSnapshot.linksMapJSON, ad)
        this.latestAdId = ad.ID
    }

    gotOverlays() {
        return (this.overlays.length > 0)
    }

    // merge all images to one
    async getMergedBigPic(){
        if (!this.mergedBigPic) {
            let ie = new ImageEditor({})
            if (!this.previousSnapshot.bigPicBinary) {
                this.previousSnapshot.bigPicBinary =
                    await ie.createBackgroundImage(this.defaultBgPath)
            }
            this.mergedBigPic = await ie.overlayAd(
                this.previousSnapshot.bigPicBinary,
                this.overlays
            )
        }
        return this.mergedBigPic
    }

    getLinksMapJSON() {
        return this.newSnapshot.linksMapJSON
    }
}

class BuySellSnapshot {
    constructor(previousSnapshot) {
        this.isMerged = false
        this._gotOverlays = false
        if ( Object.hasOwn(previousSnapshot, "latestTransactionID") ) {
            this.latestTransactionID = previousSnapshot.latestTransactionID
            this.ownershipMapJSON = previousSnapshot.ownershipMapJSON
        } else {
            this.latestTransactionID = 0 
            this.ownershipMapJSON = '[]'
        }
    }

    _appendToOwnershipMapJSON(ownershipMapJSON, buySellTx) {
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
        this.ownershipMapJSON = this._appendToOwnershipMapJSON(
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