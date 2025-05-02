import type Measurement from '~/lib/models/Measurement';
import Model from '~/lib/models/Model';

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
    return false;
  }
}
