import { facilityModules } from "../economy/facilityModule";
import { Facility } from "../economy/factility";
import { sim } from "../sim";

export function createRefineryFacility() {
  const facility = new Facility(sim);
  facility.addModule(facilityModules.refinery);
  facility.addModule(facilityModules.refinery);
  facility.addModule(facilityModules.containerSmall);
  facility.cp.storage.addStorage("metals", 50);

  return facility;
}

export function createFarm() {
  const facility = new Facility(sim);
  facility.addModule(facilityModules.farm);
  facility.addModule(facilityModules.containerSmall);
  facility.cp.storage.addStorage("food", 50);

  return facility;
}

export function createShipyard() {
  const facility = new Facility(sim);
  facility.addModule(facilityModules.shipyard);
  facility.addModule(facilityModules.containerSmall);

  return facility;
}

export function createWaterFacility() {
  const facility = new Facility(sim);
  facility.addModule(facilityModules.water);
  facility.addModule(facilityModules.containerSmall);
  facility.cp.storage.addStorage("water", 50);

  return facility;
}

export function createFuelFabricationFacility() {
  const facility = new Facility(sim);
  facility.addModule(facilityModules.fuelFabrication);
  facility.addModule(facilityModules.containerSmall);
  facility.cp.storage.addStorage("fuel", 50);

  return facility;
}

export function createHullPlatesFacility() {
  const facility = new Facility(sim);
  facility.addModule(facilityModules.hullPlates);
  facility.addModule(facilityModules.containerSmall);
  facility.cp.storage.addStorage("hullPlates", 50);

  return facility;
}

export const templates = [
  createFarm,
  createFuelFabricationFacility,
  createHullPlatesFacility,
  createRefineryFacility,
  createShipyard,
  createWaterFacility,
];
