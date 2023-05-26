const { DB } = require("./src/db.js")
const hre = require("hardhat")
const { logger } = require("./src/logger.js")
const { mainLoop } = require("./src/mainLoop.js")

// config
const config = hre.config.dbConf
const MAIN_LOOP_INTERVAL_MS = config.mainLoopIntervalMs

let db = new DB(config)

let cancelNextCycle = false
let isExecuting = false
async function main() {
    return new Promise(async (resolve) => {
 
    logger.info(`STARTING APP (JUST LOGGING AS ERROR. ALL FINE)`)  // logging as error to see it in telegram
    // register SIGINT event

    process.on('SIGINT', async () => {
    logger.info('Terminating...Wait for \"terminated\" in logs')
        if (isExecuting) {
            cancelNextCycle = true
        } else {
            resolve()
        }
    })

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
  .then(() => {  console.log("Terminated safely. CLI is clear"); process.exit(0) })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

