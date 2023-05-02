const { MongoClient } = require("mongodb")
const chalk = require("chalk")
const { logger } = require("./logger.js")

// try-catch wrapper
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


class DB {

  constructor(conf) {
    this.client = new MongoClient(conf.dbAccessUrl)
    this.conf = conf
  }

  async connect() {
    const [res, err] = await tryCatch(async () => await this.client.connect())
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
    const [res, err] = await tryCatch(async () => await this.client.close())
  }


  // DB SETUP

  recordNameForEvent(eventName) {
    return "latestBlockFor" + eventName
  }

  // checking if collection is empty
  async isEmptyCollection(collection) {
    const [res, err] = await tryCatch(
      async () => await collection.find().limit(1).toArray())
    if (res.length == 0) {
      return true
    } else {
      return false
    }
  }

  // drop collection if it exists
  async dropCollection(collection) {
    if (!(await this.isEmptyCollection(collection))) {
      collection.drop()
      logger.info(`Dropped collection ${collection.collectionName}`) 
    }
  }

  // creating empty one for the first db setup
  async createEmptyStateRecord() {
    await this.dropCollection(this.state)
    await this.state.createIndex({ "state_id": 1 }, { unique: true })
    let emptyStateRecord = {
      "state_id": this.tempStateId,
      [this.recordNameForEvent(this.conf.newImageEventName)]: 0,
      [this.recordNameForEvent(this.conf.buySellEventName)]: 0,
    }
    const p = await this.state.insertOne(emptyStateRecord)
  }

  async createCollectionWithUniqueID(collection) {
    await this.dropCollection(collection)
    logger.info(`Creating collection ${collection.collectionName}`)
    await this.ads.createIndex({ "ID": 1 }, { unique: true })
  }

  // snapshot to be returned when there are no snapshots yet
  async putEmptyAdsSnapshot() {
    let emptySnapshot = {
      // also see snapshot validity check 
      latestEventId: 0, // this is also unique ID of the snapshot
      bigPicUrl: null,
      bigPicBinary: null,
      linksMapJSON: '[]'
    }
    const [res, err] = await tryCatch(
      async () => await this.adsSnapshots.insertOne(emptySnapshot))
    logger.info(`Empty Ads snaphot was recorded to db`)
  }

  async putEmptyBuySellSnapshot() {
    let emptySnapshot = {
      // also see snapshot validity check 
      latestTransactionID: 0,
      ownershipMapJSON: '[]'
    }
    const [res, err] = await tryCatch(
      async () => await this.buySellSnapshots.insertOne(emptySnapshot))
    logger.info(`Empty BuySell snaphot was recorded to db`)
  }

  async createDB() {
    await this.createEmptyStateRecord()
    for (const collection of [this.ads, this.buySells, this.adsSnapshots, this.buySellSnapshots]) {
      await this.createCollectionWithUniqueID(collection)
    }
    await this.putEmptyAdsSnapshot()
    await this.putEmptyBuySellSnapshot()
  }

  async saveLatestBlockForEvent(eventName, latestBlock) {
    var myquery = { state_id: this.tempStateId };
    var newvalues = { $set: { [this.recordNameForEvent(eventName)]: latestBlock } };
    const [saveResult, err] = await tryCatch(
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
    const [res, err] = await tryCatch(
      async () => (await this.state.findOne(myquery))[this.recordNameForEvent(eventName)])
    return res  // will return null on error and log error
  }

  // SAVING EVENTS

  async addAdsEvents(decodedEvents) {
    return await this._addEvents(decodedEvents, this.ads)
  }

  async addBuySellEvents(decodedEvents) {
    return await this._addEvents(decodedEvents, this.buySells)
  }

  // will put events into db
  async _addEvents(decodedEvents, collection) {
    const [res, err] = await tryCatch(
      async () => await collection.insertMany(decodedEvents, { ordered: false }))
    if (err && Object.hasOwn(err, 'code') && err.code === 11000) {
      logger.info('Duplicate key error');
    }
    if (res && Object.hasOwn(res, 'insertedCount')) {
      return res.insertedCount
    } else {
      return 0
    }
  }

  // PREPARE DATA FOR ADS SNAPSHOT

  // returns ads with no downloaded images 
  async getAdsNoImages() {
    var myquery =
    {
      $and: [
        {
          $or: [
            { nextTryTimestamp: { $lt: Date.now() } },
            { nextTryTimestamp: { $exists: false } }]
        },
        {
          $or: [
            { failedToDownLoad: false },
            { failedToDownLoad: { $exists: false } }]
        },
        { imageForPixelMap: { $exists: false } }
      ]
    }
    let [res, err] = await tryCatch(
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
    // prepare bulkwrite array
    let operations = []
    for (ad of ads) {
      operations.push({
        updateOne: {
          "filter": { ID: ad.ID },
          "update": { $set: ad.updates }
        }
      })
    }
    // bulk write
    let [res, err] = [null, null]
    if (operations.length > 0) {
      [res, err] = await tryCatch(
        async () => await this.ads.bulkWrite(operations, { ordered: false }))
    }
    if (res && Object.hasOwn(res, 'modifiedCount') && res.modifiedCount > 0) {
      return res.modifiedCount
    } else {
      return 0
    }
  }

  // SNAPSHOTS

  async _getSnapshotBeforeID(collection, ID) {
    let query = { latestEventId: { $lt: ID } }
    if (adsID == 'infinity') {
      query = { $query: {}, $orderby: { latestEventId: -1 } }
    }
    const [res, err] = await tryCatch(
      async () => await collection.findOne(query))
    return res
  }

  async _getEventsFromID(collection, ID) {
    let query = { ID: { $gt: ID } }
    let fullQuery = { $query: query, $orderby: { ID: 1 } }
    const [res, err] = await tryCatch(
      async () => await collection.find(fullQuery))
    if (res) {
      return res
    } else {
      return []
    }
  }

  async _saveSnapshot(collection, newSnapshot) {
    const [res, err] = await tryCatch(
      async () => {
        // remove stale snapshot (one in - one out)
        const count = await collection.countDocuments()
        if (count > this.conf.maxStoredSnapshots) {
          collection.findOneAndDelete({}, { sort: { latestEventId: 1 } })
        }
        return await collection.insertOne(newSnapshot)
      })
    if (res && Object.hasOwn(res, 'insertedCount') && res.insertedCount == 1) {
      return true
    } else {
      return false
    }
  }

  // CONSTRUCT ADS SNAPSHOT

  // get ads snapshot before ad ID
  // snapshots have id of latest included events
  async getAdsSnapshotBeforeID(adsID) {
    return this._getSnapshotBeforeID(this.adsSnapshots, adsID)
  }

  // finds the earliest ad Id after provided image download timestamp
  // is required to add laggards to snaphot (images that were downloaded on retries)
  async getEarliestAdIdAfterTimestamp(latestAdDownloadTimestamp) {
    let query = { downloadTimestamp: { $gt: latestAdDownloadTimestamp } }
    let fullQuery = { $query: query, $orderby: { ID: 1 } }
    const [res, err] = await tryCatch(
      async () => await this.ads.findOne(fullQuery))

    // findOne will return null if there's no match
    if (res && Object.hasOwn(res, 'ID')) {
      return res.ID
    } else {
      return null
    }
   }

  // retrieve ads starting from ID
  async getAdsFromID(ID) {
    return this._getEventsFromID(this.ads, ID)
  }

  async saveAdsSnapshot(newSnapshot) { 
    return this._saveSnapshot(this.adsSnapshots, newSnapshot)
  }

  // CONSTRUCT BUY SELL SNAPSHOT 

  async getLatestBuySellSnapshot() {
    return this._getSnapshotBeforeID(this.buySellSnapshots, 'infinity')
  }

  async getTransactionsFromID(latestTransactionID) {
    return this._getEventsFromID(this.ads, latestTransactionID)
  }

  async saveBuySellSnapshot(newSnapshot) {
    return this._saveSnapshot(this.buySellSnapshots, newSnapshot)
  }

}

module.exports = {
  DB,
}