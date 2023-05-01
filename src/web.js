const fs = require('fs')  
const Path = require('path')  
const axios = require('axios')
const { logger } = require("./logger.js")
const ufs = require("url-file-size")
const SUPPORTED_FORMATS = ["jpg", "png", "gif", "tif"] // , "bmp"] // , "jp2", "jpm", "jpx"]

class WebGateway {
  
  constructor(conf) {

  }
  
  async downloadImage(imageUrl) {
    try {
      let response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'binary');
      const imageFormat = await (await import("image-type")).default(buffer)
      if (!SUPPORTED_FORMATS.includes(imageFormat.ext)) {
        throw new Error ('Image format is not supported') 
      }
      return [
        {
          binary: buffer,
          extension: imageFormat.ext
        },
        null
      ]
    }
    catch (e) {
      return [null, e]
    }
  }

  _saveImageBufferToDisk(imageBuffer, filename) {
    // const path = Path.resolve(__dirname, imageName, imageFormat)
    // const writer = fs.createWriteStream(path)
    fs.writeFileSync(filename, imageBuffer, 'binary', (err) => {
      if (err) throw err;
      logger.info(`The file ${filename} has been saved!`);
    });
  }

  async _getImageSize(url) {
    return await ufs(url)
  }
}
module.exports = {
  WebGateway,
}