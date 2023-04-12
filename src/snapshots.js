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
    constructor(previousSnapshot) {
        if (Object.hasOwn(previousSnapshot, "latestAdId")) {
            this.previousSnapshot = previousSnapshot
        } else {
            // spec for the snapshot record
            this.previousSnapshot = {
                latestAdId: 0, // this is also unique ID of the snapshot
                bigPicUrl: null,
                bigPic: null,
                linksMapJSON: []
            }
        }
    }

    // overlays an ad over given snapshot
    async overlay(ad) {
        let ie = new ImageEditor({})
        if (!this.previousSnapshot.bigPic) {
            this.previousSnapshot.bigPic = ie.createBackgroundImage()
        }
        // fields for the snapshot record
        this.newSnapshot.bigPic = ie.overlayAd(this.previousSnapshot.bigPic, ad)
        this.newSnapshot.linksMapJSON = buildLinksMapJSON(this.previousSnapshot.linksMapJSON, ad)
        this.newSnapshot.latestAdId = ad.ID
        // flag for new overlays
        this.gotOverlays = true
    }

    addBigPicUrl(url) {
        this.newSnapshot.bigPicUrl = url
    }

    getLatestAdID(){
        return this.previousSnapshot.latestAdId
    }

    gotNewOverlays() {
        return this.gotOverlays
    }

    getUpdatedBigPic() {
        return this.newSnapshot.bigPic
    }

    // these fields will go into db
    exportFields() {
        return this.newSnapshot
    }
}
module.exports = {
    AdsSnapshot,
  }