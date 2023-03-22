const { MongoClient } = require("mongodb")

class DB {

    constructor(url) {
        this.client = new MongoClient(url)
    }

    async connect(dbName) {
        const [res, err] = await this.tryCatch(() => this.client.connect())
        console.log(err)
        console.log("Connected correctly to server")
        this.db = this.client.db(dbName)
        this.col = this.db.collection("people")
    }
    
    async close() {
        await this.client.close()
    }

    async saveLatestBlockForEvent(eventName, latestBlock) {
        let personDocument = {
            "name": { "first": "Alan", "last": "Turing" },
            "birth": new Date(1912, 5, 23), // May 23, 1912                                                                                                                                 
            "death": new Date(1954, 5, 7),  // May 7, 1954                                                                                                                                  
            "contribs": ["Turing machine", "Turing test", "Turingery"],
            "views": 1250000
        }
        // Insert a single document, wait for promise so we can read it back
        const p = await this.col.insertOne(personDocument)
    }

    async getLatestBlockForEvent(eventName) {
        const myDoc = await this.col.findOne()
        // Print to the console
        console.log(myDoc)
    }

    tryCatch = async (tryer) => {
        try {
          const result = await tryer()
          return [result, null]
        } catch (error) {
          return [null, error]
        }
    }

    // finally {
    //     await client.close()
    // }
}

module.exports = {
  DB
}