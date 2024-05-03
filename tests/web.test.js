const axios = require('axios'); // for local testing
const { WebGateway } = require("../src/web.js")
const fs = require('fs');

const config = {
  supportedFormats: ["jpg", "png", "gif", "tif"], 
}
const svgData = fs.readFileSync('tests/web-test-files/etscriptionsImage.svg').toString('base64');
const imageUrl = 'https://api.ethscriptions.com/api/ethscriptions/1332116/data'

// Testing locally if needed
// jest.mock('axios');
// const mockAxiosResponseForEthscriptions = fs.readFileSync('tests/web-test-files/ethscriptionsDataAxiosResponse.json'); 
// const expectedHeaders = { 'content-type': 'image/svg+xml' }; 

describe('downloadImage', () => {
  it('should download and return image data if format is supported', async () => {
    // for local testing
    // axios.get.mockResolvedValue({ data: mockAxiosResponseForEthscriptions, headers: expectedHeaders });

    let wg = new WebGateway(config)
    const result = await wg.downloadImage(imageUrl)
    const svgBinary = Buffer.from(svgData, 'base64');
    expect(result).toEqual([
      {
        binary: svgBinary,
        extension: 'svg'
      },
      null
    ])
  })
});