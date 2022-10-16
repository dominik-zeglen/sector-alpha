import React from "react";
import { useForm } from "react-hook-form";
import { RequireComponent } from "@core/tsHelpers";
import styles from "./EntityName.scss";

const EntityName: React.FC<{ entity: RequireComponent<"name"> }> = ({
  entity,
}) => {
  const { register, handleSubmit, reset, getValues } = useForm();

  React.useEffect(reset, [entity]);

  const onSubmit = () => {
    entity.cp.name.value = getValues().name || "Unnamed Sector";
    reset();
  };

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
