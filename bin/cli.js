#!/usr/bin/env node

const concurrently = require('concurrently');

const path = `${__dirname}/..`;

concurrently([
  `${path}/node_modules/.bin/nodemon --exec ${path}/node_modules/.bin/babel-node ${path}/src/server.js`,
  `npm start --prefix ${__dirname}/../`,
], {
  prefix: 'name',
  killOthers: ['failure', 'success'],
  restartTries: 3,
});
