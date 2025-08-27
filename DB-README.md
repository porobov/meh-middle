## Check if ID is unique
db.buySells.getIndexes()

## Removing Duplicates by "ID" Field

To remove duplicates, keeping only one document per "ID", you can use aggregation with a script in the mongo shell:

1. Find Duplicate IDs:
```javascript
db.buySells.aggregate([
  { $group: { _id: "$ID", count: { $sum: 1 }, docs: { $push: "$_id" } } },
  { $match: { count: { $gt: 1 } } }
])
```

This shows which "ID"s are duplicated.

2. Remove Duplicates:
For each group of duplicate IDs, remove all but one. Use the following mongo shell JS script:
```javascript
db.buySells.aggregate([
  { $group: { _id: "$ID", count: { $sum: 1 }, docs: { $push: "$_id" } } },
  { $match: { count: { $gt: 1 } } }
]).forEach(function(doc) {
  // Keep the first _id, remove the rest
  doc.docs.slice(1).forEach(function(dupId) {
    db.buySells.deleteOne({ _id: dupId });
  });
});
```

This script keeps one document for each "ID" and deletes the rest.

3. Create Unique Index:
After deduplication, create the unique index:
```javascript
db.buySells.createIndex({ ID: 1 }, { unique: true })
```
