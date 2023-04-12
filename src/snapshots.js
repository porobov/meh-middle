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
                bigPic: null,
                linksMapJSON: []
            }
        this.newSnapshot = emptySnapshot
        if (Object.hasOwn(previousSnapshot, "latestAdId")) {
            this.previousSnapshot = previousSnapshot
        } else {
            this.previousSnapshot = emptySnapshot
        }
    }

    // overlays an ad over given snapshot
    // is collecting new ads into buffer array for subsequent merge
    async overlay(ad) {
        this.overlays.push({ 
            input: ad.imageForPixelMap,
            top: (ad.fromY - 1) * 10,
            left: (ad.fromX - 1) * 10
        })
        this.newSnapshot.linksMapJSON = buildLinksMapJSON(this.previousSnapshot.linksMapJSON, ad)
        this.newSnapshot.latestAdId = ad.ID
    }

    // merge all images to one
    async merge(){
        if (!this.newSnapshot.bigPic) {
            let ie = new ImageEditor({})
            if (!this.previousSnapshot.bigPic) {
                this.previousSnapshot.bigPic = await ie.createBackgroundImage(this.defaultBgPath)
            }
            this.newSnapshot.bigPic = await ie.overlayAd(
                this.previousSnapshot.bigPic,
                this.overlays
                )
        }
    }

    addBigPicUrl(url) {
        this.newSnapshot.bigPicUrl = url
    }

    getLatestAdID(){
        return this.previousSnapshot.latestAdId
    }

    gotNewOverlays() {
        return (this.overlays.length > 0)
    }

    async getUpdatedBigPic() {
        await this.merge()
        return this.newSnapshot.bigPic
    }

    // these fields will go into db
    async exportFields() {
        await this.merge()
        return this.newSnapshot
    }
}
module.exports = {
    AdsSnapshot,
  }