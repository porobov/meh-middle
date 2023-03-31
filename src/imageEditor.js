const sharp = require('sharp');

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
}

module.exports = {
  ImageEditor,
}