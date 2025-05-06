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
import Measurement from '~/lib/models/Measurement';
import {
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

  const selectedMotorSpecs = useMemo(
    () => ALL_MOTORS.find((m) => m.name === selectedMotor)!,
    [selectedMotor],
  );

  const motorCurve = useMemo(
    () =>
      generateMotorCurves(
        completeMotorSpecs(selectedMotorSpecs),
        Measurement.max(statorLimit, new Measurement(1, 'A')),
        Measurement.max(supplyLimit, new Measurement(1, 'A')),
      ),
    [selectedMotorSpecs, statorLimit, supplyLimit],
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
          <MeasurementInput
            stateHook={[statorLimit, setStatorLimit]}
            label="Stator Limit"
          />
          <MeasurementInput
            stateHook={[supplyLimit, setSupplyLimit]}
            label="Supply Limit"
          />
        </IOLine>
      </div>

      <ChartContainer
        config={{
          freeCurrent: {
            color: 'red',
          },
        }}
        className="min-h-[200px] w-full"
      >
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
          <Line dataKey="outputPower" dot={false} yAxisId="left" stroke="red" />
          <Line
            dataKey="efficiency"
            dot={false}
            yAxisId="right"
            stroke="blue"
          />
          <Legend />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
