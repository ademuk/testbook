#!/usr/bin/env node

const {runner} = require("../server/build/runner");

const {startDevServer} = require("../server/build/devServer");
const {startServer} = require("../server/build/server");

const [mode = 'default'] = process.argv.slice(2);

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const runCli = () => {
  runner();
};

const MODES = {
  default: [startServer, ['../../build']],
  dev: [startDevServer, ['../build']],
  cli: [runCli, []],
};

const m = MODES[mode];

if (!m) {
  throw Error(`Command "${mode}" not found. Try one of the following: ${Object.keys(MODES)}`)
}

const [fn, args] = m;

fn(...args);

