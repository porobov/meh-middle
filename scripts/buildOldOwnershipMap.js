const { MillionEther } = require("../src/chain.js")
const fs = require('fs')  
const { DB } = require("../src/db.js")
const hre = require("hardhat")
const { logger } = require("../src/logger.js")

const config = hre.config.dbConf
const MAX_NUM_OF_DOWNLOAD_ATTEMPTS = config.maxNumOfDownloadAttempts
const STATUSCODES_ALLOWING_RETRY = config.statusCodesAllowingRetry
const DEFAULT_BG_PATH = config.default_bg_path
const NEW_IMAGE_EVENT_NAME = config.newImageEventName
const BUY_SELL_EVENT_NAME = config.buySellEventName
const MAIN_LOOP_INTERVAL_MS = config.mainLoopIntervalMs
const FILE_NAME = './static/oldOwnersahipMap.json'

async function mainLoop() {
    let contractName = config.contractName
    let contractAddress = config.contractAddress
    let contract = new MillionEther(contractName, contractAddress)

    const mapper = ev => {
        return {
            ID: ev.blockNumber * 100000 + ev.logIndex,
            // fixing smart contract bug. Coordinates may be mixed up
            fromX: ev.args.fromX < ev.args.toX ? ev.args.fromX : ev.args.toX,
            fromY: ev.args.fromY < ev.args.toY ? ev.args.fromY : ev.args.toY,
            toX: ev.args.toX > ev.args.fromX ? ev.args.toX : ev.args.fromX,
            toY: ev.args.toY > ev.args.fromY ? ev.args.toY : ev.args.fromY,
            price: ev.args.price.toString(), // toString here, because values can be too bog for DB
            transactionHash: ev.transactionHash,
        }
    }

    async function syncEvents(eventName, contract, mapper) {
        let fromBlock = 0
        let newEvents = await contract.getEvents(eventName, fromBlock)
        const formatedEvents = newEvents.decodedEvents.map(mapper)

        logger.debug(
`Received ${formatedEvents.length} \
new ${eventName} events \
from block ${fromBlock} to ${newEvents.blockNumber}`)
        fs.writeFileSync(FILE_NAME, JSON.stringify(formatedEvents, null, 2))    
    }


    let db = new DB(config)
    await db.connect()
    await syncEvents(BUY_SELL_EVENT_NAME, contract, mapper)
    await db.close()
}

mainLoop()
  .then(() => { process.exit(0) })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
