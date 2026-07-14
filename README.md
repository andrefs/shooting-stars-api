# shooting-stars-api

REST API backend for the **Shooting Stars** game. Built with
[restify](http://restify.com/) and MongoDB (via Mongoose).

## Description

The API powers the Shooting Stars game: it manages players and guest accounts,
game sessions, the items/cards used in play, and the turns and moves players
make. It also exposes statistics and an admin interface, and serves uploaded
item images.

## Tech stack

- **Node.js** (>= 10.1.0)
- **restify** — HTTP server framework
- **Mongoose / MongoDB** — data layer
- **passport** + JWT — authentication (`passport-local`, `passport-custom`,
  `restify-jwt-community`)
- **pm2** — production process / cluster management
- **babel** — ES6/ES module transpilation

## Project layout

```
shooting-stars-api/
├── index.js          # App entrypoint: boots server + DB, graceful shutdown
├── server.js         # restify server, middleware, routes, JWT auth
├── db.js             # MongoDB connection
├── config/           # development / production / test configs
├── routes/           # API route handlers
│   ├── admin.js        ├── gameInstances.js   ├── items.js
│   ├── pairs.js        ├── playerMoves.js     ├── stats.js
│   ├── triples.js      ├── turns.js           └── users.js
├── models/           # Mongoose models
│   ├── GameInstance.js ├── Item.js   ├── Lock.js
│   ├── Pair.js         ├── PlayerMove.js  ├── Triple.js
│   ├── Turn.js         └── User.js
├── lib/              # Shared utilities (logger, passport, PairSorter, ...)
├── scripts/          # DB fixtures, export/import, order rebuild, stats
├── docs/             # Architecture & entity diagrams
└── test/             # Unit and integration tests
```

## Installation

```bash
yarn install
```

Requires a running MongoDB instance. Configure the connection and auth through
the files in `config/` (selected via `NODE_ENV`).

## Development

Initialize the development database with seed data:

```bash
npm run dev:initdb     # load fixtures into the dev database
npm run dev:dropdb     # drop the dev database
npm start              # run the API (node index.js)
```

## Testing

```bash
npm test               # run unit tests (NODE_ENV=test)
npm run test-unit      # unit tests (models)
npm run test-integration  # integration tests (routes)
npm run test:watch     # re-run tests on file changes
```

## Linting

```bash
npm run lint
```

## Production

The API is run with [pm2](https://pm2.keymetrics.io/), both as a clustered
server and as a per-minute cron job that rebuilds the play order:

```bash
npm run prod:cluster   # start API in a pm2 cluster
npm run prod:cron      # start the rebuild-order cron job
```

## Docker

A `Dockerfile` (multi-stage build on `node:11`) is provided. The image is
built and run by the root `shooting-stars` `docker-compose.yml`, which
exposes the API on port `15111`.

## Environment variables

| Variable       | Description                          | Default            |
| -------------- | ------------------------------------ | ------------------ |
| `NODE_ENV`     | `development` / `production` / `test`|                    |
| `MONGODB_HOST` | MongoDB host (used in compose)       | `mongo`            |
| `API_PORT`     | Port the API listens on              | `15111`            |
| `LOG_LEVEL`    | Logging verbosity                    | from config        |

## Routes

- `/status` — health check (public)
- `/auth/login`, `/auth/register`, `/auth/registerGuest` — auth (public)
- `/users`, `/gameInstances`, `/turns`, `/playerMoves`, `/items`,
  `/pairs`, `/triples`, `/stats`, `/admin` — game resources (JWT-protected)

Item images are served statically from `/items/images/*`.
