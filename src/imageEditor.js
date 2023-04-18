const sharp = require('sharp');
const { logger } = require("./logger.js")

function getDimensions(adRecord) {
    return {
        width: (1 + adRecord.toX - adRecord.fromX),
        height: (1 + adRecord.toY - adRecord.fromY)
    }
}

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

    async getImageThumbBinary(ad) {
      return [imageBuffer, error] = await ie.fitInside(
        ad.fullImageBinary,
        this.conf.thumbnailParams.width,
        this.conf.thumbnailParams.height,
        'inside',
        true)
    }

    async getImageForPixelMap(ad) {
      const width = getDimensions(ad).width
      const height = getDimensions(ad).height
        ;[imageBuffer, error] = await ie.fitInside(
          ad.fullImageBinary,
          width,
          height,
          'fill',
          false)
    }
}

module.exports = {
  ImageEditor,
}