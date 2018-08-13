
module.exports = absProbs => {
  const cumProbs = [];
  for(let i=0; i<absProbs.length; i++){
    cumProbs[i] = i ? cumProbs[i-1] : 0;
    cumProbs[i] += absProbs[i];
  }

  const totalProb = absProbs.reduce((a, b) => a + b, 0)
  if(totalProb === 0){
    let val = Math.floor(Math.random() * absProbs.length);
    return val;
  }

  const rand = Math.floor(Math.random()*Math.floor(totalProb));

  for(let i=0; i<cumProbs.length; i++){
    if(cumProbs[i] > rand){
      return i;
    }
  }
};


