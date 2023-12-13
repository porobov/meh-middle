// run like this
// npx hardhat run scripts/createDbCollections.js --network readMain

const { DB } = require("../src/db.js")
const { MillionEther } = require("../src/chain.js")
const { getFormatedEvents, saveEventsToDB } = require("../src/mainLoop.js")
const hre = require("hardhat");

const { 
    logBuys2018mapper,
    newAreaStatus2016mapper,
    transfer2018mapper,
    newImage2016mapper,
    logAds2018mapper 
} = require("../src/events.js")

let db = null
const config = hre.config.dbConf
try {
  db = new DB(config)
} catch(e) {
  console.log("Error while creating DB instance", e)
}

async function main() {
  try {
    if (await db.connect()) {
      await db.createDB()

      const signer = (await hre.ethers.getSigners())[0]
      let contractName = config.contractName
      let contractAddress = config.contractAddress
      let meh2016 = new MillionEther(contractName, contractAddress)
      let meh2018 = new MillionEther(
          contractName,
          config.meh2018AddressMain,
          new ethers.Contract(
            config.meh2018AddressMain,
            config.meh2018Abi,
            signer))
      
      // populate db with old events
      const toBlock = config.backgoundEventsBlockNumber
      const formatedEvents = {
        "NewAreaStatus": await getFormatedEvents("NewAreaStatus", meh2016, newAreaStatus2016mapper, 0, toBlock),
        "Transfer": await getFormatedEvents("Transfer", meh2018, transfer2018mapper, 0, toBlock),
        "NewImage": await getFormatedEvents("NewImage", meh2016, newImage2016mapper, 0, toBlock),
        "LogAds": await getFormatedEvents("LogAds", meh2018, logAds2018mapper, 0, toBlock),
        // "LogBuys": await getFormatedEvents("LogBuys", meh2018, logBuys2018mapper, 0, toBlock),
      }
      for (const eventName in formatedEvents) {
        await saveEventsToDB(toBlock, eventName, formatedEvents[eventName][0], db) 
      }

    }
  } catch (e) {
    throw e
  } finally {
    await db.close()
  }
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })