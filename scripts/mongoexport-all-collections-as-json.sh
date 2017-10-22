#!/bin/bash

mkdir -p _db_dev_backup

DB=$1
COLLECTIONS=$(mongo localhost:27017/$DB --quiet --eval "db.getCollectionNames()" | head -n -1 | tail -n +2 | sed 's/,/ /g' | sed 's/"//g')

for collection in $COLLECTIONS; do
    echo "Exporting $DB/$collection ..."
    echo "mongoexport -d $DB -c $collection -o _db_dev_backup/$collection.json"
    mongoexport -d $DB -c $collection -o _db_dev_backup/$collection.json
done
