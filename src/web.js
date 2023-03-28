const fs = require('fs')  
const Path = require('path')  
const axios = require('axios')
const ufs = require("url-file-size")
class WebGateway {
  
  constructor(conf) {

  }
  
  async downloadImage(imageUrl) {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');
    // const chunk = await readChunk('unicorn.png', {length: minimumBytes});
    const imageFormat = await (await import("image-type")).default(buffer)
    return {
      binary: buffer,
      extension: imageFormat.ext
    }
  }

  saveImageBufferToDisk(imageBuffer, filename) {
    // const path = Path.resolve(__dirname, imageName, imageFormat)
    // const writer = fs.createWriteStream(path)
    fs.writeFileSync(filename, imageBuffer, 'binary', (err) => {
      if (err) throw err;
      console.log(`The file ${filename} has been saved!`);
    });
  }

  async getImageSize(url) {
    return ufs(url)
  }
}
module.exports = {
  WebGateway,
}