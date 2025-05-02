/* eslint-disable @typescript-eslint/no-explicit-any */
import queryString from 'query-string';
import { useLocation } from 'react-router';

import type {
  DefaultAndQueryParamProvider,
  QueryParam,
} from '~/lib/types/queryParams';

type QueryParamEncodeDecodeMap<T extends Record<string, QueryParam<any>>> = {
  [K in keyof T]: QueryParam<T[K]>;
};

type QueryParamEncodeDecodeMapWithDefaults<
  T extends Record<string, QueryParam<any>>,
> = {
  [K in keyof T]: DefaultAndQueryParamProvider<T[K]>;
};

export function useQueryParams<T extends Record<string, any>>(
  map: QueryParamEncodeDecodeMapWithDefaults<T>,
): T {
  const { search } = useLocation();
  const parsed = queryString.parse(search);

  for (const key in map) {
    const value = parsed[key];
    if (value) {
      if (typeof value === 'string') {
        parsed[key] = map[key].queryParam.decode(value);
      }
    }
  }

  const result: Record<string, any> = {};
  for (const key in map) {
    result[key] = parsed[key] ?? map[key].defaultValue;
  }

  return result as T;
}
