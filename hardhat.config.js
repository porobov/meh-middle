require("dotenv").config();

module.exports = {
  
  solidity: "0.8.18",
	defaultNetwork: "localhost",
  networks: {
    localhost: {
      chainName: "localhost", // affects CF key name // using this chainName for local tests to test publishing to CF
      chainId: 31337,
      url: "http://127.0.0.1:8545"
    },
    // read-only mainnet (for blocks import)
    mainnet: {
      chainName: "mainnet",  // affects CF key name
      chainId: 1,
      url: process.env.ALCHEMY_MAINNET_URL !== undefined ? process.env.ALCHEMY_MAINNET_URL : "",
    },
    // we gonna use single testname in conf. Rn it is sepolia
    testnet: {
      chainName: "testnet",  // affects CF key name 
      chainId: 11155111,   // specifying chainId manually, used in getConfigChainID() function from tools
      url: process.env.ALCHEMY_SEPOLIA_URL !== undefined ? process.env.ALCHEMY_SEPOLIA_URL : "",
    },
  },

  dbConf: { 
    stateRecordName: "main",  // a single record in state collection is responsible for state
    middleWareID: process.env.MIDDLEWARE_ID !== undefined ? process.env.MIDDLEWARE_ID : "",
    dbAccessUrl: process.env.MONGO_ACCESS_URL !== undefined ? process.env.MONGO_ACCESS_URL : "",
    envType: process.env.ENV_TYPE,
    // Meh2016 and Meh2018 addresses depending on chain id
    contractAddress: {
      "1": "0x15dbdB25f870f21eaf9105e68e249E0426DaE916",
      "11155111": "0xCedaDc7a2E2291809cB0Cd8A6C092B16CDc7e833",
    },
    meh2018AddressMain: {
      "1": "0xCEf41878Db032586C835eE0890484399402A64f6",
      "11155111": "0x2e3b15B8038406008192d8f855bAD3929AD22123",
    },
    wrapperAddress: {
      // using fake wrapper for mainnet 
      "1": "0xb287dB1734b1BE9Fd681658d7dC3f2169bE9e45c",
      "11155111": "0x42b4411cAA93736C1D30f4b833713Fa65aD4a90a",
    },
    // event names
    newImageEventName: "NewImage",  // 2016 contract
    buySellEventName: "NewAreaStatus",  // 2016 contract
    logAdsEventName: "LogAds",  // 2018 contract
    logBuysEventName: "LogBuys",  // 2018 contract
    transferEventName: "Transfer",  // 2018 contract, wrapper contract
    maxBlocksRetrieved: 499, // alchemy limit is 500 (using 499 to make block number better distinguishable)
    // image downloader params
    imagesBatchSize: 100, // number of ads images downloaded within one cycle
    maxEventsPerSnapshot: 10,  // number of events retrieved per run per snapshot (small values used for testing)
    maxStoredSnapshots: 2, // if more are present in db the earliest will be deleted
    supportedFormats: ["jpg", "png", "gif", "tif"], // , "bmp"] // , "jp2", "jpm", "jpx"]
    nextRetryDelay: 1000 * 60 * 5, // 5 minutes - will retry to download. next attempt will be twice long
    maxNumOfDownloadAttempts: 5,  // number of download attempts for image
    statusCodesAllowingRetry: [408, 502, 503, 504, 429],  // downloader will try to download images again
    thumbnailParams: { width: 400, height: 400 },
    default_bg_path: "./static/bg.png", // path to bg image for pixelmap
    mainLoopIntervalMs: 12000,  // actually a pause between cycles - making it equal to Ethereum block time (12 seconds)
    cfApiToken: process.env.CF_API_TOKEN !== undefined ? process.env.CF_API_TOKEN : "",
    cfNamespaceId: process.env.CF_NAMESPACE_ID !== undefined ? process.env.CF_NAMESPACE_ID : "",
    cfAccountID: process.env.CF_ACCOUNT_ID !== undefined ? process.env.CF_ACCOUNT_ID : "",
    // when creating db, events before backgoundEventsBlockNumber will end up there (2016, 2018 contracts).
    backgoundEventsBlockNumber: {
      "1": 13275305, // 13275305 - paused here 
      // 0xad8c197dac3136385bcbac9f16dc287c3d6f421efa1eaf9c7a5bb122b84bd077, 
      // previous seting - 17362840 (not clear why)
      // see Notion Contracts Activity Periods record 
      "11155111": 5476972,  // doesn't make much sense, it just must be before the infrastructure deployment
    },
  },
}
