const { ethers } = require("hardhat")
const { logger } = require("./logger.js")

const MODULE_NAME = "chain"
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
        decodedEvents: events,
        blockNumber: latestBlock
      };
    } catch (err) {
      logger.error(err, { module: MODULE_NAME })
      return null
    }
  }
}

module.exports = {
  MillionEther
}
