import Measurement from '~/lib/models/Measurement';
import Model from '~/lib/models/Model';
import type { JSONBelt } from '~/lib/types/belts';

export class SimpleBelt extends Model {
  public readonly length: Measurement;

  constructor(
    public readonly teeth: number,
    public readonly pitch: Measurement,
  ) {
    super('SimpleBelt');
    this.length = pitch.mul(teeth);
  }

  toDict(): Record<string, unknown> {
    return {
      teeth: this.teeth,
      pitch: this.pitch.toDict(),
    };
  }

  eq<M extends Model>(m: M): boolean {
    throw new Error('Method not implemented.');
  }
}

export class Belt extends Model {
  public readonly length: Measurement;

  constructor(
    public readonly teeth: number,
    public readonly pitch: Measurement,
    public readonly width: Measurement,
    public readonly profile: string,
    public readonly sku: string | null,
    public readonly url: string,
    public readonly vendor: string,
  ) {
    super('Belt');
    this.length = pitch.mul(teeth);
  }

  public static fromJson(json: JSONBelt): Belt {
    return new Belt(
      json.teeth,
      new Measurement(json.pitch, 'mm'),
      new Measurement(json.width, 'mm'),
      json.profile,
      json.sku,
      json.url,
      json.vendor,
    );
  }

  toDict(): Record<string, unknown> {
    return {
      teeth: this.teeth,
      pitch: this.pitch.toDict(),
    };
  }

  eq<M extends Model>(m: M): boolean {
    throw new Error('Method not implemented.');
  }
}
