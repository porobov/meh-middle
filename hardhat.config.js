require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
// TODO move mogo credentials to env
module.exports = {
  dbConf: {  // TODO rename to some other conf name
    stateRecordName: "two",  // a single record in state collection is responsible for state
    dbAccessUrl: process.env.MONGO_ACCESS_URL !== undefined ? process.env.MONGO_ACCESS_URL : "",
    dbName: "test",
    newImageEventName: "NewImage",
    buySellEventName: "NewAreaStatus",
    imagesBatchSize: 2, // number of ads images downloaded within one cycle
    maxStoredSnapshots: 10, // if more are present in db the earliest will be deleted
  },
  solidity: "0.8.18",
	defaultNetwork: "localhost",
  networks: {
    localhost: {
      chainId: 31337,   // specifying chainId manually, used in getConfigChainID() function from tools
      numConfirmations: 0, // specifying numConfirmations manually, used in tools lib
      url: "http://127.0.0.1:8545"
    },
    // read-only mainnet (for blocks import)
    readMain: {
      chainId: 1,  // specifying chainId manually, used in getConfigChainID() function from tools
      numConfirmations: 0, // specifying numConfirmations manually, used in tools lib
      url: process.env.ALCHEMY_MAINNET_URL !== undefined ? process.env.ALCHEMY_MAINNET_URL : "",
      accounts: {
            mnemonic: "test test test test test test test test test test test junk"
          },
      timeout: 2000000,
    },
}
}
