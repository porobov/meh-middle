// pure ethers
const { ethers } = require("ethers")
const { logger } = require("./logger.js")
const { networks } = require("../hardhat.config.js")

const MODULE_NAME = "chain"
class MillionEther {
  constructor(contractAddress, contractAbi, chainName){
    this.provider = new ethers.providers.JsonRpcProvider(networks[chainName].url)
    const signer = this.provider.getSigner()
    this.contract = new ethers.Contract(
        contractAddress,
        contractAbi,
        signer
      )
  }

  async getEvents(eventName, fromBlock, toBlock = "latest") {
    try {
      const latestBlock = (await this.provider.getBlock(toBlock)).number
      const eventFilter = this.contract.filters[eventName]()
      const events = await this.contract.queryFilter(eventFilter, fromBlock, latestBlock)
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
