# Million ether homepage middleware

## Create DB:
docker run --name some-mongo -v ./db-data:/data/db -d -p 27017:27017 mongo:latest
npx hardhat run scripts/createDbCollections.js

## Run
npx hardhat run index.js --network readMain
