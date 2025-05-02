import Model from "~/lib/models/Model";
import type { Bore } from "~/lib/types/common";
import type { JSONPulley } from "~/lib/types/pulleys";
import { millimeters, type Length } from "@buge/ts-units/length";
import { measureToDict } from "~/lib/models/Measure";

export default class Pulley extends Model {
  constructor(
    public readonly teeth: number,
    public readonly width: Length,
    public readonly profile: string,
    public readonly pitch: Length,
    public readonly sku: string | null,
    public readonly url: string,
    public readonly bore: Bore
  ) {
    super("Pulley");
  }

  public fromJson(json: JSONPulley): Pulley {
    return new Pulley(
      json.teeth,
      millimeters(json.width),
      json.profile,
      millimeters(json.pitch),
      json.sku,
      json.url,
      json.bore
    );
  }

  public toDict(): Record<string, unknown> {
    return {
      teeth: this.teeth,
      pitch: measureToDict(this.pitch),
    };
  }

  eq<M extends Model>(m: M): boolean {
    return false;
  }
}
