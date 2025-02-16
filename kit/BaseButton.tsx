import React from "react";
import { useGameSettings } from "@ui/hooks/useGameSettings";
import type { Howl } from "howler";
import sounds from "@assets/ui/sounds";

export type BaseButtonProps = React.DetailedHTMLProps<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  HTMLButtonElement
> & {
  clickSound?: Howl;
  enterSound?: Howl;
};

export const BaseButton: React.FC<BaseButtonProps> = ({
  onClick,
  onMouseEnter,
  clickSound: clickSoundProp,
  enterSound,
  ...props
}) => {
  const [settings] = useGameSettings();
  const ref = React.useRef<HTMLButtonElement>(null);

  return (
    <button
      type="button"
      {...props}
      ref={ref}
      onClick={(event) => {
        const sound = clickSoundProp ?? sounds.click;
        sound.volume(settings.volume.ui);
        sound.play();

        onClick?.(event);
      }}
      onMouseEnter={(event) => {
        const sound = enterSound ?? sounds.pop;
        sound.volume(settings.volume.ui);
        sound.play();

        if (onMouseEnter) {
          onMouseEnter(event);
        }
      }}
      onMouseUp={() => {
        ref.current?.blur();
      }}
    />
  );
};
BaseButton.displayName = "BaseButton";
