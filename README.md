# Million ether homepage middleware

## Create DB:
**Run Mongo**
See docker-compose.yaml example in root dir. Credentials in secrets (mongo for meh)
`sudo docker compose up --build -d`

**Create db if starting new**
Will delete current DB
`npx hardhat run scripts/createDbCollections.js --network readMain`

## Run
**Locally**
`npx hardhat run index.js --network readMain`

**Running on server with pm2**
Increase kill-timeout to shutdown gracefully:
`pm2 start meh-middle-testnet.sh --kill-timeout 5000`
See logs here:
`$HOME/.pm2/logs/`

## Naming DBs and keys for Cloudlfare KV storage
- saves to DB named after network in use (e.g. mainnet). Uses hardhat config for names
- publishes to KV storage with CF_NAMESPACE_ID (from .env)
- the key name is constructed as CHAIN_NAME + "-" + ENV_TYPE (e.g. mainnet-public)
- CF worker makes that KV available 