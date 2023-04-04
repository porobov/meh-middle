const { MongoClient } = require("mongodb")
IMAGES_BATCH_SIZE = 2

class DB {

    constructor(conf) {
        this.client = new MongoClient(conf.dbAccessUrl)
        this.conf = conf
    }

    async connect(dbName) {
        const [res, err] = await this.tryCatch(async () => await this.client.connect())
        if (!err) {
          this.db = this.client.db(this.conf.dbName)
          this.col = this.db.collection("people")
          this.state = this.db.collection("state")
          this.ads = this.db.collection("ads")
          this.tempStateId = this.conf.stateRecordName
        }
    }
    
    async close() {
        const [res, err] = await this.tryCatch(async () => await this.client.close())
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
        return await this.tryCatch(
          async () => await this.state.updateOne(myquery, newvalues))
    }

    async getLatestBlockForEvent(eventName) {
        var myquery = { state_id: this.tempStateId };
        return await this.tryCatch(
          async () => await this.state.findOne(myquery)[this.recordNameForEvent(eventName)])
    }

    // Saving events

    async createEmptyEventsCollection(eventName) {
        await this.ads.createIndex( { "ID": 1 }, { unique: true } )
    }

    async addAds(decodedEvents) {
      const [res, err] = await this.tryCatch(
        async () => await this.ads.insertMany(decodedEvents, { ordered: false }))
      if (err && Object.hasOwn(err, 'code') && err.code === 11000) {
        console.log('Duplicate key error');
      } 
      return [res, err]
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
      let projection = { numOfTries: 1, imageSourceUrl: 1, ID: 1 }
      let cursor = this.ads.find(myquery).project(projection).limit(IMAGES_BATCH_SIZE)
      return await this.tryCatch(async () => await cursor.toArray())
    }

    async appendImagesToAds(ads) {
      // prepare bulkwrite array
      let operations = []
      for (ad of ads) {
        operations.push({ updateOne: {
              "filter": { ID: ad.ID},
              "update": { $set: ad.updates }
            }
          })
      }
      // bulk write
      if (operations.length > 0) {
        return await this.tryCatch(
          async () => await this.ads.bulkWrite(operations, { ordered: false }))
      } else { 
        return [ null, null ]
      }
    }

    tryCatch = async (tryer) => {
        try {
          const result = await tryer()
          return [result, null]
        } catch (error) {
          console.log(error)
          return [null, error]
        }
    }
}

module.exports = {
  DB,
}