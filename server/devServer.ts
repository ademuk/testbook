const path = require("path");
const {spawn} = require("child_process");

const startDevServer = (client_static_root) => {
  const node_modules_path = path.dirname(path.dirname(require.resolve('ts-node/package.json')));
  const ls = spawn(`${node_modules_path}/.bin/ts-node-dev`, [`${require.resolve('../server.ts')}`, client_static_root]);

  ls.stdout.on("data", data => {
    console.log(`stdout: ${data}`);
  });

  ls.stderr.on("data", data => {
    console.log(`stderr: ${data}`);
  });

  ls.on('error', (error) => {
    console.log(`error: ${error.message}`);
  });

  ls.on("close", code => {
    console.log(`child process exited with code ${code}`);
  });

  return new Promise((resolve) => resolve)
};

module.exports.startDevServer = startDevServer;
