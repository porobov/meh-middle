const sharp = require('sharp');
const { logger } = require("./logger.js")

class ImageEditor {

    constructor(conf) {
        this.conf = conf
    }

    async fitInside(imageBuffer, width, height, fit, noEnlargement) {
        try {
            return [await sharp(imageBuffer)
              .resize(width, height, {
                fit: fit,
                withoutEnlargement: noEnlargement
              })
              .toBuffer(),
              null]
          } catch (err) {
            return [null, err]
          }
    }

    async overlayAds(background, ads) {
      return await sharp(background)
        .composite(ads)
        .toBuffer();
    }

    async createBackgroundImage(source){
      return await sharp(source)
        .toBuffer();
    }
}

module.exports = {
  ImageEditor,
}