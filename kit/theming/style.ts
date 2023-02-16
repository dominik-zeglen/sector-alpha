import React from "react";
import Color from "color";
import fromPairs from "lodash/fromPairs";
import isObject from "lodash/isObject";

import "./global.scss";

const spacings = [0.25, 0.5, 0.75, 1, 2, 3, 4, 8] as const;
const texts = [1, 2, 3, 4, 5] as const;

export interface Theme {
  spacing: Record<(typeof spacings)[number], string>;
  palette: {
    background: string;
    default: string;
    text: Record<(typeof texts)[number], string>;
    disabled: string;
    border: string;
    warning: string;
    error: string;
    success: string;
  };
  typography: {
    button: string;
    label: string;
    default: string;
    header: string;
    header2: string;
  };
}

export function createTheme(scale: number): Theme {
  const baseFontSize = 14 * scale;
  const baseSpacing = 8 * scale;

  return {
    spacing: fromPairs(
      spacings.map((n) => [n, `${n * baseSpacing}px`])
    ) as Record<(typeof spacings)[number], string>,
    palette: {
      background: "#000000",
      default: "#FFFFFF",
      text: fromPairs(
        texts.map((v) => [v, Color.hsl(0, 0, 100 - (v - 1) * 20).hex()])
      ) as Record<(typeof texts)[number], string>,
      disabled: Color.hsl(0, 0, 70).hex(),
      border: Color.hsl(0, 0, 60).hex(),
      warning: "#ffe645",
      error: "#ff5b45",
      success: "#52fa6e",
    },
    typography: {
      button: `${baseFontSize * 0.875}px`,
      label: `${baseFontSize * 0.875}px`,
      default: `${baseFontSize}px`,
      header: `${Math.ceil(baseFontSize * 1.3 ** 2)}px`,
      header2: `${Math.ceil(baseFontSize * 1.3)}px`,
    },
  };
}

function getProperties(
  o: Object,
  prefix = ""
): Array<{ key: string; value: string }> {
  return Object.entries(o).flatMap(([k, v]) => {
    if (isObject(v)) {
      return getProperties(v, `${prefix + k}-`);
    }
    return { key: prefix + k, value: v };
  });
}

export const Styles: React.FC = ({ children }) => {
  const [scale] = React.useState(1);
  const theme = React.useMemo(() => createTheme(scale), [scale]);
  const cssVariables = React.useRef(
    document.querySelector("style[data-css-variables]")
  );

  React.useEffect(() => {
    if (!cssVariables.current) {
      const styleTag = document.createElement("style");
      styleTag.setAttribute("data-css-variable", "true");
      document.head.append(styleTag);
      cssVariables.current = styleTag;
    }

    cssVariables.current!.innerHTML = `:root { ${getProperties(theme)
      .map(({ key, value }) => `--${key.replace(/\./g, "-")}: ${value};`)
      .join(" ")} }`;
  }, [theme]);

  return children as any;
};

const documentStyles = getComputedStyle(document.documentElement);
export function getVar(varName: string): string {
  return documentStyles.getPropertyValue(varName).trim();
}
