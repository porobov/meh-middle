const { MongoClient } = require("mongodb")
const { ImageEditor } = require("./imageEditor.js")
const { logger } = require("./logger.js")

const MODULE_NAME = "db"
// try-catch wrapper
const withErrorHandling = async (fn, fnName) => {
  try {
    const result = await fn()
    return [result, null]
  } catch (error) {
    logger.error(error, { module: MODULE_NAME, function: fnName })
    return [null, error]
  }
}


class DB {

  constructor(conf, chainName="") {
    this.client = new MongoClient(conf.dbAccessUrl)
    this.conf = conf
    this.chainName = chainName
  }

  async connect() {
    const [res, err] = await withErrorHandling(async () => await this.client.connect(), "connect")
    if (this.client && this.client.topology && this.client.topology.isConnected()) {
      this.db = this.client.db(this.chainName)
      // initialize collections
      this.state = this.db.collection("state")
      this.ads = this.db.collection("ads")
      this.buySells = this.db.collection("buySells")
      this.adsSnapshots = this.db.collection("adsSnapshots")
      this.buySellSnapshots = this.db.collection("buySellSnapshots")
      // record id for current state
      this.tempStateId = this.conf.stateRecordName
      this.eventNameToCollection = {
        [this.conf.logAdsEventName]: this.ads,  // 2018 contract
        [this.conf.newImageEventName]: this.ads,  // 2016
        [this.conf.buySellEventName]: this.buySells, // 2016
        [this.conf.logBuysEventName]: this.buySells, // 2018
        [this.conf.transferEventName]: this.buySells, // 2018
        // TODO add wrapper here
      }
      return true
    } else {
      return false
    }
  }

  async close() {
    const [res, err] = await withErrorHandling(async () => await this.client.close(), "close")
  }


  // DB SETUP

  recordNameForEvent(eventName) {
    return "latestBlockFor" + eventName
  }

  getCollectionForEvent(eventName) {
    return this.eventNameToCollection[eventName]
  }
  

  // checking if collection is empty
  async isEmptyCollection(collection) {
    const [res, err] = await withErrorHandling(
      async () => await collection.find().limit(1).toArray(),
      "isEmptyCollection")
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
      [this.recordNameForEvent(this.conf.transferEventName)]: 0,
      [this.recordNameForEvent(this.conf.logAdsEventName)]: 0,
    }
    const p = await this.state.insertOne(emptyStateRecord)
  }

  // collections with unique ID field
  async createEventsCollection(collection) {
    await this.dropCollection(collection)
    logger.info(`Creating collection ${collection.collectionName}`)
    await collection.createIndex({ "ID": 1 }, { unique: true })
  }

  // collections with unique latestEventId field
  async createSnapshotCollection(collection) {
    await this.dropCollection(collection)
    logger.info(`Creating collection ${collection.collectionName}`)
    await collection.createIndex({ "latestEventId": 1 }, { unique: true })
  }

  // snapshot to be returned when there are no snapshots yet
  async putEmptySnapshot(collection) {
    let ie = new ImageEditor({})
    let emptySnapshot = {
      // see snapshot validity check 
      // note that background is created here
      latestEventId: 0, // this is also unique ID of the snapshot
      bigPicUrl: null,
      bigPicBinary: await ie.createBackgroundImage(this.conf.default_bg_path),
      picMapJSON: '{}',
      latestDownloadTimestamp: 0
    }
    const [res, err] = await withErrorHandling(
      async () => await collection.insertOne(emptySnapshot),
      `putEmptySnapshot ${ collection.collectionName } `)
      
    logger.info(`Empty ${ collection.collectionName } record was put into db`)
  }

  async putEmptyAdsSnapshot() {
    await this.putEmptySnapshot(this.adsSnapshots)
  }

  async putEmptyBuySellSnapshot() {
    await this.putEmptySnapshot(this.buySellSnapshots)
  }

  async createDB() {
    await this.createEmptyStateRecord()
    for (const collection of [this.ads, this.buySells]) {
      await this.createEventsCollection(collection)
    }
    for (const collection of [this.adsSnapshots, this.buySellSnapshots]) {
      await this.createSnapshotCollection(collection)
    }
    await this.putEmptyAdsSnapshot()
    await this.putEmptyBuySellSnapshot()
  }

  // Note: 
  // We have Transfer events both in 2018 and 2024 contracts. 
  // They share single latestBlockForEvent record, 
  // which is "latestBlockForTransfer" in "state collection"
  // That's ok. Because we read 2018 contract only when creating DB 
  // after that we get Transfer events only from 2024. 
  // 
  // Be carefull when deploying to testnet. 
  // backgoundEventsBlockNumber in config must equal the block of deployment
  async saveLatestBlockForEvent(eventName, latestBlock) {
    var myquery = { state_id: this.tempStateId };
    var newvalues = { $set: { [this.recordNameForEvent(eventName)]: latestBlock } };
    const [saveResult, err] = await withErrorHandling(
      async () => await this.state.updateOne(myquery, newvalues),
      "saveLatestBlockForEvent")
    if (saveResult && Object.hasOwn(saveResult, 'modifiedCount') && saveResult.modifiedCount == 1) {
      return true
    } else {
      return false
    }
  }

  async getLatestBlockForEvent(eventName) {
    var myquery = { state_id: this.tempStateId };
    // db ensures there's 0 value for the first run
    const [res, err] = await withErrorHandling(
      async () => (
        await this.state.findOne(myquery))[this.recordNameForEvent(eventName)],
        "getLatestBlockForEvent")
    return res  // will return null on error and log error
  }

  // SAVING EVENTS

  // will put events into db
  // Will discard duplicates, but still perform unique insert operation
  async addEvents(decodedEvents, eventName) {
    const collection = this.getCollectionForEvent(eventName)
    const [res, err] = await withErrorHandling(
      async () => await collection.insertMany(decodedEvents, { ordered: false }),
      "_addEvents")
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
    let [res, err] = await withErrorHandling(
      async () => await this.ads
        .find(myquery)
        .limit(this.conf.imagesBatchSize),
        "getAdsNoImages")
    if (res) {
      return res
    } else {
      return []
    }
  }

  // saves downloaded and processed images 
  // only updates as input
  async appendImagesToAds(ads) {
    // prepare bulkwrite array
    let operations = []
    for (const ad of ads) {
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
      [res, err] = await withErrorHandling(
        async () => await this.ads.bulkWrite(operations, { ordered: false }),
        "appendImagesToAds")
    }
    if (res && Object.hasOwn(res, 'modifiedCount') && res.modifiedCount > 0) {
      return res.modifiedCount
    } else {
      return 0
    }
  }

  // SNAPSHOTS

  // retrieves the most recent snapshot before ID
  async _getSnapshotBeforeID(collection, ID) {
    let query = { latestEventId: { $lt: ID } }
    if (ID == 'infinity') {
      query = {}
    }
    const [res, err] = await withErrorHandling(
      async () => await collection.findOne(query, { sort: { latestEventId: -1 } }),
      "_getSnapshotBeforeID")
    return res
  }

  async _getEventsFromID(collection, ID) {
    let query = { ID: { $gt: ID } }
    let options = { sort: { ID: 1 } }
    const [res, err] = await withErrorHandling(
      async () => await collection.find(query, options).limit(this.conf.maxEventsPerSnapshot),
      "_getEventsFromID")
    if (res) {
      return res
    } else {
      return []
    }
  }

  // new snapshot may include newly downloaded images for old ad IDs
  async _saveSnapshot(collection, newSnapshot) {
    logger.debug(`Saving ${collection.collectionName} snapshot`)
    const [res, err] = await withErrorHandling(
      async () => {
        // remove stale snapshot (one in - one out)
        const count = await collection.countDocuments()
        if (count > this.conf.maxStoredSnapshots) {
          logger.debug(`Removed stale snapshot (higher than 0 snapshot)`)
          collection.findOneAndDelete({ latestEventId: { $gt: 0 }}, { sort: { latestEventId: 1 } })
        }
        const filter = { "latestEventId": newSnapshot.latestEventId }
        const update = { $set: newSnapshot } 
        // return await collection.insertOne(newSnapshot)
        return await collection.updateOne(filter, update, { upsert: true })
      },
      "_saveSnapshot")
    if (res && res.acknowledged) {
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
    const [res, err] = await withErrorHandling(
      async () => await this.ads.findOne(query, { sort: { ID: 1 }}),
      "getEarliestAdIdAfterTimestamp")

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
    return this._getEventsFromID(this.buySells, latestTransactionID)
  }

  async saveBuySellSnapshot(newSnapshot) {
    return this._saveSnapshot(this.buySellSnapshots, newSnapshot)
  }

}

module.exports = {
  DB,
}