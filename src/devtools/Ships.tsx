import React from "react";
import throttle from "lodash/throttle";
import {
  useForm,
  useWatch,
  FormProvider,
  useFormContext,
  useFieldArray,
} from "react-hook-form";
import { nano, theme } from "../style";
import { shipClasses, ShipInput } from "../world/ships";
import { Input, LabeledInput } from "../ui/components/Input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleSummary,
} from "../ui/components/Collapsible";
import { Button } from "../ui/components/Button";
import { limitMax } from "../utils/limit";

type FormData = { ships: ShipInput[] };

function useThrottledFormState<T>(name?: string): T {
  const data = useWatch(name ? { name } : undefined!);
  const [display, setDisplay] = React.useState<T>();
  const refreshDisplay = React.useCallback(throttle(setDisplay, 500), []);

  React.useEffect(() => {
    refreshDisplay(data);
  }, [data]);

  return display!;
}

const styles = nano.sheet({
  editorContainer: {
    overflowY: "scroll",
    padding: theme.spacing(1),
  },
  editor: {
    "& input": {
      width: "100%",
    },
    display: "grid",
    gridTemplateColumns: "200px 200px 240px 160px 100px 50px",
    gap: theme.spacing(2),
    marginLeft: 0,
  },
  root: {
    display: "grid",
    gridTemplateColumns: "1fr 300px",
    height: "100vh",
  },
  viewer: {
    "json-viewer": {
      "--background-color": "transparent",
    },
    borderLeft: `1px solid ${theme.palette.default}`,
    padding: theme.spacing(1),
    overflowY: "scroll",
    fontFamily: "monospace",
    lineBreak: "anywhere",
  },
  column: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1),
    padding: `${theme.spacing(1)} 0`,
  },
  copy: {
    width: "100%",
    marginBottom: theme.spacing(2),
  },
  add: {
    marginBottom: theme.spacing(2),
  },
});

/**
 * Expressed in seconds
 */
function getShipTravelTime(ship: ShipInput, distance: number): number {
  if (
    [ship.acceleration, ship.cruise, ship.maneuver].some(
      (v) => Number.isNaN(v) || v <= 0
    )
  ) {
    return NaN;
  }

  const resolution = distance / 100;
  let moved = 0;
  let speed = 0;
  let cycles = 0;

  // Inspired by Verlet integration
  for (; moved < distance && cycles * resolution < ship.ttc; cycles++) {
    moved += speed * resolution;
    speed = limitMax(
      speed + ship.maneuver * ship.acceleration * resolution,
      ship.maneuver
    );
  }

  for (; moved < distance; cycles++) {
    moved += speed * resolution;
    speed = limitMax(
      speed + ship.cruise * ship.acceleration * resolution,
      ship.cruise
    );
  }

  return cycles * resolution;
}

/**
 * Expressed in units per second
 */
function getShipTravelSpeed(ship: ShipInput, distance: number): number {
  return distance / getShipTravelTime(ship, distance);
}

/**
 * Expressed in storage kilounits per hour
 */
function getShipStorageEfficiency(ship: ShipInput, distance: number): number {
  return (ship.storage / getShipTravelTime(ship, distance)) * 3.6;
}

/**
 * Expressed in storage kilounits per hour
 */
function getShipMiningEfficiency(ship: ShipInput, distance: number): number {
  if (ship.mining === 0) {
    return 0;
  }

  return (
    (ship.storage /
      (getShipTravelTime(ship, distance) * 2 + ship.storage / ship.mining)) *
    3.6
  );
}

// eslint-disable-next-line no-unused-vars
function withDistance(cb: (distance: number) => any): string {
  return [10, 100, 1000, 10000].map(cb).join("/");
}

const JSONOutput: React.FC = () => {
  const data = useThrottledFormState<FormData>();
  const display = React.useMemo(
    () => (data ? JSON.stringify(Object.values(data!)[0]) : null),
    [data]
  );

  return (
    <div className={styles.viewer}>
      <Button
        className={styles.copy}
        onClick={() => {
          navigator.clipboard.writeText(display!);
        }}
      >
        Copy
      </Button>
      {/* @ts-expect-error */}
      <json-viewer data={display} />
    </div>
  );
};

const ShipEditor: React.FC<{ index: number }> = ({ index }) => {
  const { register, getValues } = useFormContext<FormData>();
  const ship = useThrottledFormState<ShipInput>(`ships.${index.toString()}`);

  if (!ship) {
    return null;
  }

  return (
    <Collapsible>
      <CollapsibleSummary className={styles.editor}>
        <Input
          {...register(`ships.${index}.name`)}
          defaultValue={getValues().ships[index].name}
        />
        <div>
          Speed [su/s]
          <br />
          {withDistance((d) => getShipTravelSpeed(ship, d).toFixed(2))}
        </div>
        <div>
          Storage [Ksu/h]
          <br />
          {withDistance((d) => getShipStorageEfficiency(ship, d).toFixed(2))}
        </div>
        <div>
          Mining [Ksu/h]
          <br />
          {withDistance((d) => getShipMiningEfficiency(ship, d).toFixed(2))}
        </div>
      </CollapsibleSummary>
      <CollapsibleContent className={styles.editor}>
        <div />
        <div className={styles.column}>
          <LabeledInput
            {...register(`ships.${index}.acceleration`, {
              valueAsNumber: true,
            })}
            label="Acceleration"
            defaultValue={getValues().ships[index].acceleration}
            type="number"
            max={1}
            min={0.01}
            step={0.01}
          />
          <LabeledInput
            {...register(`ships.${index}.cruise`, {
              valueAsNumber: true,
            })}
            label="Cruise"
            defaultValue={getValues().ships[index].cruise}
            type="number"
          />
          <LabeledInput
            {...register(`ships.${index}.maneuver`, {
              valueAsNumber: true,
            })}
            label="Maneuver"
            defaultValue={getValues().ships[index].maneuver}
            type="number"
          />
          <LabeledInput
            {...register(`ships.${index}.rotary`, {
              valueAsNumber: true,
            })}
            label="Rotary"
            defaultValue={getValues().ships[index].rotary}
            type="number"
          />
          <LabeledInput
            {...register(`ships.${index}.ttc`, { valueAsNumber: true })}
            label="Time to cruise"
            defaultValue={getValues().ships[index].ttc}
            type="number"
          />
        </div>
        <div className={styles.column}>
          <LabeledInput
            {...register(`ships.${index}.storage`, {
              valueAsNumber: true,
            })}
            label="Storage"
            defaultValue={getValues().ships[index].storage}
            type="number"
          />
        </div>
        <div className={styles.column}>
          <LabeledInput
            {...register(`ships.${index}.mining`, {
              valueAsNumber: true,
            })}
            label="Mining"
            defaultValue={getValues().ships[index].mining}
            type="number"
          />
        </div>
        <div className={styles.column}>
          <LabeledInput
            {...register(`ships.${index}.texture`)}
            label="Texture"
            defaultValue={getValues().ships[index].texture}
          />
        </div>
        <div className={styles.column}>
          <LabeledInput
            {...register(`ships.${index}.size`)}
            label="Size"
            defaultValue={getValues().ships[index].size}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

const Editor: React.FC<{}> = () => {
  const { getValues, control } = useFormContext<FormData>();
  const { append } = useFieldArray({ control, name: "ships" });
  const [ships, setShips] = React.useState(getValues().ships);

  return (
    <div className={styles.editorContainer}>
      <Button
        onClick={() => {
          append({
            cruise: 0,
            maneuver: 0,
            rotary: 0,
            ttc: 0,
            name: "New Ship",
            size: "medium",
            storage: 0,
            texture: "mCiv",
          });
          setShips(getValues().ships);
        }}
        className={styles.add}
      >
        + Add new
      </Button>
      {Object.values(ships).map((_, shipIndex) => (
        <ShipEditor index={shipIndex} key={shipIndex} />
      ))}
    </div>
  );
};

export const Ships: React.FC = () => {
  const form = useForm<FormData>({
    defaultValues: { ships: shipClasses },
  });

  return (
    <FormProvider {...form}>
      <div className={styles.root}>
        <Editor />
        <JSONOutput />
      </div>
    </FormProvider>
  );
};
