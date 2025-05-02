import { useQueryParams } from '~/lib/hooks';
import Measurement from '~/lib/models/Measurement';
import {
  MeasurementParam,
  NumberParam,
  StringParam,
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
    hello: string;
    foo: number;
    bar: Measurement;
  }>({
    hello: withDefault(StringParam, 'world'),
    foo: withDefault(NumberParam, 1),
    bar: withDefault(MeasurementParam, new Measurement(1, 'in')),
  });

  return <div>{queryParams.hello}</div>;
}
