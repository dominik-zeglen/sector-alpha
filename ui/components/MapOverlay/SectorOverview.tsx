import { useStrategicMapStore } from "@ui/state/strategicMap";
import React, { memo, useMemo } from "react";
import { AnimatedBackdrop } from "@kit/AnimatedBackdrop";
import { Card } from "@kit/Card";
import { Button } from "@kit/Button";
import Text from "@kit/Text";
import { useSim } from "@ui/atoms";
import { entries, filter, flatMap, map, pipe, toArray, uniq } from "@fxts/core";
import { commodityLabel } from "@core/economy/commodity";
import type { Faction } from "@core/archetypes/faction";
import { relationThresholds } from "@core/components/relations";
import { gameStore } from "@ui/state/game";
import styles from "./styles.scss";

export interface SectorOverviewProps {}

export const SectorOverview: React.FC<SectorOverviewProps> = memo(() => {
  const [sim] = useSim();
  const [[currentSector]] = useStrategicMapStore((store) => [store.selected]);
  const knownFacilities = useMemo(() => {
    if (!currentSector) return [];

    return pipe(
      sim.index.facilities.getIt(),
      filter(
        (f) =>
          f.cp.position.sector === currentSector.id && f.tags.has("discovered")
      ),
      toArray
    );
  }, [currentSector]);
  const tradedResources = useMemo(() => {
    const sold = pipe(
      knownFacilities,
      filter((f) =>
        f.cp.owner
          ? sim.getOrThrow<Faction>(f.cp.owner.id).cp.relations.values[
              sim.index.player.get()[0].id
            ] >= relationThresholds.trade
          : false
      ),
      flatMap((f) =>
        f.cp.trade?.offers
          ? pipe(
              f.cp.trade.offers,
              entries,
              filter(([_, offer]) => offer.active && offer.type === "sell"),
              map(([commodity]) => commodity)
            )
          : []
      ),
      uniq,
      toArray
    );
    const bought = pipe(
      knownFacilities,
      filter((f) =>
        f.cp.owner
          ? sim.getOrThrow<Faction>(f.cp.owner.id).cp.relations.values[
              sim.index.player.get()[0].id
            ] >= relationThresholds.trade
          : false
      ),
      flatMap((f) =>
        f.cp.trade?.offers
          ? pipe(
              f.cp.trade.offers,
              entries,
              filter(([_, offer]) => offer.active && offer.type === "buy"),
              map(([commodity]) => commodity)
            )
          : []
      ),
      uniq,
      toArray
    );

    return { sold, bought };
  }, [knownFacilities]);

  if (!currentSector) return null;

  return (
    <Card className={styles.sector}>
      <AnimatedBackdrop>
        <Text variant="h6" className={styles.sectorHeader}>
          {currentSector.cp.name.value}
        </Text>
        {/* <hr /> */}
        <Text>Known facilities: {knownFacilities.length}</Text>
        <Text>
          Sold:{" "}
          {tradedResources.sold.map((c) => commodityLabel[c]).join(", ") || "?"}
        </Text>
        <Text>
          Bought:{" "}
          {tradedResources.bought.map((c) => commodityLabel[c]).join(", ") ||
            "?"}
        </Text>
        <hr />
        <Button
          className={styles.sectorEnter}
          onClick={() => {
            gameStore.setSector(currentSector);
            gameStore.closeOverlay();
          }}
        >
          enter
        </Button>
      </AnimatedBackdrop>
    </Card>
  );
});
