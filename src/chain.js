const { ethers } = require("hardhat")

class MyContract {
  constructor(contractName, contractAddress){
    this.contractAddress = contractAddress
    this.contractName = contractName
  }

  async getEvents(eventName, fromBlock) {
    let contract = await ethers.getContractAt(this.contractName, this.contractAddress) 
    const eventFilter = contract.filters[eventName]()
    const events = await contract.queryFilter(eventFilter, fromBlock, 'latest')
    return events.map(ev => ev.args)  
  }
}

module.exports = {
  MyContract
}
