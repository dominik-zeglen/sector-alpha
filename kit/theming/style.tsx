import React from "react";
import Color from "color";
import fromPairs from "lodash/fromPairs";
import isObject from "lodash/isObject";

import "./global.scss";
import { useGameSettings } from "@ui/hooks/useGameSettings";

const texts = [1, 2, 3, 4, 5] as const;

export interface Theme {
  palette: {
    background: string;
    "background-active": string;
    default: string;
    text: Record<(typeof texts)[number], string>;
    disabled: string;
    border: string;
    warning: string;
    error: string;
    success: string;
    active: string;
    primary: string;
    blue: string;
    "debug-error": string;
  };
  typography: {
    button: string;
    caption: string;
    label: string;
    table: string;
    default: string;
    header: string;
    header2: string;
    header3: string;
    header4: string;
    header5: string;
    header6: string;
  };
  z: {
    tooltip: number;
  };
}

export function usesize(size: number): string {
  return `calc(var(--size) * ${size})`;
}

const getColor = (v: number): string =>
  Color.hsl(0, 0, (100 - (v - 1) * 20) * 0.85).hex();

export function createTheme(): Theme {
  const baseFontSize = 1.4;

  return {
    palette: {
      background: "#080808",
      "background-active": "#1e1e1e",
      default: "#FFFFFF",
      text: fromPairs(texts.map((v) => [v, getColor(v)])) as Record<
        (typeof texts)[number],
        string
      >,
      disabled: getColor(4),
      border: Color.hsl(0, 0, 60).hex(),
      warning: "#ffe645",
      error: "#ff5b45",
      success: "#52fa6e",
      primary: "#f7c14a",
      active: "#f7c14a",
      blue: "#328bcf",
      "debug-error": "#ff5b4522",
    },
    typography: {
      button: usesize(baseFontSize * 0.875),
      caption: usesize(baseFontSize * 0.75),
      label: usesize(baseFontSize * 0.875),
      table: usesize(baseFontSize * 0.8),
      default: usesize(baseFontSize),
      header: usesize(baseFontSize * 1.3 ** 2),
      header2: usesize(baseFontSize * 1.3),
      header3: usesize(baseFontSize * 1.2),
      header4: usesize(baseFontSize * 1.1),
      header5: usesize(baseFontSize * 1.1),
      header6: usesize(baseFontSize * 1.1),
    },
    z: {
      tooltip: 100,
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

export const Styles: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [settings] = useGameSettings();
  const theme = React.useMemo(() => createTheme(), []);
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

    cssVariables.current!.innerHTML = `:root { ${[
      `--size: ${settings.scale}px;`,
      ...getProperties(theme).map(
        ({ key, value }) => `--${key.replace(/\./g, "-")}: ${value};`
      ),
    ].join(" ")} }`;
  }, [theme, settings.scale]);

  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{children}</>;
};

const documentStyles = getComputedStyle(document.documentElement);
export function getVar(varName: string): string {
  return documentStyles.getPropertyValue(varName).trim();
}
