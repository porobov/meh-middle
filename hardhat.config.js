require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
// to run for other network or for developement change dbName, contract address
module.exports = {
  dbConf: { 
    stateRecordName: "main",  // a single record in state collection is responsible for state
    middleWareID: process.env.MIDDLEWARE_ID !== undefined ? process.env.MIDDLEWARE_ID : "", // affects keyName for cloudflare
    dbAccessUrl: process.env.MONGO_ACCESS_URL !== undefined ? process.env.MONGO_ACCESS_URL : "",
    dbName: "MillionEther", // affects keyName for cloudflare
    contractName: "MillionEther",
    contractAddress: "0x15dbdB25f870f21eaf9105e68e249E0426DaE916",
    newImageEventName: "NewImage",
    buySellEventName: "NewAreaStatus",
    imagesBatchSize: 30, // number of ads images downloaded within one cycle
    maxEventsPerSnapshot: 10,  // number of events retrieved per run per snapshot (small values used for testing)
    maxStoredSnapshots: 2, // if more are present in db the earliest will be deleted
    supportedFormats: ["jpg", "png", "gif", "tif"], // , "bmp"] // , "jp2", "jpm", "jpx"]
    nextRetryDelay: 1000 * 60 * 5, // 5 minutes - will retry to download. next attempt will be twice long
    maxNumOfDownloadAttempts: 5,  // number of download attempts for image
    statusCodesAllowingRetry: [408, 502, 503, 504, 429],  // downloader will try to download images again
    thumbnailParams: { width: 400, height: 400 },
    default_bg_path: "./static/bg.png", // path to bg image for pixelmap
    mainLoopIntervalMs: 1000,  // 10 second (actually a pause between cycles)
    cfApiToken: process.env.CF_API_TOKEN !== undefined ? process.env.CF_API_TOKEN : "",
    cfNamespaceId: process.env.CF_NAMESPACE_ID !== undefined ? process.env.CF_NAMESPACE_ID : "",
    cfPreviewNamespaceID: process.env.CF_PREVIEW_NAMESPACE_ID !== undefined ? process.env.CF_PREVIEW_NAMESPACE_ID : "",
    cfAccountID: process.env.CF_ACCOUNT_ID !== undefined ? process.env.CF_ACCOUNT_ID : "",
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
