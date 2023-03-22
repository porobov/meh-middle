const { DB } = require("../src/db.js")
const hre = require("hardhat");
let db = new DB(hre.config.dbAccessUrl)

async function main() {
    await db.connect(hre.config.dbName) 
    await db.createEmptyStateRecord()
    await db.close()
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })