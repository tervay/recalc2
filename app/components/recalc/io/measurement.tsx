import { useEffect, useMemo, useState } from 'react';

import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import Measurement from '~/lib/models/Measurement';
import type { HasStateHook } from '~/lib/types/common';

export function MeasurementInput({
  stateHook,
  label,
}: HasStateHook<Measurement> & { label: string }) {
  const [meas, setMeas] = stateHook;

  const [scalar, setScalar] = useState(meas.scalar);
  const [unit, setUnit] = useState(meas.units());
  const kinds = useMemo(() => Measurement.choices(meas), [meas]);

  useEffect(() => {
    setMeas(new Measurement(scalar, unit));
  }, [scalar, unit, setMeas]);

  return (
    <div className="flex flex-row">
      <Label htmlFor="measurement" className="mr-2 text-nowrap">
        {label}
      </Label>
      <div className="flex w-full flex-row">
        <Input
          type="number"
          id="measurement"
          placeholder={label}
          value={scalar}
          onChange={(e) => {
            setScalar(Number(e.target.value));
          }}
          className="rounded-r-none"
        />
        <Select value={unit} onValueChange={setUnit}>
          <SelectTrigger className="rounded-l-none">
            <SelectValue placeholder="Theme" />
          </SelectTrigger>
          <SelectContent>
            {kinds.map((kind) => (
              <SelectItem key={kind} value={kind}>
                {kind}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export function MeasurementOutput({
  state,
  label,
  defaultUnit,
  roundTo = 3,
}: {
  state: Measurement;
  label: string;
  defaultUnit?: string;
  roundTo?: number;
}) {
  const [scalar, setScalar] = useState(state.scalar);
  const [unit, setUnit] = useState(defaultUnit ?? state.units());
  const kinds = useMemo(() => Measurement.choices(state), [state]);
  const [stringified, setStringified] = useState(scalar.toFixed(roundTo));

  useEffect(() => {
    setScalar(state.to(unit).scalar);
  }, [state, unit]);

  useEffect(() => {
    setStringified(scalar.toFixed(roundTo));
  }, [scalar, roundTo]);

  return (
    <div className="flex flex-row">
      <Label htmlFor="measurement" className="mr-2 text-nowrap">
        {label}
      </Label>
      <div className="flex w-full flex-row">
        <Input
          type="number"
          id="measurement"
          disabled
          placeholder={label}
          value={stringified}
          className="rounded-r-none disabled:bg-gray-100 disabled:text-gray-900"
        />
        <Select value={unit} onValueChange={setUnit}>
          <SelectTrigger className="rounded-l-none">
            <SelectValue placeholder="Theme" />
          </SelectTrigger>
          <SelectContent>
            {kinds.map((kind) => (
              <SelectItem key={kind} value={kind}>
                {kind}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
