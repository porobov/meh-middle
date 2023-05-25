// fixing smart contract bug. Coordinates may be mixed up
// ignoring mixed coordinates everywhere
const mixedCoordinatesFilter = ev => {
    if (ev.args.fromX) {
        return (ev.args.fromX <= ev.args.toX && ev.args.fromY <= ev.args.toY)
    } else {
        return true
    }
}

// 2016 contract NewAreaStatus. Need only events where price is 0 (block is sold)
const sellEventFilter = ev => {
    if (ev.args.price) {
        return (ev.args.price == 0)
    } else {
        return true
    }
}

const newAreaStatus2016mapper = ev => {
    return {
        ID: ev.blockNumber * 100000 + ev.logIndex,
        fromX: ev.args.fromX,
        fromY: ev.args.fromY,
        toX: ev.args.toX,
        toY: ev.args.toY,
        price: ev.args.price.toString(), // toString here, because values can be too bog for DB
        transactionHash: ev.transactionHash,
        contract: "2016"
    }
}

// 2018
// event LogBuys( uint ID, uint8 fromX, uint8 fromY, uint8 toX, uint8 toY, address newLandlord);
const logBuys2018mapper = ev => {
    return {
        ID: ev.blockNumber * 100000 + ev.logIndex,
        fromX: ev.args.fromX,
        fromY: ev.args.fromY,
        toX: ev.args.toX,
        toY: ev.args.toY,
        address: ev.args.address,
        transactionHash: ev.transactionHash,
        contract: "2018"
    }
}

// event transfer for wrapper from, to, tokenId
const transfer2018mapper = ev => {
    return {
        ID: ev.blockNumber * 100000 + ev.logIndex,
        from: ev.args._from,
        to: ev.args._to,
        tokenId: ev.args._tokenId.toNumber(),
        transactionHash: ev.transactionHash,
        contract: "2018"
    }
}

const newImage2016mapper = ev => {
    return {
        ID: ev.blockNumber * 100000 + ev.logIndex,
        fromX: ev.args.fromX,
        fromY: ev.args.fromY,
        toX: ev.args.toX,
        toY: ev.args.toY,
        adText: ev.args.adText,
        adUrl: ev.args.adUrl,
        imageSourceUrl: ev.args.imageSourceUrl,
        transactionHash: ev.transactionHash,
        numOfTries: 0,  // num of download tries for ad image
        failedToDownLoad: false,  // flag. If image failed to download
        nextTryTimestamp: 0,  // next download attempt timestamp
        downloadTimestamp: 0,  // image download status change timestamp to be precise
        contract: "2016"
    }
}

const logAds2018mapper = ev => {
    return {
        ID: ev.blockNumber * 100000 + ev.logIndex,
        fromX: ev.args.fromX,
        fromY: ev.args.fromY,
        toX: ev.args.toX,
        toY: ev.args.toY,
        adText: ev.args.adText,
        adUrl: ev.args.adUrl,
        imageSourceUrl: ev.args.imageSourceUrl,
        advertiser: ev.args.advertiser,
        transactionHash: ev.transactionHash,
        numOfTries: 0,  // num of download tries for ad image
        failedToDownLoad: false,  // flag. If image failed to download
        nextTryTimestamp: 0,  // next download attempt timestamp
        downloadTimestamp: 0,  // image download status change timestamp to be precise
        contract: "2018"
    }
}

module.exports = {
    mixedCoordinatesFilter,
    sellEventFilter,
    newAreaStatus2016mapper,
    logBuys2018mapper,
    transfer2018mapper,
    newImage2016mapper,
    logAds2018mapper,
}