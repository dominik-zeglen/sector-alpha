import clsx from "clsx";
import React from "react";
import sounds from "@assets/ui/sounds";
import styles from "./Checkbox.scss";

export const Checkbox: React.FC<
  React.DetailedHTMLProps<
    React.InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  >
> = ({ onClick, onMouseEnter, ...props }) => {
  const ref = React.useRef<HTMLInputElement>(null);

  return (
    <input
      type="checkbox"
      {...props}
      ref={ref}
      onClick={(event) => {
        sounds.click.play();
        if (onClick) {
          onClick(event);
        }
      }}
      onMouseEnter={(event) => {
        sounds.pop.play();
        if (onMouseEnter) {
          onMouseEnter(event);
        }
      }}
      onMouseUp={() => {
        ref.current?.blur();
      }}
      // eslint-disable-next-line react/destructuring-assignment
      className={clsx(styles.root, props?.className)}
    />
  );
};
Checkbox.displayName = "Checkbox";
