const { logger } = require("ethers")
const { ImageEditor } = require("./imageEditor.js")

function _blockID(x, y) {
    return (y - 1) * 100 + x;
  }

function _blockXY(blockId) {
    let remainder = blockId % 100;
    let y;
    if (remainder === 0) {
        y = Math.floor(blockId / 100)
    } else {
        y = Math.floor(blockId / 100 + 1)
    }
    let x = blockId - (y - 1) * 100
    return [x, y]
}

function _addToJsonMap(bgJson, coords, entry) {
    let parsedMap = JSON.parse(bgJson)
    if ( coords.fromX ) {
        for (let x = coords.fromX; x <= coords.toX; x++) {
            for (let y = coords.fromY; y <= coords.toY; y++) {
                let blockID = _blockID(x, y)
                parsedMap[blockID] = { ...parsedMap[blockID], ...{x: x}, ...{y: y} , ...entry}
            }
        }
    } else {
        const xy = _blockXY(coords.tokenId)
        parsedMap[coords.tokenId] = {...parsedMap[coords.tokenId], ...{x: xy[0]}, ...{y: xy[1]} , ...entry}
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

    // TODO add transaction hash
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

    // this fuction accepts Transfer(2018 and wrapper), LogBuys(2018) and NewAreaStatus (2016) events
    _addToOwnershipMapJSON(ownershipMapJSON, buySellTx) {
        return _addToJsonMap(
            ownershipMapJSON,
            buySellTx,
            { 
                ...(buySellTx.price !== undefined ? { price: buySellTx.price } : {}),
                transactionHash: buySellTx.transactionHash,
                from: buySellTx.from,
                to: buySellTx.to ? buySellTx.to : buySellTx.address, // address is from LogBuys event
                contract: buySellTx.contract
            }
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