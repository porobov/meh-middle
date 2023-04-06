const { ethers } = require("hardhat")

class MillionEther {
  constructor(contractName, contractAddress){
    this.contractAddress = contractAddress
    this.contractName = contractName
  }

  async getEvents(eventName, fromBlock) {
    const latestBlock = (await ethers.provider.getBlock("latest")).number
    let contract = await ethers.getContractAt(this.contractName, this.contractAddress) 
    const eventFilter = contract.filters[eventName]()
    const events = await contract.queryFilter(eventFilter, fromBlock, latestBlock)
    // if event name is NewImage
    const strippedEvents = events.map(ev => {
      return {
        ID: ev.args.ID.toNumber(),
        // fixing smart contract bug. Coordinates may be mixed up
        fromX: ev.args.fromX < ev.args.toX ? ev.args.fromX : ev.args.toX,
        fromY: ev.args.fromY < ev.args.toY ? ev.args.fromY : ev.args.toY,
        toX: ev.args.toX > ev.args.fromX ? ev.args.toX : ev.args.fromX,
        toY: ev.args.toY > ev.args.fromY ? ev.args.toY : ev.args.fromY,
        adText: ev.args.adText,
        adUrl: ev.args.adUrl,
        imageSourceUrl: ev.args.imageSourceUrl
      }
    })
    return {
      decodedEvents: strippedEvents,
      blockNumber: latestBlock
    }
  }
}

module.exports = {
  MillionEther
}
