import React from "react";
import ReactDOM from "react-dom";
import {act} from "react-dom/test-utils";
import * as m from 'module';

declare global {
  interface Window {
    exportName: string;
    props: {[key: string]: any};
    error: [Error, {componentStack: string}];
  }
}

const Component = m[window.exportName];

type State = {
  error: Error
}

class ErrorBoundary extends React.Component<{}, State> {
  constructor(props) {
    super(props);

    this.state = {
      error: null
    }
  }

  static getDerivedStateFromError(error) {
    return {
      error
    }
  }

  componentDidCatch(error, errorInfo) {
    window.error = [error, errorInfo];
  }

  render() {
    return !this.state.error && this.props.children;
  }
}

window.result = new Promise((resolve, reject) =>
  act(() => {
    ReactDOM.render(
      React.createElement(
        ErrorBoundary,
        null,
        React.createElement(
          Component,
          window.props
        )
      ),
      window.container,
      () => window.error ? reject(window.error) : resolve()
    );
  })
);
