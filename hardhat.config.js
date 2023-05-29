require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
// to run for other network or for developement change dbName, contract address
module.exports = {
  
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
  },
  dbConf: { 
    stateRecordName: "main",  // a single record in state collection is responsible for state
    middleWareID: process.env.MIDDLEWARE_ID !== undefined ? process.env.MIDDLEWARE_ID : "", // affects keyName for cloudflare
    dbAccessUrl: process.env.MONGO_ACCESS_URL !== undefined ? process.env.MONGO_ACCESS_URL : "",
    dbName: "MillionEther", // affects keyName for cloudflare
    contractName: "MillionEther",
    contractAddress: "0x15dbdB25f870f21eaf9105e68e249E0426DaE916",
    newImageEventName: "NewImage",
    buySellEventName: "NewAreaStatus",
    imagesBatchSize: 100, // number of ads images downloaded within one cycle
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
    meh2018AddressMain: '0xCEf41878Db032586C835eE0890484399402A64f6',
    backgoundEventsBlockNumber: 17362840, // when creating db, events before this block will end up there (2016, 2018 contracts). 
    meh2018Abi: '[{\"constant\":true,\"inputs\":[{\"name\":\"_interfaceId\",\"type\":\"bytes4\"}],\"name\":\"supportsInterface\",\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_address\",\"type\":\"address\"}],\"name\":\"adminSetMarket\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"x\",\"type\":\"uint8\"},{\"name\":\"y\",\"type\":\"uint8\"}],\"name\":\"getBlockOwner\",\"outputs\":[{\"name\":\"\",\"type\":\"address\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"name\",\"outputs\":[{\"name\":\"\",\"type\":\"string\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"_tokenId\",\"type\":\"uint256\"}],\"name\":\"getApproved\",\"outputs\":[{\"name\":\"\",\"type\":\"address\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_to\",\"type\":\"address\"},{\"name\":\"_tokenId\",\"type\":\"uint256\"}],\"name\":\"approve\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"fromX\",\"type\":\"uint8\"},{\"name\":\"fromY\",\"type\":\"uint8\"},{\"name\":\"toX\",\"type\":\"uint8\"},{\"name\":\"toY\",\"type\":\"uint8\"}],\"name\":\"areaPrice\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"totalSupply\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"InterfaceId_ERC165\",\"outputs\":[{\"name\":\"\",\"type\":\"bytes4\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_from\",\"type\":\"address\"},{\"name\":\"_to\",\"type\":\"address\"},{\"name\":\"_tokenId\",\"type\":\"uint256\"}],\"name\":\"transferFrom\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"\",\"type\":\"address\"}],\"name\":\"balances\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"_owner\",\"type\":\"address\"},{\"name\":\"_index\",\"type\":\"uint256\"}],\"name\":\"tokenOfOwnerByIndex\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_address\",\"type\":\"address\"}],\"name\":\"adminSetAds\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[],\"name\":\"withdraw\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_payer\",\"type\":\"address\"},{\"name\":\"_recipient\",\"type\":\"address\"},{\"name\":\"_amount\",\"type\":\"uint256\"}],\"name\":\"operatorTransferFunds\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[],\"name\":\"unpause\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_from\",\"type\":\"address\"},{\"name\":\"_to\",\"type\":\"address\"},{\"name\":\"_tokenId\",\"type\":\"uint256\"}],\"name\":\"safeTransferFrom\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"rentals\",\"outputs\":[{\"name\":\"\",\"type\":\"address\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"_tokenId\",\"type\":\"uint256\"}],\"name\":\"exists\",\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"_index\",\"type\":\"uint256\"}],\"name\":\"tokenByIndex\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"x\",\"type\":\"uint8\"},{\"name\":\"y\",\"type\":\"uint8\"}],\"name\":\"adminImportOldMEBlock\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"paused\",\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"fromX\",\"type\":\"uint8\"},{\"name\":\"fromY\",\"type\":\"uint8\"},{\"name\":\"toX\",\"type\":\"uint8\"},{\"name\":\"toY\",\"type\":\"uint8\"},{\"name\":\"priceForEachBlockWei\",\"type\":\"uint256\"}],\"name\":\"sellArea\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"_tokenId\",\"type\":\"uint256\"}],\"name\":\"ownerOf\",\"outputs\":[{\"name\":\"\",\"type\":\"address\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_to\",\"type\":\"address\"},{\"name\":\"_blockId\",\"type\":\"uint16\"}],\"name\":\"_mintCrowdsaleBlock\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"fromX\",\"type\":\"uint8\"},{\"name\":\"fromY\",\"type\":\"uint8\"},{\"name\":\"toX\",\"type\":\"uint8\"},{\"name\":\"toY\",\"type\":\"uint8\"},{\"name\":\"imageSource\",\"type\":\"string\"},{\"name\":\"link\",\"type\":\"string\"},{\"name\":\"text\",\"type\":\"string\"}],\"name\":\"placeAds\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"_owner\",\"type\":\"address\"}],\"name\":\"balanceOf\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[],\"name\":\"renounceOwnership\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"market\",\"outputs\":[{\"name\":\"\",\"type\":\"address\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"fromX\",\"type\":\"uint8\"},{\"name\":\"fromY\",\"type\":\"uint8\"},{\"name\":\"toX\",\"type\":\"uint8\"},{\"name\":\"toY\",\"type\":\"uint8\"},{\"name\":\"rentPricePerPeriodWei\",\"type\":\"uint256\"}],\"name\":\"rentOutArea\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"x\",\"type\":\"uint8\"},{\"name\":\"y\",\"type\":\"uint8\"}],\"name\":\"blockID\",\"outputs\":[{\"name\":\"\",\"type\":\"uint16\"}],\"payable\":false,\"stateMutability\":\"pure\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[],\"name\":\"pause\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_address\",\"type\":\"address\"}],\"name\":\"adminSetRentals\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"owner\",\"outputs\":[{\"name\":\"\",\"type\":\"address\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"fromX\",\"type\":\"uint8\"},{\"name\":\"fromY\",\"type\":\"uint8\"},{\"name\":\"toX\",\"type\":\"uint8\"},{\"name\":\"toY\",\"type\":\"uint8\"}],\"name\":\"buyArea\",\"outputs\":[],\"payable\":true,\"stateMutability\":\"payable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"symbol\",\"outputs\":[{\"name\":\"\",\"type\":\"string\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[],\"name\":\"adminRescueFunds\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_to\",\"type\":\"address\"},{\"name\":\"_approved\",\"type\":\"bool\"}],\"name\":\"setApprovalForAll\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"advertiser\",\"type\":\"address\"},{\"name\":\"fromX\",\"type\":\"uint8\"},{\"name\":\"fromY\",\"type\":\"uint8\"},{\"name\":\"toX\",\"type\":\"uint8\"},{\"name\":\"toY\",\"type\":\"uint8\"}],\"name\":\"canAdvertise\",\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"fromX\",\"type\":\"uint8\"},{\"name\":\"fromY\",\"type\":\"uint8\"},{\"name\":\"toX\",\"type\":\"uint8\"},{\"name\":\"toY\",\"type\":\"uint8\"},{\"name\":\"numberOfPeriods\",\"type\":\"uint256\"}],\"name\":\"areaRentPrice\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"ads\",\"outputs\":[{\"name\":\"\",\"type\":\"address\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_from\",\"type\":\"address\"},{\"name\":\"_to\",\"type\":\"address\"},{\"name\":\"_tokenId\",\"type\":\"uint256\"},{\"name\":\"_data\",\"type\":\"bytes\"}],\"name\":\"safeTransferFrom\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"_tokenId\",\"type\":\"uint256\"}],\"name\":\"tokenURI\",\"outputs\":[{\"name\":\"\",\"type\":\"string\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"_owner\",\"type\":\"address\"},{\"name\":\"_operator\",\"type\":\"address\"}],\"name\":\"isApprovedForAll\",\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"fromX\",\"type\":\"uint8\"},{\"name\":\"fromY\",\"type\":\"uint8\"},{\"name\":\"toX\",\"type\":\"uint8\"},{\"name\":\"toY\",\"type\":\"uint8\"},{\"name\":\"numberOfPeriods\",\"type\":\"uint256\"}],\"name\":\"rentArea\",\"outputs\":[],\"payable\":true,\"stateMutability\":\"payable\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"_newOwner\",\"type\":\"address\"}],\"name\":\"transferOwnership\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"isMEH\",\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"name\":\"ID\",\"type\":\"uint256\"},{\"indexed\":false,\"name\":\"fromX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"fromY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"newLandlord\",\"type\":\"address\"}],\"name\":\"LogBuys\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"name\":\"ID\",\"type\":\"uint256\"},{\"indexed\":false,\"name\":\"fromX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"fromY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"sellPrice\",\"type\":\"uint256\"}],\"name\":\"LogSells\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"name\":\"ID\",\"type\":\"uint256\"},{\"indexed\":false,\"name\":\"fromX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"fromY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"rentPricePerPeriodWei\",\"type\":\"uint256\"}],\"name\":\"LogRentsOut\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"name\":\"ID\",\"type\":\"uint256\"},{\"indexed\":false,\"name\":\"fromX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"fromY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"numberOfPeriods\",\"type\":\"uint256\"},{\"indexed\":false,\"name\":\"rentedFrom\",\"type\":\"uint256\"}],\"name\":\"LogRents\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"name\":\"ID\",\"type\":\"uint256\"},{\"indexed\":false,\"name\":\"fromX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"fromY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toX\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"toY\",\"type\":\"uint8\"},{\"indexed\":false,\"name\":\"imageSourceUrl\",\"type\":\"string\"},{\"indexed\":false,\"name\":\"adUrl\",\"type\":\"string\"},{\"indexed\":false,\"name\":\"adText\",\"type\":\"string\"},{\"indexed\":true,\"name\":\"advertiser\",\"type\":\"address\"}],\"name\":\"LogAds\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"name\":\"payerOrPayee\",\"type\":\"address\"},{\"indexed\":false,\"name\":\"balanceChange\",\"type\":\"int256\"}],\"name\":\"LogContractBalance\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":false,\"name\":\"newAddress\",\"type\":\"address\"},{\"indexed\":false,\"name\":\"moduleName\",\"type\":\"string\"}],\"name\":\"LogModuleUpgrade\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[],\"name\":\"Pause\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[],\"name\":\"Unpause\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"name\":\"previousOwner\",\"type\":\"address\"}],\"name\":\"OwnershipRenounced\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"name\":\"previousOwner\",\"type\":\"address\"},{\"indexed\":true,\"name\":\"newOwner\",\"type\":\"address\"}],\"name\":\"OwnershipTransferred\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"name\":\"_from\",\"type\":\"address\"},{\"indexed\":true,\"name\":\"_to\",\"type\":\"address\"},{\"indexed\":true,\"name\":\"_tokenId\",\"type\":\"uint256\"}],\"name\":\"Transfer\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"name\":\"_owner\",\"type\":\"address\"},{\"indexed\":true,\"name\":\"_approved\",\"type\":\"address\"},{\"indexed\":true,\"name\":\"_tokenId\",\"type\":\"uint256\"}],\"name\":\"Approval\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"name\":\"_owner\",\"type\":\"address\"},{\"indexed\":true,\"name\":\"_operator\",\"type\":\"address\"},{\"indexed\":false,\"name\":\"_approved\",\"type\":\"bool\"}],\"name\":\"ApprovalForAll\",\"type\":\"event\"}]'
  },
}
