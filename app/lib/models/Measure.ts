import type { Dimensions } from "@buge/ts-units/dimension";
import { grams } from "@buge/ts-units/mass";
import { meters } from "@buge/ts-units/length";
import type { Quantity } from "@buge/ts-units/unit";

export function measureToDict(
  measure: Quantity<number, Dimensions>
): Record<string, unknown> {
  return {
    s: measure.value,
    u: measure.unit.symbol,
  };
}

export function measureFromDict(dict: Record<string, unknown>) {
  switch (dict.u) {
    case "m":
      return meters(parseFloat(dict.s as string));
    case "g":
      return grams(parseFloat(dict.s as string));
    default:
      throw new Error(`Unknown unit: ${dict.u}`);
  }
}
