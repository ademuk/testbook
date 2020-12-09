import path  from "path";
import {spawn} from "child_process";

export const startDevServer = (client_static_root) => {
  const node_modules_path = path.dirname(path.dirname(require.resolve('ts-node/package.json')));
  const process = spawn(`${node_modules_path}/.bin/ts-node-dev`, ['--pretty', '--project', require.resolve('../tsconfig.json'), require.resolve('../server.ts'), client_static_root]);

  process.stdout.on("data", data => {
    console.log(`stdout: ${data}`);
  });

  process.stderr.on("data", data => {
    console.log(`stderr: ${data}`);
  });

  process.on('error', (error) => {
    console.log(`error: ${error.message}`);
  });

  process.on("close", code => {
    console.log(`child process exited with code ${code}`);
  });

  return new Promise((resolve) => resolve)
};
