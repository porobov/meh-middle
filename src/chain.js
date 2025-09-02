// pure ethers
const { ethers } = require("ethers")
const { logger } = require("./logger.js")
const { networks } = require("../hardhat.config.js")
const wrapperAbi = require('../contracts/wrapper_abi.js')
const oldMehAbi = require('../contracts/oldMeh_abi.js')
const meh2018Abi = require('../contracts/meh2018_abi.js')

const MODULE_NAME = "chain"

class Chain {
  constructor(config, chainName){
    const chainId = networks[chainName].chainId
    this.provider = new ethers.providers.JsonRpcProvider(networks[chainName].url)
    const chain = this
    this.latestChainBlock = null

    class MillionEther {
      constructor(provider, contractAddress, contractAbi){
        this.provider = provider
        this.contract = new ethers.Contract(
          contractAddress,
          contractAbi,
          provider
        )
      }

      async getEvents(eventName, fromBlock, toBlock) {
        try {
          const latestChainBlock = chain.latestChainBlock
          if (fromBlock > latestChainBlock) {
            return null
          }
          let queryToBlock = latestChainBlock
          if (latestChainBlock > toBlock) {
            queryToBlock = toBlock
          }
          const eventFilter = this.contract.filters[eventName]()
          const events = await this.contract.queryFilter(eventFilter, fromBlock, queryToBlock)
          return {
            decodedEvents: events,
            blockNumber: queryToBlock
          };
        } catch (err) {
          if (err?.code !== -32000) {
            logger.error(err, { module: MODULE_NAME });
          }
          return null
        }
      }
    }

    this.oldMehContract = new MillionEther(
      this.provider,
      config.contractAddress[chainId],
      oldMehAbi.abi
    )
    this.wrapperContract = new MillionEther(
      this.provider,
      config.wrapperAddress[chainId],
      wrapperAbi.abi
    )
    this.meh2018 = new MillionEther(
      this.provider,
      config.meh2018AddressMain[chainId],
      meh2018Abi.abi
    )
  }

  async updateLatestChainBlock() {
    this.latestChainBlock = await this.provider.getBlockNumber()
    return true
  }
}

module.exports = {
  Chain
}
