db.pairs.drop();
db.triples.drop();
db.users.find().forEach(u => { u.playedSequences = []; u.totalScore = 0; u.currentGameInstance = null; db.users.save(u); });
db.moves.drop();
db.scores.drop();
db.gameinstances.drop();
db.gamesequences.drop();
db.playermoves.drop();
db.items.find().forEach(i => { i.isActive = false; db.items.save(i); });
db.counters.drop();
db.turns.drop();




