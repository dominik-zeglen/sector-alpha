import React from "react";
import {
  Dropdown,
  DropdownButton,
  DropdownOption,
  DropdownOptions,
} from "@kit/Dropdown";
import { maxFacilityModules } from "@core/systems/facilityBuilding";
import { IconButton } from "@kit/IconButton";
import { commoditiesArray, commodityLabel } from "@core/economy/commodity";
import { sum } from "@fxts/core";
import { perCommodity } from "@core/utils/perCommodity";
import { getCommodityCost } from "@core/economy/utils";
import { formatGameTime } from "@core/utils/format";
import { getCrewMultiplier } from "@core/systems/producing";
import { AnimatedBackdrop } from "@kit/AnimatedBackdrop";
import { Button } from "@kit/Button";
import { CloseIcon } from "@assets/ui/icons";
import { OGLModel } from "@devtools/components/OGLModel/OGLModel";
import styles from "./styles.scss";
import facilityModules from "../../core/world/data/facilityModules.json";
import facilityTemplates from "../../core/world/data/facilityTemplates.json";

const initialModules = ["basicHabitat", "basicStorage"];

const FacilityBuilder: React.FC = () => {
  const [template, setTemplate] = React.useState<string>();
  const [moduleIds, setModuleIds] = React.useState<string[]>(initialModules);
  const [modified, setModified] = React.useState<boolean>(false);
  const modules = React.useMemo(
    () =>
      moduleIds.map((fm) => facilityModules.find((sfm) => sfm.slug === fm)!),
    [moduleIds]
  );
  const production = perCommodity((commodity) =>
    sum(
      modules
        .filter((fm) => fm.pac?.[commodity])
        .map(
          (fm) => fm.pac![commodity]!.produces - fm.pac![commodity]!.consumes
        )
    )
  );

  const availableCrew = sum(modules.map((fm) => fm.crew.capacity ?? 0));
  const requiredCrew = sum(modules.map((fm) => fm.crew.cost ?? 0));

  return (
    <div className={styles.root}>
      <div className={styles.preview}>
        <OGLModel />
        <div className={styles.templateDropdownContainer}>
          <Dropdown className={styles.templateDropdown}>
            <DropdownButton>
              {template ?? "New Template"}
              {modified ? "*" : ""}
            </DropdownButton>
            <DropdownOptions direction="up">
              <DropdownOption
                onClick={() => {
                  setTemplate(undefined);
                  setModuleIds(initialModules);
                  setModified(false);
                }}
              >
                New Template
              </DropdownOption>
              {facilityTemplates.map((ft, ftIndex) => (
                <DropdownOption
                  key={ftIndex}
                  onClick={() => {
                    setTemplate(facilityTemplates[ftIndex].name);
                    setModuleIds(facilityTemplates[ftIndex].modules);
                    setModified(false);
                  }}
                >
                  {ft.name}
                </DropdownOption>
              ))}
            </DropdownOptions>
          </Dropdown>
        </div>
      </div>
      <AnimatedBackdrop className={styles.sidebar}>
        <h2>Selected modules</h2>
        {modules.map((fm, fmIndex) => (
          <div className={styles.selectedModule} key={fm.slug + fmIndex}>
            <IconButton
              onClick={() => {
                setModuleIds((pfm) => pfm.filter((_, i) => i !== fmIndex));
                setModified(true);
              }}
              variant="naked"
            >
              <CloseIcon />
            </IconButton>
            {fm.name}
          </div>
        ))}
        <Dropdown className={styles.addModule}>
          <DropdownButton disabled={modules.length >= maxFacilityModules}>
            Add module ({modules.length}/{maxFacilityModules})
          </DropdownButton>
          <DropdownOptions>
            {facilityModules
              .filter(
                (fm) =>
                  !(
                    initialModules.includes(fm.slug) &&
                    !modules.find((m) => m.slug === fm.slug)
                  )
              )
              .map((fm) => (
                <DropdownOption
                  key={fm.slug}
                  onClick={() => {
                    setModuleIds((pfm) => [...pfm, fm.slug]);
                    setModified(true);
                  }}
                >
                  {fm.name}
                </DropdownOption>
              ))}
          </DropdownOptions>
        </Dropdown>
        <hr />
        <h2>Production</h2>
        <table className={styles.table}>
          <tbody>
            {commoditiesArray
              .filter((commodity) => Number.isFinite(production[commodity]))
              .map((commodity) => (
                <tr key={commodity}>
                  <td>{commodityLabel[commodity]}</td>
                  <td
                    style={{
                      color:
                        production[commodity] > 0
                          ? "var(--palette-success)"
                          : "var(--palette-error)",
                    }}
                  >
                    {production[commodity]}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        <hr />
        <h2>Crew</h2>
        <table className={styles.table}>
          <tbody>
            <tr>
              <td>Available workplaces</td>
              <td
                style={{
                  color:
                    availableCrew >= requiredCrew
                      ? "var(--palette-success)"
                      : "var(--palette-error)",
                }}
              >
                {availableCrew}
              </td>
            </tr>
            <tr>
              <td>Required</td>
              <td>{requiredCrew}</td>
            </tr>
            <tr>
              <td>Crew efficiency</td>
              <td
                style={{
                  color:
                    availableCrew >= requiredCrew
                      ? "var(--palette-success)"
                      : "var(--palette-error)",
                }}
              >
                {(getCrewMultiplier(requiredCrew, availableCrew) * 100).toFixed(
                  1
                )}
                %
              </td>
            </tr>
            <tr>
              <td>Consumed food</td>
              <td>
                {facilityModules.find((fm) => fm.slug === "hub")!.pac!.food!
                  .consumes * availableCrew}
              </td>
            </tr>
            <tr>
              <td>Consumed water</td>
              <td>
                {facilityModules.find((fm) => fm.slug === "hub")!.pac!.water!
                  .consumes * availableCrew}
              </td>
            </tr>
          </tbody>
        </table>
        <hr />
        <h2>Build cost</h2>
        <table className={styles.table}>
          <tbody>
            {commoditiesArray
              .map((commodity) => ({
                commodity,
                cost: sum(modules.map((fm) => fm.build.cost[commodity] ?? 0)),
              }))
              .filter(({ cost }) => cost)
              .map(({ commodity, cost }) => (
                <tr key={commodity}>
                  <td>{commodityLabel[commodity]}</td>
                  <td>{cost}</td>
                </tr>
              ))}
            <tr>
              <td>Total (avg.)</td>
              <td className={styles.total}>
                {sum(
                  commoditiesArray.map(
                    (commodity) =>
                      getCommodityCost(commodity, facilityModules as any) *
                      sum(modules.map((fm) => fm.build.cost[commodity] ?? 0))
                  )
                )}{" "}
                UTT
              </td>
            </tr>
            <tr>
              <td>Time</td>
              <td>
                {formatGameTime(sum(modules.map(({ build }) => build.time)))}
              </td>
            </tr>
          </tbody>
        </table>
        <Button
          onClick={() =>
            window.navigator.clipboard.writeText(
              JSON.stringify([
                ...facilityTemplates.map((v) =>
                  v.name === template
                    ? { ...v, name: template, modules: moduleIds }
                    : v
                ),
                template === undefined
                  ? { name: "", slug: "", modules: moduleIds }
                  : undefined,
              ])
            )
          }
        >
          Copy to clipboard
        </Button>
      </AnimatedBackdrop>
    </div>
  );
};

export default FacilityBuilder;
