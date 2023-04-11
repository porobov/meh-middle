const { ImageEditor } = require("./src/imageEditor.js")

class AdsSnapshot {

    // construct from the same fields as in export (retrieved from db)
    // expects an empty object if no snapshots exist yet
    constructor(previousSnapshot) {
        this.previousSnapshot = previousSnapshot
        if (!Object.hasOwn(previousSnapshot, 'latestAdId')) {
            this.previousSnapshot = {
                latestAdId: 0
            }
        }
    }

    overlay(ad) {
        this.gotOverlays = true
        this.newSnapshot.latestAdId = ad.ID
        this.newSnapshot.bigpic = "big pic binary here" // putOnImage(old, new, coords)
        this.newSnapshot.linksMap = [] // array of links // addToArray(index)
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
        return this.newSnapshot.bigpic
    }

    // these fields will go into db
    exportFields() {
        return this.newSnapshot
    }
}
module.exports = {
    AdsSnapshot,
  }