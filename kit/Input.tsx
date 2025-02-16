import clsx from "clsx";
import React from "react";
import sounds from "@assets/ui/sounds";
import styles from "./Input.scss";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.DetailedHTMLProps<
    React.InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  >
>(({ onMouseEnter, ...props }, ref) => (
  <input
    {...props}
    ref={ref}
    // eslint-disable-next-line react/destructuring-assignment
    className={clsx(styles.root, props?.className)}
    onMouseEnter={(event) => {
      sounds.pop.play();
      if (onMouseEnter) {
        onMouseEnter(event);
      }
    }}
  />
));
Input.displayName = "Input";

export const LabeledInput = React.forwardRef<
  HTMLInputElement,
  React.DetailedHTMLProps<
    React.InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  > & { label: string }
>(({ id, label, ...props }, ref) => (
  <div>
    <label className={styles.label} htmlFor={id}>
      {label}
    </label>
    <Input {...props} ref={ref} />
  </div>
));
LabeledInput.displayName = "LabeledInput";
