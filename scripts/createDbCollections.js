// run like this
// npx hardhat run scripts/createDbCollections.js --network readMain

const { DB } = require("../src/db.js")
const hre = require("hardhat");

let db = null
const config = hre.config.dbConf
try {
  db = new DB(config)
} catch(e) {
  console.log("Error while creating DB instance", e)
}

async function main() {
  try {
    if (await db.connect()) {
      await db.createDB()
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