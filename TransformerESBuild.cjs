const { transformSync } = require("esbuild");
const tsconfig = require("./tsconfig.json");

const defaultOptions = {
  format: "cjs",
};

module.exports = {
  createTransformer(userOptions) {
    return {
      canInstrument: true,
      process(sourceText, sourcePath) {
        const options = {
          ...defaultOptions,
          ...userOptions,
          tsconfigRaw: tsconfig,
          sourcefile: sourcePath,
        };
        const { code, map } = transformSync(sourceText, options);
        return { code, map };
      },
    };
  },
};
