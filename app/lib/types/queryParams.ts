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
  decode: (value) => value === "true",
};
