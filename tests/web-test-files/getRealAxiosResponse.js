const axios = require('axios');
const fs = require('fs');

const imageUrl = 'https://api.ethscriptions.com/api/ethscriptions/1332116/data';

  axios.get(imageUrl, { responseType: 'arraybuffer' })
  .then(response => {
    fs.writeFileSync('tests/web-test-files/ethscriptionsDataAxiosResponse.json', Buffer.from(response.data, 'binary'));
    console.log('Image data saved to file: ethscriptionsDataAxiosResponse.json');
  })
  .catch(error => {
    console.error('Error fetching image data:', error);
  });
