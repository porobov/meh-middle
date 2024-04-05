const { logger } = require("ethers")
const { ImageEditor } = require("./imageEditor.js")
const hre = require("hardhat");

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
        return event.imageForPixelMap ? event.imageForPixelMap.buffer : await ie.transparentImage(width(pxCoords), height(pxCoords))
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

        // defining colors for tiles. 
        // Meh 2018 will overwrite all 2016 tiles as all the tiles from 
        // 2016 are imported to 2018
        const MEH_2016_COLOR = { r: 208, g: 0, b: 162 } // DARK_PURPLE
        const MEH_2018_COLOR = { r: 255, g: 0, b: 199 } // PURPLE
        const WRAPPED_BLOCK_COLOR = { r: 0, g: 194, b: 255 } // BLUE
        const IMPOSSIBLE_COLOR = { r: 0, g: 139, b: 183 } // dark-blue (should never come up - debugging)
        let color = IMPOSSIBLE_COLOR

        // select color for legacy blocks
        if (ev.contract == "2016") { color = MEH_2016_COLOR }
        if (ev.contract == "2018") { color = MEH_2018_COLOR }
        if (ev.contract == "2024") { color = WRAPPED_BLOCK_COLOR }

        // build image
        return await ie.blankImage(width(pxCoords), height(pxCoords), color)
    }

    // note. We need to make it light weight as the whole JSON is transferred to users every time 
    // this fuction accepts Transfer(2018 and wrapper), LogBuys(2018) and NewAreaStatus (2016) events
    // but we don't need LogBuys(2018) anymore (Transfer events duplicate those)
    _buildJSONMapEntry(buySellTx) {
        return {
            // if price is present it is always 0 due to sellEventFilter
            // so we don't need price field here - if contract is 2016, price 
            // is present and it is always 0)
            // ...(buySellTx.price !== undefined ? { price: buySellTx.price } : {}),  
            // from: buySellTx.from, // we could distinguish mint transactions this way, but no need
            // to: buySellTx.to ? buySellTx.to : buySellTx.address, // address is from LogBuys event 
            // 2018 overlays all 2016 tiles (all tiles were imported). 
            // And as we anyway only can "try" to interact with 2016, we can
            // apply same flow to 2024. But let's try to leave year for now. 
            // contract: buySellTx.contract,  
            // transactionHash: buySellTx.transactionHash,  // maybe we will add link to sell transaction
            owner: buySellTx.owner,
        }
    }
}

module.exports = {
    AdsSnapshot,
    BuySellSnapshot,
  }