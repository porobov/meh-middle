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

function toPixels(coord){
    return (coord - 1) * 10
}

const pixelCoords = (event) => {
    if (event.fromX) {
        return {
            fromX: toPixels(event.fromX),
            fromY: toPixels(event.fromY),
            toX: toPixels(event.toX),
            toY: toPixels(event.toY)
        }
    } else {
        const blockXY = _blockXY(event.tokenId)
        return {
            fromX: toPixels(blockXY[0]),
            fromY: toPixels(blockXY[1]),
            toX: toPixels(blockXY[0]) + 10,
            toY: toPixels(blockXY[1]) + 10,
        }
    }
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
class BaseSnapshot {

    // construct from the same fields as in export (retrieved from db)
    // expects an empty object if no snapshots exist yet
    constructor(previousSnapshot, options) {
        this.bg = previousSnapshot
        this.latestEventId = previousSnapshot.latestEventId
        this.picMapJSON = previousSnapshot.picMapJSON
        this.bgBinary = previousSnapshot.bigPicBinary
        this.overlays = []
    }

    getBGLatestAdID(){
        return this.bg.latestEventId
    }

    getLatestAdID(){
        return this.latestEventId
    }

    gotOverlays() {
        return (this.overlays.length > 0)
    }

    getLinksMapJSON() {
        return this.picMapJSON
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

    // overlays an ad over given snapshot
    // is collecting new ads into buffer array for subsequent merge
    async overlay(ad) {
        if (this.mergedBigPic) {
            throw new Error("Cannot overlay - merged big pic already")}
        // input, top and left are params for shark image processor
        const newOverlay = { 
            // put 1 px if imageForPixelMap is null
            // note: buffer key is 
            input: await this.buildInputImage(ad),
            top: pixelCoords(ad).fromY,
            left: pixelCoords(ad).fromX
        }
        this.overlays.push(newOverlay)
        this.picMapJSON = this._addToLinksMapJSON(this.picMapJSON, ad)
        this.latestEventId = ad.ID
        if ( ad.downloadTimestamp > this.latestDownloadTimestamp ) {
            this.latestDownloadTimestamp = ad.downloadTimestamp
        }
    }
}

class AdsSnapshot extends BaseSnapshot {

    constructor(previousSnapshot, options) {
        super(previousSnapshot, options)
        this.latestDownloadTimestamp = this.bg.latestDownloadTimestamp
    }

    // TODO add transaction hash
    _addToLinksMapJSON(picMapJSON, newAd) {
        return _addToJsonMap(
            picMapJSON,
            newAd,
            {
                adText: newAd.adText,
                adUrl: newAd.adUrl,
                imageSourceUrl: newAd.imageSourceUrl
            }
        )
    }

    getBGLatestAdDownloadTimestamp() {
        return this.bg.latestDownloadTimestamp
    }

    getLatestAdDownloadTimestamp() {
        return this.latestDownloadTimestamp
    }

    async buildInputImage(event) {
        const ie = new ImageEditor({})
        return event.imageForPixelMap ? event.imageForPixelMap.buffer : await ie.blankImage(1,1)
    }
}

class BuySellSnapshot {
    constructor(previousSnapshot) {
        this.bg = previousSnapshot
        this._gotOverlays = false
        this.latestEventId = previousSnapshot.latestEventId
        this.ownershipMapJSON = previousSnapshot.ownershipMapJSON
        this.overlays = []
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

    async overlay(buySellTx) {
        if (this.mergedPic) {
            throw new Error("Cannot overlay - merged pic already")}
        // input, top and left are params for shark image processor
        const ie = new ImageEditor({})
        const pixels = pixelCoords(buySellTx)
        const newOverlay = { 
            input: await ie.blankImage(pixels.toX - pixels.fromX, pixels.toY - pixels.fromY),
            top: pixels.fromY,
            left: pixels.fromX
        }
        this.overlays.push(newOverlay) 
        this.ownershipMapJSON = this._addToOwnershipMapJSON(
            this.ownershipMapJSON,
            buySellTx)
        this.latestEventId = buySellTx.ID
    }

    gotOverlays() {
        return (this.overlays.length > 0)
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