const { DB } = require("../src/db.js")
const hre = require("hardhat");
let db = new DB(hre.config.dbConf)

async function main() {
  try {
    if (await db.connect()) {
      const previousBSSnapshot = await db.getLatestBuySellSnapshot()
      let previousSnapshot = await db.getAdsSnapshotBeforeID('infinity')
      console.log(previousBSSnapshot)
      console.log(previousSnapshot.latestEventId)
    }
  } catch (e) {
    throw e
  } finally {
    await db.close()
  }
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })