// ownership map snapshot uses this as background
const { MillionEther } = require("../src/chain.js")
const { getFormatedEvents, saveEventsToDB } = require("../index.js")
const { BuySellSnapshot } = require("../src/snapshots.js")
const fs = require('fs')  
const hre = require("hardhat")
const { ethers } = require("hardhat")
const { 
    mixedCoordinatesFilter,
    sellEventFilter,
    newAreaStatus2016mapper,
    logBuys2018mapper,
    transfer2018mapper,
    newImage2016mapper,
    logAds2018mapper 
} = require("..src/events.js")
const config = hre.config.dbConf
const BUY_SELL_EVENT_NAME = config.buySellEventName
const FILE_NAME = './static/oldOwnershipMap.json'

async function mainLoop() {
    const signer = (await hre.ethers.getSigners())[0]
    let contractName = config.contractName
    let contractAddress = config.contractAddress
    let meh2016 = new MillionEther(contractName, contractAddress)
    let meh2018 = new MillionEther(contractName, contractAddress, new ethers.Contract(newMehAddress, newMehAbi, signer))
    
    async function syncEvents(eventName, contract, mapper) {
        let fromBlock = 0
        let newEvents = await contract.getEvents(eventName, fromBlock)
        const formatedEvents = newEvents.decodedEvents.filter(mixedCoordinatesFilter).filter(sellEventFilter).map(mapper)
        console.log(
`Received ${formatedEvents.length} \
new ${eventName} events \
from block ${fromBlock} to ${newEvents.blockNumber}`)
    return formatedEvents
    }

    // owneship
    const buySells2016 = await syncEvents(BUY_SELL_EVENT_NAME, meh2016, newAreaStatus2016mapper)
    const logBuys2018 = await syncEvents( "LogBuys", meh2018, logBuys2018mapper)
    const transfers2018 = await syncEvents( "Transfer", meh2018, transfer2018mapper)
    const ads2016 = await getFormatedEvents( 0, "NewImage", meh2016, newImage2016mapper)
    const ads2018 = await getFormatedEvents( 0, "LogAds", meh2018, logAds2018mapper)

    // BUILDING NEW BACKGROUND SNAPSHOT
    // this is previous background snapshot. 
    // moved it here to create new background
    let emptySnapshot = { latestEventId: 0, ownershipMapJSON: '{}' }
    
    const buySellSnapshot = new BuySellSnapshot(emptySnapshot)
    for (const ev of buySells2016) {
        buySellSnapshot.overlay(ev)
    }
    let snapshot2016length = Object.keys(JSON.parse(buySellSnapshot.getOwnershipMapJSON())).length 
    for (const ev of logBuys2018) {
        buySellSnapshot.overlay(ev)
    }
    let snapshotTotalLength = Object.keys(JSON.parse(buySellSnapshot.getOwnershipMapJSON())).length 
    console.log(`Snaphot 2016 length ${snapshot2016length}, total: ${snapshotTotalLength}`)
    let data = buySellSnapshot.getOwnershipMapJSON()
    fs.writeFileSync(FILE_NAME, data)
}

mainLoop()
  .then(() => { process.exit(0) })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
