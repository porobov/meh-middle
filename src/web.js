const fs = require('fs')  
const Path = require('path')  
const axios = require('axios')
const { logger } = require("./logger.js")
const ufs = require("url-file-size")
const cloudFlareWorkersKV = require('@kikobeats/cloudflare-workers-kv')

class WebGateway {
  
  constructor(conf) {
    this.conf = conf
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
      if (err) throw err
    })
    logger.debug(`The image ${filename} has been saved!`);
  }

  // debug function
  _saveObjectToFile(data, fileName) {
    fs.writeFileSync(fileName, data);
    logger.debug(`The file ${ fileName } has been saved!`);
  }

  async _getImageSize(url) {
    return await ufs(url)
  }

  async uploadAdsSnapshotPic(bigPicBinary){
    const filename = "./logs/hey.png"
    this._saveImageBufferToDisk(bigPicBinary, filename)
    return filename
  }

  async publish(JSON_siteData, keyName){
    const fileName = "./logs/hey.json"
    this._saveObjectToFile(JSON_siteData, fileName)
    await this._publishToCF(JSON_siteData, keyName)
    return fileName
  }

  // https://developers.cloudflare.com/api/operations/workers-kv-namespace-write-key-value-pair-with-metadata
  // publishig both to production and preview namespaces
  async _publishToCF(JSON_siteData, keyName) {
    const store = cloudFlareWorkersKV({
      accountId: this.conf.cfAccountID,
      key: this.conf.cfApiToken,
      namespaceId: this.conf.cfNamespaceId
    })
    const previewStore = cloudFlareWorkersKV({
      accountId: this.conf.cfAccountID,
      key: this.conf.cfApiToken,
      namespaceId: this.conf.cfPreviewNamespaceID
    })
    // TODO error handling
    console.log(await store.set(keyName, JSON.stringify(JSON_siteData)))
    console.log(await previewStore.set(keyName, JSON.stringify(JSON_siteData)))
  }
}
module.exports = {
  WebGateway,
}