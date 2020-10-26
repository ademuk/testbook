import React from "react";
import ReactDOM from "react-dom";
import {act} from "react-dom/test-utils";
import * as m from 'module';

declare global {
  interface Window {
    exportName: string;
    props: {[key: string]: any};
  }
}

const Component = m[window.exportName];


act(() => {
  ReactDOM.render(
    React.createElement(
      Component,
      window.props,
      null
    ),
    window.container
  );
});
