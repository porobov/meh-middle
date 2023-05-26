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

const commonFields = (ev) => {
    return {
        ID: ev.blockNumber * 100000 + ev.logIndex,
        transactionHash: ev.transactionHash
    }
}

const coordsFields = (ev) => {
    return {
        fromX: ev.args.fromX,
        fromY: ev.args.fromY,
        toX: ev.args.toX,
        toY: ev.args.toY,
    }
}

// Ownership

const newAreaStatus2016mapper = ev => {
    return {
        ...commonFields(ev),
        ...coordsFields(ev),
        price: ev.args.price.toString(), // toString here, because values can be too bog for DB
        contract: "2016"
    }
}

const logBuys2018mapper = ev => {
    return {
        ...commonFields(ev),
        ...coordsFields(ev),
        address: ev.args.address,
        contract: "2018"
    }
}

const transfer2018mapper = ev => {
    return {
        ...commonFields(ev),
        from: ev.args._from,
        to: ev.args._to,
        tokenId: ev.args._tokenId.toNumber(),
        contract: "2018"
    }
}

// ADS

// ads common

const adParamsFields = (ev) => {
    return {
        adText: ev.args.adText,
        adUrl: ev.args.adUrl,
        imageSourceUrl: ev.args.imageSourceUrl,
    }
}

const adDownloadFields = () => {
    return {
        numOfTries: 0,  // num of download tries for ad image
        failedToDownLoad: false,  // flag. If image failed to download
        nextTryTimestamp: 0,  // next download attempt timestamp
        downloadTimestamp: 0,  // image download status change timestamp to be precise
    }
}

// ads events mappers

const newImage2016mapper = ev => {
    return {
        ...commonFields(ev),
        ...coordsFields(ev),
        ...adParamsFields(ev), 
        ...adDownloadFields(),
        contract: "2016"
    }
}

const logAds2018mapper = ev => {
    return {
        ...commonFields(ev),
        ...coordsFields(ev),
        ...adParamsFields(ev), 
        ...adDownloadFields(),
        advertiser: ev.args.advertiser,
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