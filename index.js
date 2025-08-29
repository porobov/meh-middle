require("dotenv").config();
const { DB } = require("./src/db.js")
const { logger } = require("./src/logger.js")
const { mainLoop } = require("./src/mainLoop.js")
const { networks } = require("./hardhat.config.js")
const { dbConf } = require("./hardhat.config.js")


// get chainName from network
const args = process.argv.slice(2)
const networkArg = args.find(arg => arg.startsWith('--network='))
const network = networkArg ? networkArg.split('=')[1] : null

if (network) {
    if (networks[network]) {
        logger.info(`Network specified: ${network}`)
    } else {
        logger.error(`Network ${network} not found in hardhat.config.js`)
        process.exit(1)
    }
} else {
    logger.error("Network not specified")
    process.exit(1)
}
const chainName = networks[network].chainName

// config
const config = dbConf
const MAIN_LOOP_INTERVAL_MS = config.mainLoopIntervalMs
const MODULE_NAME = 'index'

let db = new DB(config, chainName)

let cancelNextCycle = false
let isExecuting = false
async function main() {
    return new Promise(async (resolve) => {
 
    logger.info(`STARTING APP (JUST LOGGING AS ERROR. ALL FINE)`)  // logging as error to see it in telegram
    // register SIGINT event

    process.on('SIGINT', async () => {
    logger.info('Terminating...Wait for \"Terminated safely...\" in terminal')
        if (isExecuting) {
            cancelNextCycle = true
        } else {
            resolve()
        }
    })

    // params check
    if (
        (chainName == "testnet" || chainName == "localhost") 
        && config.envType == "production"
    ) {
        logger.error("Wrong config. Testnet can only go with preview env type")
    }

    async function interval() {
        try {
            isExecuting = true
            logger.debug(`================= STARTING NEW CYCLE =================`)
            if ( await db.connect() ) {
                await mainLoop(db)
            }
        } catch (e) {
            throw e
        } finally {
            await db.close()
            isExecuting = false
            logger.debug(`================= CLOSING DB. NEXT CYCLE IN ${ MAIN_LOOP_INTERVAL_MS } ms =================`)
            if ( cancelNextCycle ) {
                resolve()
            } else {
                setTimeout(interval, MAIN_LOOP_INTERVAL_MS)
            }
        }
    }

    await interval()
    })

}

main()
  .then(() => {  logger.info("Terminated safely. CLI is clear"); process.exit(0) })
  .catch((error) => {
    logger.error(error, { module: MODULE_NAME })
    process.exit(1);
  });

