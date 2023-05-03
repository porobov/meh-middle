const fs = require('fs')  
const Path = require('path')  
const axios = require('axios')
const { logger } = require("./logger.js")
const ufs = require("url-file-size")

class WebGateway {
  
  constructor(conf) {
    this.SUPPORTED_FORMATS = conf.supportedFormats
  }
  
  async downloadImage(imageUrl) {
    try {
      let response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data, 'binary');
      const imageFormat = await (await import("image-type")).default(buffer)
      if (!this.SUPPORTED_FORMATS.includes(imageFormat.ext)) {
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

  // debug function
  _saveImageBufferToDisk(imageBuffer, filename) {
    // const path = Path.resolve(__dirname, imageName, imageFormat)
    // const writer = fs.createWriteStream(path)
    fs.writeFileSync(filename, imageBuffer, 'binary', (err) => {
      if (err) throw err;
      logger.info(`The file ${filename} has been saved!`);
    });
  }

  // debug function
  _saveObjectToFile(data, fileName) {
    fs.writeFileSync(fileName, data);
    logger.info(`The file ${ fileName } has been saved!`);
  }

  async _getImageSize(url) {
    return await ufs(url)
  }

  async uploadAdsSnapshotPic(bigPicBinary){
    const filename = "./logs/hey.png"
    this._saveImageBufferToDisk(bigPicBinary, filename)
    return filename
  }

  async publish(JSON_siteData){
    const fileName = "./logs/hey.json"
    this._saveObjectToFile(JSON_siteData, fileName)
    return fileName
  }
}
module.exports = {
  WebGateway,
}