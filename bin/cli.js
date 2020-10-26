#!/usr/bin/env node

const openBrowser = require('react-dev-utils/openBrowser');

const {startDevServer} = require("../server/build/devServer");
const {startServer} = require("../server/build/server");

const [env] = process.argv.slice(2);

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const start = env === 'dev' ? startDevServer : startServer;
const client_static_root = env === 'dev' ? '../build' : '../../build';

start(client_static_root)
  .then((port) => {
    console.log(`Started Testbook http://localhost:${port}.`);

    openBrowser(`http://localhost:${port}`);
  });

