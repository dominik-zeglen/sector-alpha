import { Disclosure } from "@headlessui/react";
import React from "react";
import { nano } from "../ui/style";

const styles = nano.sheet({
  root: {
    marginBottom: "var(--spacing-1)",
  },
  header: {
    marginBottom: "4px",
    cursor: "pointer",
  },
  body: {
    marginLeft: "var(--spacing-3)",
  },
});

export const Collapsible: React.FC<React.HTMLAttributes<HTMLDivElement>> = (
  props
) => <Disclosure {...props} as="div" className={styles.root} />;

export const CollapsibleSummary: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = (props) => (
  <Disclosure.Button {...props} as="div" className={styles.header} />
);

export const CollapsibleContent: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = (props) => <Disclosure.Panel {...props} as="div" className={styles.body} />;
