const hre = require("hardhat");
const config = hre.config.dbConf

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
        // when wrapper will put ads to 2016 there will be overlap in ids with 2018
        // 2018 Transfer event doesn't have ID field - using logIndex
        // using block number to prevent IDs intersection
        // multiplying by 100000 to prevent intersection and to visually see IDs
        // large number to allow high logIndex
        // means that 100000 events can be thrown within single block with no intersection
        // IDtest: ev.args?.ID ? ev.args.ID.toNumber() : "noID",
        ID: ev.blockNumber * 100000 + ev.logIndex, // WARNING!!! see _buildInputImage in snapshots
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
        price: ev.args.price.toString(), // toString here, because values can be too big for DB
        owner: ev.address,  // only owner can emit events (also filtered by sellEventFilter, also overlayed by 2024 transfer)
        event: config.buySellEventName,
        contract: "2016"
    }
}

const logBuys2018mapper = ev => {
    return {
        ...commonFields(ev),
        ...coordsFields(ev),
        owner: ev.args.address,
        event: config.logBuysEventName,
        contract: "2018"
    }
}

const transferFields = (ev) => {
    return {
        from: ev.args._from || ev.args.from,
        to: ev.args._to || ev.args.to,
        owner: ev.args._to || ev.args.to,  // 2024 overlays 2016 when minting
        tokenId: (ev.args._tokenId || ev.args.tokenId).toNumber(),
        event: config.transferEventName,
    }
}

const transfer2018mapper = ev => {
    return {
        ...commonFields(ev),
        ...transferFields(ev),
        contract: "2018"
    }
}

const transfer2024wrapper = ev => {
    return {
        ...commonFields(ev),
        ...transferFields(ev),
        contract: "2024"
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
        event: config.newImageEventName,
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
        event: config.logAdsEventName,
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
    transfer2024wrapper,
}