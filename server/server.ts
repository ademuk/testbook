/* eslint-disable react/forbid-foreign-prop-types */

import {Context, Script} from "vm";
import {runMockStep} from "./mocks";
import {findTextNodes, getElementTreeXPath} from "./dom";

const path = require("path");
const fs = require("fs");
const express = require('express');
const glob = require("glob");
const {v1: uuidv1} = require('uuid');
const {JSDOM, VirtualConsole} = require('jsdom');
const webpack = require("webpack");

const hostNodeModulesPath = `${process.cwd()}/node_modules`;
const {act} = require(`${hostNodeModulesPath}/react-dom/test-utils`);

const findModulesWithComponents = (searchPath): Promise<LoadedModule[]> =>
  new Promise((resolve, reject) => {
    glob(
      path.join(searchPath, "**/*.js"),
      {
        ignore: '**/*.test.js'
      },
      (err, files) => {
        console.log(`js files found: ${files}`);

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

  return new Promise((resolve, reject) =>
    webpack({
      ...craWebpackConfig,
      entry: [path.resolve(modulePath)],
      output: {
        filename: modulePath,
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

      return resolve([stats.toJson().outputPath, modulePath]);
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
  ).then((wrapperModulePath) => new Promise((resolve, reject) =>
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
  ).then((wrapperModulePath) => new Promise((resolve, reject) =>
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
      (e) => {console.log(e);return ['error', context]}
    );

const runEventStep = (file, exportName, {definition: {type, target}}, context: Context): Promise<ResultAndContext> => {
  const {container} = context;
  const node = findTextNodes(container)
    .find(([, text]) => text === target);

  if (!node) {
    return Promise.resolve(
      ['error', context]
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

const runAssertionStep = (file, exportName, {definition}, context: Context): Promise<ResultAndContext> => {
  const {container, mocks} = context;
  if (definition.type === 'text') {
    const matches = findTextNodes(container)
      .filter(([, text]) => text === definition.target);
    return Promise.resolve(
      [matches.length ? 'success' : 'error', context]
    );
  }

  if (definition.type === 'mock') {
    const mock = mocks
      .find((m) => m.name === definition.target.name);

    const calls = mock ? mock.mock.getCalls() : [];
    const callsWithMatchingArgs =
      calls.filter((args) => JSON.stringify(args) === JSON.stringify(definition.target.args));

    return Promise.resolve(
      [callsWithMatchingArgs.length ? 'success' : 'error', context]
    );
  }

  return Promise.resolve([
    'error',
    context
  ]);
};

const STEP_RUNNERS = {
  render: runRenderStep,
  event: runEventStep,
  assertion: runAssertionStep,
  mock: runMockStep,
};

type Result = string;
type ResultObj = {
  result: string;
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
              !results.find(r => r.result === 'error')
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

const valueMap = {
  'an array': 'array',
  'a ReactNode': 'ReactNode',
  'a single ReactElement': 'ReactElement',
  'a single ReactElement type': 'ReactElement type',
};

const parsePropTypeMessage = (message, defaultType) => {
  let result;
  if (!message) {
    return defaultType;
  }

  const primitivePattern = /expected `?([a-zA-Z ]+)/g;
  if (message.message.match(primitivePattern)) {
    const r = primitivePattern.exec(message.message);
    result = r ? r[1] : null;
  }

  const oneOfPattern = /expected one of (\[.*])/g;
  if (message.message.match(oneOfPattern)) {
    const r = oneOfPattern.exec(message.message);
    result = r ? `oneOf:${r[1]}` : null;
  }

  const instanceOfPattern = /expected instance of `(.*)`/g;
  if (message.message.match(instanceOfPattern)) {
    const r = instanceOfPattern.exec(message.message);
    result = r ? `instanceOf:${r[1]}` : null;
  }

  return valueMap[result] || result;
};

const inferPropTypes = (propTypes) =>
  Object.keys(propTypes)
    .reduce(
      (prev , curr) =>
        ({
          ...prev,
          [curr]: [
            parsePropTypeMessage(
              propTypes[curr]({[curr]: {}}, curr, null, null, null, 'SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED'),
              'object'
            ),
            propTypes[curr]({[curr]: undefined}, curr, null, null, null, 'SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED') !== null
          ]
        }),
      {});

module.exports.inferPropTypes = inferPropTypes;

const getComponentPropTypes = (modulePath, exportName) =>
  compileModuleWithHostWebpack(modulePath)
    .then(([moduleOutputPath, moduleFilename]) => {
      const component = require(path.join(moduleOutputPath, moduleFilename))[exportName];
      return component.propTypes ? inferPropTypes(component.propTypes) : {};
    });

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
    getComponentTests(path.join(SEARCH_PATH, req.query.file), req.query.exportName)
      .then(
        test => res.send(test)
      )
);

app.get(
  '/test/status',
  (req, res) =>
    getComponentTestStatuses(path.join(SEARCH_PATH, req.query.file), req.query.exportName)
      .then(
        statuses => res.send(statuses)
      )
);

app.get(
  '/test/:testId',
  (req, res) =>
    getComponentTest(path.join(SEARCH_PATH, req.query.file), req.query.exportName, req.params.testId)
      .then(
        test => res.send(test)
      )
);

app.post(
  '/test',
  (req, res) =>
    createTest(path.join(SEARCH_PATH, req.query.file), req.query.exportName)
      .then(
        test => res.send(test)
      )
);

app.put(
  '/test/:testId/steps',
  (req, res) =>
    updateTestSteps(path.join(SEARCH_PATH, req.query.file), req.query.exportName, req.params.testId, req.body)
      .then(
        test => res.send(test)
      )
);

app.get(
  '/test/:testId/render/side-effects',
  (req, res) =>
    renderComponentSideEffects(path.join(SEARCH_PATH, req.query.file), req.query.exportName, req.params.testId, req.query.step)
      .then(
        test => res.send(test)
      )
);

app.get(
  '/test/:testId/run',
  (req, res, next) =>
    runComponentTest(path.join(SEARCH_PATH, req.query.file), req.query.exportName, req.params.testId, req.query.step)
      .then(
        ([results]) => res.send(results)
      )
      .catch(next)
);

app.get(
  '/component/propTypes',
  (req, res, next) =>
    getComponentPropTypes(path.join(SEARCH_PATH, req.query.file), req.query.exportName)
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
