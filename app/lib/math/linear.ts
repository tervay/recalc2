import { solveMotorODE } from '~/lib/math/ode';
import Measurement, { type MeasurementDict } from '~/lib/models/Measurement';
import Motor, { type MotorDict } from '~/lib/models/Motor';
import type { RatioDict } from '~/lib/models/Ratio';
import Ratio from '~/lib/models/Ratio';

export interface LinearODEResult {
  positionInches: number;
  velocityRPM: number;
  statorDrawAmps: number;
  timeSeconds: number;
  powerWatts: number;
  efficiency: number;
}

export function generateODEData(
  motor_: MotorDict,
  statorVoltage_: MeasurementDict,
  supplyVoltage_: MeasurementDict,
  statorLimit_: MeasurementDict,
  supplyLimit_: MeasurementDict,
  travelDistance_: MeasurementDict,
  ratio_: RatioDict,
  spoolDiameter_: MeasurementDict,
  load_: MeasurementDict,
  J_: MeasurementDict,
  efficiency: number,
  angle_: MeasurementDict,
): LinearODEResult[] {
  const motor = Motor.fromDict(motor_);
  const statorVoltage = Measurement.fromDict(statorVoltage_);
  const supplyVoltage = Measurement.fromDict(supplyVoltage_);
  const statorLimit = Measurement.fromDict(statorLimit_);
  const supplyLimit = Measurement.fromDict(supplyLimit_);
  const travelDistance = Measurement.fromDict(travelDistance_);
  const spoolDiameter = Measurement.fromDict(spoolDiameter_);
  const ratio = Ratio.fromDict(ratio_);
  const load = Measurement.fromDict(load_);
  const J = Measurement.fromDict(J_);
  const angle = Measurement.fromDict(angle_);

  if (
    [
      ratio.magnitude,
      spoolDiameter.baseScalar,
      statorLimit.baseScalar,
      supplyLimit.baseScalar,
    ].includes(0)
  ) {
    return [];
  }

  const gravitationalForce = load.mul(Measurement.GRAVITY.negate());
  const gravitationalTorque = gravitationalForce
    .mul(spoolDiameter.div(2))
    .div(ratio.asNumber())
    .mul(Math.sin(angle.to('rad').scalar));

  const data = solveMotorODE(
    motor,
    statorVoltage,
    supplyVoltage,
    statorLimit,
    supplyLimit,
    (info) =>
      info.position
        .linearizeRadialPosition(
          spoolDiameter.mul(Math.PI).div(ratio.asNumber()),
        )
        .gte(travelDistance) ||
      (info.velocity.lte(new Measurement(2, 'rad/s')) &&
        info.stepNumber >= 1000),
    J,
    gravitationalTorque,
    efficiency,
  );

  const ret: LinearODEResult[] = [];

  data.forEach((d) => {
    ret.push({
      positionInches: d.positionRad.linearizeRadialPosition(
        spoolDiameter.mul(Math.PI).div(ratio.asNumber()),
      ).scalar,
      velocityRPM: d.velocityRPM.to('rpm').scalar,
      statorDrawAmps: d.statorDrawAmps.to('A').scalar,
      timeSeconds: d.time.to('s').scalar,
      powerWatts: d.power.to('W').scalar,
      efficiency: d.efficiency * 100,
    });
  });

  return ret;
}

export function add(a: number, b: number) {
  return a + b;
}
