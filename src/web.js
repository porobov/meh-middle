const fs = require('fs')  
const axios = require('axios')
const { logger } = require("./logger.js")
const ufs = require("url-file-size")
const cloudFlareWorkersKV = require('@kikobeats/cloudflare-workers-kv')
const MODULE_NAME = 'web'
class WebGateway {
  
  constructor(conf) {
    this.conf = conf
    this.SUPPORTED_FORMATS = conf.supportedFormats
  }
  
  getBinaryFromSvg(svgData) {
    // TODO may not find the image - try catch
    const regex = /xlink:href="data:image\/svg\+xml;base64,(.*)"/;
    const base64Data = svgData.match(regex)[1];
    return Buffer.from(base64Data, 'base64');
  }

  async downloadImage(imageUrl) {
    try {
      // Dealing with imgur rate limiting. Setting timeput in milliseconds
      await new Promise(resolve => setTimeout(resolve, 1000));

      let response = await axios.get(imageUrl, { responseType: 'arraybuffer' });

      let binary, extension;
      if (response.headers['content-type'] === 'image/svg+xml') {
        binary = this.getBinaryFromSvg(response.data.toString())
        extension = 'svg'
      } else {
        binary = Buffer.from(response.data, 'binary');
        const imageFormat = await (await import("image-type")).default(binary)
        if (!this.SUPPORTED_FORMATS.includes(imageFormat.ext)) {
          throw new Error('Image format is not supported')
        }
        extension = imageFormat.ext
      }

      return [
        {
          binary: binary,
          extension: extension 
        },
        null
      ]
    }
    catch (e) {
      return [null, e]
    }
  }

  async _getImageSize(url) {
    return await ufs(url)
  }

  // debug function
  _saveImageBufferToDisk(imageBuffer, filename) {
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

  // debug
  // We don't need to upload image anymore. the whole snapshot is uploaded to Cloudflare KV
  saveSnapshotPic(bigPicBinary, filenameWithExtension){
    this._saveImageBufferToDisk(bigPicBinary, "./logs/" + filenameWithExtension)
  }

  async publish(JSON_siteData, keyName){
    return await this._publishToCF(JSON.stringify(JSON_siteData), keyName)
  }

  // https://developers.cloudflare.com/api/operations/workers-kv-namespace-write-key-value-pair-with-metadata
  // publishig to production namespace
  // TODO gives this - (node:20670) ExperimentalWarning: The Fetch API is an experimental feature. This feature could change at any time
  async _publishToCF(JSON_siteData, keyName) {
    const store = cloudFlareWorkersKV({
      accountId: this.conf.cfAccountID,
      key: this.conf.cfApiToken,
      namespaceId: this.conf.cfNamespaceId
    })
    try {
      await store.set(keyName, JSON.stringify(JSON_siteData))
      logger.debug(`Published key ${ keyName } to production ${ this.conf.cfNamespaceId }`)
      return true
    } catch (err) {
      logger.error(err, { module: MODULE_NAME })
      return false
    }
  }
}

module.exports = {
  WebGateway,
}