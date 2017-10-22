#!/bin/bash


DB=$1

echo "Droping $DB database..."
echo "mongo shooting-stars-dev --eval 'db.dropDatabase();'"
mongo shooting-stars-dev --eval 'db.dropDatabase();'

for f in $(ls -1 _db_dev_backup); do
    c="${f%%.*}"
    echo "Importing $DB/$c ..."
    echo "mongoimport -d $DB -c $c --file _db_dev_backup/$f"
    mongoimport -d $DB -c $c --file _db_dev_backup/$f
done

