import {
  findModuleTests,
  LoadedModule,
  ResultsAndContext,
  runComponentTest,
  serialiseError,
} from "./server";
import path from "path";
import { promiseSequence } from "./promise";

const SEARCH_PATH = "./src";

type TestRunnerResult = { result: string; error?: string };

const runComponentTests = (
  file: string,
  component: any
): Promise<TestRunnerResult[]> =>
  promiseSequence<ResultsAndContext>(
    component.tests.map((test) => () =>
      runComponentTest(
        path.join(SEARCH_PATH, file),
        component.exportName,
        test.id
      ).then(
        ([results]) =>
          results.map(({ result }) =>
            result instanceof Error
              ? { result: "error", error: serialiseError(result) }
              : { result }
          ),
        (e) => console.error(e)
      )
    )
  );

export const runner = () =>
  findModuleTests(SEARCH_PATH)
    .then((moduleComponentTests: LoadedModule[]) =>
      promiseSequence<TestRunnerResult[][]>(
        moduleComponentTests.map(({ file, components }) => () =>
          promiseSequence<TestRunnerResult[]>(
            components.map((component) => () =>
              runComponentTests(file, component)
            )
          )
        )
      )
    )
    .then((results: TestRunnerResult[][]) => {
      const errors = results.flat(3).filter(({ result }) => result === "error");
      if (errors.length) {
        console.error(errors);
        process.exit(1);
      }
    });
