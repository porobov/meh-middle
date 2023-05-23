// ownership map snapshot uses this as background
const { MillionEther } = require("../src/chain.js")
const { BuySellSnapshot } = require("../src/snapshots.js")
const fs = require('fs')  
const hre = require("hardhat")
const { ethers } = require("hardhat")

const config = hre.config.dbConf
const BUY_SELL_EVENT_NAME = config.buySellEventName
const FILE_NAME = './static/oldOwnershipMap.json'
const newMehAddress = '0xCEf41878Db032586C835eE0890484399402A64f6'

const newMehAbi = '[{\"constant\":true,\"inputs\":[{\"name\":\"_interfaceId\",\"type\":\"bytes4\"}],\"name\":\"supportsInterface\",\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_address\",\"type\":\"address\"}],\"name\":\"adminSetMarket\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"x\",\"type\":\"uint8\"},{\"name\":\"y\",\"type\":\"uint8\"}],\"name\":\"getBlockOwner\",\"outputs\":[{\"name\":\"\",\"type\":\"address\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"name\",\"outputs\":[{\"name\":\"\",\"type\":\"string\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"_tokenId\",\"type\":\"uint256\"}],\"name\":\"getApproved\",\"outputs\":[{\"name\":\"\",\"type\":\"address\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_to\",\"type\":\"address\"},{\"name\":\"_tokenId\",\"type\":\"uint256\"}],\"name\":\"approve\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"fromX\",\"type\":\"uint8\"},{\"name\":\"fromY\",\"type\":\"uint8\"},{\"name\":\"toX\",\"type\":\"uint8\"},{\"name\":\"toY\",\"type\":\"uint8\"}],\"name\":\"areaPrice\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"totalSupply\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"InterfaceId_ERC165\",\"outputs\":[{\"name\":\"\",\"type\":\"bytes4\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_from\",\"type\":\"address\"},{\"name\":\"_to\",\"type\":\"address\"},{\"name\":\"_tokenId\",\"type\":\"uint256\"}],\"name\":\"transferFrom\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"\",\"type\":\"address\"}],\"name\":\"balances\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"_owner\",\"type\":\"address\"},{\"name\":\"_index\",\"type\":\"uint256\"}],\"name\":\"tokenOfOwnerByIndex\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_address\",\"type\":\"address\"}],\"name\":\"adminSetAds\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[],\"name\":\"withdraw\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_payer\",\"type\":\"address\"},{\"name\":\"_recipient\",\"type\":\"address\"},{\"name\":\"_amount\",\"type\":\"uint256\"}],\"name\":\"operatorTransferFunds\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[],\"name\":\"unpause\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_from\",\"type\":\"address\"},{\"name\":\"_to\",\"type\":\"address\"},{\"name\":\"_tokenId\",\"type\":\"uint256\"}],\"name\":\"safeTransferFrom\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"rentals\",\"outputs\":[{\"name\":\"\",\"type\":\"address\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"_tokenId\",\"type\":\"uint256\"}],\"name\":\"exists\",\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"_index\",\"type\":\"uint256\"}],\"name\":\"tokenByIndex\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"x\",\"type\":\"uint8\"},{\"name\":\"y\",\"type\":\"uint8\"}],\"name\":\"adminImportOldMEBlock\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"paused\",\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"fromX\",\"type\":\"uint8\"},{\"name\":\"fromY\",\"type\":\"uint8\"},{\"name\":\"toX\",\"type\":\"uint8\"},{\"name\":\"toY\",\"type\":\"uint8\"},{\"name\":\"priceForEachBlockWei\",\"type\":\"uint256\"}],\"name\":\"sellArea\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"_tokenId\",\"type\":\"uint256\"}],\"name\":\"ownerOf\",\"outputs\":[{\"name\":\"\",\"type\":\"address\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_to\",\"type\":\"address\"},{\"name\":\"_blockId\",\"type\":\"uint16\"}],\"name\":\"_mintCrowdsaleBlock\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"fromX\",\"type\":\"uint8\"},{\"name\":\"fromY\",\"type\":\"uint8\"},{\"name\":\"toX\",\"type\":\"uint8\"},{\"name\":\"toY\",\"type\":\"uint8\"},{\"name\":\"imageSource\",\"type\":\"string\"},{\"name\":\"link\",\"type\":\"string\"},{\"name\":\"text\",\"type\":\"string\"}],\"name\":\"placeAds\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"_owner\",\"type\":\"address\"}],\"name\":\"balanceOf\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[],\"name\":\"renounceOwnership\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"market\",\"outputs\":[{\"name\":\"\",\"type\":\"address\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"fromX\",\"type\":\"uint8\"},{\"name\":\"fromY\",\"type\":\"uint8\"},{\"name\":\"toX\",\"type\":\"uint8\"},{\"name\":\"toY\",\"type\":\"uint8\"},{\"name\":\"rentPricePerPeriodWei\",\"type\":\"uint256\"}],\"name\":\"rentOutArea\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"x\",\"type\":\"uint8\"},{\"name\":\"y\",\"type\":\"uint8\"}],\"name\":\"blockID\",\"outputs\":[{\"name\":\"\",\"type\":\"uint16\"}],\"payable\":false,\"stateMutability\":\"pure\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[],\"name\":\"pause\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_address\",\"type\":\"address\"}],\"name\":\"adminSetRentals\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"owner\",\"outputs\":[{\"name\":\"\",\"type\":\"address\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"fromX\",\"type\":\"uint8\"},{\"name\":\"fromY\",\"type\":\"uint8\"},{\"name\":\"toX\",\"type\":\"uint8\"},{\"name\":\"toY\",\"type\":\"uint8\"}],\"name\":\"buyArea\",\"outputs\":[],\"payable\":true,\"stateMutability\":\"payable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"symbol\",\"outputs\":[{\"name\":\"\",\"type\":\"string\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[],\"name\":\"adminRescueFunds\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_to\",\"type\":\"address\"},{\"name\":\"_approved\",\"type\":\"bool\"}],\"name\":\"setApprovalForAll\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"advertiser\",\"type\":\"address\"},{\"name\":\"fromX\",\"type\":\"uint8\"},{\"name\":\"fromY\",\"type\":\"uint8\"},{\"name\":\"toX\",\"type\":\"uint8\"},{\"name\":\"toY\",\"type\":\"uint8\"}],\"name\":\"canAdvertise\",\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"fromX\",\"type\":\"uint8\"},{\"name\":\"fromY\",\"type\":\"uint8\"},{\"name\":\"toX\",\"type\":\"uint8\"},{\"name\":\"toY\",\"type\":\"uint8\"},{\"name\":\"numberOfPeriods\",\"type\":\"uint256\"}],\"name\":\"areaRentPrice\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"ads\",\"outputs\":[{\"name\":\"\",\"type\":\"address\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_from\",\"type\":\"address\"},{\"name\":\"_to\",\"type\":\"address\"},{\"name\":\"_tokenId\",\"type\":\"uint256\"},{\"name\":\"_data\",\"type\":\"bytes\"}],\"name\":\"safeTransferFrom\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"_tokenId\",\"type\":\"uint256\"}],\"name\":\"tokenURI\",\"outputs\":[{\"name\":\"\",\"type\":\"string\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"_owner\",\"type\":\"address\"},{\"name\":\"_operator\",\"type\":\"address\"}],\"name\":\"isApprovedForAll\",\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"fromX\",\"type\":\"uint8\"},{\"name\":\"fromY\",\"type\":\"uint8\"},{\"name\":\"toX\",\"type\":\"uint8\"},{\"name\":\"toY\",\"type\":\"uint8\"},{\"name\":\"numberOfPeriods\",\"type\":\"uint256\"}],\"name\":\"rentArea\",\"outputs\":[],\"payable\":true,\"stateMutability\":\"payable\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_newOwner\",\"type\":\"address\"}],\"name\":\"transferOwnership\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"isMEH\",\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"name\":\"ID\",\"type\":\"uint256\"},{\"indexed\":false,\"name\":\"fromX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"fromY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"newLandlord\",\"type\":\"address\"}],\"name\":\"LogBuys\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"name\":\"ID\",\"type\":\"uint256\"},{\"indexed\":false,\"name\":\"fromX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"fromY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"sellPrice\",\"type\":\"uint256\"}],\"name\":\"LogSells\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"name\":\"ID\",\"type\":\"uint256\"},{\"indexed\":false,\"name\":\"fromX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"fromY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"rentPricePerPeriodWei\",\"type\":\"uint256\"}],\"name\":\"LogRentsOut\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"name\":\"ID\",\"type\":\"uint256\"},{\"indexed\":false,\"name\":\"fromX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"fromY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"numberOfPeriods\",\"type\":\"uint256\"},{\"indexed\":false,\"name\":\"rentedFrom\",\"type\":\"uint256\"}],\"name\":\"LogRents\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"name\":\"ID\",\"type\":\"uint256\"},{\"indexed\":false,\"name\":\"fromX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"fromY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"imageSourceUrl\",\"type\":\"string\"},{\"indexed\":false,\"name\":\"adUrl\",\"type\":\"string\"},{\"indexed\":false,\"name\":\"adText\",\"type\":\"string\"},{\"indexed\":true,\"name\":\"advertiser\",\"type\":\"address\"}],\"name\":\"LogAds\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"name\":\"payerOrPayee\",\"type\":\"address\"},{\"indexed\":false,\"name\":\"balanceChange\",\"type\":\"int256\"}],\"name\":\"LogContractBalance\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"name\":\"newAddress\",\"type\":\"address\"},{\"indexed\":false,\"name\":\"moduleName\",\"type\":\"string\"}],\"name\":\"LogModuleUpgrade\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[],\"name\":\"Pause\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[],\"name\":\"Unpause\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"name\":\"previousOwner\",\"type\":\"address\"}],\"name\":\"OwnershipRenounced\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"name\":\"previousOwner\",\"type\":\"address\"},{\"indexed\":true,\"name\":\"newOwner\",\"type\":\"address\"}],\"name\":\"OwnershipTransferred\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"name\":\"_from\",\"type\":\"address\"},{\"indexed\":true,\"name\":\"_to\",\"type\":\"address\"},{\"indexed\":true,\"name\":\"_tokenId\",\"type\":\"uint256\"}],\"name\":\"Transfer\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"name\":\"_owner\",\"type\":\"address\"},{\"indexed\":true,\"name\":\"_approved\",\"type\":\"address\"},{\"indexed\":true,\"name\":\"_tokenId\",\"type\":\"uint256\"}],\"name\":\"Approval\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"name\":\"_owner\",\"type\":\"address\"},{\"indexed\":true,\"name\":\"_operator\",\"type\":\"address\"},{\"indexed\":false,\"name\":\"_approved\",\"type\":\"bool\"}],\"name\":\"ApprovalForAll\",\"type\":\"event\"}]'

async function mainLoop() {
    const signer = (await hre.ethers.getSigners())[0]
    let contractName = config.contractName
    let contractAddress = config.contractAddress
    let meh2016 = new MillionEther(contractName, contractAddress)
    let meh2018 = new MillionEther(contractName, contractAddress, new ethers.Contract(newMehAddress, newMehAbi, signer))
    
    
    async function syncEvents(eventName, contract, mapper) {

        // fixing smart contract bug. Coordinates may be mixed up
        const mixedCoordinates = ev => {
            if (ev.args.fromX) {
                return (ev.args.fromX <= ev.args.toX && ev.args.fromY <= ev.args.toY)
            } else {
                return true
            }
        }
        
        const sellEvent = ev => {
            if (ev.args.price) {
                return (ev.args.price == 0)
            } else {
                return true
            }
        }

        let fromBlock = 0
        let newEvents = await contract.getEvents(eventName, fromBlock)
        const formatedEvents = newEvents.decodedEvents.filter(mixedCoordinates).filter(sellEvent).map(mapper)

        console.log(
`Received ${formatedEvents.length} \
new ${eventName} events \
from block ${fromBlock} to ${newEvents.blockNumber}`)
    return formatedEvents
    }

    // 2016
    const buySells2016 = await syncEvents(
        BUY_SELL_EVENT_NAME, 
        meh2016, 
        ev => {
            return {
                ID: ev.blockNumber * 100000 + ev.logIndex,
                fromX: ev.args.fromX,
                fromY: ev.args.fromY,
                toX: ev.args.toX,
                toY: ev.args.toY,
                price: ev.args.price.toString(), // toString here, because values can be too bog for DB
                transactionHash: ev.transactionHash,
                contract: "2016"
            }
        })

    // 2018
    // event LogBuys( uint ID, uint8 fromX, uint8 fromY, uint8 toX, uint8 toY, address newLandlord);
    const logBuys2018 = await syncEvents(
        "LogBuys", 
        meh2018, 
        ev => {
            return {
                ID: ev.blockNumber * 100000 + ev.logIndex,
                fromX: ev.args.fromX,
                fromY: ev.args.fromY,
                toX: ev.args.toX,
                toY: ev.args.toY,
                address: ev.args.address,
                transactionHash: ev.transactionHash,
                contract: "2016"
            }
        })

    // event transfer for wrapper from, to, tokenId
    const transfers2018 = await syncEvents(
        "Transfer", 
        meh2018, 
        ev => {
            return {
                ID: ev.blockNumber * 100000 + ev.logIndex,
                from: ev.args._from,
                to: ev.args._to,
                tokenId: ev.args._tokenId.toNumber(),
                transactionHash: ev.transactionHash,
                contract: "2018"
            }
        })
    
    // BUILDING NEW BACKGROUND SNAPSHOT
    // this is previous background snapshot. 
    // moved it here to create new background
    let emptySnapshot = {
        // also see snapshot validity check 
        latestEventId: 0,
        ownershipMapJSON: '{}'
      }
    
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
