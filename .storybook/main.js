import custom from "../webpack.config.ts";
import HtmlWebpackPlugin from "html-webpack-plugin";

module.exports = {
  stories: [
    "../stories/**/*.stories.mdx",
    "../stories/**/*.stories.@(js|jsx|ts|tsx)",
    "../ui/**/*.stories.tsx",
    "../ogl-engine/**/*.stories.tsx",
  ],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/react-webpack5",
    options: {},
  },
  webpackFinal: async (config) => {
    return {
      ...config,
      module: {
        ...config.module,

        rules: [
          ...config.module.rules.filter(({ test }) =>
            test ? !test.toString().includes(".css") : true
          ),
          ...custom.module.rules,
        ],
      },
      resolve: {
        ...config.resolve,
        plugins: custom.resolve.plugins,
      },
      plugins: [
        ...config.plugins,
        ...custom.plugins.filter(
          (plugin) => !(plugin instanceof HtmlWebpackPlugin)
        ),
      ],
    };
  },
};
