import type { SimpleBelt } from '~/lib/models/Belt';
import Measurement from '~/lib/models/Measurement';
import type { SimplePulley } from '~/lib/models/Pulley';

export function calculateDistanceBetweenPulleys(
  p1: SimplePulley,
  p2: SimplePulley,
  ccDistance: Measurement,
): Measurement {
  return ccDistance.sub(p1.pitchDiameter.div(2)).sub(p2.pitchDiameter.div(2));
}

export function calculateDistance(
  p1: SimplePulley,
  p2: SimplePulley,
  belt: SimpleBelt,
): Measurement {
  const b = belt.length
    .mul(2)
    .sub(p1.pitchDiameter.add(p2.pitchDiameter).mul(Math.PI));

  const pulleyDiff = p1.pitchDiameter.sub(p2.pitchDiameter).abs();

  const toSqrt = b.mul(b).sub(pulleyDiff.mul(pulleyDiff).mul(8));

  if (toSqrt.lte(new Measurement(0, 'in^2'))) {
    return new Measurement(0, 'in');
  }

  const sqrted = new Measurement(
    Math.sqrt(toSqrt.scalar),
    toSqrt.units().replace('2', '1'),
  );

  return b.add(sqrted).div(8);
}
