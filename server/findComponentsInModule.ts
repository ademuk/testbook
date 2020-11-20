/* eslint-disable react/forbid-foreign-prop-types */

import React from 'react';
import ReactDOM from 'react-dom';

import {setupMocks} from "./mocks";
import * as m from 'module';

declare global {
  interface Window {
    result: any;
  }
}

setupMocks();

const loadedModule: {
  [key: string]: any
} = m;

window.result = Object.keys(loadedModule)
  .map(
    exportName => ({
      exportName,
      exportedModule: loadedModule[exportName]
    })
  )
  .map(({exportName, exportedModule}) => {
    console.log(`Loading ${exportName}`)
    if (exportedModule.propTypes) {
      return true;
    }

    const container = document.createElement('div');

    try {
      ReactDOM.render(React.createElement(exportedModule, {}), container);
    } catch(e) {
      console.log(`Error rendering ${exportName}: ${e}`)
      return [exportName, false, e];
    }

    return [exportName, !!container, null];
  });
