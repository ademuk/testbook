import { Context, Script } from "vm";
import { runMockStep } from "./mocks";
import { findTextNodes, getElementTreeXPath } from "./dom";

import path from "path";
import fs from "fs";
import express from "express";
import glob from "glob";
import { v1 as uuidv1 } from "uuid";
import { JSDOM, VirtualConsole } from "jsdom";
import webpack from "webpack";
import { getTsPropTypes } from "./propTypes";
import openBrowser from "react-dev-utils/openBrowser";
import { promiseBatch } from "./promise";
import { Logger, setupConsoleLogger } from "./logger";

const hostNodeModulesPath = path.join(process.cwd(), "node_modules");
const { act } = require(path.join(hostNodeModulesPath, "react-dom/test-utils"));

export const serialiseError = (error) => ({
  name: error.name,
  message: error.message,
  stack: error.stack,
  componentStack:
    error instanceof RenderError ? error.componentStack : undefined,
});

const loadModuleTests = (file) => getFile(file).then((f) => [file, f]);

export const findModuleTests = (searchPath: string): Promise<LoadedModule[]> =>
  new Promise((resolve, reject) => {
    glob(path.join(searchPath, "**/*.tests.json"), null, (err, files) => {
      console.log(`Test files found: ${files}`);

      if (err) {
        return reject(err);
      }

      Promise.all(files.map(loadModuleTests))
        .then((files) =>
          files.map(([fileName, file]) => ({
            file: fileName
              .replace(/\.tests\.json$/, "")
              .replace(new RegExp(`^src${path.sep}`), ""),
            components: file.components.map((c) => ({
              ...c,
              exportName: c.name,
              name: getExportComponentName(c.name, fileName).replace(
                /\.(.+)\.tests$/,
                ""
              ),
            })),
          }))
        )
        .then(resolve)
        .catch(reject);
    });
  });

const findModulesWithComponents = (
  searchPath: string
): Promise<LoadedModule[]> =>
  new Promise((resolve, reject) => {
    glob(
      path.join(searchPath, "**/*.{js,jsx,ts,tsx}"),
      {
        ignore: "**/*.test.js",
      },
      (err, files) => {
        console.log(`js/ts files found: ${files}`);

        if (err) {
          return reject(err);
        }

        (promiseBatch<LoadedModule>(
          files.map((file) => () => loadModuleWithComponents(file)),
          3
        ) as Promise<LoadedModule[]>)
          .then((m) =>
            m
              .filter((m) => !m.error && m.components.length)
              .map((m) => ({
                ...m,
                components: m.components.map((c) => ({
                  ...c,
                  ...(c.error && { error: serialiseError(c.error) }),
                })),
                file: m.file.replace(new RegExp(`^src${path.sep}`), ""),
              }))
          )
          .then(resolve);
      }
    );
  });

const loadModuleWithComponents = (modulePath): Promise<LoadedModule> =>
  compileModuleWithHostWebpack(modulePath)
    .then(([outputPath, filename]) =>
      compileWrapperAndModuleWithWebpack(
        require.resolve("./findComponentsInModule"),
        outputPath,
        filename
      )
    )
    .then((moduleCode: string) => {
      console.log(`Loading ${modulePath}`);

      const script = new Script(moduleCode);
      const context = createDOM().getInternalVMContext();
      script.runInContext(context);
      context.close();

      return {
        file: modulePath,
        components:
          context.result &&
          context.result
            .filter(([, isComponent, error]) => isComponent || error)
            .map(([exportName, , error]) => ({
              exportName,
              name: getExportComponentName(exportName, modulePath),
              ...(error && { error }),
            }))
            .sort((a, b) => (b.exportName === "default" ? 1 : -1)),
      };
    })
    .catch((error) => {
      console.log(`Load failed ${error}`);

      return {
        file: modulePath,
        components: [],
        error,
      };
    });

const getExportComponentName = (exportName, filePath) => {
  if (exportName === "default") {
    const fileName = path.parse(filePath).name;

    if (fileName === "index") {
      return path.basename(path.dirname(filePath));
    }

    return fileName;
  }

  return exportName;
};

const compileModuleWithHostWebpack = (
  modulePath: string,
  externals: { [key: string]: string } = null
): Promise<[string, string]> => {
  const craWebpackConfig = require(path.join(
    hostNodeModulesPath,
    "react-scripts/config/webpack.config"
  ))("production");
  const outputModulePath = modulePath.replace(/\.[^.]+$/, ".js");

  return new Promise((resolve, reject) =>
    webpack(
      {
        ...craWebpackConfig,
        entry: [path.resolve(modulePath)],
        output: {
          filename: outputModulePath,
          libraryTarget: "umd",
        },
        optimization: {
          ...craWebpackConfig.optimization,
          splitChunks: false,
          runtimeChunk: false,
        },
        externals: {
          react: "react",
          "react-dom": "react-dom",
          ...externals,
        },
      },
      (err, stats) => {
        if (err) {
          return reject(err);
        }

        if (stats.hasErrors()) {
          return reject(stats.toJson().errors);
        }

        return resolve([stats.toJson().outputPath, outputModulePath]);
      }
    )
  );
};

const compileWithWebpack = (modulePath: string): Promise<string> =>
  new Promise((resolve, reject) =>
    webpack(
      {
        entry: [modulePath],
        output: {
          filename: path.basename(modulePath),
        },
        module: {
          rules: [
            {
              test: /\.tsx?$/,
              use: [
                {
                  loader: "ts-loader",
                  options: {
                    happyPackMode: true,
                  },
                },
              ],
              exclude: /node_modules/,
            },
          ],
        },
        resolve: {
          extensions: [".tsx", ".ts", ".js"],
        },
      },
      (err, stats) => {
        if (err) {
          return reject(err);
        }

        if (stats.hasErrors()) {
          return reject(stats.toJson().errors);
        }

        return resolve(
          path.resolve(
            path.join(stats.toJson().outputPath, path.basename(modulePath))
          )
        );
      }
    )
  ).then(
    (wrapperModulePath: string) =>
      new Promise((resolve, reject) =>
        fs.readFile(wrapperModulePath, function (err, data) {
          if (err) {
            return reject(err);
          }
          resolve(data.toString());
        })
      )
  );

const compileWrapperAndModuleWithWebpack = (
  wrapperModulePath: string,
  modulePath: string,
  moduleFilename: string,
  aliases: { [key: string]: string } = null
): Promise<string> =>
  new Promise((resolve, reject) =>
    webpack(
      {
        entry: [wrapperModulePath],
        output: {
          filename: path.join(path.basename(wrapperModulePath), moduleFilename),
        },
        module: {
          rules: [
            {
              test: /\.tsx?$/,
              use: [
                {
                  loader: "ts-loader",
                  options: {
                    happyPackMode: true,
                  },
                },
              ],
              exclude: /node_modules/,
            },
          ],
        },
        resolve: {
          extensions: [".tsx", ".ts", ".js"],
          alias: {
            module:
              modulePath && path.resolve(path.join(modulePath, moduleFilename)),
            react: path.join(hostNodeModulesPath, "react"),
            "react-dom": path.join(hostNodeModulesPath, "react-dom"),
            ...aliases,
          },
        },
      },
      (err, stats) => {
        if (err) {
          return reject(err);
        }

        if (stats.hasErrors()) {
          return reject(stats.toJson().errors);
        }

        return resolve(
          path.resolve(
            path.join(
              stats.toJson().outputPath,
              path.basename(wrapperModulePath),
              moduleFilename
            )
          )
        );
      }
    )
  ).then(
    (wrapperModulePath: string) =>
      new Promise((resolve, reject) =>
        fs.readFile(wrapperModulePath, function (err, data) {
          if (err) {
            return reject(err);
          }
          resolve(data.toString());
        })
      )
  );

type StepDefinition = {
  type: string;
  definition: {
    [key: string]: any;
  };
};

type TestDefinition = {
  id: string;
  steps: StepDefinition[];
};

type ComponentDefinition = {
  name: string;
  tests: TestDefinition[];
};

type WrapperDefinition = {
  file: string;
  exportName: string;
  props?: { [key: string]: any };
};

export type LoadedComponent = {
  name: string;
  exportName;
  error?: { [key: string]: any };
};

export type LoadedModule = {
  file: string;
  components: LoadedComponent[];
  error?: Error;
};

const getComponent = (file, exportName): Promise<ComponentDefinition> =>
  getTestFile(file).then((f) =>
    f.components.find((c) => c.name === exportName)
  );

const getComponentTests = (file, exportName): Promise<TestDefinition[]> =>
  getComponent(file, exportName).then(
    (c) => (c ? c.tests : []),
    () => []
  );

const getComponentTestStatuses = (file, exportName) =>
  getComponentTests(file, exportName)
    .then((tests: TestDefinition[]) =>
      Promise.all(
        tests.map((t) =>
          runComponentTest(file, exportName, t.id).then(([results]) => [
            t.id,
            results,
          ])
        )
      )
    )
    .then((listOfIdsAndResults) =>
      listOfIdsAndResults.reduce(
        (prev: any, [testId, results]: [string, any]) => ({
          ...prev,
          [testId]: results.every((r) => r.result === "success")
            ? "success"
            : "error",
        }),
        {}
      )
    );

const getComponentTest = (file, exportName, testId) =>
  getComponentTests(file, exportName).then((t) =>
    t.find((t) => t.id === testId)
  );

const getOrCreateFileJson = (file): Promise<LoadedFile> =>
  getTestFile(file).catch(() => ({
    components: [],
  }));

type LoadedFile = {
  components: ComponentDefinition[];
};

const getFile = (file): Promise<LoadedFile> =>
  new Promise((resolve, reject) =>
    fs.readFile(file, "utf8", (err, data) =>
      err ? reject(err) : resolve(JSON.parse(data))
    )
  );

const getTestFile = (file): Promise<LoadedFile> =>
  getFile(`${file}.tests.json`);

const writeFile = (file, payload) =>
  new Promise((resolve, reject) =>
    fs.writeFile(
      `${file}.tests.json`,
      JSON.stringify(payload, null, 2),
      (err) => {
        err ? reject() : resolve(payload);
      }
    )
  );

const getOrCreateComponent = (fileJson: LoadedFile, exportName) => {
  const component = fileJson.components.find((c) => c.name === exportName);
  return component
    ? fileJson
    : {
        components: [
          ...fileJson.components,
          {
            name: exportName,
            tests: [],
          },
        ],
      };
};

const createTest = (file, exportName) => {
  const test = {
    id: uuidv1(),
    steps: [
      {
        type: "render",
        definition: {
          props: {},
        },
      },
    ],
  };

  return getOrCreateFileJson(file)
    .then((fileJson) => getOrCreateComponent(fileJson, exportName))
    .then((fileJson) =>
      writeFile(file, fileJsonWithAddedTest(fileJson, exportName, test))
    )
    .then(() => test);
};

const updatedTest = (test, updates) => ({
  ...test,
  ...updates,
});

const componentWithAddedTest = (component, test) => ({
  ...component,
  tests: component.tests.concat([test]),
});

const fileJsonWithAddedTest = (fileJson, exportName, test) => ({
  ...fileJson,
  components: fileJson.components.map((c) =>
    c.name === exportName ? componentWithAddedTest(c, test) : c
  ),
});

const componentWithUpdatedTest = (component, testId, testUpdates) => ({
  ...component,
  tests: component.tests.map((t) =>
    t.id === testId ? updatedTest(t, testUpdates) : t
  ),
});

const fileJsonWithUpdatedTest = (
  fileJson,
  exportName,
  testId,
  testUpdates
) => ({
  ...fileJson,
  components: fileJson.components.map((c) =>
    c.name === exportName ? componentWithUpdatedTest(c, testId, testUpdates) : c
  ),
});

const updateTestName = (file, exportName, testId, name) =>
  getTestFile(file).then((fileJson) =>
    writeFile(
      file,
      fileJsonWithUpdatedTest(fileJson, exportName, testId, { name })
    )
  );

const updateTestSteps = (file, exportName, testId, steps) =>
  getTestFile(file).then((fileJson) =>
    writeFile(
      file,
      fileJsonWithUpdatedTest(fileJson, exportName, testId, { steps })
    )
  );

class RenderError extends Error {
  public componentStack?: string;

  constructor(
    name,
    message = undefined,
    stack = undefined,
    componentStack = undefined
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = name;
    this.stack = stack;
    this.componentStack = componentStack;
  }
}

class EventError extends Error {
  constructor(message) {
    super(message);
    this.name = "EventError";
  }
}

class AssertionError extends Error {
  constructor(message) {
    super(message);
    this.name = "AssertionError";
  }
}

const createDOM = (logger?: Logger) =>
  new JSDOM('<!doctype html><html lang="en-GB"><body /></html>', {
    pretendToBeVisual: true,
    runScripts: "dangerously",
    url: "http://localhost",
    virtualConsole: logger
      ? new VirtualConsole().sendTo((logger as unknown) as Console)
      : new VirtualConsole(),
  });

const render = (
  file,
  exportName,
  props,
  context,
  wrapper?: WrapperDefinition
) =>
  compileModuleWithHostWebpack(
    file,
    wrapper ? { [wrapper.file]: wrapper.file } : null
  )
    .then(([moduleOutputPath, moduleFilename]) =>
      compileWrapperAndModuleWithWebpack(
        require.resolve("./render"),
        moduleOutputPath,
        moduleFilename,
        {
          wrapper: wrapper
            ? path.join(hostNodeModulesPath, wrapper.file)
            : require.resolve("./noop"),
          ...(wrapper
            ? { [wrapper.file]: path.join(hostNodeModulesPath, wrapper.file) }
            : null),
        }
      )
    )
    .then((moduleCode) => {
      const script = new Script(moduleCode);
      context.exportName = exportName;
      context.props = props;
      context.wrapperExportName = wrapper && wrapper.exportName;
      context.wrapperProps = wrapper && wrapper.props;
      script.runInContext(context);
      return context.result;
    })
    .catch(([errorException, componentError]) => {
      throw new RenderError(
        errorException.name,
        errorException.message,
        errorException.stack,
        componentError && componentError.componentStack
      );
    });

const setupVmContextWithContainerAndMocks = (): Promise<[Context, Logger]> =>
  compileWithWebpack(require.resolve("./setupContainerAndMocks")).then(
    (moduleCode) => {
      const script = new Script(moduleCode);
      const logger = setupConsoleLogger();
      const context = createDOM(logger).getInternalVMContext();
      script.runInContext(context);
      return [context, logger];
    }
  );

const renderComponentSideEffects = (file, exportName, testId, step: number) =>
  runComponentTest(file, exportName, testId, step).then(
    ([, context, logger]) => {
      const { container, mocks } = context;
      if (!container) {
        return {
          regions: [],
          mocks: [],
        };
      }

      const elements = findTextNodes(container).map(([e, text]) => ({
        text,
        type: ["BUTTON", "A"].includes(e.nodeName) ? "button" : "text",
        xpath: getElementTreeXPath(e, context),
      }));

      return {
        regions: elements.map((e) => ({
          ...e,
          unique: !elements.find(
            (f) => f.text === e.text && f.xpath !== e.xpath
          ),
        })),
        mocks: mocks.map(({ name, mock }) => ({
          name,
          calls: mock.getCalls(),
        })),
        logs: logger.getLog(),
      };
    }
  );

const runRenderStep = (
  file,
  exportName,
  { definition: { props, wrapper } },
  context: Context
): Promise<ResultAndContext> =>
  render(file, exportName, props, context, wrapper)
    .then(() => ["success", context] as ResultAndContext)
    .catch((e) => [e, context]);

const runEventStep = (
  file,
  exportName,
  { definition: { type, target } },
  context: Context
): Promise<ResultAndContext> => {
  const { container } = context;
  const node = findTextNodes(container).find(([, text]) => text === target);

  if (!node) {
    return Promise.resolve([
      new EventError(`Text '${target}' could not be found`),
      context,
    ]);
  }

  const [targetNode] = node;

  act(() => {
    targetNode.dispatchEvent(
      new context.Event(type, {
        bubbles: true,
        cancelable: false,
        composed: false,
      })
    );
  });

  return new Promise((resolve) =>
    setTimeout(() => resolve(["success", context]), 10)
  );
};

const runAssertionStep = (
  file,
  exportName,
  { definition: { type, target } },
  context: Context
): Promise<ResultAndContext> => {
  const { container, mocks } = context;
  if (type === "text") {
    const matches = findTextNodes(container).filter(
      ([, text]) => text === target
    );
    return Promise.resolve([
      matches.length
        ? "success"
        : new AssertionError(`Text '${target}' could not be found`),
      context,
    ]);
  }

  if (type === "mock") {
    const mock = mocks.find((m) => m.name === target.name);

    const calls = mock ? mock.mock.getCalls() : [];
    const callsWithMatchingArgs = calls.filter(
      (args) => JSON.stringify(args) === JSON.stringify(target.args)
    );

    return Promise.resolve([
      callsWithMatchingArgs.length
        ? "success"
        : new AssertionError(
            `Mock '${target.name}' was not called with args '${target.args}'`
          ),
      context,
    ]);
  }

  return Promise.resolve([
    new AssertionError(`Invalid assertion type '${type}'`),
    context,
  ]);
};

const STEP_RUNNERS = {
  render: runRenderStep,
  event: runEventStep,
  assertion: runAssertionStep,
  mock: runMockStep,
};

type Result = RenderError | EventError | AssertionError | string;
type ResultObj = {
  result: Result;
};

export type ResultsContextAndLogger = [ResultObj[], Context, Logger];
type ResultAndContext = [Result, Context];

const runStep = (
  file,
  exportName,
  step,
  context
): Promise<ResultAndContext> => {
  console.log(`Running step ${JSON.stringify(step)}`);

  return STEP_RUNNERS[step.type](file, exportName, step, context);
};

export const runComponentTest = (
  file,
  exportName,
  testId,
  step?: number
): Promise<ResultsContextAndLogger> =>
  Promise.all([
    setupVmContextWithContainerAndMocks(),
    getComponentTest(file, exportName, testId),
  ])
    .then(
      ([[context, logger], { steps }]): Promise<ResultsContextAndLogger> =>
        steps.reduce(
          (
            resultsAndContext: Promise<ResultsContextAndLogger>,
            s: StepDefinition,
            idx: number
          ): Promise<ResultsContextAndLogger> =>
            resultsAndContext.then(
              ([results, context]): Promise<ResultsContextAndLogger> =>
                idx <= (step === undefined ? steps.length - 1 : step) &&
                !results.find((r) => r.result instanceof Error)
                  ? runStep(file, exportName, s, context).then(
                      ([
                        result,
                        newContext,
                      ]: ResultAndContext): ResultsContextAndLogger => [
                        [...results, { result }],
                        newContext,
                        logger,
                      ]
                    )
                  : Promise.resolve([
                      results,
                      context,
                      logger,
                    ] as ResultsContextAndLogger)
            ),
          Promise.resolve([[], context, logger] as ResultsContextAndLogger)
        )
    )
    .then(([results, context, logger]) => [
      results,
      context.close() || context,
      logger,
    ]);

const getComponentPropTypes = (modulePath, exportName) => {
  if (/tsx?$/.test(modulePath)) {
    return getTsPropTypes(
      modulePath,
      exportName,
      require(path.join(hostNodeModulesPath, "react-scripts/config/paths"))
        .appTsConfig
    );
  }

  return compileModuleWithHostWebpack(modulePath)
    .then(([moduleOutputPath, moduleFilename]) =>
      compileWrapperAndModuleWithWebpack(
        require.resolve("./getComponentPropTypes"),
        moduleOutputPath,
        moduleFilename
      )
    )
    .then((moduleCode) => {
      const context = createDOM().getInternalVMContext();
      const script = new Script(moduleCode);
      context.exportName = exportName;
      script.runInContext(context);
      context.close();
      return context.result;
    });
};

const getWrapperOptions = () =>
  Promise.resolve([
    {
      file: "react-router-dom",
      exportName: "MemoryRouter",
      propTypes: {},
    },
  ]);

const app = express();
const PORT = 9010;

app.use(express.json());

const SEARCH_PATH = "./src";

app.get("/module-test", (req, res, next) =>
  findModuleTests(SEARCH_PATH)
    .then((moduleComponentTests) => res.send(moduleComponentTests))
    .catch(next)
);

app.get("/module-component", (req, res, next) =>
  findModulesWithComponents(SEARCH_PATH)
    .then((modulesWithComponents) => res.send(modulesWithComponents))
    .catch(next)
);

app.get("/test", (req, res, next) =>
  getComponentTests(
    path.join(SEARCH_PATH, req.query.file as string),
    req.query.exportName
  )
    .then((tests) => res.send(tests))
    .catch(next)
);

app.get("/test/status", (req, res, next) =>
  getComponentTestStatuses(
    path.join(SEARCH_PATH, req.query.file as string),
    req.query.exportName
  )
    .then((statuses) => res.send(statuses))
    .catch(next)
);

app.get("/test/:testId", (req, res, next) =>
  getComponentTest(
    path.join(SEARCH_PATH, req.query.file as string),
    req.query.exportName,
    req.params.testId
  )
    .then((test) => res.send(test))
    .catch(next)
);

app.post("/test", (req, res, next) =>
  createTest(
    path.join(SEARCH_PATH, req.query.file as string),
    req.query.exportName
  )
    .then((test) => res.send(test))
    .catch(next)
);

app.put("/test/:testId/steps", (req, res, next) =>
  updateTestSteps(
    path.join(SEARCH_PATH, req.query.file as string),
    req.query.exportName,
    req.params.testId,
    req.body
  )
    .then((testSteps) => res.send(testSteps))
    .catch(next)
);

app.put("/test/:testId/name", (req, res, next) =>
  updateTestName(
    path.join(SEARCH_PATH, req.query.file as string),
    req.query.exportName,
    req.params.testId,
    req.body.name
  )
    .then((test) => res.send(test))
    .catch(next)
);

app.get("/test/:testId/render/side-effects", (req, res, next) =>
  renderComponentSideEffects(
    path.join(SEARCH_PATH, req.query.file as string),
    req.query.exportName,
    req.params.testId,
    parseInt(req.query.step as string, 10)
  )
    .then((testSideEffects) => res.send(testSideEffects))
    .catch(next)
);

app.get("/test/:testId/run", (req, res, next) =>
  runComponentTest(
    path.join(SEARCH_PATH, req.query.file as string),
    req.query.exportName,
    req.params.testId
  )
    .then(([results]) =>
      results.map(({ result }) =>
        result instanceof Error
          ? { result: "error", error: serialiseError(result) }
          : { result }
      )
    )
    .then((results) => res.send(results))
    .catch(next)
);

app.get("/component/prop-types", (req, res, next) =>
  getComponentPropTypes(
    path.join(SEARCH_PATH, req.query.file as string),
    req.query.exportName
  )
    .then((propTypes) => res.send(propTypes))
    .catch(next)
);

app.get("/component/wrapper", (req, res, next) =>
  getWrapperOptions()
    .then((wrappers) => res.send(wrappers))
    .catch(next)
);

export const startServer = (client_static_root) => {
  app.use("/", express.static(path.join(__dirname, client_static_root)));

  app.get("/*", (req, res) =>
    res.sendFile(path.join(__dirname, client_static_root, "index.html"))
  );

  app.listen(PORT, () => {
    console.log(`Started Testbook http://localhost:${PORT}.`);

    openBrowser(`http://localhost:${PORT}`);
  });
};

const isCLI = require.main === module;

if (isCLI) {
  const [client_static_root] = process.argv.slice(2);
  startServer(client_static_root);
}
