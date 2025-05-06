import Measurement from '~/lib/models/Measurement';

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

  while (currentSpeed.lte(specs.freeSpeed)) {
    const speedPercentage = currentSpeed.div(specs.freeSpeed);
    const oneMinusSpeedPercentage = new Measurement(1).sub(speedPercentage);

    const freeCurrent = specs.freeCurrent.mul(speedPercentage);

    // max stator
    const maxPowerIn = specs.voltage.mul(supplyLimit);
    const a = specs.resistance.to('Ohm');
    const b = speedPercentage.mul(specs.voltage);
    const c = maxPowerIn.negate().add(specs.voltage.mul(freeCurrent));
    const discriminant = b.mul(b).sub(a.mul(c).mul(4));
    const sqrtDiscriminant = new Measurement(
      Math.sqrt(discriminant.to('V2').scalar),
      'V',
    );
    const numerator = b.negate().add(sqrtDiscriminant);
    const denominator = a.mul(2);
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
