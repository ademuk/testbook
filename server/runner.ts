import {findModuleTests, runComponentTest, serialiseError} from "./server";
import path from "path";

const SEARCH_PATH = './src';

const PromiseSequence = (tasks) =>
  tasks.reduce((promiseChain, currentTask) =>
    promiseChain.then(chainResults =>
      currentTask.then(currentResult =>
        [ ...chainResults, currentResult ]
      )
    ), Promise.resolve([]));

const runComponentTests = (file: string, component: any) =>
  PromiseSequence(
    component.tests.map((test) =>
      runComponentTest(path.join(SEARCH_PATH, file), component.exportName, test.id)
        .then(
          ([results]) => results.map(
            ({result}) => (result instanceof Error ? {result: 'error', error: serialiseError(result)} : {result})
          ),
          (e) => console.error(e)
        )
    )
  );

export const runner = () =>
  findModuleTests(SEARCH_PATH)
    .then(
      moduleComponentTests => PromiseSequence(
        moduleComponentTests.map(({file, components}) =>
          PromiseSequence(
            components.map((component) => runComponentTests(file, component))
          )
        )
      )
    )
    .then(results => {
      const errors = results.flat(3).filter(({result}) => result === 'error');
      if (errors.length) {
        console.error(errors);
        process.exit(1);
      }
    });
