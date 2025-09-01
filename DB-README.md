# MongoDB Database Operations Guide

## Manage db via ssh

### 1. Create port forwarding
ssh -L 8000:localhost:27018 <user>@<remote-server-IP>

### 2. Use mogo eplorer 
Use port 8000 locally

## Create Database Dump

### 1. Create Dump
```bash
export MONGO_USERNAME=$(grep MONGO_INITDB_ROOT_USERNAME .env | cut -d '=' -f2) && \
export MONGO_PASSWORD=$(grep MONGO_INITDB_ROOT_PASSWORD .env | cut -d '=' -f2) && \
docker exec meh-middle-mongo mongodump \
  --username $MONGO_USERNAME \
  --password $MONGO_PASSWORD \
  --authenticationDatabase admin \
  --out /data/db/mongo_dump
```

### 2. Compress Dump
```bash
docker exec meh-middle-mongo tar -czf /data/db/mongo_dump.tar.gz -C /data/db mongo_dump
```

### 3. Copy to Host
```bash
docker cp meh-middle-mongo:/data/db/mongo_dump.tar.gz ./mongo_dump.tar.gz
```

### 4. Cleanup Container
```bash
docker exec meh-middle-mongo rm -rf /data/db/mongo_dump /data/db/mongo_dump.tar.gz
```

## Send to Server

Transfer the compressed dump to your target server:

```bash
scp mongo_dump.tar.gz user@server:/home/self/meh-middle
```

## Restore Database

### 1. Extract Archive
```bash
mkdir -p temp_dump && tar -xzf mongo_dump.tar.gz -C temp_dump
```

### 2. Copy to Container
```bash
docker cp temp_dump/mongo_dump meh-middle-mongo:/tmp/
```

### 3. Restore Database
```bash
export MONGO_USERNAME=$(grep MONGO_INITDB_ROOT_USERNAME .env | cut -d '=' -f2) && \
export MONGO_PASSWORD=$(grep MONGO_INITDB_ROOT_PASSWORD .env | cut -d '=' -f2) && \
docker exec meh-middle-mongo mongorestore \
  --drop \
  --username "$MONGO_USERNAME" \
  --password "$MONGO_PASSWORD" \
  --authenticationDatabase admin \
  /tmp/mongo_dump
```

### 4. Cleanup Temporary Files
```bash
rm -rf temp_dump
rm mongo_dump.tar.gz
```

## Database Maintenance

### Check Indexes
To verify existing indexes on a collection:

```javascript
db.buySells.getIndexes()
```

### Removing Duplicates by "ID" Field

To remove duplicates while keeping only one document per "ID", use the following MongoDB aggregation operations:

#### 1. Find Duplicate IDs
```javascript
db.buySells.aggregate([
  { 
    $group: { 
      _id: "$ID", 
      count: { $sum: 1 }, 
      docs: { $push: "$_id" } 
    } 
  },
  { 
    $match: { 
      count: { $gt: 1 } 
    } 
  }
])
```

This query will show which "ID" values are duplicated and how many times.

#### 2. Remove Duplicates
For each group of duplicate IDs, remove all but one document. Use this MongoDB shell script:

```javascript
db.buySells.aggregate([
  { 
    $group: { 
      _id: "$ID", 
      count: { $sum: 1 }, 
      docs: { $push: "$_id" } 
    } 
  },
  { 
    $match: { 
      count: { $gt: 1 } 
    } 
  }
]).forEach(function(doc) {
  // Keep the first _id, remove the rest
  doc.docs.slice(1).forEach(function(dupId) {
    db.buySells.deleteOne({ _id: dupId });
  });
});
```

**⚠️ Warning:** This script will permanently delete duplicate documents. Make sure you have a backup before running it.

#### 3. Create Unique Index
After deduplication, create a unique index to prevent future duplicates:

```javascript
db.buySells.createIndex({ ID: 1 }, { unique: true })
```
