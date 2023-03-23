const { MongoClient } = require("mongodb")

class DB {

    constructor(conf) {
        this.client = new MongoClient(conf.dbAccessUrl)
        this.conf = conf
    }

    async connect(dbName) {
        const [res, err] = await this.tryCatch(() => this.client.connect())
        console.log(err)
        console.log("Connected correctly to server")
        this.db = this.client.db(this.conf.dbName)
        this.col = this.db.collection("people")
        this.state = this.db.collection("state")
        this.tempStateId = this.conf.stateRecordName
    }
    
    async close() {
        await this.client.close()
    }

    // State

    // creating empty one for the first db setup
    async createEmptyStateRecord() {
        await this.state.createIndex( { "state_id": 1 }, { unique: true } )
        let emptyStateRecord = {
            "state_id": this.tempStateId,
            "latestNewImageEventBlock": 1250000
        }
        // Insert a single document, wait for promise so we can read it back
        const p = await this.state.insertOne(emptyStateRecord)
    }

    async recordNameForEvent(eventName) {
        return "latestBlockFor" + eventName
    }
    async saveLatestBlockForEvent(eventName, latestBlock) {
        var myquery = { state_id: this.tempStateId };
        var newvalues = { $set: { [this.recordNameForEvent(eventName)]: latestBlock} };
        this.state.updateOne(myquery, newvalues)
    }

    async getLatestBlockForEvent(eventName) {
        var myquery = { state_id: this.tempStateId };
        const stateRecord = await this.state.findOne(myquery)
        console.log(stateRecord[this.recordNameForEvent(eventName)])
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