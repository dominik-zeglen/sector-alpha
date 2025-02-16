import difference from "lodash/difference";
import type { CoreComponents } from "./components/component";
import type { DockSize } from "./components/dockable";
import type { Entity } from "./entity";

export const notImplemented = new Error("Not implemented");

export class InsufficientStorage extends Error {
  wanted: number;
  actual: number;

  constructor(wanted: number, actual: number) {
    super(`Insufficient storage, wanted: ${wanted}, actual: ${actual}`);
    this.wanted = wanted;
    this.actual = actual;
  }
}

export class InsufficientStorageSpace extends Error {
  wanted: number;
  actual: number;

  constructor(wanted: number, actual: number) {
    super(`Insufficient storage space, wanted: ${wanted}, actual: ${actual}`);
    this.wanted = wanted;
    this.actual = actual;
  }
}

export class InsufficientMoney extends Error {
  wanted: number;
  actual: number;

  constructor(wanted: number, actual: number) {
    super(`Insufficient money, wanted: ${wanted}, actual: ${actual}`);
    this.wanted = wanted;
    this.actual = actual;
  }
}

export class NotFiniteMoney extends Error {
  constructor() {
    super("Expected finite money");
  }
}

export class NonPositiveAmount extends Error {
  amount: number;

  constructor(amount: number) {
    super(`Expected non-negative amount, got: ${amount}`);
    this.amount = amount;
  }
}

export class NegativeQuantity extends Error {
  quantity: number;

  constructor(quantity: number) {
    super(`Negative quantity: ${quantity}`);
    this.quantity = quantity;
  }
}

export class NonIntegerQuantity extends Error {
  quantity: number;

  constructor(quantity: number) {
    super(`Non integer quantity: ${quantity}`);
    this.quantity = quantity;
  }
}

export class NegativeBudget extends Error {
  quantity: number;

  constructor(quantity: number) {
    super(`Negative budget: ${quantity}`);
    this.quantity = quantity;
  }
}

export class NotFound extends Error {
  id: number;

  constructor(id: number) {
    super(`ID not found: ${id}`);
    this.id = id;
  }
}

export class InvalidOfferType extends Error {
  type: string;

  constructor(type: string) {
    super(`Expected opposed offer, but both got: ${type}`);
    this.type = type;
  }
}

export class ExceededOfferQuantity extends Error {
  quantity: number;
  limit: number;

  constructor(quantity: number, limit: number) {
    super(`Offered ${quantity}, but the limit is ${limit}`);
    this.quantity = quantity;
    this.limit = limit;
  }
}

export class MissingComponentError extends Error {
  entity: Entity;
  expectedComponents: Readonly<Array<keyof CoreComponents>>;

  constructor(
    entity: Entity,
    expectedComponents: Readonly<Array<keyof CoreComponents>>
  ) {
    super(
      `Missing following components: ${difference(
        expectedComponents,
        Object.keys(entity.cp)
      ).join(", ")}`
    );
    this.entity = entity;
    this.expectedComponents = expectedComponents;
  }
}

export class MissingEntityError extends Error {
  id: number;

  constructor(id: number) {
    super(`Missing entity: ${id}`);
    this.id = id;
  }
}

export class DockSizeMismatchError extends Error {
  size: DockSize;

  constructor(size: DockSize) {
    super(`Target entity does not contain dock with size: ${size}`);
    this.size = size;
  }
}

export class NotDockedError extends Error {
  constructor(entity: Entity, target: Entity) {
    super(`Entity ${entity.id} must be docked to target ${target.id}`);
  }
}
