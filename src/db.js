const { MongoClient } = require("mongodb")
const chalk = require("chalk")
const { logger } = require("./logger.js")
IMAGES_BATCH_SIZE = 2

// try-catch wrapper
tryCatch = async (tryer) => {
  try {
    const result = await tryer()
    return [result, null]
  } catch (error) {
    logger.info(chalk.red(" ↓↓↓ Cought error ↓↓↓ "))  // TODO remove this??
    logger.info(error)
    logger.info(chalk.red(" ↑↑↑ Cought error ↑↑↑ "))
    return [null, error]
  }
}


class DB {

    constructor(conf) {
        this.client = new MongoClient(conf.dbAccessUrl)
        this.conf = conf
    }

  async connect(dbName) {
    const [res, err] = await this.tryCatch(async () => await this.client.connect())
    if (!err) {
      this.db = this.client.db(this.conf.dbName)
      // initialize collections
      this.state = this.db.collection("state")
      this.ads = this.db.collection("ads")
      this.buySells = this.db.collection("buySells")
      this.adsSnapshots = this.db.collection("adsSnapshots")
      this.buySellSnapshots = this.db.collection("buySellSnapshots")
      // record id for current state
      this.tempStateId = this.conf.stateRecordName
    }
  }
    
    async close() {
        const [res, err] = await this.tryCatch(async () => await this.client.close())
    }


    // DB SETUP

    // checking if collection is empty
    async isEmptyCollection(collection) {
      const [res, err] = await this.tryCatch(
        async () => await collection.find().limit(1).toArray())
      if (res.length > 0) {
        return true
      } else {
        return false
      }
    }

    // drop collection if it exists
    async dropCollection(collection) {
      if ( !(await this.isEmptyCollection(collection)) ) {
        collection.drop()
        logger.info(`Dropped collection ${ collection.name }`) // TODO find .name method
      }
    }

    // creating empty one for the first db setup
    async createEmptyStateRecord() {
      await this.dropCollection(this.state)
      await this.state.createIndex( { "state_id": 1 }, { unique: true } )
      let emptyStateRecord = {
          "state_id": this.tempStateId,
          [this.recordNameForEvent(this.conf.newImageEventName)]: 0,
          [this.recordNameForEvent(this.conf.buySellEventName)]: 0,
      }
      const p = await this.state.insertOne(emptyStateRecord)
    }

    async createCollectionWithUniqueID(collection) {
      await this.dropCollection(this.ads)
      logger.info(`Creating collection ${ collection.name }`)  // TODO find name
      await this.ads.createIndex( { "ID": 1 }, { unique: true } )
    }

    async createDB() {
      await this.createEmptyStateRecord()
      for (const collection of [this.ads, this.buySells, this.adsSnapshots, this.buySellSnapshots]) {
        await this.createCollectionWithUniqueID(collection)
      }
      await this.flagDbCreation()
    }

    async saveLatestBlockForEvent(eventName, latestBlock) {
        var myquery = { state_id: this.tempStateId };
        var newvalues = { $set: { [this.recordNameForEvent(eventName)]: latestBlock} };
        const [ saveResult, err ] = await this.tryCatch(
          async () => await this.state.updateOne(myquery, newvalues))
        if (saveResult && Object.hasOwn(saveResult, 'modifiedCount') && saveResult.modifiedCount == 1) {
          return true
        } else {
          return false
        }
    }

  async getLatestBlockForEvent(eventName) {
    var myquery = { state_id: this.tempStateId };
    // db ensures there's 0 value for the first run
    const [res, err] = await this.tryCatch(
      async () => (await this.state.findOne(myquery))[this.recordNameForEvent(eventName)])
    return res  // will return null on error and log error
  }

    // SAVING EVENTS

    async addAdsEvents(decodedEvents) {
      return await _addEvents(decodedEvents, this.ads)
    }

    async addBuySellEvents(decodedEvents) {
      return await _addEvents(decodedEvents, this.buySells)
    }

    // will put events into db
    async _addEvents(decodedEvents, collection) {
      const [res, err] = await this.tryCatch(
        async () => await collection.insertMany(decodedEvents, { ordered: false }))
      if (err && Object.hasOwn(err, 'code') && err.code === 11000) {
        logger.info('Duplicate key error');
      } 
      if (res) {
        const count = Object.hasOwn(res, 'insertedCount') ? res.insertedCount : 0
        return count
      } else {
        return 0
      }
    }

    // PREPARE DATA FOR ADS SNAPSHOT

    // returns ads with no downloaded images 
    async getAdsNoImages() {
      // TODO return cursor
      // TODO if error return empty array and log error here
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
          .limit(this.conf.imagesBatchSize))
      if (res) {
        return res
      } else {
        return []
      }
    }

    // saves downloaded and processed images 
    async appendImagesToAds(ads) {
      // TODO return only result. log error here
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


    // CONSTRUCT ADS SNAPSHOT

    async getAdsSnapshotBeforeID('infinity')
    async getEarliestAdIdAfterTimestamp( adsSnapshot.getLatestAdDownloadTimestamp()
    async getAdsFromID(adsSnapshot.getLatestAdID())
    async saveAdsSnapshot(newSnapshot)


    // CONSTRUCT BUY SELL SNAPSHOT 

    async getLatestBuySellSnapshot()
    async getTransactionsFromID(buySellSnapshot.getLatestTransactionID())
    async saveBuySellSnapshot(newSnapshot)
    async getAdsSnapshotBeforeID('infinity')

// TODO tidy up snapshot records (keep only some limited tail)
}

module.exports = {
  DB,
}