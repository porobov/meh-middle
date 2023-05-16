const sharp = require('sharp')
const { WebGateway } = require("../src/web.js")
const sizeOf = require('image-size')
const { DB } = require("../src/db.js")
const source = "static/bg.png"
const fs = require('fs')
const hre = require("hardhat");
const config = hre.config.dbConf


async function main() {
  

let db = new DB(config)


    async function _blankImage(width, height) {
        return sharp({
            create: {
                width: width,
                height: height,
                channels: 3,
                background: { r: 255, g: 255, b: 255 } // white background
            }
        }).toBuffer()
    }

    async function createBlankImage() {
        return await sharp({
          create: {
            width: 1,
            height: 1,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 } // white background with alpha channel
          }
        }).toBuffer();
      }


    async function overlayAds(background, ads) {
        return await sharp(background)
            .composite(ads)
            .toBuffer();
    }

    async function createBackgroundImage(source) {
        return  sharp(source)
            .toBuffer();
    }

    const background = await createBackgroundImage(source)
    const blankImage = await createBlankImage()

    // get image from db
    await db.connect()
    let adsToBeAdded = await db.getAdsFromID(0)
    const dbRecord = await adsToBeAdded.next()
    // here's the correct line for retrived image 
    const dbImage = dbRecord.imageForPixelMap.buffer
    await db.close()
    console.log(sizeOf(dbImage))

    // download image
    let wg = new WebGateway(config)
    let [ downloadResult, error ] = await wg.downloadImage("https://i.imgur.com/gwcoc3s.jpg")
    const imageFromWeb = downloadResult.binary
    console.log(sizeOf(imageFromWeb))

  const ads = [
    {
      input: await sharp("static/1x1.png").toBuffer(),
      top: 1,
      left: 1
    },
    {
      input: imageFromWeb,
      top: 100,
      left: 100,
    },
    {
      input: dbImage,
      top: 200,
      left: 200,
    },  ]

    const result = await overlayAds(background, ads)
    fs.writeFileSync('10x10(web).png', imageFromWeb, function(err) {
      if (err) {
        console.log(err);
        return;
      }
    });
    
    fs.writeFileSync('hey.png', result, function(err) {
        if (err) {
          console.log(err);
          return;
        }
      });

}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })