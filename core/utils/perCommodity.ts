import type { Commodity } from "../economy/commodity";
import { commodities } from "../economy/commodity";

export function perCommodity<T>(
  // eslint-disable-next-line no-unused-vars
  cb: (commodity: Commodity) => T
): Record<Commodity, T> {
  const ret = {} as Record<Commodity, T>;

  for (const commodity of commodities) {
    ret[commodity] = cb(commodity);
  }

  return ret;
}
