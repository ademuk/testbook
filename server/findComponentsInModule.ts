/* eslint-disable react/forbid-foreign-prop-types */

import React from 'react';
import ReactDOM from 'react-dom';

import {setupMocks} from "./mocks";
import * as m from 'module';

declare global {
  interface Window { result: any; }
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
  .filter(({exportName, exportedModule}) => {
    if (exportedModule.propTypes) {
      return true;
    }

    const container = document.createElement('div');

    ReactDOM.render(React.createElement(exportedModule), container);

    return !!container;
  })
  .map(
    ({exportName}) => exportName
  );
