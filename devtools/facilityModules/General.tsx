import React from "react";
import { useFormContext } from "react-hook-form";
import { Select, SelectButton, SelectOption, SelectOptions } from "@kit/Select";
import { useThrottledFormState } from "@devtools/utils";
import { FacilityModuleInput } from "@core/archetypes/facilityModule";
import { Table, TableCell, TableHeader } from "../components/Table";
import { FormData } from "./utils";

const FacilityModuleGeneralEditor: React.FC<{ index: number }> = ({
  index,
}) => {
  const { register, setValue } = useFormContext<FormData>();
  const facilityModule = useThrottledFormState<FacilityModuleInput>(
    `facilityModules.${index.toString()}`
  );

  if (!facilityModule) {
    return null;
  }

  return (
    <tr>
      <TableCell />
      <TableCell>
        <input
          {...register(`facilityModules.${index}.name`)}
          defaultValue={facilityModule.name}
        />
      </TableCell>
      <TableCell>
        <input
          {...register(`facilityModules.${index}.slug`)}
          defaultValue={facilityModule.slug}
        />
      </TableCell>
      <TableCell>
        <Select
          value={facilityModule.type}
          onChange={(value) => setValue(`facilityModules.${index}.type`, value)}
        >
          <SelectButton>{facilityModule.type}</SelectButton>
          <SelectOptions>
            <SelectOption value="production">Production</SelectOption>
            <SelectOption value="storage">Storage</SelectOption>
            <SelectOption value="shipyard">Shipyard</SelectOption>
            <SelectOption value="teleport">Teleport</SelectOption>
            <SelectOption value="habitat">Habitat</SelectOption>
          </SelectOptions>
        </Select>
      </TableCell>
      <TableCell>
        {facilityModule.type === "storage" && (
          <input
            {...register(`facilityModules.${index}.storage`)}
            defaultValue={facilityModule.storage}
          />
        )}
      </TableCell>
    </tr>
  );
};

export const GeneralEditor: React.FC<{
  facilityModules: FacilityModuleInput[];
}> = ({ facilityModules }) => (
  <Table>
    <colgroup>
      <col style={{ width: "48px" }} />
      <col style={{ width: "250px" }} />
      <col style={{ width: "250px" }} />
      <col style={{ width: "200px" }} />
      <col style={{ width: "150px" }} />
      <col />
    </colgroup>
    <thead>
      <tr>
        {/* eslint-disable-next-line jsx-a11y/control-has-associated-label */}
        <th colSpan={2} />
        <TableHeader>Slug</TableHeader>
        <TableHeader>Type</TableHeader>
        <TableHeader>Storage</TableHeader>
      </tr>
    </thead>
    <tbody>
      {Object.values(facilityModules).map((_, facilityModuleIndex) => (
        <FacilityModuleGeneralEditor
          index={facilityModuleIndex}
          key={facilityModuleIndex}
        />
      ))}
    </tbody>
  </Table>
);
