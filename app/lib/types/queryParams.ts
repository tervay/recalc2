import type { Length } from "@buge/ts-units/length";
import type { Mass } from "@buge/ts-units/mass";
import queryString from "query-string";
import { measureFromDict, measureToDict } from "~/lib/models/Measure";

export interface QueryParam<T> {
  encode: (value: T) => string;
  decode: (value: string) => T;
}

export const StringParam: QueryParam<string> = {
  encode: (value) => value,
  decode: (value) => value,
};

export const NumberParam: QueryParam<number> = {
  encode: (value) => value.toString(),
  decode: (value) => Number(value),
};

export const BooleanParam: QueryParam<boolean> = {
  encode: (value) => value.toString(),
  decode: (value) => value === "true",
};

export const LengthParam: QueryParam<Length> = {
  encode: (value) => queryString.stringify(measureToDict(value)),
  decode: (value) => measureFromDict(queryString.parse(value)) as Length,
};

export const MassParam: QueryParam<Mass> = {
  encode: (value) => queryString.stringify(measureToDict(value)),
  decode: (value) => measureFromDict(queryString.parse(value)) as Mass,
};
