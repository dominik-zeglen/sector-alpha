import type { Commodity } from "@core/economy/commodity";
import { commoditiesArray, commodityLabel } from "@core/economy/commodity";
import {
  Dropdown,
  DropdownButton,
  DropdownOption,
  DropdownOptions,
} from "@kit/Dropdown";
import { IconButton } from "@kit/IconButton";
import React from "react";
import { useLocalStorage } from "@ui/hooks/useLocalStorage";
import sortBy from "lodash/sortBy";
import clsx from "clsx";
import { relationThresholds } from "@core/components/relations";
import { RedoIcon } from "@assets/ui/icons";
import { useGameStore } from "@ui/state/game";
import { useSim } from "../../atoms";
import styles from "./TradeFinder.scss";

export const TradeFinder: React.FC = () => {
  const [sim] = useSim();
  const [selectedCommodity, setSelectedCommodity] = useLocalStorage<Commodity>(
    "TradeFinder",
    "fuel"
  );
  const sortedOffers = React.useMemo(
    () =>
      sortBy(
        sim.index.trading
          .get()
          .filter(
            (entity) =>
              entity.cp.trade.offers[selectedCommodity].active &&
              entity.cp.trade.offers[selectedCommodity].quantity > 0 &&
              sim.index.player.get()[0].cp.relations.values[
                entity.cp.owner.id
              ] > relationThresholds.trade &&
              entity.tags.has("discovered")
          ),
        `components.trade.offers.${selectedCommodity}.price`
      ),
    [sim.index.trading.get()]
  );
  const [, gameStore] = useGameStore(() => []);

  return (
    <>
      <Dropdown>
        <DropdownButton>
          {selectedCommodity
            ? commodityLabel[selectedCommodity]
            : "Find resource..."}
        </DropdownButton>
        <DropdownOptions>
          {commoditiesArray.map((commodity) => (
            <DropdownOption
              key={commodity}
              onClick={() => setSelectedCommodity(commodity)}
            >
              {commodityLabel[commodity]}
            </DropdownOption>
          ))}
        </DropdownOptions>
      </Dropdown>
      <div className={styles.facilities}>
        {sortedOffers.length === 0
          ? "No offers on the market"
          : sortedOffers.map((entity) => (
              <div className={styles.facilitiesItem} key={entity.id}>
                <span>{entity.cp.name!.value}</span>
                <span
                  className={clsx(
                    styles.facilitiesItemPrice,
                    entity.cp.trade.offers[selectedCommodity].type === "buy"
                      ? styles.facilitiesItemPriceBuy
                      : styles.facilitiesItemPriceSell
                  )}
                >
                  {entity.cp.trade.offers[selectedCommodity].price} UTT
                </span>
                <IconButton
                  variant="naked"
                  onClick={() => {
                    gameStore.setSelectedUnits([entity]);
                  }}
                  onDoubleClick={gameStore.focus}
                >
                  <RedoIcon />
                </IconButton>
              </div>
            ))}
      </div>
    </>
  );
};

TradeFinder.displayName = "TradeFinder";
