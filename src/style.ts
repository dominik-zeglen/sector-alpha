import React, { createElement } from "react";
import { create, CssLikeObject, NanoRenderer } from "nano-css";
import { addon as addonSheet } from "nano-css/addon/sheet";
import { addon as addonRule } from "nano-css/addon/rule";
import { addon as addonNesting } from "nano-css/addon/nesting";
import { addon as addonJsx } from "nano-css/addon/jsx";
import { addon as addonCache } from "nano-css/addon/cache";
import { addon as addonGlobal } from "nano-css/addon/global";
import Color from "color";
import type { MineableCommodity } from "./economy/commodity";

/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
export const nano = create({
  h: createElement,
}) as NanoRenderer &
  Required<Pick<NanoRenderer, "sheet" | "rule" | "global">> & {
    jsx: <T extends keyof HTMLElementTagNameMap>(
      el: T,
      styles: CssLikeObject
    ) => React.FC<React.HTMLAttributes<T>>;
  };
/* eslint-enable no-unused-vars */
/* eslint-enable no-undef */

addonRule(nano);
addonSheet(nano);
addonNesting(nano);
addonCache(nano);
addonJsx(nano);
addonGlobal(nano);

const isMobile = window.innerWidth < 1000;
const baseFontSize = isMobile ? 14 : 16;
export const theme = {
  isMobile,
  spacing: (n: number) => `${n * (isMobile ? 6 : 8)}px`,
  palette: {
    asteroids: {
      fuelium: "#ffab6b",
      goldOre: "#ffe46b",
      ice: "#e8ffff",
      ore: "#ff5c7a",
      silica: "#8f8f8f",
    } as Record<MineableCommodity, string>,
    default: "#FFFFFF",
    text: (v: 1 | 2 | 3 | 4 | 5) => Color.hsl(0, 0, 100 - (v - 1) * 20).hex(),
    disabled: Color.hsl(0, 0, 70).hex(),
  },
  typography: {
    button: `${baseFontSize - 2}px`,
    label: `${baseFontSize - 2}px`,
    default: `${baseFontSize}px`,
    header: `${Math.ceil(baseFontSize * 1.3 ** 2)}px`,
    header2: `${Math.ceil(baseFontSize * 1.3)}px`,
  },
};

nano.global({
  "*": {
    boxSizing: "border-box",
    // eslint-disable-next-line quotes
    fontFamily: '"Space Mono", monospace',
  },
  "html, body": {
    backgroundColor: "black",
    color: "white",
    margin: 0,
    overscrollBehaviorY: "none",
    fontSize: theme.typography.default,
  },
  label: {
    display: "block",
  },
  th: {
    textAlign: "left",
    padding: 0,
    fontSize: theme.typography.default,
  },
  "#root": {
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
  },
  "#canvasRoot": {
    width: "100%",
    height: "100vh",
  },
});
