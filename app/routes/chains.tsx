import { useMemo, useState } from 'react';

import IOLine from '~/components/recalc/blocks';
import CalcHeading from '~/components/recalc/calcHeading';
import { MeasurementInput } from '~/components/recalc/io/measurement';
import { SprocketTable } from '~/components/recalc/sprocketTable';
import { useQueryParams } from '~/lib/hooks';
import { calculateCenters } from '~/lib/math/chains';
import Measurement from '~/lib/models/Measurement';
import {
  BooleanParam,
  MeasurementParam,
  NumberParam,
  StringParam,
  withDefault,
} from '~/lib/types/queryParams';

export function meta() {
  return [
    { title: 'Chain Calculator' },
    { name: 'description', content: 'Chain Calculator' },
  ];
}

export default function Chains() {
  const queryParams = useQueryParams<{
    chain: string;
    p1Teeth: number;
    p2Teeth: number;
    desiredCenter: Measurement;
    extraCenter: Measurement;
    allowHalfLinks: boolean;
  }>({
    chain: withDefault(StringParam, '#25'),
    p1Teeth: withDefault(NumberParam, 16),
    p2Teeth: withDefault(NumberParam, 36),
    desiredCenter: withDefault(MeasurementParam, new Measurement(5, 'in')),
    extraCenter: withDefault(MeasurementParam, new Measurement(0, 'in')),
    allowHalfLinks: withDefault(BooleanParam, false),
  });

  const [chain, setChain] = useState(queryParams.chain);
  const [p1Teeth, setP1Teeth] = useState(queryParams.p1Teeth);
  const [p2Teeth, setP2Teeth] = useState(queryParams.p2Teeth);
  const [desiredCenter, setDesiredCenter] = useState(queryParams.desiredCenter);
  const [extraCenter, setExtraCenter] = useState(queryParams.extraCenter);
  const [allowHalfLinks, setAllowHalfLinks] = useState(
    queryParams.allowHalfLinks,
  );

  const results = useMemo(
    () =>
      calculateCenters(chain, p1Teeth, p2Teeth, desiredCenter, allowHalfLinks),
    [chain, p1Teeth, p2Teeth, desiredCenter, allowHalfLinks],
  );

  return (
    <div>
      <CalcHeading title="Chain Calculator" />

      <div className="flex flex-row flex-wrap gap-x-4 px-1 [&>*]:flex-1">
        <div className="flex flex-col gap-x-4 gap-y-2">
          <IOLine>
            <MeasurementInput
              stateHook={[desiredCenter, setDesiredCenter]}
              label="Desired Center"
            />
            <MeasurementInput
              stateHook={[extraCenter, setExtraCenter]}
              label="Extra Center"
            />
          </IOLine>
        </div>

        <div className="flex w-auto flex-col gap-x-4 gap-y-4">
          <SprocketTable
            filterFn={(sprocket) =>
              sprocket.chainType === chain &&
              (sprocket.teeth === p1Teeth || sprocket.teeth === p2Teeth)
            }
          />
        </div>
      </div>
    </div>
  );
}
