import restify from 'restify';
const config = {};
import Debug from 'debug';
const debug = Debug('api');


const server = restify.createServer();

server.get('/status', (req, res, next) => {
    res.setHeader('content-type', 'text/plain');
    res.send('Server is running and accepting requests!');
    next();
});


// Server port and start
const port = process.env.PORT || (config && config.server && config.server.port) ? config.server.port : 15111;

server.listen(port, () => {
  debug(`Server running on http://localhost:${port}`);
});

