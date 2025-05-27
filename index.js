const { DB } = require("./src/db.js")
const hre = require("hardhat")
const { logger } = require("./src/logger.js")
const { mainLoop } = require("./src/mainLoop.js")

// config
const config = hre.config.dbConf
const MAIN_LOOP_INTERVAL_MS = config.mainLoopIntervalMs
const MODULE_NAME = 'index'

let db = new DB(config)

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
        (hre.network.config.chainName == "testnet" || hre.network.config.chainName == "localhost") 
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

