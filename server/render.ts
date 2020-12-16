import React from "react";
import ReactDOM from "react-dom";
import { act } from "react-dom/test-utils";
import * as m from "module";

declare global {
  interface Window {
    exportName: string;
    props: { [key: string]: any };
    wrapperExportName: string;
    wrapperProps: string;
    error: [Error, { componentStack: string }];
  }
}

const Component = m[window.exportName];

type State = {
  error: Error;
};

class ErrorBoundary extends React.Component<{}, State> {
  constructor(props) {
    super(props);

    this.state = {
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      error,
    };
  }

  componentDidCatch(error, errorInfo) {
    window.error = [error, errorInfo];
  }

  render() {
    return !this.state.error && this.props.children;
  }
}

const getWrapperComponent = () => {
  if (window.wrapperExportName) {
    // @ts-ignore
    return import("wrapper").then((module) => module[window.wrapperExportName]);
  }

  return Promise.resolve();
};

window.result = getWrapperComponent().then((WrapperComponent) => {
  act(() => {
    ReactDOM.render(
      React.createElement(
        ErrorBoundary,
        null,
        WrapperComponent
          ? React.createElement(
              WrapperComponent,
              window.wrapperProps,
              React.createElement(Component, window.props)
            )
          : React.createElement(Component, window.props)
      ),
      window.container,
      () => {
        if (window.error) {
          throw window.error;
        }
      }
    );
  });
});
