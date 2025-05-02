import queryString from 'query-string';

import Measurement from '~/lib/models/Measurement';

export interface DefaultAndQueryParamProvider<T> {
  queryParam: QueryParam<T>;
  defaultValue: T;
}

export function withDefault<T>(
  param: QueryParam<T>,
  defaultValue: T,
): DefaultAndQueryParamProvider<T> {
  return {
    queryParam: param,
    defaultValue,
  };
}

export interface QueryParam<T> {
  encode: (value: T) => string;
  decode: (value: string) => T;
}

export const StringParam: QueryParam<string> = {
  encode: (value) => value,
  decode: (value) => value,
};

export const NumberParam: QueryParam<number> = {
  encode: (value) => value.toString(),
  decode: (value) => Number(value),
};

export const BooleanParam: QueryParam<boolean> = {
  encode: (value) => value.toString(),
  decode: (value) => value === 'true',
};

export const MeasurementParam: QueryParam<Measurement> = {
  encode: (value) => queryString.stringify(value.toDict()),
  decode: (value) => {
    const parsed = queryString.parse(value);

    if ('s' in parsed && 'u' in parsed) {
      return Measurement.fromDict({
        s: Number(parsed.s),
        u: parsed.u as string,
      });
    }

    throw new Error('Invalid measurement');
  },
};
