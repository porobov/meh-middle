const { DB } = require("../src/db.js")
const hre = require("hardhat");
let db = new DB(hre.config.dbConf)

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