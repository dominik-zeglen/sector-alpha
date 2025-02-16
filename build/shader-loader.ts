/* eslint-disable no-invalid-this, no-underscore-dangle */
import glsl from "glslify";
import glslDeps from "glslify-deps";
import fs from "fs";
import type webpack from "webpack";

// eslint-disable-next-line func-names
const loader: webpack.LoaderDefinitionFunction = function (this, content) {
  this.async();
  this.cacheable(true);

  if (content.includes("#define GLSLIFY 0")) {
    this.callback(null, `export default \`${content}\``);
    return;
  }

  const depper = glslDeps();

  const bundled = glsl(content, {
    basedir: "./",
  });

  const filenameParts = this.resourcePath.split(".");
  filenameParts.splice(1, 0, "bundled");
  const filename = filenameParts.join(".");
  console.log(`[shader-loader] Saving bundled shader ${filename}`);

  fs.writeFile(filename, bundled, () => {});

  depper.inline(content, "./", (err, tree) => {
    if (tree) {
      for (const file of tree) {
        if (!file.entry) {
          this.addDependency(file.file);
        }
      }
    }

    if (err) {
      this.callback(err, undefined);
    }

    this.callback(null, `export default \`${bundled}\``);
  });
};

export default loader;
