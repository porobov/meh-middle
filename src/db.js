const { MongoClient } = require("mongodb")
IMAGES_BATCH_SIZE = 10

class DB {

    constructor(conf) {
        this.client = new MongoClient(conf.dbAccessUrl)
        this.conf = conf
    }

    async connect(dbName) {
        const [res, err] = await this.tryCatch(async () => await this.client.connect())
        console.log("error:", err)  // TODO manage errors correctly
        this.db = this.client.db(this.conf.dbName)
        this.col = this.db.collection("people")
        this.state = this.db.collection("state")
        this.ads = this.db.collection("ads")
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
        const p = await this.state.insertOne(emptyStateRecord)
    }

    async recordNameForEvent(eventName) {
        return "latestBlockFor" + eventName
    }

    async saveLatestBlockForEvent(eventName, latestBlock) {
        var myquery = { state_id: this.tempStateId };
        var newvalues = { $set: { [this.recordNameForEvent(eventName)]: latestBlock} };
        await this.state.updateOne(myquery, newvalues)
    }

    async getLatestBlockForEvent(eventName) {
        var myquery = { state_id: this.tempStateId };
        const stateRecord = await this.state.findOne(myquery)
        return stateRecord[this.recordNameForEvent(eventName)]
    }

    // Saving events

    async createEmptyEventsCollection(eventName) {
        // TODO delete if exists
        await this.ads.createIndex( { "ID": 1 }, { unique: true } )
    }

    // TODO manage errors correctly
    async addAds(decodedEvents) {
        try {
            const result = await this.ads.insertMany(decodedEvents, { ordered: false })
            return result
          } catch (error) {
            if (error.code === 11000) {
              console.log('Duplicate key error');
            } else {
              console.log(error);
            }
            return 0
          }   
    }

    async getAdsNoImages() {
      var myquery =  
        {
          $and: [
            { $or:[
              {nextTryTimestamp: {$gt:Date.now()}},
              {nextTryTimestamp: {$exists:false}}]}, 
            { $or:[
              {failedToDownLoad: false },
              {failedToDownLoad: {$exists:false}}]}, 
            { imageThumb: null }
          ]
        }
      
      let cursor = this.ads.find(myquery).limit(IMAGES_BATCH_SIZE)
      return await cursor.toArray()
    }

    async appendImagesToAds(ads) {
      
    }
    // Allowed error codes ECONNREFUSED 
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
  DB,
}