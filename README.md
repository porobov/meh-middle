# Million ether homepage middleware

## Create DB:
docker run --name some-mongo -v ./db-data:/data/db -d -p 27017:27017 mongo:latest
npx hardhat run scripts/createDbCollections.js --network readMain

## Run
npx hardhat run index.js --network readMain

## Naming DBs and keys for Cloudlfare KV storage
- saves to DB named after network in use (e.g. mainnet). Uses hardhat config for names
- publishes to KV with CF_NAMESPACE_ID (from .env)
- the key name is constructed as CHAIN_NAME + "-" + ENV_TYPE (e.g. mainnet-public)
- CF worker makes that KV available 