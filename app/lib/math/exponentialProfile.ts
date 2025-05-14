import { calculateLoadedBatteryVoltage } from '~/lib/math/batterySim';
import Measurement from '~/lib/models/Measurement';
import type Motor from '~/lib/models/Motor';
import { nominalVoltage } from '~/lib/models/Motor';
import type Ratio from '~/lib/models/Ratio';
import { MotorRules } from '~/lib/rules';

interface ProfileTiming {
  inflectionTime: number;
  totalTime: number;
  isFinished: (t: number) => boolean;
}

interface Constraints {
  maxInput: number;
  A: number;
  B: number;
  maxVelocity: () => number;
}

interface State {
  position: number;
  velocity: number;
}

function createProfileTiming(
  inflectionTime: number,
  totalTime: number,
): ProfileTiming {
  return {
    inflectionTime,
    totalTime,
    isFinished: (t: number) => t >= inflectionTime,
  };
}

function createConstraints(
  maxInput: number,
  A: number,
  B: number,
): Constraints {
  return {
    maxInput,
    A,
    B,
    maxVelocity: () => (-maxInput * B) / A,
  };
}

function createState(position: number, velocity: number): State {
  return { position, velocity };
}

function fromCharacteristics(
  maxInput: number,
  kV: number,
  kA: number,
): Constraints {
  return createConstraints(maxInput, -kV / kA, 1.0 / kA);
}

function fromStateSpace(maxInput: number, A: number, B: number): Constraints {
  return createConstraints(maxInput, A, B);
}

export class ExponentialProfile {
  private readonly constraints: Constraints;

  constructor(constraints: Constraints) {
    this.constraints = constraints;
  }

  calculate(t: number, current: State, goal: State): State {
    const direction = this.shouldFlipInput(current, goal) ? -1 : 1;
    const u = direction * this.constraints.maxInput;

    const inflectionPoint = this.calculateInflectionPointWithInput(
      current,
      goal,
      u,
    );
    const timing = this.calculateProfileTimingWithInput(
      current,
      inflectionPoint,
      goal,
      u,
    );

    if (t < 0) {
      return createState(current.position, current.velocity);
    } else if (t < timing.inflectionTime) {
      return createState(
        this.computeDistanceFromTime(t, u, current),
        this.computeVelocityFromTime(t, u, current),
      );
    } else if (t < timing.totalTime) {
      return createState(
        this.computeDistanceFromTime(t - timing.totalTime, -u, goal),
        this.computeVelocityFromTime(t - timing.totalTime, -u, goal),
      );
    }
    return createState(goal.position, goal.velocity);
  }

  calculateInflectionPoint(current: State, goal: State): State {
    const direction = this.shouldFlipInput(current, goal) ? -1 : 1;
    const u = direction * this.constraints.maxInput;
    return this.calculateInflectionPointWithInput(current, goal, u);
  }

  private calculateInflectionPointWithInput(
    current: State,
    goal: State,
    input: number,
  ): State {
    const u = input;

    if (ExponentialProfile.areStatesEqual(current, goal)) {
      return current;
    }

    const inflectionVelocity = this.solveForInflectionVelocity(
      u,
      current,
      goal,
    );
    const inflectionPosition = this.computeDistanceFromVelocity(
      inflectionVelocity,
      -u,
      goal,
    );

    return createState(inflectionPosition, inflectionVelocity);
  }

  timeLeftUntil(current: State, goal: State): number {
    const timing = this.calculateProfileTiming(current, goal);
    return timing.totalTime;
  }

  calculateProfileTiming(current: State, goal: State): ProfileTiming {
    const direction = this.shouldFlipInput(current, goal) ? -1 : 1;
    const u = direction * this.constraints.maxInput;

    const inflectionPoint = this.calculateInflectionPointWithInput(
      current,
      goal,
      u,
    );
    return this.calculateProfileTimingWithInput(
      current,
      inflectionPoint,
      goal,
      u,
    );
  }

  private calculateProfileTimingWithInput(
    current: State,
    inflectionPoint: State,
    goal: State,
    input: number,
  ): ProfileTiming {
    const u = input;
    let inflectionT_forward: number;

    const epsilon = 1e-9;
    if (
      Math.abs(
        Math.sign(input) * this.constraints.maxVelocity() -
          inflectionPoint.velocity,
      ) < epsilon
    ) {
      let solvableV = inflectionPoint.velocity;
      let t_to_solvable_v: number;
      let x_at_solvable_v: number;

      if (Math.abs(current.velocity - inflectionPoint.velocity) < epsilon) {
        t_to_solvable_v = 0;
        x_at_solvable_v = current.position;
      } else {
        if (Math.abs(current.velocity) > this.constraints.maxVelocity()) {
          solvableV += Math.sign(u) * epsilon;
        } else {
          solvableV -= Math.sign(u) * epsilon;
        }

        t_to_solvable_v = this.computeTimeFromVelocity(
          solvableV,
          u,
          current.velocity,
        );
        x_at_solvable_v = this.computeDistanceFromVelocity(
          solvableV,
          u,
          current,
        );
      }

      inflectionT_forward =
        t_to_solvable_v +
        (Math.sign(input) * (inflectionPoint.position - x_at_solvable_v)) /
          this.constraints.maxVelocity();
    } else {
      inflectionT_forward = this.computeTimeFromVelocity(
        inflectionPoint.velocity,
        u,
        current.velocity,
      );
    }

    const inflectionT_backward = this.computeTimeFromVelocity(
      inflectionPoint.velocity,
      -u,
      goal.velocity,
    );

    return createProfileTiming(
      inflectionT_forward,
      inflectionT_forward - inflectionT_backward,
    );
  }

  private computeDistanceFromTime(
    t: number,
    input: number,
    initial: State,
  ): number {
    const A = this.constraints.A;
    const B = this.constraints.B;
    const u = input;

    return (
      initial.position +
      (-B * u * t + (initial.velocity + (B * u) / A) * (Math.exp(A * t) - 1)) /
        A
    );
  }

  private computeVelocityFromTime(
    t: number,
    input: number,
    initial: State,
  ): number {
    const A = this.constraints.A;
    const B = this.constraints.B;
    const u = input;

    return (initial.velocity + (B * u) / A) * Math.exp(A * t) - (B * u) / A;
  }

  private computeTimeFromVelocity(
    velocity: number,
    input: number,
    initial: number,
  ): number {
    const A = this.constraints.A;
    const B = this.constraints.B;
    const u = input;

    return Math.log((A * velocity + B * u) / (A * initial + B * u)) / A;
  }

  public computeDistanceFromVelocity(
    velocity: number,
    input: number,
    initial: State,
  ): number {
    const A = this.constraints.A;
    const B = this.constraints.B;
    const u = input;

    return (
      initial.position +
      (velocity - initial.velocity) / A -
      ((B * u) / (A * A)) *
        Math.log((A * velocity + B * u) / (A * initial.velocity + B * u))
    );
  }

  private solveForInflectionVelocity(
    input: number,
    current: State,
    goal: State,
  ): number {
    const A = this.constraints.A;
    const B = this.constraints.B;
    const u = input;

    const U_dir = Math.sign(u);

    const position_delta = goal.position - current.position;
    const velocity_delta = goal.velocity - current.velocity;

    const scalar = (A * current.velocity + B * u) * (A * goal.velocity - B * u);
    const power = (-A / B / u) * (A * position_delta - velocity_delta);

    const a = -A * A;
    const c = B * B * (u * u) + scalar * Math.exp(power);

    if (-1e-9 < c && c < 0) {
      return 0;
    }

    return U_dir * Math.sqrt(-c / a);
  }

  private shouldFlipInput(current: State, goal: State): boolean {
    const u = this.constraints.maxInput;

    const xf = goal.position;
    const v0 = current.velocity;
    const vf = goal.velocity;

    const x_forward = this.computeDistanceFromVelocity(vf, u, current);
    const x_reverse = this.computeDistanceFromVelocity(vf, -u, current);

    if (v0 >= this.constraints.maxVelocity()) {
      return xf < x_reverse;
    }

    if (v0 <= -this.constraints.maxVelocity()) {
      return xf < x_forward;
    }

    const a = v0 >= 0;
    const b = vf >= 0;
    const c = xf >= x_forward;
    const d = xf >= x_reverse;

    return (a && !d) || (b && !c) || (!c && !d);
  }

  static areStatesEqual(state1: State, state2: State): boolean {
    return (
      state1.position === state2.position && state1.velocity === state2.velocity
    );
  }
}

function simProfile(
  profile: ExponentialProfile,
  current: State,
  goal: State,
  dt: number,
  motor: Motor,
  currentLimit: Measurement,
  statorVoltage: Measurement,
  spoolDiameter: Measurement,
  ratio: Ratio,
  supplyVoltage: Measurement,
  batteryResistance: Measurement,
) {
  const results: (State & {
    time: number;
    rpm: number;
    voltage: number;
    current: number;
    torque: number;
    power: number;
    efficiency: number;
    losses: number;
    batteryVoltage: number;
  })[] = [
    {
      ...current,
      time: 0,
      rpm: current.velocity,
      voltage: statorVoltage.to('V').scalar,
      current: 0,
      torque: 0,
      power: 0,
      efficiency: 0,
      losses: 0,
      batteryVoltage: supplyVoltage.to('V').scalar,
    },
  ];

  while (current.position < goal.position) {
    current = profile.calculate(dt, current, goal);

    if (
      results.length == 1 &&
      ExponentialProfile.areStatesEqual(current, goal)
    ) {
      break;
    }

    const motorState = new MotorRules(motor, currentLimit, {
      rpm:
        ratio.asNumber() === 0
          ? new Measurement(0, 'rpm')
          : new Measurement(current.velocity, 'in/s')
              .radializeLinearPosition(
                spoolDiameter.mul(Math.PI).div(ratio.asNumber()),
              )
              .to('rpm'),
      voltage: statorVoltage,
    }).solve();

    results.push({
      ...current,
      time: (results.length + 1) * dt,
      rpm: motorState.rpm.to('rpm').scalar,
      voltage: motorState.voltage.to('V').scalar,
      current: motorState.current.to('A').scalar,
      torque: motorState.torque.to('N m').scalar,
      power: motorState.power.to('W').scalar,
      efficiency: motorState.efficiency.baseScalar * 100,
      losses: motorState.losses.to('W').scalar,
      batteryVoltage: calculateLoadedBatteryVoltage(
        supplyVoltage,
        batteryResistance,
        [motorState.current],
      ).to('V').scalar,
    });
  }

  return results;
}

function simFlywheelProfile(
  profile: ExponentialProfile,
  current: State,
  goal: State,
  dt: number,
  motor: Motor,
  cuurrentLimit: Measurement,
  ratio: Ratio,
  batteryResistance: Measurement,
  radialize: (m: Measurement) => Measurement,
) {
  const results: (State & {
    time: number;
    rpm: number;
    voltage: number;
    current: number;
    torque: number;
    power: number;
    efficiency: number;
    losses: number;
    batteryVoltage: number;
  })[] = [
    {
      ...current,
      time: 0,
      rpm: radialize(new Measurement(current.velocity, 'in/s')).to('rpm')
        .scalar,
      voltage: 0,
      current: 0,
      torque: 0,
      power: 0,
      efficiency: 0,
      losses: 0,
      batteryVoltage: nominalVoltage.to('V').scalar,
    },
  ];

  while (current.velocity < goal.velocity) {
    current = profile.calculate(dt, current, goal);

    if (
      results.length == 1 &&
      ExponentialProfile.areStatesEqual(current, goal)
    ) {
      break;
    }

    results.push({
      ...current,
      time: (results.length + 1) * dt,
      rpm: radialize(new Measurement(current.velocity, 'in/s')).to('rpm')
        .scalar,
      voltage: 0,
      current: 0,
      torque: 0,
      power: 0,
      efficiency: 0,
      losses: 0,
      batteryVoltage: 0,
    });
  }
  return results;
}

export {
  fromCharacteristics,
  fromStateSpace,
  createState,
  type State,
  type Constraints,
  type ProfileTiming,
  simProfile,
  simFlywheelProfile,
};
