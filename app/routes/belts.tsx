import { useMemo, useState } from 'react';

import { BeltTable } from '~/components/recalc/beltTable';
import IOLine from '~/components/recalc/blocks';
import CalcHeading from '~/components/recalc/calcHeading';
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
    <div>
      <CalcHeading />
      <div className="flex flex-row flex-wrap gap-x-4 px-1 [&>*]:flex-1">
        <div className="flex flex-col gap-x-4 gap-y-2">
          <IOLine>
            <MeasurementInput stateHook={[pitch, setPitch]} label="Pitch" />
            <NumberInput
              stateHook={[toothIncrement, setToothIncrement]}
              label="Tooth Increment"
            />
          </IOLine>
          <IOLine>
            <MeasurementInput
              stateHook={[desiredCenter, setDesiredCenter]}
              label="Target Center"
            />
            <MeasurementInput
              stateHook={[extraCenter, setExtraCenter]}
              label="Extra Center"
            />
          </IOLine>

          <IOLine>
            <BooleanInput
              stateHook={[useCustomBelt, setUseCustomBelt]}
              label="Use Custom Belt"
            />
            <NumberInput
              stateHook={[customBeltTeeth, setCustomBeltTeeth]}
              label="Custom Belt Teeth"
            />
          </IOLine>

          <Divider className="">Pulley 1</Divider>
          <IOLine>
            <NumberInput stateHook={[p1Teeth, setP1Teeth]} label="Teeth" />
            <MeasurementOutput
              state={p1PitchDiameter}
              label="Pitch Diameter"
              defaultUnit="in"
            />
          </IOLine>

          <Divider className="">Pulley 2</Divider>
          <IOLine>
            <NumberInput stateHook={[p2Teeth, setP2Teeth]} label="Teeth" />
            <MeasurementOutput
              state={p2PitchDiameter}
              label="Pitch Diameter"
              defaultUnit="in"
            />
          </IOLine>

          <Divider className="">Smaller Belt</Divider>
          <IOLine>
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
          </IOLine>

          <IOLine>
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
          </IOLine>

          <IOLine>
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
          </IOLine>

          <Divider className="">Larger Belt</Divider>
          <IOLine>
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
          </IOLine>

          <IOLine>
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
          </IOLine>

          <IOLine>
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
          </IOLine>
        </div>
        <div className="flex w-auto flex-col gap-x-4 gap-y-4">
          <PulleyTable
            filterFn={(pulley) =>
              pulley.pitch.eq(pitch) &&
              (pulley.teeth == p1Teeth || pulley.teeth == p2Teeth)
            }
          />
          <BeltTable
            filterFn={(belt) =>
              belt.pitch.eq(pitch) &&
              (belt.teeth == results.larger.belt.teeth ||
                belt.teeth == results.smaller.belt.teeth)
            }
          />
        </div>
      </div>
    </div>
  );
}
