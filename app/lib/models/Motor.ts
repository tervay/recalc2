import Measurement from '~/lib/models/Measurement';
import Model from '~/lib/models/Model';

export const nominalVoltage = new Measurement(12, 'V');
export const highCurrentLimit = new Measurement(1000, 'A');

interface MotorSpecs {
  voltage: Measurement;
  stallTorque: Measurement;
  stallCurrent: Measurement;
  freeCurrent: Measurement;
  freeSpeed: Measurement;
  name: string;
}

interface FullMotorSpecs extends MotorSpecs {
  resistance: Measurement;
  kV: Measurement;
  kT: Measurement;
}

export function completeMotorSpecs(specs: MotorSpecs): FullMotorSpecs {
  const resistance = specs.voltage.div(specs.stallCurrent);
  const kV = specs.freeSpeed.div(
    specs.voltage.sub(resistance.mul(specs.freeCurrent)),
  );
  const kT = specs.stallTorque.div(specs.stallCurrent);

  return {
    ...specs,
    resistance,
    kV,
    kT,
  };
}

interface MotorCurveSnapshot {
  speedPercentage: Measurement;
  speed: Measurement;
  freeCurrent: Measurement;
  maxStator: Measurement;
  statorCurrent: Measurement;
  torque: Measurement;
  outputPower: Measurement;
  losses: Measurement;
  efficiency: Measurement;
}

export function generateMotorCurves(
  specs: FullMotorSpecs,
  statorLimit: Measurement,
  supplyLimit: Measurement,
): MotorCurveSnapshot[] {
  const curve: MotorCurveSnapshot[] = [];
  let currentSpeed = new Measurement(0, 'rpm');

  if ([specs.voltage, statorLimit, supplyLimit].some((s) => s.scalar === 0)) {
    return [];
  }

  while (currentSpeed.lte(specs.freeSpeed)) {
    const speedPercentage = currentSpeed.div(specs.freeSpeed);
    const oneMinusSpeedPercentage = new Measurement(1).sub(speedPercentage);

    const freeCurrent = specs.freeCurrent.mul(speedPercentage);

    // max stator
    const maxPowerIn = specs.voltage.mul(supplyLimit);
    const resistance = specs.resistance.to('Ohm');
    const voltagePercentage = speedPercentage.mul(specs.voltage);
    const c = maxPowerIn.negate().add(specs.voltage.mul(freeCurrent));
    const discriminant = voltagePercentage
      .mul(voltagePercentage)
      .sub(resistance.mul(c).mul(4));
    const sqrtDiscriminant = new Measurement(
      Math.sqrt(discriminant.to('V2').scalar),
      'V',
    );
    const numerator = voltagePercentage.negate().add(sqrtDiscriminant);
    const denominator = resistance.mul(2);
    const maxStator = numerator.div(denominator).abs();
    // end max stator

    // stator current
    const innerMin = Measurement.min(
      statorLimit,
      oneMinusSpeedPercentage.mul(specs.stallCurrent),
    );
    const max = Measurement.max(innerMin, new Measurement(0, 'A'));
    const outerMin = Measurement.min(max, maxStator.sub(freeCurrent));
    const statorCurrent = outerMin;
    // end stator current

    const torque = statorCurrent.mul(specs.kT);
    const outputPower = torque.mul(currentSpeed).removeRad();
    const losses = statorCurrent
      .mul(statorCurrent)
      .mul(specs.resistance)
      .add(specs.voltage.mul(freeCurrent));

    const efficiency = outputPower.div(outputPower.add(losses));

    curve.push({
      efficiency,
      freeCurrent,
      maxStator,
      losses,
      outputPower,
      speed: currentSpeed,
      speedPercentage,
      statorCurrent,
      torque,
    });

    currentSpeed = currentSpeed.add(new Measurement(10, 'rpm'));
  }

  return curve;
}

export default class Motor extends Model {
  public readonly kV: Measurement;
  public readonly kT: Measurement;
  public readonly kM: Measurement;
  // public readonly maxPower: Measurement;
  public readonly resistance: Measurement;
  public readonly b: Measurement;

  constructor(
    identifier: string,
    public readonly freeSpeed: Measurement,
    public readonly stallTorque: Measurement,
    public readonly stallCurrent: Measurement,
    public readonly freeCurrent: Measurement,
    public readonly voltage: Measurement,
  ) {
    super(identifier);

    this.resistance = this.voltage.div(this.stallCurrent);

    this.kV = this.freeSpeed.div(
      this.voltage.sub(this.resistance.mul(this.freeCurrent)),
    );
    this.kT = this.stallTorque.div(this.stallCurrent);
    this.kM = new Measurement(
      this.kT.scalar / Math.sqrt(this.resistance.scalar),
    );
    this.b = this.kT.mul(this.freeCurrent).div(this.freeSpeed);

    // this.maxPower = new MotorRules(this, highCurrentLimit, {
    //   voltage: nominalVoltage,
    //   rpm: this.freeSpeed.div(2),
    //   torque: this.stallTorque.div(2),
    // }).solve().power;
  }

  public static fromSpecs(specs: MotorSpecs) {
    return new Motor(
      specs.name,
      specs.freeSpeed,
      specs.stallTorque,
      specs.stallCurrent,
      specs.freeCurrent,
      specs.voltage,
    );
  }

  public static fromName(name: string) {
    return this.fromSpecs(ALL_MOTORS.find((m) => m.name === name)!);
  }

  public withReduction(ratio: number) {
    return new Motor(
      this.identifier,
      this.freeSpeed.div(ratio),
      this.stallTorque.mul(ratio),
      this.stallCurrent,
      this.freeCurrent,
      this.voltage,
    );
  }

  public withQuantity(quantity: number) {
    return new Motor(
      this.identifier,
      this.freeSpeed,
      this.stallTorque.mul(quantity),
      this.stallCurrent.mul(quantity),
      this.freeCurrent.mul(quantity),
      this.voltage,
    );
  }

  public withVoltage(voltage: Measurement) {
    return new Motor(
      this.identifier,
      this.freeSpeed.mul(voltage.div(nominalVoltage)),
      this.stallTorque.mul(voltage.div(nominalVoltage)),
      this.stallCurrent.mul(voltage.div(nominalVoltage)),
      this.freeCurrent.mul(voltage.div(nominalVoltage)),
      voltage,
    );
  }

  toDict(): Record<string, unknown> {
    throw new Error('Not implemented');
  }

  eq<M extends Model>(m: M): boolean {
    return m instanceof Motor && m.identifier === this.identifier;
  }
}

export const ALL_MOTORS: MotorSpecs[] = [
  {
    name: 'Kraken X60',
    voltage: new Measurement(12, 'V'),
    stallTorque: new Measurement(7.09, 'N m'),
    stallCurrent: new Measurement(366, 'A'),
    freeCurrent: new Measurement(2, 'A'),
    freeSpeed: new Measurement(6000, 'rpm'),
  },
  {
    name: 'Kraken X60 (FOC)',
    voltage: new Measurement(12, 'V'),
    stallTorque: new Measurement(9.37, 'N m'),
    stallCurrent: new Measurement(483, 'A'),
    freeCurrent: new Measurement(2, 'A'),
    freeSpeed: new Measurement(5800, 'rpm'),
  },
  {
    name: 'Kraken X44',
    voltage: new Measurement(12, 'V'),
    stallTorque: new Measurement(4.05, 'N m'),
    stallCurrent: new Measurement(275, 'A'),
    freeCurrent: new Measurement(1.4, 'A'),
    freeSpeed: new Measurement(7530, 'rpm'),
  },
];
