module.exports = {
  setupFiles: ["jest-canvas-mock"],
  testEnvironment: "jsdom",
  resetMocks: false,
  transform: {
    "^.+\\.(jsx?|tsx?)$": [
      "<rootDir>/TransformerESBuild.cjs",
      {
        sourcemap: "inline",
        target: "chrome112",
        loader: "tsx",
      },
    ],
    ".+\\.(svg|css|styl|less|sass|scss|png|jpg|ttf|woff|woff2|yml)$":
      "jest-transform-stub",
  },
  transformIgnorePatterns: ["/node_modules/(?!(ogl)/)"],
  testRegex: ".*\\.test\\.tsx?$",
  moduleFileExtensions: ["ts", "tsx", "js"],
  moduleNameMapper: {
    "@core/(.*)$": "<rootDir>/core/$1",
  },
};
