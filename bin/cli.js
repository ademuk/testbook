#!/usr/bin/env node

const concurrently = require('concurrently');

const testbookRootPath = `${__dirname}/..`;

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

concurrently([
  `${testbookRootPath}/node_modules/.bin/babel-node ${testbookRootPath}/src/server.js`,
  `npm start --prefix ${__dirname}/../`,
], {
  prefix: 'name',
  killOthers: ['failure', 'success'],
  restartTries: 3,
});
