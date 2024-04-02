const { ethers } = require("hardhat")
const { logger } = require("./logger.js")

const MODULE_NAME = "chain"
class MillionEther {
  constructor(contractName, contractAddress, contractInstance = null){
    this.contractAddress = contractAddress
    this.contractName = contractName
    this.contractInstance = contractInstance
  }

  async getEvents(eventName, fromBlock, toBlock = "latest") {
    try {
      let contract
      if (this.contractInstance) {
        contract = this.contractInstance
      } else {
        contract = await ethers.getContractAt(this.contractName, this.contractAddress)
      }
      const latestBlock = (await ethers.provider.getBlock(toBlock)).number
      const eventFilter = contract.filters[eventName]()
      const events = await contract.queryFilter(eventFilter, fromBlock, latestBlock)
      return {
        decodedEvents: events,
        blockNumber: latestBlock
      };
    } catch (err) {
      // skipping error code "-32000", which is:
      // One of the blocks specified in filter (fromBlock, toBlock or blockHash) cannot be found.
      // This is ethereum node sync issues. Some nodes are faster than others.
      if (err?.code !== -32000) {
        logger.error(err, { module: MODULE_NAME });
      }
      return null
    }
  }
}

module.exports = {
  MillionEther
}
