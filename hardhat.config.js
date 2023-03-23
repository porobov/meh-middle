require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  dbConf: {
    stateRecordName: "two",
    dbAccessUrl: "mongodb+srv://upala-express:1l42hOuMYBVAjfte@cluster0.xix8e.mongodb.net/test?retryWrites=true&w=majority&useNewUrlParser=true&useUnifiedTopology=true",
    dbName: "test",
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
