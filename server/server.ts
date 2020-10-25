/* eslint-disable react/forbid-foreign-prop-types */

const path = require("path");
const fs = require("fs");
const express = require('express');
const glob = require("glob");
const {v1: uuidv1} = require('uuid');
const {JSDOM} = require('jsdom');

const hostNodeModulesPath = `${process.cwd()}/node_modules`;

const React = require(`${hostNodeModulesPath}/react`);
const ReactDOM = require(`${hostNodeModulesPath}/react-dom`);
const {Simulate, act} = require(`${hostNodeModulesPath}/react-dom/test-utils`);

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

        setupJSDOM();
        setupMocks();

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

const compileModuleWithWebpack = (modulePath): Promise<string> => {
  const webpack = require("webpack");

  const craWebpackConfig = require(`${hostNodeModulesPath}/react-scripts/config/webpack.config`)(process.env.NODE_ENV);
  const config = {
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
      'react': 'react',
      'react-dom' : 'reactDOM'
    }
  };

  return new Promise((resolve, reject) => {
    webpack(config, (err, stats) => {
      if (err) {
        return reject(err);
      }

      if (stats.hasErrors()) {
        return reject(stats.toJson().errors);
      }

      return resolve(path.resolve(path.join(stats.toJson().outputPath, modulePath)));
    });
  });
};

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

type LoadedComponent = {
  name: string;
  exportName;
}

type LoadedModule = {
  file: string;
  components: LoadedComponent[];
  error?: string
}

const loadModuleWithComponents = (modulePath) : Promise<LoadedModule> =>
  compileModuleWithWebpack(modulePath)
    .then((compiledModulePath) => {
      try {
        console.log(`Loading file: ${modulePath}`);
        return {
          file: modulePath,
          components: findComponentsInModule(
            require(compiledModulePath), modulePath
          ).sort(
            (a, b) =>
              b.exportName === 'default' ? 1: -1
          )
        };
      }
      catch(error) {
        console.log(`Load failed ${error}`);

        return {
          file: modulePath,
          components: [],
          error
        };
      }
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

const findComponentsInModule = (module, modulePath): LoadedComponent[] =>
  Object.keys(module)
    .map(
      exportName => ({
        exportName,
        exportedModule: module[exportName]
      })
    )
    .filter(({exportedModule}) => {
      if (exportedModule.propTypes) {
        return true;
      }

      const container = document.createElement('div');

      ReactDOM.render(React.createElement(exportedModule), container);

      return !!container;
    })
    .map(
      ({exportName}) => ({name: getExportComponentName(exportName, modulePath), exportName})
    );

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
            .then(({results}) => [t.id, results])
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
    url: 'http://localhost'
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

function copyProps(src, target) {
  Object.defineProperties(target, {
    ...Object.getOwnPropertyDescriptors(src),
    ...Object.getOwnPropertyDescriptors(target),
  });
}

const render = (file, exportName, props) =>
  compileModuleWithWebpack(file)
    .then((compiledModulePath) => {
      const {[exportName]: Component} = require(compiledModulePath);

      const container = document.createElement('div');

      document.body.appendChild(container);

      act(() => {
        ReactDOM.render(
          React.createElement(
            Component,
            props,
            null
          ),
          container
        );
      });

      return container;
    });

const getElementTreeXPath = element => {
  // https://stackoverflow.com/questions/3454526/how-to-calculate-the-xpath-position-of-an-element-using-javascript#answer-3454545

  var paths = [];  // Use nodeName (instead of localName)

  // so namespace prefix is included (if any).
  for (;element && element.nodeType === Node.ELEMENT_NODE; element = element.parentNode) {
    let index = 0;
    let hasFollowingSiblings = false;
    let sibling;

    for (sibling = element.previousSibling; sibling; sibling = sibling.previousSibling) {
      // Ignore document type declaration.
      if (sibling.nodeType === Node.DOCUMENT_TYPE_NODE) {
        continue;
      }

      if (sibling.nodeName === element.nodeName) {
        ++index;
      }
    }

    for (sibling = element.nextSibling; sibling && !hasFollowingSiblings; sibling = sibling.nextSibling) {
      if (sibling.nodeName === element.nodeName)
        hasFollowingSiblings = true;
    }

    const tagName = (element.prefix ? element.prefix + ":" : "") + element.localName;
    const pathIndex = (index || hasFollowingSiblings ? "[" + (index + 1) + "]" : "");

    paths.splice(0, 0, tagName + pathIndex);
  }

  return paths.length ? "/" + paths.join("/") : null;
};

const findTextNodes = (elem) => {
  let textNodes = [];
  if (elem) {
    elem.childNodes.forEach((node) => {
      if (node.nodeType === 3) {
        textNodes.push([node.parentNode, node.textContent.trim()]);
      } else if (node.nodeType === 1 || node.nodeType === 9 || node.nodeType === 11) {
        textNodes = textNodes.concat(findTextNodes(node));
      }
    });
  }
  return textNodes;
};

const renderComponentSideEffects = (file, exportName, testId, step) =>
  runComponentTest(file, exportName, testId, step)
    .then(({container, mocks}) => {
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
          xpath: getElementTreeXPath(e)
        }));

      return {
        regions: elements.map(e => ({
          ...e,
          unique: !elements.find(f => f.text === e.text && f.xpath !== e.xpath)
        })),
        mocks
      };
    });

const runRenderStep = (file, exportName, {definition: {props}}, container) =>
  render(file, exportName, props)
    .then(
      (c) => ['success', c]
    )
    .catch(
      () => ['error', container]
    );

const runEventStep = (file, exportName, {definition: {type, target}}, container) => {
  const node = findTextNodes(container)
    .find(([, text]) => text === target);

  if (!node) {
    return Promise.resolve(
      ['error', container]
    );
  }

  const [targetNode] = node;

  act(() => {
    Simulate[type](
      targetNode
    );
  });

  return Promise.resolve(
    ['success', container]
  );
};

const runAssertionStep = (file, exportName, {definition}, container, mocks) => {
  if (definition.type === 'text') {
    const matches = findTextNodes(container)
      .filter(([, text]) => text === definition.target);
    return Promise.resolve(
      [matches.length ? 'success' : 'error', container]
    );
  }

  if (definition.type === 'mock') {
    const mock = mocks
      .find((m) => m.name === definition.target.name);

    const calls = mock ? mock.mock.getCalls() : [];
    const callsWithMatchingArgs =
      calls.filter((args) => JSON.stringify(args) === JSON.stringify(definition.target.args));

    return Promise.resolve(
      [callsWithMatchingArgs.length ? 'success' : 'error', container]
    );
  }

  return Promise.resolve([
    'error',
    container
  ]);
};

const runMockStep = (file, exportName, step, container, mocks) => {
  const mock = mocks
    .find((m) => m.name === step.definition.name);

  mock.mock.addMock(step.definition.args, step.definition.return);

  return Promise.resolve([
    'success',
    container
  ]);
};

type MockCall = [any[], any];

type SetupMock = {
  addMock: (args: any[], returnValue: any) => void;
  getCalls: () => MockCall[]
}

const setupFetchMock = (): SetupMock => {
  let calls = [];
  let mockReturnValues = [];

  global.window.fetch = function (input: RequestInfo, init: RequestInit): Promise<any> {
    const callingArgs = Array.from(arguments);

    calls.push(callingArgs);

    const mockReturnValue = mockReturnValues
      .find(([args]) => JSON.stringify(args) === JSON.stringify(callingArgs));

    return Promise.resolve({
      json: () => Promise.resolve(mockReturnValue ? mockReturnValue[1] : [])
    });
  };

  return {
    addMock: (args, returnValue) => mockReturnValues.push([args, returnValue]),
    getCalls: () => calls
  }
};

const MOCKS = [
  {
    name: "fetch",
    setup: setupFetchMock
  }
];

type Mock = {
  name: string;
  mock: SetupMock;
}

type MockResult = {
  name: string;
  calls: MockCall[];
}

const setupMocks = (): Mock[] =>
  MOCKS.map(({name, setup}) => ({
    name,
    mock: setup()
  }));

const STEP_RUNNERS = {
  render: runRenderStep,
  event: runEventStep,
  assertion: runAssertionStep,
  mock: runMockStep,
};

const runStep = (file, exportName, step, container, mocks): Promise<[string, any]> => {
  console.log(`Running step ${JSON.stringify(step)}`);

  return STEP_RUNNERS[step.type](file, exportName, step, container, mocks);
};

const setupJSDOM = () => {
  const {window} = createDOM();

  (global.document as any) = window.document;
  (global.window as any) = window;

  // https://github.com/enzymejs/enzyme/blob/master/docs/guides/jsdom.md#using-enzyme-with-jsdom
  copyProps(window, global);
};

type Result = string;
type ResultObj = {
  result: string;
}

type ResultsAndContainer = [ResultObj[], HTMLElement];

type TestResult = {
  results: ResultObj[];
  container: HTMLElement;
  mocks: MockResult[];
};

const runComponentTest = (file, exportName, testId, step): Promise<TestResult> =>
  getComponentTest(file, exportName, testId)
    .then(({steps}): Promise<[ResultsAndContainer, Mock[]]> => {
      setupJSDOM();
      const mocks = setupMocks();

      return (
        steps.reduce(
          (resultsAndContainer: Promise<ResultsAndContainer>, s: StepDefinition, idx: number): Promise<ResultsAndContainer> =>
            resultsAndContainer.then(([results, container]): Promise<ResultsAndContainer> =>
              (
                idx <= (step === undefined ? steps.length - 1 : step) &&
                !results.find(r => r.result === 'error')
              ) ?
                runStep(file, exportName, s, container, mocks)
                  .then(([result, newContainer]: [Result, HTMLElement]): ResultsAndContainer => [
                    [...results, {result}],
                    newContainer
                  ]) :
                Promise.resolve([results, container] as ResultsAndContainer)
            ),
          Promise.resolve([[], null] as ResultsAndContainer)
        ) as Promise<ResultsAndContainer>
      ).then((resultsAndContainer) => [resultsAndContainer, mocks]);
    })
    .then(([[results, container], mocks]) => ({
      results,
      container,
      mocks: mocks.map(({name, mock}) => ({
        name,
        calls: mock.getCalls()
      }))
    }));

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

const getComponentPropTypes = (modulePath, exportName) => {
  return compileModuleWithWebpack(modulePath)
    .then((compiledModulePath) => {
      const component = require(compiledModulePath)[exportName];
      return component.propTypes ? inferPropTypes(component.propTypes) : {};
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
        ({results}) => res.send(results)
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
