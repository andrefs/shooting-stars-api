const axios = require('axios');
const host  = 'https://stars-api.andrefs.com';
const path  = '/triples';
const token = 'ichbintherealOG';
const query = '&includeItems=true&includePairs=true&limit=300';
const url   = `${host}${path}?token=${token}${query}`;


axios.get(url).then(resp => {
  const {nodes, edges} = parseTriples(resp.data.docs);

  logN(nodes);
  logE(nodes, edges);

  removeZeroWeightEdges(nodes, edges);
  logE(nodes, edges, 'zeros removed');

  removeWeakEdges(nodes, edges);
  logE(nodes, edges, 'weak rels. removed');

  removeRedundantEdges(nodes, edges);
  logE(nodes, edges, 'redundant rels. removed');

  const sources = findSources(nodes, edges);
  const endings = findEndings(nodes, edges);

  const dot = graph2dot(nodes, edges, sources, endings);
  console.log(dot);
});


const logN = nodes => {
  console.warn('# nodes', Object.keys(nodes).length);
};

const logE = (nodes, edges, message) => {
  let edgesCount = 0;
  Object.keys(nodes).forEach(n1 => {
    Object.keys(nodes).forEach(n2 => {
      if(edges[n1][n2]){ edgesCount++; }
    });
  });

  console.warn('# edges', message ?  `(${message})` : '', edgesCount);
};

const removeZeroWeightEdges = (nodes, edges) => {
  // Remove edges with zero weight
  Object.keys(nodes).forEach(n1 => {
    Object.keys(nodes).forEach(n2 => {
      if(edges[n1][n2] === 0){
        delete edges[n1][n2];
      }
    });
  });
};

const removeWeakEdges = (nodes, edges) => {
  // Remove weakest direction in relations
  // Remove direction unless its twice as strong as the opposite
  // direction
  Object.keys(nodes).forEach(n1 => {
    Object.keys(nodes).forEach(n2 => {
      if(!edges[n1][n2] || !edges[n2][n1]){
        return;
      }
      if(edges[n1][n2] < edges[n2][n1]){ return; }
      if(edges[n1][n2]/edges[n2][n1] < 2){
        delete edges[n1][n2];
        delete edges[n2][n1];
        return;
      }
      delete edges[n2][n1];
    });
  });
};

const removeRedundantEdges = (nodes, edges) => {
  // Remove relations if it can be replaced with 2 other relations
  Object.keys(nodes).forEach(n1 => {
    Object.keys(nodes).forEach(n2 => {
      Object.keys(nodes).forEach(n3 => {
        if(edges[n1][n2] && edges[n2][n3] && edges[n1][n3]){
          delete edges[n1][n3];
        }
      });
    });
  });
};

const findSources = (nodes, edges) => {
  let sources = [];

  Object.keys(nodes).forEach(n1 => {
    let n1_isSource = true;
    Object.keys(nodes).forEach(n2 => {
      if(edges[n2][n1]){ n1_isSource = false; }
    });
    if(n1_isSource){ sources.push(n1); }
  });

  return sources;
};


const findEndings = (nodes, edges) => {
  let endings = [];

  Object.keys(nodes).forEach(n1 => {
    if(!edges[n1]){
      endings.push(n1);
    }
  });

  return endings;
};

const graph2dot = (nodes, edges, sources, endings) => {
  let output = 'digraph {\n  rankdir=LR;\n';
  Object.keys(nodes).forEach(n => output += '  '+n+';\n');
  Object.keys(edges).forEach(s => {
    Object.keys(edges[s]).forEach(d => {
      edge = edges[s][d];
      inverse = edges[d][s];
      if(edge < inverse){ return; }
      if(edge/inverse < 3){ return; }
      output += '  ' + s + ' -> ' + d + ' [label="'+ edge +'"];\n';
    });
  });
  output += '  {rank=same; '+sources.join(', ')+'}\n';
  output += '  {rank=same; '+endings.join(', ')+'}\n';
  output += '}\n';

  return output;
};


const parseTriples = triples => {
  let nodes = {};
  let edges = {};
  triples.forEach(doc => {
    if(doc.support < 10){ return; }
    pairs = {
      AB: 'n_'+doc.itemA.seqNum+'_'+doc.itemB.seqNum + '__' + doc.picks.AB.pair.seqNum,
      AC: 'n_'+doc.itemA.seqNum+'_'+doc.itemC.seqNum + '__' + doc.picks.AC.pair.seqNum,
      BC: 'n_'+doc.itemB.seqNum+'_'+doc.itemC.seqNum + '__' + doc.picks.BC.pair.seqNum,
    };

    // Add all nodes
    nodes[pairs.AB] = true;
    nodes[pairs.AC] = true;
    nodes[pairs.BC] = true;


    // Add all possible edges
    edges[pairs.AB] = edges[pairs.AB] || {};
    edges[pairs.AB][pairs.AC] = edges[pairs.AB][pairs.AC] || 0;
    edges[pairs.AB][pairs.AC] += doc.picks.AB.count;

    edges[pairs.AB] = edges[pairs.AB] || {};
    edges[pairs.AB][pairs.BC] = edges[pairs.AB][pairs.BC] || 0;
    edges[pairs.AB][pairs.BC] += doc.picks.AB.count;

    edges[pairs.AC] = edges[pairs.AC] || {};
    edges[pairs.AC][pairs.AB] = edges[pairs.AC][pairs.AB] || 0;
    edges[pairs.AC][pairs.AB] += doc.picks.AC.count;

    edges[pairs.AC] = edges[pairs.AC] || {};
    edges[pairs.AC][pairs.BC] = edges[pairs.AC][pairs.BC] || 0;
    edges[pairs.AC][pairs.BC] += doc.picks.AC.count;

    edges[pairs.BC] = edges[pairs.BC] || {};
    edges[pairs.BC][pairs.AB] = edges[pairs.BC][pairs.AB] || 0;
    edges[pairs.BC][pairs.AB] += doc.picks.BC.count;

    edges[pairs.BC] = edges[pairs.BC] || {};
    edges[pairs.BC][pairs.AC] = edges[pairs.BC][pairs.AC] || 0;
    edges[pairs.BC][pairs.AC] += doc.picks.BC.count;
  });

  return {nodes, edges};
};

