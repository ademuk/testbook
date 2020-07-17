const path = require("path");
const fs = require("fs");
const express = require('express');
const glob = require("glob");
const {v1: uuidv1} = require('uuid');
const {JSDOM} = require('jsdom');

const hostNodeModulesPath = `${process.cwd()}/node_modules`;

const React = require(`${hostNodeModulesPath}/react`);
const ReactDOM = require(`${hostNodeModulesPath}/react-dom`);
const {Simulate} = require(`${hostNodeModulesPath}/react-dom/test-utils`);


const findModulesWithComponents = searchPath => {
  return new Promise((resolve, reject) => {
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

        Promise.all(files.map(loadModuleWithComponents))
          .then(m =>
            m.filter(m => !m.error && m.components.length)
              .map(m => ({...m, file: m.file.replace(new RegExp(`^src${path.sep}`), '')}))
          )
          .then(resolve)
      }
    );
  });
};

const compileModuleWithWebpack = (modulePath) => {
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
      };

      return resolve(path.resolve(path.join(stats.toJson().outputPath, modulePath)));
    });
  });
};


const loadModuleWithComponents = modulePath => {
  const {window} = createDOM();
  global.document = window.document;
  global.window = window;

  return compileModuleWithWebpack(modulePath)
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
};


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


const findComponentsInModule = (module, modulePath) =>
  Object.keys(module)
    .map(
      exportName => ({
        exportName,
        returnValue: React.createElement(module[exportName])
      })
    )
    .filter(({returnValue}) => {
      const container = document.createElement('div');

      ReactDOM.render(returnValue, container);

      return !!container;
    })
    .map(
      ({exportName}) => ({name: getExportComponentName(exportName, modulePath), exportName})
    );

const getComponent = (file, exportName) =>
  getFile(file)
    .then(f => f.components.find(c => c.name === exportName));

const getComponentTests = (file, exportName) =>
  getComponent(file, exportName)
    .then(
      c => c ? c.tests : [],
      () => []
    );

const getComponentTest = (file, exportName, testId) =>
  getComponentTests(file, exportName)
    .then(t => t.find(t => t.id === testId));

const getOrCreateFileJson = (file) =>
  getFile(file)
    .catch(() => ({
      components: []
    }));

const getFile = file =>
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
  new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'http://localhost'
  });

const getOrCreateComponent = (fileJson, exportName) => {
  const component = fileJson.components.find(c => c.name === exportName);
  return component ? fileJson : {
    components: fileJson.components.concat([
      {
        name: exportName,
        tests: []
      }
    ])
  };
};


const createTest = (file, exportName) => {
  const test = {
    id: uuidv1(),
    steps: [
      {
        type: "render",
        props: {}
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
          (err, data) => {
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
      const {window} = createDOM();
      global.document = window.document;
      global.window = window;

      const {[exportName]: Component} = require(compiledModulePath);

      // https://github.com/enzymejs/enzyme/blob/master/docs/guides/jsdom.md#using-enzyme-with-jsdom
      copyProps(window, global);

      const container = document.createElement('div');

      document.body.appendChild(container);
      ReactDOM.render(
        React.createElement(
          Component,
          props,
          null
        ),
        container
      );

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

const findClickableElements = container =>
  Array.from(
    container.querySelectorAll('a, button')
  );

const renderComponentRegions = (file, exportName, testId, step) => {
  return runComponentTest(file, exportName, testId, step)
    .then(([results, container]) => {
      if (!container) {
        return [];
      }

      const elements = findClickableElements(container).map(e => ({
        name: e.textContent.trim(),
        xpath: getElementTreeXPath(e)
      }));

      return elements.map(e => ({
        ...e,
        unique: !elements.find(f => f.name === e.name && f.xpath !== e.xpath)
      }));
    });
};

const runRenderStep = (file, exportName, {props}, container) =>
  render(file, exportName, props)
    .then(
      (c) => ['success', c]
    )
    .catch(
      (e) => {
        console.error('ERROR,', e)
        return ['error', container]
      }
    );

const runEventStep = (file, exportName, {eventType, target}, container) => {
  const node = findClickableElements(container)
    .find(e => e.textContent.trim() === target);

  if (!node) {
    return Promise.resolve(
      ['error', container]
    );
  }

  Simulate[eventType](
    node
  );

  return Promise.resolve(
    ['success', container]
  );
};


function getNodeText(node) {
  if (node.matches('input[type=submit], input[type=button]')) {
    return node.value
  }

  return Array.from(node.childNodes)
    .filter(child => child.nodeType === Node.TEXT_NODE && Boolean(child.textContent))
    .map(c => c.textContent)
    .join('')
}

const queryAllByText = (container, text) => {
  return Array.from(container.querySelectorAll('*'))
    .filter(node => getNodeText(node) === text)
};

const runAssertionStep = (file, exportName, step, container) => {
  if (step.assertionType === 'textIsPresent') {
    const matches = queryAllByText(container, step.target);
    return Promise.resolve(
      [matches.length ? 'success' : 'error', container]
    );
  }

  return Promise.resolve([
    'error',
    container
  ]);
};


const STEP_RUNNERS = {
  render: runRenderStep,
  event: runEventStep,
  assertion: runAssertionStep,
};

const runStep = (file, exportName, step, container) =>
  STEP_RUNNERS[step.type](file, exportName, step, container);

const runComponentTest = (file, exportName, testId, step) =>
  getComponentTest(file, exportName, testId)
    .then(({steps}) =>
      steps.reduce((resultsAndContainer, s, idx) =>
        resultsAndContainer.then(([results, container]) =>
          (idx <= (step || steps.length - 1) && !results.find(r => r.result === 'error')) ? runStep(file, exportName, s, container)
            .then(([result, newContainer]) => [
               [...results, {result}],
              newContainer
            ]) : Promise.resolve([results, container])
        ), Promise.resolve([[], null]))
    );

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
  '/test/:testId/render/regions',
  (req, res) =>
    renderComponentRegions(path.join(SEARCH_PATH, req.query.file), req.query.exportName, req.params.testId, req.query.step)
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

app.listen(
  PORT,
  () => console.log(`Started Testbook server listening on port ${PORT}.`)
);
