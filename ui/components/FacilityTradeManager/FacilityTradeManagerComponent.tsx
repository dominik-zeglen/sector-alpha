import type { TradeOffers } from "@core/components/trade";
import { commodityLabel } from "@core/economy/commodity";
import { Button } from "@kit/Button";
import { Checkbox } from "@kit/Checkbox";
import { Dialog } from "@kit/Dialog";
import { DialogActions } from "@kit/DialogActions";
import { Slider } from "@kit/Slider";
import React from "react";
import { commodityPrices } from "@core/economy/utils";
import type { ModalProps } from "../ConfigDialog";
import styles from "./FacilityTradeManager.scss";

interface FacilityTradeManagerComponentProps extends ModalProps {
  auto: boolean;
  offers: TradeOffers;
  onChange: (_value: { offers: TradeOffers; auto: boolean }) => void;
}

export const FacilityTradeManagerComponent: React.FC<
  FacilityTradeManagerComponentProps
> = ({ onClose, open, onChange, auto: initialAuto, offers: initialOffers }) => {
  const [auto, setAuto] = React.useState(initialAuto);
  const [offers, setOffers] = React.useState<TradeOffers>(initialOffers);

  return (
    <Dialog
      width="500px"
      open={open}
      onClose={onClose}
      title="Manage facility trade offers"
    >
      <div className={styles.labelContainer}>
        <Checkbox
          id="offers-pricing-auto"
          checked={auto}
          onChange={() => setAuto((a) => !a)}
        />
        <label className={styles.label} htmlFor="offers-pricing-auto">
          Use automatic pricing
        </label>
      </div>
      <div className={styles.grid}>
        {Object.entries(offers)
          .filter(([, offer]) => offer.active)
          .map(([commodity, offer]) => (
            <React.Fragment key={commodity}>
              <div>{commodityLabel[commodity]}</div>
              <Slider
                disabled={auto}
                min={commodityPrices[commodity].min}
                max={commodityPrices[commodity].max}
                step={1}
                value={offer.price}
                onChange={(event) =>
                  setOffers({
                    ...offers,
                    [commodity]: {
                      ...offers[commodity],
                      price: parseInt(event.target.value, 10),
                    },
                  })
                }
              />
              <input
                className={styles.input}
                value={offer.price}
                onChange={(event) =>
                  setOffers({
                    ...offers,
                    [commodity]: {
                      ...offers[commodity],
                      price: parseInt(event.target.value, 10),
                    },
                  })
                }
              />
              <span className={styles.currency}>UTT</span>
            </React.Fragment>
          ))}
      </div>
      <DialogActions>
        <Button
          onClick={() => {
            setAuto(initialAuto);
            setOffers(initialOffers);
          }}
        >
          Reset
        </Button>
        <Button onClick={() => onChange({ offers, auto })}>Accept</Button>
      </DialogActions>
    </Dialog>
  );
};
FacilityTradeManagerComponent.displayName = "FacilityTradeManagerComponent";
