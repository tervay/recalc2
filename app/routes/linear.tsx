import { useEffect, useMemo, useState } from 'react';
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
import CalcHeading from '~/components/recalc/calcHeading';
import {
  MeasurementInput,
  MeasurementOutput,
} from '~/components/recalc/io/measurement';
import { MotorInput } from '~/components/recalc/io/motor';
import { ChartContainer } from '~/components/ui/chart';
import { useQueryParams } from '~/lib/hooks';
import { supplyLimitToStatorLimit } from '~/lib/math/common';
import {
  ExponentialProfile,
  createState,
  fromCharacteristics,
  simProfile,
} from '~/lib/math/exponentialProfile';
import { calculateKa, calculateKg, calculateKv } from '~/lib/math/kVkA';
import type { LinearODEResult } from '~/lib/math/linear';
import Measurement from '~/lib/models/Measurement';
import Motor from '~/lib/models/Motor';
import Ratio, { RatioType } from '~/lib/models/Ratio';
import {
  MeasurementParam,
  MotorParam,
  NumberParam,
  RatioParam,
  withDefault,
} from '~/lib/types/queryParams';

const worker = new ComlinkWorker<typeof import('~/lib/math/linear')>(
  new URL('../lib/math/linear.js', import.meta.url),
);

export function meta() {
  return [
    { title: 'Chain Calculator' },
    { name: 'description', content: 'Chain Calculator' },
  ];
}

export default function Linear() {
  const queryParams = useQueryParams<{
    motor: Motor;
    travelDistance: Measurement;
    spoolDiameter: Measurement;
    load: Measurement;
    ratio: Ratio;
    efficiency: number;
    statorLimit: Measurement;
    supplyLimit: Measurement;
    supplyVoltage: Measurement;
    statorVoltage: Measurement;
    angle: Measurement;
  }>({
    motor: withDefault(MotorParam, Motor.fromName('Kraken X60 (FOC)', 2)),
    travelDistance: withDefault(MeasurementParam, new Measurement(60, 'in')),
    spoolDiameter: withDefault(MeasurementParam, new Measurement(1, 'in')),
    load: withDefault(MeasurementParam, new Measurement(15, 'lb')),
    ratio: withDefault(RatioParam, new Ratio(2, RatioType.REDUCTION)),
    efficiency: withDefault(NumberParam, 100),
    statorLimit: withDefault(MeasurementParam, new Measurement(60, 'A')),
    supplyLimit: withDefault(MeasurementParam, new Measurement(90, 'A')),
    supplyVoltage: withDefault(MeasurementParam, new Measurement(12, 'V')),
    statorVoltage: withDefault(MeasurementParam, new Measurement(6, 'V')),
    angle: withDefault(MeasurementParam, new Measurement(90, 'deg')),
  });

  const [motor, setMotor] = useState(queryParams.motor);
  const [travelDistance, setTravelDistance] = useState(
    queryParams.travelDistance,
  );
  const [spoolDiameter, setSpoolDiameter] = useState(queryParams.spoolDiameter);
  const [load, setLoad] = useState(queryParams.load);
  const [ratio, setRatio] = useState(queryParams.ratio);
  const [efficiency, setEfficiency] = useState(queryParams.efficiency);
  const [statorLimit, setStatorLimit] = useState(queryParams.statorLimit);
  const [supplyLimit, setSupplyLimit] = useState(queryParams.supplyLimit);
  const [supplyVoltage, setSupplyVoltage] = useState(queryParams.supplyVoltage);
  const [statorVoltage, setStatorVoltage] = useState(queryParams.statorVoltage);
  const [angle, setAngle] = useState(queryParams.angle);

  const supplyLimitInStatorTerms = useMemo(
    () =>
      supplyLimitToStatorLimit({
        supplyLimit,
        supplyVoltage,
        statorVoltage,
      }),
    [supplyLimit, supplyVoltage, statorVoltage],
  );

  const isUsingStatorLimit = useMemo(
    () => supplyLimitInStatorTerms.gt(statorLimit),
    [supplyLimitInStatorTerms, statorLimit],
  );

  const limitingCurrentLimit = useMemo(
    () => (isUsingStatorLimit ? statorLimit : supplyLimitInStatorTerms),
    [isUsingStatorLimit, statorLimit, supplyLimitInStatorTerms],
  );

  const kV = useMemo(
    () =>
      calculateKv(motor.freeSpeed.div(ratio.asNumber()), spoolDiameter.div(2)),
    [motor, ratio, spoolDiameter],
  );

  const kA = useMemo(
    () =>
      calculateKa(
        motor.kT
          .mul(limitingCurrentLimit)
          .mul(motor.quantity)
          .mul(ratio.asNumber())
          .mul(efficiency / 100),
        spoolDiameter.div(2),
        load,
      ),
    [
      motor.kT,
      limitingCurrentLimit,
      motor.quantity,
      efficiency,
      ratio,
      spoolDiameter,
      load,
    ],
  );

  const kG = useMemo(
    () =>
      calculateKg(
        motor.kT
          .mul(statorLimit)
          .mul(motor.quantity)
          .mul(ratio.asNumber())
          .mul(efficiency / 100),
        spoolDiameter.div(2),
        load,
      ).mul(Math.sin(angle.to('rad').scalar)),
    [
      motor.kT,
      statorLimit,
      motor.quantity,
      ratio,
      efficiency,
      spoolDiameter,
      load,
      angle,
    ],
  );

  const profile = useMemo(() => {
    const constraints = fromCharacteristics(
      statorVoltage.sub(kG).to('V').scalar,
      kV.to('V*s/in').scalar,
      kA.to('V*s^2/in').scalar,
      // 2.5629,
      // 0.43277,
    );
    return new ExponentialProfile(constraints);
  }, [kV, kA, kG, statorVoltage]);

  const simulatedStates = useMemo(
    () =>
      simProfile(
        profile,
        createState(0, 0),
        createState(travelDistance.to('in').scalar, 0),
        0.005,
        motor,
        limitingCurrentLimit,
        statorVoltage,
        spoolDiameter,
        ratio,
      ),
    [
      profile,
      travelDistance,
      motor,
      limitingCurrentLimit,
      statorVoltage,
      spoolDiameter,
      ratio,
    ],
  );

  return (
    <div>
      <CalcHeading title="Linear Motion Calculator" />
      <div className="flex flex-row flex-wrap gap-x-4 px-1 [&>*]:flex-1">
        <div className="flex flex-col gap-x-4 gap-y-2">
          <IOLine>
            <MotorInput stateHook={[motor, setMotor]} />
          </IOLine>

          <IOLine>
            <MeasurementInput
              stateHook={[travelDistance, setTravelDistance]}
              label="Travel Distance"
            />
            <MeasurementInput
              stateHook={[spoolDiameter, setSpoolDiameter]}
              label="Spool Diameter"
            />
          </IOLine>

          <IOLine>
            <MeasurementInput
              stateHook={[statorLimit, setStatorLimit]}
              label="Stator Limit"
            />
            <MeasurementInput
              stateHook={[supplyLimit, setSupplyLimit]}
              label="Supply Limit"
            />
          </IOLine>

          <IOLine>
            <MeasurementInput
              stateHook={[statorVoltage, setStatorVoltage]}
              label="Stator Voltage"
            />
            <MeasurementInput
              stateHook={[supplyVoltage, setSupplyVoltage]}
              label="Supply Voltage"
            />
          </IOLine>

          <IOLine>
            <MeasurementInput stateHook={[load, setLoad]} label="Load" />
            <MeasurementInput stateHook={[angle, setAngle]} label="Angle" />
          </IOLine>

          <IOLine>
            <MeasurementOutput state={kV} label="kV" defaultUnit="V*s/m" />
            <MeasurementOutput state={kA} label="kA" defaultUnit="V*s^2/m" />
            <MeasurementOutput state={kG} label="kG" defaultUnit="V" />
          </IOLine>
        </div>
        <ChartContainer config={{}} className="min-h-[200px] w-full">
          <LineChart data={simulatedStates}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <YAxis yAxisId="right2" orientation="right" />
            <Tooltip />

            <Line
              dataKey="position"
              yAxisId="left"
              stroke="black"
              dot={false}
            />

            <Line dataKey="velocity" yAxisId="right" stroke="red" dot={false} />
            <Line
              dataKey="current"
              yAxisId="left"
              stroke="goldenrod"
              dot={false}
            />
            <Line dataKey="voltage" yAxisId="left" stroke="blue" dot={false} />
            {/* <Line dataKey="rpm" yAxisId="right" stroke="green" dot={false} /> */}
            <Line dataKey="rpm" yAxisId="right2" stroke="green" dot={false} />
            <Line dataKey="torque" yAxisId="left" stroke="purple" dot={false} />
            <Line dataKey="power" yAxisId="right" stroke="grey" dot={false} />
            <Line
              dataKey="efficiency"
              yAxisId="left"
              stroke="green"
              dot={false}
            />
            <Line dataKey="losses" yAxisId="left" stroke="red" dot={false} />
            {/* <Line
              dataKey="positionInches"
              dot={false}
              yAxisId="left"
              stroke="black"
            />
            <Line
              dataKey="velocityRPM"
              dot={false}
              yAxisId="right"
              stroke="red"
            />
            <Line
              dataKey="statorDrawAmps"
              dot={false}
              yAxisId="left"
              stroke="goldenrod"
            />
            <Line
              dataKey="powerWatts"
              dot={false}
              yAxisId="right"
              stroke="green"
            />
            <Line
              dataKey="efficiency"
              dot={false}
              yAxisId="left"
              stroke="blue"
            /> */}

            <Legend />
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  );
}
