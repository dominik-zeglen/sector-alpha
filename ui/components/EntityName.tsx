import React from "react";
import { useForm } from "react-hook-form";
import type { RequireComponent } from "@core/tsHelpers";
import Text from "@kit/Text";
import styles from "./EntityName.scss";

const EntityName: React.FC<{
  entity: RequireComponent<"name">;
  editable: boolean;
}> = ({ entity, editable }) => {
  const { register, handleSubmit, reset, getValues } = useForm();

  React.useEffect(reset, [entity]);

  const onSubmit = () => {
    entity.cp.name.value = getValues().name || "Unnamed Sector";
    reset();
  };

  if (!editable)
    return <Text className={styles.text}>{entity.cp.name.value}</Text>;

  return (
    <form autoComplete="off" onSubmit={handleSubmit(onSubmit)}>
      <input
        {...register("name", {
          onBlur: onSubmit,
        })}
        className={styles.input}
        defaultValue={entity.cp.name.value}
      />
    </form>
  );
};

export default EntityName;
