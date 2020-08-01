#!/usr/bin/env node

const openBrowser = require('react-dev-utils/openBrowser');
const {startServer} = require("../server");

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

startServer()
  .then((port) => {
    console.log(`Started Testbook http://localhost:${port}.`);

    openBrowser(`http://localhost:${port}`);
  });
