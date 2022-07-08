import React from "react";
import { commodities } from "../../economy/commodity";
import { RequireComponent } from "../../tsHelpers";
import { Table, TableCell } from "./Table";

export interface OffersProps {
  entity: RequireComponent<"storage" | "trade">;
}

export const Offers: React.FC<OffersProps> = ({ entity }) => {
  const { compoundProduction, trade, storage } = entity.cp;
  const offered = Object.values(commodities)

    .map((commodity) => ({
      commodity,
      ...(compoundProduction?.pac[commodity] ?? {}),
      ...trade.offers[commodity],
      stored: storage.availableWares[commodity],
    }))
    .filter(
      (data) => data.quantity || data.stored || data.produces || data.consumes
    );

  return (
    <Table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Stored</th>
          <th>Offer</th>
          <th>Unit Price</th>
        </tr>
      </thead>
      <tbody>
        {offered.length === 0 ? (
          <tr>
            <TableCell>-</TableCell>
            <TableCell>-</TableCell>
            <TableCell>-</TableCell>
            <TableCell>-</TableCell>
          </tr>
        ) : (
          offered.map((data) => (
            <tr key={data.commodity}>
              <TableCell>{data.commodity}</TableCell>
              <TableCell>{data.stored}</TableCell>
              <TableCell>{data.quantity}</TableCell>
              <TableCell>{data.price}</TableCell>
            </tr>
          ))
        )}
      </tbody>
    </Table>
  );
};
