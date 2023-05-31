const sharp = require('sharp');
const { logger } = require("./logger.js")

const MODULE_NAME = "image-editor"
function getDimensions(adRecord) {
    return {
        width: (1 + adRecord.toX - adRecord.fromX) * 10,
        height: (1 + adRecord.toY - adRecord.fromY) * 10
    }
}

class ImageEditor {

  constructor(conf) {
    this.conf = conf
  }

  async _blankImage(width, height) {
    return await sharp("static/1x1.png").toBuffer()
  }

  async blankImage(width, height) {
    logger.debug(`Creating image ${ width }, ${ height }`)
    return await sharp({
      create: {
        width: width,
        height: height,
        channels: 4,
        background: { r: 0, g: 255, b: 0 }
      }
    }).png().toBuffer()
  }

  async _fitInside(imageBuffer, width, height, fit, noEnlargement) {
    try {
      return [await sharp(imageBuffer)
        .resize(width, height, {
          fit: fit,
          withoutEnlargement: noEnlargement
        })
        .toBuffer(),
        null]
    } catch (err) {
      logger.error(err, { module: MODULE_NAME, function: "_fitInside" })
      return [null, err]
    }
    }

    async overlayAds(background, ads) {
      try {
        const composite = await sharp(background)
          .composite(ads)
          .toBuffer();
        return composite
      } catch (e) {
        logger.error(e, { module: MODULE_NAME, function: "overlayAds" })
        return null
      }
    }

    async createBackgroundImage(source){
      logger.debug(`Creating blank backgroud image`)
      return await sharp(source)
        .toBuffer()
    }

    async getImageThumbBinary(fullImageBinary, ad) {
      const [imageBuffer, error] = await this._fitInside(
        fullImageBinary,
        this.conf.thumbnailParams.width,
        this.conf.thumbnailParams.height,
        'inside',
        true)
      return imageBuffer
    }

    async getImageForPixelMap(fullImageBinary, ad) {
      const width = getDimensions(ad).width
      const height = getDimensions(ad).height
      const [imageBuffer, error] = await this._fitInside(
          fullImageBinary,
          width,
          height,
          'fill',
          false)
      return imageBuffer
    }
}

module.exports = {
  ImageEditor,
}