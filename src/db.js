const { MongoClient } = require("mongodb")
const chalk = require("chalk")
const { logger } = require("./logger.js")
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
      const [res, err] = await this.tryCatch(
        async () => await this.state.find().toArray())
      if (res.length > 0) {
        logger.info(`Dropping state...`)
        this.state.drop()
      }
      const eventName = "NewImage"
      await this.state.createIndex( { "state_id": 1 }, { unique: true } )
      let emptyStateRecord = {
          "state_id": this.tempStateId,
          [this.recordNameForEvent(eventName)]: 0
      }
      const p = await this.state.insertOne(emptyStateRecord)
    }

    recordNameForEvent(eventName) {
        return "latestBlockFor" + eventName
    }

    async saveLatestBlockForEvent(eventName, latestBlock) {
        var myquery = { state_id: this.tempStateId };
        var newvalues = { $set: { [this.recordNameForEvent(eventName)]: latestBlock} };
        const [ saveResult, err ] = await this.tryCatch(
          async () => await this.state.updateOne(myquery, newvalues))
        if (saveResult && Object.hasOwn(saveResult, 'modifiedCount') && saveResult.modifiedCount == 1) {
          return [true, err]
        } else {
          return [false, err]
        }
    }

    async getLatestBlockForEvent(eventName) {
        var myquery = { state_id: this.tempStateId };
        return await this.tryCatch(
          async () => (await this.state.findOne(myquery))[this.recordNameForEvent(eventName)])
    }

    // Saving events

    async createEmptyEventsCollection(eventName) {
      const [res, err] = await this.tryCatch(
        async () => await this.ads.find().toArray())
      if (res.length > 0) {
        logger.info(`Dropping collection...`)
        this.ads.drop()
      } 
      logger.info(`Creating collection`)
      await this.ads.createIndex( { "ID": 1 }, { unique: true } )
    }

    // returns array
    async addAds(decodedEvents) {
      const [res, err] = await this.tryCatch(
        async () => await this.ads.insertMany(decodedEvents, { ordered: false }))
      if (err && Object.hasOwn(err, 'code') && err.code === 11000) {
        logger.info('Duplicate key error');
      } 
      if (res) {
        const count = Object.hasOwn(res, 'insertedCount') ? res.insertedCount : 0
        return [count, err]
      } else {
        return [0, err]
      }
    }

    async getAdsNoImages() {
      var myquery =  
        {
          $and: [
            { $or:[
              {nextTryTimestamp: {$lt:Date.now()}},
              {nextTryTimestamp: {$exists:false}}]}, 
            { $or:[
              {failedToDownLoad: false },
              {failedToDownLoad: {$exists:false}}]}, 
            { imageForPixelMap: {$exists:false} }
          ]
        }
      let [res, err ] = await this.tryCatch(
        async () => await this.ads
          .find(myquery)
          .limit(IMAGES_BATCH_SIZE)
          .toArray())
      if (res && Array.isArray(res)) {
        return [res, err]
      } else {
        return [[], err]
      }
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
      let [ res, err ] = [ null, null ]
      if (operations.length > 0) {
        [res, err ] = await this.tryCatch(
          async () => await this.ads.bulkWrite(operations, { ordered: false }))
      }
      if (res && Object.hasOwn(res, 'modifiedCount') && res.modifiedCount > 0) {
        return [ res.modifiedCount , err ]
      } else { 
        return [ 0 , err ]
      }
    }

    tryCatch = async (tryer) => {
        try {
          const result = await tryer()
          return [result, null]
        } catch (error) {
          logger.info(chalk.red(" ↓↓↓ Cought error ↓↓↓ "))
          logger.info(error)
          logger.info(chalk.red(" ↑↑↑ Cought error ↑↑↑ "))
          return [null, error]
        }
    }
}

module.exports = {
  DB,
}