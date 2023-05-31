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
            toX: toPixels(event.toX) + 10,
            toY: toPixels(event.toY) + 10
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
const width = (pxCoords) => pxCoords.toX - pxCoords.fromX
const height = (pxCoords) => pxCoords.toY - pxCoords.fromY

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

    // TODO add transaction hash
    _addToLinksMapJSON(picMapJSON, newEvent) {
        return _addToJsonMap(
            picMapJSON,
            newEvent,
            this._buildJSONMapEntry(newEvent)
        )
    }

    // overlays an ad over given snapshot
    // is collecting new ads into buffer array for subsequent merge
    async overlay(ad) {
        if (this.mergedBigPic) {
            throw new Error("Cannot overlay - merged big pic already")}
        const pixels = pixelCoords(ad)
        // input, top and left are params for shark image processor
        const newOverlay = { 
            input: await this._buildInputImage(ad, pixels),
            top: pixels.fromY,
            left: pixels.fromX
        }
        this.overlays.push(newOverlay)
        this.picMapJSON = this._addToLinksMapJSON(this.picMapJSON, ad)
        this.latestEventId = ad.ID
        this._setLatestDownloadTimestamp(ad)
    }

    // does nothing for the base snapshot. Overriden in AdsSnapshot
    _setLatestDownloadTimestamp(ad) {
    }
}

class AdsSnapshot extends BaseSnapshot {

    constructor(previousSnapshot, options) {
        super(previousSnapshot, options)
        this.latestDownloadTimestamp = this.bg.latestDownloadTimestamp
    }

    async _buildInputImage(event, pxCoords) {
        // put 1 px if imageForPixelMap is null
        // note: buffer key is
        const ie = new ImageEditor({})
        return event.imageForPixelMap ? event.imageForPixelMap.buffer : await ie.blankImage(width(pxCoords), height(pxCoords))
    }

    _buildJSONMapEntry(newEvent) {
        return {
            adText: newEvent.adText,
            adUrl: newEvent.adUrl,
            imageSourceUrl: newEvent.imageSourceUrl
        }
    }

    _setLatestDownloadTimestamp(ad) {
        if (ad.downloadTimestamp > this.latestDownloadTimestamp) {
            this.latestDownloadTimestamp = ad.downloadTimestamp
        }
    }

    getBGLatestAdDownloadTimestamp() {
        return this.bg.latestDownloadTimestamp
    }

    getLatestAdDownloadTimestamp() {
        return this.latestDownloadTimestamp
    }
}

class BuySellSnapshot extends BaseSnapshot {
    constructor(previousSnapshot) {
        super(previousSnapshot)
    }

    async _buildInputImage(ev, pxCoords) {
        const ie = new ImageEditor({})
        return await ie.blankImage(width(pxCoords), height(pxCoords))
    }

    // this fuction accepts Transfer(2018 and wrapper), LogBuys(2018) and NewAreaStatus (2016) events
    _buildJSONMapEntry(buySellTx) {
        return {
            ...(buySellTx.price !== undefined ? { price: buySellTx.price } : {}),
            transactionHash: buySellTx.transactionHash,
            from: buySellTx.from,
            to: buySellTx.to ? buySellTx.to : buySellTx.address, // address is from LogBuys event
            contract: buySellTx.contract
        }
    }
}

module.exports = {
    AdsSnapshot,
    BuySellSnapshot,
  }