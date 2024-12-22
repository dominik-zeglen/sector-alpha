/* eslint-disable no-invalid-this */

import type webpack from "webpack";

// eslint-disable-next-line func-names
const loader: webpack.LoaderDefinition = function (this, content) {
  return content.replace(/usesize\((.+)\)/g, "calc($1 * var(--size))");
};

export default loader;
