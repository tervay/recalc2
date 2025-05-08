import type Measurement from '~/lib/models/Measurement';

export function supplyLimitToStatorLimit({
  supplyLimit,
  supplyVoltage,
  statorVoltage,
}: {
  supplyLimit: Measurement;
  supplyVoltage: Measurement;
  statorVoltage: Measurement;
}): Measurement {
  return supplyLimit.mul(supplyVoltage).div(statorVoltage);
}
