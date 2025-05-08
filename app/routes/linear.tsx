import { minBy } from 'lodash-es';
import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Label,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DataKey } from 'recharts/types/util/types';

import IOLine from '~/components/recalc/blocks';
import CalcHeading from '~/components/recalc/calcHeading';
import {
  MeasurementInput,
  MeasurementOutput,
} from '~/components/recalc/io/measurement';
import { MotorInput } from '~/components/recalc/io/motor';
import NumberInput from '~/components/recalc/io/number';
import { RatioInput } from '~/components/recalc/io/ratio';
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
import { calculateStallLoad } from '~/lib/math/linear';
import Measurement from '~/lib/models/Measurement';
import Motor from '~/lib/models/Motor';
import Ratio, { RatioType } from '~/lib/models/Ratio';
import { MotorRules } from '~/lib/rules';
import {
  MeasurementParam,
  MotorParam,
  NumberParam,
  RatioParam,
  withDefault,
} from '~/lib/types/queryParams';

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
    batteryResistance: Measurement;
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
    statorVoltage: withDefault(MeasurementParam, new Measurement(10, 'V')),
    angle: withDefault(MeasurementParam, new Measurement(90, 'deg')),
    batteryResistance: withDefault(
      MeasurementParam,
      new Measurement(0.015, 'Ohm'),
    ),
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
  const [batteryResistance, setBatteryResistance] = useState(
    queryParams.batteryResistance,
  );
  const [hiddenChartLines, setHiddenChartLines] = useState<DataKey<unknown>[]>(
    [],
  );

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

  const statorPowerLimit = useMemo(
    () => statorVoltage.mul(statorLimit),
    [statorVoltage, statorLimit],
  );

  const supplyPowerLimit = useMemo(
    () => supplyVoltage.mul(supplyLimit),
    [supplyVoltage, supplyLimit],
  );

  const kV = useMemo(
    () =>
      ratio.asNumber() === 0
        ? new Measurement(0, 'V*s/m')
        : calculateKv(
            motor.freeSpeed.div(ratio.asNumber()),
            spoolDiameter.div(2),
          ),
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
        new MotorRules(motor, limitingCurrentLimit, {
          current: limitingCurrentLimit,
          voltage: statorVoltage,
        })
          .solve()
          .torque.mul(motor.quantity)
          .mul(ratio.asNumber())
          .mul(efficiency / 100),
        spoolDiameter.div(2),
        load,
      ).mul(Math.sin(angle.to('rad').scalar)),
    [
      motor,
      limitingCurrentLimit,
      statorVoltage,
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
        supplyVoltage,
        batteryResistance,
      ),
    [
      profile,
      travelDistance,
      motor,
      limitingCurrentLimit,
      statorVoltage,
      spoolDiameter,
      ratio,
      supplyVoltage,
      batteryResistance,
    ],
  );

  const timeToGoal = useMemo(() => {
    return new Measurement(
      simulatedStates.find(
        (state) => state.position >= travelDistance.to('in').scalar,
      )?.time ?? 0,
      's',
    );
  }, [simulatedStates, travelDistance]);

  const stallLoad = useMemo(() => {
    return calculateStallLoad(
      motor,
      limitingCurrentLimit,
      spoolDiameter,
      ratio,
      efficiency,
      statorVoltage,
    );
  }, [
    motor,
    limitingCurrentLimit,
    spoolDiameter,
    ratio,
    efficiency,
    statorVoltage,
  ]);

  const minimumBatteryVoltage = useMemo(
    () =>
      new Measurement(
        minBy(simulatedStates, (state) => state.batteryVoltage)
          ?.batteryVoltage ?? 0,
        'V',
      ),
    [simulatedStates],
  );

  return (
    <div>
      <CalcHeading title="Linear Motion Calculator" />
      <div className="flex flex-row flex-wrap gap-x-4 px-1 [&>*]:flex-1">
        <div className="flex flex-col gap-x-4 gap-y-2">
          <IOLine>
            <MotorInput stateHook={[motor, setMotor]} />
            <RatioInput stateHook={[ratio, setRatio]} />
          </IOLine>

          <IOLine>
            <NumberInput
              stateHook={[efficiency, setEfficiency]}
              label="Efficiency %"
            />
            <MeasurementInput
              stateHook={[spoolDiameter, setSpoolDiameter]}
              label="Spool Diameter"
            />
          </IOLine>

          <IOLine>
            <MeasurementInput
              stateHook={[travelDistance, setTravelDistance]}
              label="Travel Distance"
            />
            <MeasurementInput
              stateHook={[batteryResistance, setBatteryResistance]}
              label="Battery Resistance"
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
            <MeasurementOutput
              state={statorPowerLimit}
              label="Stator Power Limit"
              defaultUnit="W"
              roundTo={0}
            />
            <MeasurementOutput
              state={supplyPowerLimit}
              label="Supply Power Limit"
              defaultUnit="W"
              roundTo={0}
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

          <IOLine>
            <MeasurementOutput
              state={stallLoad}
              label="Stall Load"
              defaultUnit="lbs"
            />
            <MeasurementOutput
              state={timeToGoal}
              label="Time to Goal"
              defaultUnit="s"
            />
          </IOLine>

          <IOLine>
            <MeasurementOutput
              state={minimumBatteryVoltage}
              label="Minimum Battery Voltage"
              defaultUnit="V"
              roundTo={2}
            />
          </IOLine>
        </div>
        <ChartContainer config={{}} className="min-h-[200px] w-full">
          <LineChart data={simulatedStates}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis yAxisId="left">
              <Label value="Current (A), Efficiency (%)" angle={-90} />
            </YAxis>
            <YAxis yAxisId="right" orientation="right">
              <Label
                value="Position (in), Velocity (in/s), Power (W)"
                angle={90}
                offset={10}
              />
            </YAxis>
            <Tooltip />

            <Line
              dataKey="position"
              yAxisId="right"
              stroke="black"
              dot={false}
              hide={hiddenChartLines.includes('position')}
            />

            <Line
              dataKey="velocity"
              yAxisId="right"
              stroke="red"
              dot={false}
              hide={hiddenChartLines.includes('velocity')}
            />
            <Line
              dataKey="current"
              yAxisId="left"
              stroke="goldenrod"
              dot={false}
              hide={hiddenChartLines.includes('current')}
            />
            <Line
              dataKey="power"
              yAxisId="right"
              stroke="green"
              dot={false}
              hide={hiddenChartLines.includes('power')}
            />
            <Line
              dataKey="efficiency"
              yAxisId="left"
              stroke="purple"
              dot={false}
              hide={hiddenChartLines.includes('efficiency')}
            />
            <Legend
              onClick={(props) => {
                if (props.dataKey === undefined) {
                  return;
                }

                if (hiddenChartLines.includes(props.dataKey)) {
                  setHiddenChartLines(
                    hiddenChartLines.filter((line) => line !== props.dataKey),
                  );
                } else {
                  setHiddenChartLines([...hiddenChartLines, props.dataKey]);
                }
              }}
            />
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  );
}
