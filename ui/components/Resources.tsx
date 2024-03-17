import React from "react";
import type { Sector } from "@core/archetypes/sector";
import { getSectorResources } from "@core/utils/resources";
import { Table, TableCell } from "@kit/Table";
import { commodityLabel } from "@core/economy/commodity";
import SectorResources from "./SectorStats";

const Resources: React.FC<{ entity: Sector }> = ({ entity }) => {
  if (!entity.sim.paths) return null;

  const fieldsByType = getSectorResources(entity, 0);
  if (!fieldsByType) return null;

  return (
    <>
      <Table>
        <thead>
          <tr>
            <TableCell>Name</TableCell>
            <TableCell>Available</TableCell>
            <TableCell>Max</TableCell>
          </tr>
        </thead>
        <tbody>
          {Object.entries(fieldsByType).map(
            ([commodity, resources]) =>
              resources.max > 0 && (
                <tr key={commodity}>
                  <TableCell>{commodityLabel[commodity]}</TableCell>
                  <TableCell>
                    {resources.available.toFixed(0)} (
                    {((resources.available / resources.max) * 100).toFixed(0)}%)
                  </TableCell>
                  <TableCell>{resources.max.toFixed(0)}</TableCell>
                </tr>
              )
          )}
        </tbody>
      </Table>
      <SectorResources entity={entity} />
    </>
  );
};

export default Resources;
