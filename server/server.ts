import {Context, Script} from "vm";
import {runMockStep} from "./mocks";
import {findTextNodes, getElementTreeXPath} from "./dom";

import path from "path";
import fs from "fs";
import express from 'express';
import glob from "glob";
import {v1 as uuidv1} from 'uuid';
import {JSDOM, VirtualConsole} from 'jsdom';
import webpack from "webpack";
import {getTsPropTypes} from "./propTypes";

const hostNodeModulesPath = `${process.cwd()}/node_modules`;
const {act} = require(`${hostNodeModulesPath}/react-dom/test-utils`);

const findModulesWithComponents = (searchPath: string): Promise<LoadedModule[]> =>
  new Promise((resolve, reject) => {
    glob(
      path.join(searchPath, "**/*.{js,jsx,ts,tsx}"),
      {
        ignore: '**/*.test.js'
      },
      (err, files) => {
        console.log(`js/ts files found: ${files}`);

        if (err) {
          return reject(err)
        }

        (Promise.all(files.map(loadModuleWithComponents)) as Promise<LoadedModule[]>)
          .then((m) =>
            m.filter(m => !m.error && m.components.length)
              .map(
                (m) =>
                  ({...m, file: m.file.replace(new RegExp(`^src${path.sep}`), '')})
              )
          )
          .then(resolve)
      }
    );
  });

const compileModuleWithHostWebpack = (modulePath: string): Promise<[string, string]> => {
  const craWebpackConfig = require(`${hostNodeModulesPath}/react-scripts/config/webpack.config`)(process.env.NODE_ENV);
  const outputModulePath = modulePath.replace(/\.[^.]+$/, '.js');

  return new Promise((resolve, reject) =>
    webpack({
      ...craWebpackConfig,
      entry: [path.resolve(modulePath)],
      output: {
        filename: outputModulePath,
        libraryTarget: 'umd'
      },
      optimization: {
        ...craWebpackConfig.optimization,
        splitChunks: false,
        runtimeChunk: false
      },
      externals: {
        react: 'react',
        "react-dom": 'react-dom',
      }
    }, (err, stats) => {
      if (err) {
        return reject(err);
      }

      if (stats.hasErrors()) {
        return reject(stats.toJson().errors);
      }

      return resolve([stats.toJson().outputPath, outputModulePath]);
    })
  );
};

const compileWrapperWithWebpack = (wrapperModulePath: string,): Promise<string> =>
  new Promise((resolve, reject) =>
    webpack({
      entry: [wrapperModulePath],
      output: {
        filename: path.basename(wrapperModulePath),
      },
      module: {
        rules: [
          {
            test: /\.tsx?$/,
            use: require.resolve('ts-loader'),
            exclude: /node_modules/,
          },
        ],
      },
      resolve: {
        extensions: [ '.tsx', '.ts', '.js' ],
      },
    }, (err, stats) => {
      if (err) {
        return reject(err);
      }

      if (stats.hasErrors()) {
        return reject(stats.toJson().errors);
      }

      return resolve(path.resolve(path.join(stats.toJson().outputPath, path.basename(wrapperModulePath))));
    })
  ).then((wrapperModulePath: string) => new Promise((resolve, reject) =>
    fs.readFile(wrapperModulePath, function (err, data) {
      if (err) {
        return reject(err);
      }
      resolve(data.toString());
    })
  ));

const compileWrapperAndModuleWithWebpack = (wrapperModulePath: string, modulePath: string, moduleFilename: string): Promise<string> =>
  new Promise((resolve, reject) =>
    webpack({
      entry: [wrapperModulePath],
      output: {
        filename: path.join(path.basename(wrapperModulePath), moduleFilename),
      },
      mode: 'development',
      module: {
        rules: [
          {
            test: /\.tsx?$/,
            use: require.resolve('ts-loader'),
            exclude: /node_modules/,
          },
        ],
      },
      resolve: {
        extensions: [ '.tsx', '.ts', '.js' ],
        alias: {
          module: modulePath && path.resolve(path.join(modulePath, moduleFilename)),
          react: `${hostNodeModulesPath}/react`,
          "react-dom": `${hostNodeModulesPath}/react-dom`,
        }
      },
    }, (err, stats) => {
      if (err) {
        return reject(err);
      }

      if (stats.hasErrors()) {
        return reject(stats.toJson().errors);
      }

      return resolve(path.resolve(path.join(stats.toJson().outputPath, path.basename(wrapperModulePath), moduleFilename)));
    })
  ).then((wrapperModulePath: string) => new Promise((resolve, reject) =>
    fs.readFile(wrapperModulePath, function (err, data) {
      if (err) {
        return reject(err);
      }
      resolve(data.toString());
    })
  ));


type StepDefinition = {
  type: string;
  definition: {
    [key: string]: any
  }
};

type TestDefinition = {
  id: string;
  steps: StepDefinition[]
}

type ComponentDefinition = {
  name: string;
  tests: TestDefinition[];
}

export type LoadedComponent = {
  name: string;
  exportName;
}

type LoadedModule = {
  file: string;
  components: LoadedComponent[];
  error?: string
}

const loadModuleWithComponents = (modulePath) : Promise<LoadedModule> =>
  compileModuleWithHostWebpack(modulePath)
    .then(([outputPath, filename]) =>
      compileWrapperAndModuleWithWebpack(require.resolve("./findComponentsInModule"), outputPath, filename)
    )
    .then((moduleCode: string) => {
      const script = new Script(moduleCode);
      const context = createDOM().getInternalVMContext();
      script.runInContext(context);
      context.close();

      return {
        file: modulePath,
        components: context.result && context.result
          .map((exportName) => ({exportName, name: getExportComponentName(exportName, modulePath)}))
          .sort(
            (a, b) =>
              b.exportName === 'default' ? 1: -1
          )
      };
    })
    .catch((error) => {
      console.log(`Load failed ${error}`);

      return {
        file: modulePath,
        components: [],
        error
      };
    });


const getExportComponentName = (exportName, filePath) => {
  if (exportName === 'default') {
    const fileName = path.parse(filePath).name;

    if (fileName === 'index') {
      return path.basename(path.dirname(filePath));
    }

    return fileName
  }

  return exportName;
};

const getComponent = (file, exportName): Promise<ComponentDefinition> =>
  getFile(file)
    .then(f => f.components.find(c => c.name === exportName));

const getComponentTests = (file, exportName): Promise<TestDefinition[]> =>
  getComponent(file, exportName)
    .then(
      c => c ? c.tests : [],
      () => []
    );

const getComponentTestStatuses = (file, exportName) =>
  getComponentTests(file, exportName)
    .then((tests: TestDefinition[]) =>
      Promise.all(
        tests.map(t =>
          runComponentTest(file, exportName, t.id, t.steps.length - 1)
            .then(([results]) => [t.id, results])
        )
      )
    ).then(listOfIdsAndResults =>
      listOfIdsAndResults.reduce((prev: any, [testId, results]: [string, any]) => ({
        ...prev,
        [testId]: results.every(r => r.result === 'success') ? 'success' : 'error'
      }), {})
    );

const getComponentTest = (file, exportName, testId) =>
  getComponentTests(file, exportName)
    .then(t => t.find(t => t.id === testId));

const getOrCreateFileJson = (file): Promise<LoadedFile> =>
  getFile(file)
    .catch(() => ({
      components: []
    }));

type LoadedFile = {
  components: ComponentDefinition[];
}

const getFile = (file): Promise<LoadedFile> =>
  new Promise((resolve, reject) =>
    fs.readFile(`${file}.tests.json`, 'utf8', (err, data) =>
      err ? reject() : resolve(JSON.parse(data))
    )
  );

const writeFile = (file, payload) =>
  new Promise((resolve, reject) =>
    fs.writeFile(
      `${file}.tests.json`,
      JSON.stringify(payload, null, 2),
      err => {
        err ? reject() : resolve();
      }
    )
  );

const createDOM = () =>
  new JSDOM('<!doctype html><html lang="en-GB"><body /></html>', {
    pretendToBeVisual: true,
    runScripts: 'dangerously',
    url: 'http://localhost',
    virtualConsole: new VirtualConsole().sendTo(console)
  });

const getOrCreateComponent = (fileJson: LoadedFile, exportName) => {
  const component = fileJson.components.find(c => c.name === exportName);
  return component ? fileJson : {
    components: [
      ...fileJson.components,
      {
        name: exportName,
        tests: []
      }
    ]
  };
};

const createTest = (file, exportName) => {
  const test = {
    id: uuidv1(),
    steps: [
      {
        type: "render",
        definition: {
          props: {}
        }
      }
    ]
  };

  return getOrCreateFileJson(file)
    .then(fileJson => getOrCreateComponent(fileJson, exportName))
    .then(fileJson =>
      writeFile(
        file,
        fileJsonWithAddedTest(
          fileJson,
          exportName,
          test
        ))
    )
    .then(() => test)
};

const testWithUpdatedSteps = (test, steps) => ({
  ...test,
  steps
});

const componentWithAddedTest = (component, test) => ({
  ...component,
  tests: component.tests.concat([test])
});

const fileJsonWithAddedTest = (fileJson, exportName, test) => ({
  ...fileJson,
  components: fileJson.components.map(c =>
    c.name === exportName ? componentWithAddedTest(c, test) : c
  )
});

const componentWithUpdatedTest = (component, testId, steps) => ({
  ...component,
  tests: component.tests.map(t => t.id === testId ? testWithUpdatedSteps(t, steps) : t)
});

const fileJsonWithUpdatedComponent = (fileJson, exportName, testId, steps) => ({
  ...fileJson,
  components: fileJson.components.map(c =>
    c.name === exportName ? componentWithUpdatedTest(c, testId, steps) : c
  )
});

const updateTestSteps = (file, exportName, testId, steps) =>
  getFile(file)
    .then(fileJson => {
      const payload = fileJsonWithUpdatedComponent(fileJson, exportName, testId, steps);
      return new Promise((resolve, reject) => {
        fs.writeFile(
          `${file}.tests.json`,
          JSON.stringify(payload, null, 2),
          (err) => {
            err ? reject() : resolve(payload);
          }
        );
      })
    });

class RenderError extends Error {
  public componentStack?: string;

  constructor(name, message = undefined, stack = undefined, componentStack = undefined) {
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
    this.name = 'EventError';
  }
}

class AssertionError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AssertionError';
  }
}

const render = (file, exportName, props, context) =>
  compileModuleWithHostWebpack(file)
    .then(([moduleOutputPath, moduleFilename]) =>
      compileWrapperAndModuleWithWebpack(require.resolve("./render"), moduleOutputPath, moduleFilename)
    )
    .then((moduleCode) => {
      const script = new Script(moduleCode);
      context.exportName = exportName;
      context.props = props;
      script.runInContext(context);
      return context.result;
    }).catch(([errorException, {componentStack}]) => {
      throw new RenderError(
        errorException.name,
        errorException.message,
        errorException.stack,
        componentStack
      );
    });

const setupVmContextWithContainerAndMocks = (): Context =>
  compileWrapperWithWebpack(require.resolve("./setupContainerAndMocks"))
    .then((moduleCode) => {
      const script = new Script(moduleCode);
      const context = createDOM().getInternalVMContext();
      script.runInContext(context);
      return context
    });

const renderComponentSideEffects = (file, exportName, testId, step) =>
  runComponentTest(file, exportName, testId, step)
    .then(([, context]) => {
      const {container, mocks} = context;
      if (!container) {
        return {
          regions: [],
          mocks: []
        };
      }

      const elements = findTextNodes(container)
        .map(([e, text]) => ({
          text,
          type: ['BUTTON', 'A'].includes(e.nodeName) ? 'button' : 'text',
          xpath: getElementTreeXPath(e, context)
        }));

      return {
        regions: elements.map(e => ({
          ...e,
          unique: !elements.find(f => f.text === e.text && f.xpath !== e.xpath)
        })),
        mocks: mocks.map(({name, mock}) => ({
          name,
          calls: mock.getCalls()
        }))
      };
    });

const runRenderStep = (file, exportName, {definition: {props}}, context: Context): Promise<ResultAndContext> =>
  render(file, exportName, props, context)
    .then(
      () => ['success', context] as ResultAndContext
    )
    .catch(
      (e) => [e, context]
    );

const runEventStep = (file, exportName, {definition: {type, target}}, context: Context): Promise<ResultAndContext> => {
  const {container} = context;
  const node = findTextNodes(container)
    .find(([, text]) => text === target);

  if (!node) {
    return Promise.resolve(
      [new EventError(`Text '${target}' could not be found`), context]
    );
  }

  const [targetNode] = node;

  act(() => {
    targetNode.dispatchEvent(
      new context.Event(type, { bubbles: true, cancelable: false, composed: false })
    );
  });

  return Promise.resolve(
    ['success', context]
  );
};

const runAssertionStep = (file, exportName, {definition: {type, target}}, context: Context): Promise<ResultAndContext> => {
  const {container, mocks} = context;
  if (type === 'text') {
    const matches = findTextNodes(container)
      .filter(([, text]) => text === target);
    return Promise.resolve(
      [matches.length ? 'success' : new AssertionError(`Text '${target}' could not be found`), context]
    );
  }

  if (type === 'mock') {
    const mock = mocks
      .find((m) => m.name === target.name);

    const calls = mock ? mock.mock.getCalls() : [];
    const callsWithMatchingArgs =
      calls.filter((args) => JSON.stringify(args) === JSON.stringify(target.args));

    return Promise.resolve(
      [callsWithMatchingArgs.length ? 'success' : new AssertionError(`Mock '${target.name}' was not called with args '${target.args}'`), context]
    );
  }

  return Promise.resolve([
    new AssertionError(`Invalid assertion type '${type}'`),
    context
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
}

type ResultsAndContext = [ResultObj[], Context];
type ResultAndContext = [Result, Context];


const runStep = (file, exportName, step, context): Promise<ResultAndContext> => {
  console.log(`Running step ${JSON.stringify(step)}`);

  return STEP_RUNNERS[step.type](file, exportName, step, context);
};

const runComponentTest = (file, exportName, testId, step): Promise<ResultsAndContext> =>
  Promise.all([
    setupVmContextWithContainerAndMocks(),
    getComponentTest(file, exportName, testId)
  ]).then(([context, {steps}]): Promise<ResultsAndContext> => (
      steps.reduce(
        (resultsAndContext: Promise<ResultsAndContext>, s: StepDefinition, idx: number): Promise<ResultsAndContext> =>
          resultsAndContext.then(([results, context]): Promise<ResultsAndContext> =>
            (
              idx <= (step === undefined ? steps.length - 1 : step) &&
              !results.find(r => r.result instanceof Error)
            ) ?
              runStep(file, exportName, s, context)
                .then(([result, newContext]: ResultAndContext): ResultsAndContext => [
                  [...results, {result}],
                  newContext,
                ]) :
              Promise.resolve([results, context] as ResultsAndContext)
          ),
        Promise.resolve([[], context] as ResultsAndContext)
      )
    )
  ).then(([results, context]) => [results, context.close() || context]);

const getComponentPropTypes = (modulePath, exportName) => {
  if (/tsx?$/.test(modulePath)) {
    return getTsPropTypes(modulePath, exportName, require(`${hostNodeModulesPath}/react-scripts/config/paths`).appTsConfig);
  }

  return compileModuleWithHostWebpack(modulePath)
    .then(([moduleOutputPath, moduleFilename]) =>
      compileWrapperAndModuleWithWebpack(require.resolve("./getComponentPropTypes"), moduleOutputPath, moduleFilename)
    )
    .then((moduleCode) => {
      const context = createDOM().getInternalVMContext();
      const script = new Script(moduleCode);
      context.exportName = exportName;
      script.runInContext(context);
      return context.result;
    });
};

const app = express();
const PORT = 9010;

app.use(express.json());

const SEARCH_PATH = './src';

app.get(
  '/component',
  (req, res) =>
    findModulesWithComponents(SEARCH_PATH)
      .then(
        modulesWithComponents => res.send(modulesWithComponents)
      )
);

app.get(
  '/test',
  (req, res) =>
    getComponentTests(path.join(SEARCH_PATH, (req.query.file as string)), req.query.exportName)
      .then(
        test => res.send(test)
      )
);

app.get(
  '/test/status',
  (req, res) =>
    getComponentTestStatuses(path.join(SEARCH_PATH, (req.query.file as string)), req.query.exportName)
      .then(
        statuses => res.send(statuses)
      )
);

app.get(
  '/test/:testId',
  (req, res) =>
    getComponentTest(path.join(SEARCH_PATH, (req.query.file as string)), req.query.exportName, req.params.testId)
      .then(
        test => res.send(test)
      )
);

app.post(
  '/test',
  (req, res) =>
    createTest(path.join(SEARCH_PATH, (req.query.file as string)), req.query.exportName)
      .then(
        test => res.send(test)
      )
);

app.put(
  '/test/:testId/steps',
  (req, res) =>
    updateTestSteps(path.join(SEARCH_PATH, (req.query.file as string)), req.query.exportName, req.params.testId, req.body)
      .then(
        test => res.send(test)
      )
);

app.get(
  '/test/:testId/render/side-effects',
  (req, res) =>
    renderComponentSideEffects(path.join(SEARCH_PATH, (req.query.file as string)), req.query.exportName, req.params.testId, req.query.step)
      .then(
        test => res.send(test)
      )
);

app.get(
  '/test/:testId/run',
  (req, res, next) =>
    runComponentTest(path.join(SEARCH_PATH, (req.query.file as string)), req.query.exportName, req.params.testId, req.query.step)
      .then(
        ([results]) => res.send(
          results.map(
            ({result}) => (result instanceof Error ? {
                result: 'error',
                error: {
                  name: result.name,
                  message: result.message,
                  stack: result.stack,
                  componentStack: result instanceof RenderError ? result.componentStack : undefined,
                }
              } : {result})
            )
        )
      )
      .catch(next)
);

app.get(
  '/component/propTypes',
  (req, res, next) =>
    getComponentPropTypes(path.join(SEARCH_PATH, (req.query.file as string)), req.query.exportName)
      .then(
        (propTypes) => res.send(propTypes)
      )
      .catch(next)
);


const startServer = (client_static_root) => {
  app.use(
    '/',
    express.static(path.join(__dirname, client_static_root))
  );

  app.get('/*', (req, res) =>
    res.sendFile(path.join(__dirname, client_static_root, 'index.html'))
  );

  return new Promise((resolve) =>
    app.listen(
      PORT,
      () => resolve(PORT)
    )
  );
};

module.exports.startServer = startServer;

const isCLI = require.main === module;

if (isCLI) {
  const [client_static_root] = process.argv.slice(2);
  startServer(client_static_root)
    .then((port) => console.log(`Started Testbook development server on port ${port}`));
}
