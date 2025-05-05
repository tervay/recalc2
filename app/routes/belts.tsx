import { useMemo, useState } from 'react';

import { BeltTable } from '~/components/recalc/beltTable';
import Divider from '~/components/recalc/divider';
import BooleanInput from '~/components/recalc/io/boolean';
import {
  MeasurementInput,
  MeasurementOutput,
} from '~/components/recalc/io/measurement';
import NumberInput, { NumberOutput } from '~/components/recalc/io/number';
import { PulleyTable } from '~/components/recalc/pulleyTable';
import { useQueryParams } from '~/lib/hooks';
import { calculateClosestCenters } from '~/lib/math/belts';
import Measurement from '~/lib/models/Measurement';
import { SimplePulley } from '~/lib/models/Pulley';
import {
  BooleanParam,
  MeasurementParam,
  NumberParam,
  withDefault,
} from '~/lib/types/queryParams';

export function meta() {
  return [
    { title: 'Belt Calculator' },
    { name: 'description', content: 'Belt Calculator' },
  ];
}

export default function Belts() {
  const queryParams = useQueryParams<{
    customBeltTeeth: number;
    desiredCenter: Measurement;
    extraCenter: Measurement;
    p1Teeth: number;
    p2Teeth: number;
    pitch: Measurement;
    toothIncrement: number;
    useCustomBelt: boolean;
  }>({
    customBeltTeeth: withDefault(NumberParam, 125),
    desiredCenter: withDefault(MeasurementParam, new Measurement(5, 'in')),
    extraCenter: withDefault(MeasurementParam, new Measurement(0, 'mm')),
    p1Teeth: withDefault(NumberParam, 16),
    p2Teeth: withDefault(NumberParam, 24),
    pitch: withDefault(MeasurementParam, new Measurement(5, 'mm')),
    toothIncrement: withDefault(NumberParam, 5),
    useCustomBelt: withDefault(BooleanParam, false),
  });

  const [customBeltTeeth, setCustomBeltTeeth] = useState(
    queryParams.customBeltTeeth,
  );
  const [desiredCenter, setDesiredCenter] = useState(queryParams.desiredCenter);
  const [extraCenter, setExtraCenter] = useState(queryParams.extraCenter);
  const [p1Teeth, setP1Teeth] = useState(queryParams.p1Teeth);
  const [p2Teeth, setP2Teeth] = useState(queryParams.p2Teeth);
  const [pitch, setPitch] = useState(queryParams.pitch);
  const [toothIncrement, setToothIncrement] = useState(
    queryParams.toothIncrement,
  );
  const [useCustomBelt, setUseCustomBelt] = useState(queryParams.useCustomBelt);

  const results = useMemo(
    () =>
      calculateClosestCenters(
        new SimplePulley(p1Teeth, pitch),
        new SimplePulley(p2Teeth, pitch),
        desiredCenter,
        toothIncrement,
      ),
    [p1Teeth, p2Teeth, pitch, desiredCenter, toothIncrement],
  );

  const p1PitchDiameter = useMemo(
    () => new SimplePulley(p1Teeth, pitch).pitchDiameter,
    [p1Teeth, pitch],
  );

  const p2PitchDiameter = useMemo(
    () => new SimplePulley(p2Teeth, pitch).pitchDiameter,
    [p2Teeth, pitch],
  );

  return (
    <div className="mt-10 flex flex-row gap-4">
      <div className="flex flex-col gap-x-4 gap-y-2">
        <div className="flex flex-row gap-4 [&>*]:w-1/2">
          <MeasurementInput stateHook={[pitch, setPitch]} label="Pitch" />
          <NumberInput
            stateHook={[toothIncrement, setToothIncrement]}
            label="Tooth Increment"
          />
        </div>
        <div className="flex flex-row gap-4 [&>*]:w-1/2">
          <MeasurementInput
            stateHook={[desiredCenter, setDesiredCenter]}
            label="Target Center"
          />
          <MeasurementInput
            stateHook={[extraCenter, setExtraCenter]}
            label="Extra Center"
          />
        </div>

        <div className="flex flex-row gap-4 [&>*]:w-1/2">
          <BooleanInput
            stateHook={[useCustomBelt, setUseCustomBelt]}
            label="Use Custom Belt"
          />
          <NumberInput
            stateHook={[customBeltTeeth, setCustomBeltTeeth]}
            label="Custom Belt Teeth"
          />
        </div>

        <Divider className="">Pulley 1</Divider>
        <div className="flex flex-row gap-4 [&>*]:w-1/2">
          <NumberInput stateHook={[p1Teeth, setP1Teeth]} label="Teeth" />
          <MeasurementOutput
            state={p1PitchDiameter}
            label="Pitch Diameter"
            defaultUnit="in"
          />
        </div>

        <Divider className="">Pulley 2</Divider>
        <div className="flex flex-row gap-4 [&>*]:w-1/2">
          <NumberInput stateHook={[p2Teeth, setP2Teeth]} label="Teeth" />
          <MeasurementOutput
            state={p2PitchDiameter}
            label="Pitch Diameter"
            defaultUnit="in"
          />
        </div>

        <Divider className="">Smaller Belt</Divider>
        <div className="flex flex-row gap-4 [&>*]:w-1/2">
          <NumberOutput
            state={results.smaller.belt.teeth}
            label="Belt Teeth"
            roundTo={0}
          />
          <MeasurementOutput
            state={results.smaller.distance}
            label="Center Distance"
            defaultUnit="in"
          />
        </div>

        <div className="flex flex-row gap-4 [&>*]:w-1/2">
          <NumberOutput
            state={results.smaller.p1TeethInMesh}
            label="Pulley 1 Teeth in Mesh"
            roundTo={0}
          />
          <NumberOutput
            state={results.smaller.p2TeethInMesh}
            label="Pulley 2 Teeth in Mesh"
            roundTo={0}
          />
        </div>

        <div className="flex flex-row gap-4 [&>*]:w-1/2">
          <MeasurementOutput
            state={results.smaller.gapBetweenPulleys}
            label="Gap Between Pulleys"
            defaultUnit="in"
          />
          <MeasurementOutput
            state={results.smaller.differenceFromTarget}
            label="Difference From Target"
            defaultUnit="in"
          />
        </div>

        <Divider className="">Larger Belt</Divider>
        <div className="flex flex-row gap-4 [&>*]:w-1/2">
          <NumberOutput
            state={results.larger.belt.teeth}
            label="Belt Teeth"
            roundTo={0}
          />
          <MeasurementOutput
            state={results.larger.distance}
            label="Center Distance"
            defaultUnit="in"
          />
        </div>

        <div className="flex flex-row gap-4 [&>*]:w-1/2">
          <NumberOutput
            state={results.larger.p1TeethInMesh}
            label="Pulley 1 Teeth in Mesh"
            roundTo={0}
          />
          <NumberOutput
            state={results.larger.p2TeethInMesh}
            label="Pulley 2 Teeth in Mesh"
            roundTo={0}
          />
        </div>

        <div className="flex flex-row gap-4 [&>*]:w-1/2">
          <MeasurementOutput
            state={results.larger.gapBetweenPulleys}
            label="Gap Between Pulleys"
            defaultUnit="in"
          />
          <MeasurementOutput
            state={results.larger.differenceFromTarget}
            label="Difference From Target"
            defaultUnit="in"
          />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <BeltTable
          filterFn={(belt) =>
            new Measurement(belt.pitch, 'mm').eq(pitch) &&
            (belt.teeth == results.larger.belt.teeth ||
              belt.teeth == results.smaller.belt.teeth)
          }
        />
        <PulleyTable
          filterFn={(pulley) =>
            pulley.pitch.eq(pitch) &&
            (pulley.teeth == p1Teeth || pulley.teeth == p2Teeth)
          }
        />
      </div>
    </div>
  );
}
