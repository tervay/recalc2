import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import IOLine from '~/components/recalc/blocks';
import { MeasurementInput } from '~/components/recalc/io/measurement';
import { StringSelectInput } from '~/components/recalc/io/stringSelect';
import { ChartContainer } from '~/components/ui/chart';
import { solveMotorODE } from '~/lib/math/ode';
import Measurement from '~/lib/models/Measurement';
import Motor, {
  ALL_MOTORS,
  completeMotorSpecs,
  generateMotorCurves,
} from '~/lib/models/Motor';

export function meta() {
  return [
    { title: 'Motor Calculator' },
    { name: 'description', content: 'Motor Calculator' },
  ];
}

export default function Motors() {
  const [selectedMotor, setSelectedMotor] = useState(ALL_MOTORS[0].name);

  const [statorLimit, setStatorLimit] = useState(new Measurement(90, 'A'));
  const [supplyLimit, setSupplyLimit] = useState(new Measurement(60, 'A'));
  const [supplyVoltage, setSupplyVoltage] = useState(new Measurement(12, 'V'));
  const [statorVoltage, setStatorVoltage] = useState(new Measurement(12, 'V'));

  const selectedMotorSpecs = useMemo(
    () => ALL_MOTORS.find((m) => m.name === selectedMotor)!,
    [selectedMotor],
  );

  const motor = useMemo(
    () => Motor.fromName(selectedMotor).withVoltage(statorVoltage),
    [selectedMotor, statorVoltage],
  );

  const motorCurve = useMemo(
    () =>
      generateMotorCurves(
        {
          ...completeMotorSpecs(selectedMotorSpecs),
          voltage: supplyVoltage,
        },
        statorLimit,
        supplyLimit,
      ),
    [selectedMotorSpecs, statorLimit, supplyLimit, supplyVoltage],
  );

  const numericalCurve = useMemo(
    () =>
      motorCurve.map((c) => ({
        freeCurrent: c.freeCurrent.to('A').scalar,
        speedPercentage: c.speedPercentage.baseScalar,
        maxStator: c.maxStator.to('A').scalar,
        statorCurrent: c.statorCurrent.to('A').scalar,
        torque: c.torque.to('N m').scalar,
        outputPower: c.outputPower.to('W').scalar,
        losses: c.losses.to('W').scalar,
        efficiency: c.efficiency.scalar,
      })),
    [motorCurve],
  );

  const odeData = useMemo(() => {
    const data = solveMotorODE(
      Motor.fromName(selectedMotor).withVoltage(statorVoltage),
      statorVoltage,
      supplyVoltage,
      supplyLimit,
      statorLimit,
      (info) => info.stepNumber >= 400,
      new Measurement(0.0001, 'kg m2'),
      new Measurement(0, 'N m'),
      100,
    );

    const chartData = data.ys.map((y, i) => {
      const shouldApplyLimit = y[1] >= y[2];
      const currentDraw = shouldApplyLimit ? y[2] : y[1];

      const power = motor.kT
        .mul(new Measurement(currentDraw, 'A').sub(motor.freeCurrent))
        .mul(new Measurement(y[0], 'rad/s'))
        .removeRad()
        .to('W');

      const losses = new Measurement(currentDraw, 'A')
        .mul(new Measurement(currentDraw, 'A'))
        .mul(motor.resistance)
        .add(statorVoltage.mul(motor.freeCurrent));

      return {
        time: data.ts[i],
        velocity: new Measurement(y[0], 'rad/s').to('rpm').scalar,
        current: y[1],
        currLimit: y[2],
        position: y[3],
        torque: motor.kT.mul(new Measurement(y[2], 'A')).to('N m').scalar,
        power: power.scalar,
        efficiency: power.div(power.add(losses)).baseScalar,
        losses: losses.to('W').scalar,
        currentDraw,
      };
    });

    return chartData;
  }, [
    selectedMotor,
    supplyLimit,
    supplyVoltage,
    statorVoltage,
    statorLimit,
    motor,
  ]);

  return (
    <div>
      <div className="flex flex-col gap-x-4 gap-y-2">
        <IOLine>
          <StringSelectInput
            choices={ALL_MOTORS.map((m) => ({
              label: m.name,
              value: m.name,
            }))}
            stateHook={[selectedMotor, setSelectedMotor]}
            label="Motor"
          />
        </IOLine>
        <IOLine>
          <MeasurementInput
            stateHook={[statorLimit, setStatorLimit]}
            label="Stator Limit"
          />
          <MeasurementInput
            stateHook={[statorVoltage, setStatorVoltage]}
            label="Stator Voltage"
          />
        </IOLine>
        <IOLine>
          <MeasurementInput
            stateHook={[supplyLimit, setSupplyLimit]}
            label="Supply Limit"
          />
          <MeasurementInput
            stateHook={[supplyVoltage, setSupplyVoltage]}
            label="Supply Voltage"
          />
        </IOLine>
      </div>

      <div className="mt-4 flex flex-row">
        <ChartContainer config={{}} className="min-h-[200px] w-full">
          <LineChart data={numericalCurve}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="speedPercentage" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Line
              dataKey="statorCurrent"
              dot={false}
              yAxisId="left"
              stroke="yellow"
            />
            <Line dataKey="torque" dot={false} yAxisId="right" stroke="green" />
            <Line
              dataKey="outputPower"
              dot={false}
              yAxisId="left"
              stroke="red"
            />
            <Line
              dataKey="efficiency"
              dot={false}
              yAxisId="right"
              stroke="blue"
            />
            <Legend />
          </LineChart>
        </ChartContainer>

        <ChartContainer config={{}} className="min-h-[200px] w-full">
          <LineChart data={odeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />

            <Line dataKey="velocity" dot={false} yAxisId="left" stroke="red" />
            <Line dataKey="power" dot={false} yAxisId="left" stroke="green" />
            <Line dataKey="torque" dot={false} yAxisId="right" stroke="blue" />
            <Line
              dataKey="currentDraw"
              dot={false}
              yAxisId="right"
              stroke="yellow"
            />
            {/* <Line
              dataKey="efficiency"
              dot={false}
              yAxisId="right"
              stroke="blue"
            />
            <Line dataKey="losses" dot={false} yAxisId="left" stroke="purple" /> */}
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  );
}
