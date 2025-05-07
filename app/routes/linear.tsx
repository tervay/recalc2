import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import IOLine from '~/components/recalc/blocks';
import CalcHeading from '~/components/recalc/calcHeading';
import { MeasurementInput } from '~/components/recalc/io/measurement';
import { ChartContainer } from '~/components/ui/chart';
import { useQueryParams } from '~/lib/hooks';
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
    angle: Measurement;
  }>({
    motor: withDefault(MotorParam, Motor.fromName('Kraken X60 (FOC)')),
    travelDistance: withDefault(MeasurementParam, new Measurement(60, 'in')),
    spoolDiameter: withDefault(MeasurementParam, new Measurement(1, 'in')),
    load: withDefault(MeasurementParam, new Measurement(15, 'lb')),
    ratio: withDefault(RatioParam, new Ratio(2, RatioType.REDUCTION)),
    efficiency: withDefault(NumberParam, 100),
    statorLimit: withDefault(MeasurementParam, new Measurement(60, 'A')),
    supplyLimit: withDefault(MeasurementParam, new Measurement(90, 'A')),
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
  const [angle, setAngle] = useState(queryParams.angle);

  const moi = useMemo(
    () =>
      ratio.asNumber() === 0
        ? new Measurement(0, 'kg m2')
        : load
            .mul(spoolDiameter.div(2))
            .mul(spoolDiameter.div(2))
            .div(ratio.asNumber())
            .div(ratio.asNumber()),
    [ratio, load, spoolDiameter],
  );

  // const results = useMemo(
  //   () =>
  //     generateODEData(
  //       motor,
  //       new Measurement(12, 'V'),
  //       new Measurement(12, 'V'),
  //       statorLimit,
  //       supplyLimit,
  //       travelDistance,
  //       ratio,
  //       spoolDiameter,
  //       load,
  //       moi,
  //       efficiency,
  //       angle,
  //     ),
  //   [
  //     angle,
  //     efficiency,
  //     load,
  //     moi,
  //     motor,
  //     ratio,
  //     spoolDiameter,
  //     statorLimit,
  //     supplyLimit,
  //     travelDistance,
  //   ],
  // );

  const [results, setResults] = useState<LinearODEResult[]>([]);

  // useEffect(async () => {
  //   await worker
  //     .generateODEData(
  //       motor.toDict(),
  //       new Measurement(12, 'V').toDict(),
  //       new Measurement(12, 'V').toDict(),
  //       statorLimit.toDict(),
  //       supplyLimit.toDict(),
  //       travelDistance.toDict(),
  //       ratio.toDict(),
  //       spoolDiameter.toDict(),
  //       load.toDict(),
  //       moi.toDict(),
  //       efficiency,
  //       angle.toDict(),
  //     )
  //     .then((r) => {
  //       setResults(r);
  //     });
  // }, [
  //   angle,
  //   efficiency,
  //   load,
  //   moi,
  //   motor,
  //   ratio,
  //   spoolDiameter,
  //   statorLimit,
  //   supplyLimit,
  //   travelDistance,
  // ]);

  useEffect(() => {
    void worker
      .generateODEData(
        motor.toDict(),
        new Measurement(12, 'V').toDict(),
        new Measurement(12, 'V').toDict(),
        statorLimit.toDict(),
        supplyLimit.toDict(),
        travelDistance.toDict(),
        ratio.toDict(),
        spoolDiameter.toDict(),
        load.toDict(),
        moi.toDict(),
        efficiency,
        angle.toDict(),
      )
      .then(setResults);
  }, [
    angle,
    efficiency,
    load,
    moi,
    motor,
    ratio,
    spoolDiameter,
    statorLimit,
    supplyLimit,
    travelDistance,
  ]);

  return (
    <div>
      <CalcHeading title="Linear Motion Calculator" />
      <div className="flex flex-row flex-wrap gap-x-4 px-1 [&>*]:flex-1">
        <div className="flex flex-col gap-x-4 gap-y-2">
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
            <MeasurementInput stateHook={[load, setLoad]} label="Load" />
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
            <MeasurementInput stateHook={[angle, setAngle]} label="Angle" />
          </IOLine>
        </div>
        <ChartContainer config={{}} className="min-h-[200px] w-full">
          <LineChart data={results}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timeSeconds" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />

            <Line
              dataKey="positionInches"
              dot={false}
              yAxisId="left"
              stroke="red"
            />
            <Line
              dataKey="velocityRPM"
              dot={false}
              yAxisId="right"
              stroke="blue"
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
            />
          </LineChart>
        </ChartContainer>
      </div>
    </div>
  );
}
