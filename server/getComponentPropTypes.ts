/* eslint-disable react/forbid-foreign-prop-types */

import * as m from "module";
import { inferPropTypes } from "./propTypes";

declare global {
  interface Window {
    exportName: string;
    result: any;
  }
}

const Component = m[window.exportName];

window.result = Component.propTypes ? inferPropTypes(Component.propTypes) : {};
