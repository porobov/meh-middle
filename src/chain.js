const { ethers } = require("hardhat")

class MillionEther {
  constructor(contractName, contractAddress){
    this.contractAddress = contractAddress
    this.contractName = contractName
  }

  async getEvents(eventName, fromBlock) {
    // TODO log error. return empty decodedEvents array if something is wrong
    // TODO return 0 block height if something is worng
    const latestBlock = (await ethers.provider.getBlock("latest")).number
    let contract = await ethers.getContractAt(this.contractName, this.contractAddress) 
    const eventFilter = contract.filters[eventName]()
    const events = await contract.queryFilter(eventFilter, fromBlock, latestBlock)
    return {
      decodedEvents: ev.args,
      blockNumber: latestBlock
    }
  }
}

module.exports = {
  MillionEther
}
