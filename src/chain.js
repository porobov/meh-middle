const { ethers } = require("hardhat")

class MillionEther {
  constructor(contractName, contractAddress){
    this.contractAddress = contractAddress
    this.contractName = contractName
  }

  async getEvents(eventName, fromBlock) {
    try {
      const latestBlock = (await ethers.provider.getBlock("latest")).number
      let contract = await ethers.getContractAt(this.contractName, this.contractAddress)
      const eventFilter = contract.filters[eventName]()
      const events = await contract.queryFilter(eventFilter, fromBlock, latestBlock)
      return {
        decodedEvents: events.args,
        blockNumber: latestBlock
      }
    } catch (err) {
      logger.error(err)
      return null
    }
  }
}

module.exports = {
  MillionEther
}
