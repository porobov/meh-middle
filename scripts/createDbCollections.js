const { DB } = require("../src/db.js")
const hre = require("hardhat");
let db = new DB(hre.config.dbConf)

async function main() {
    await db.connect() 
    /// await db.createEmptyStateRecord()
    const eventName = "NewImage"
    await db.createEmptyEventsCollection(eventName)
    await db.close()
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })