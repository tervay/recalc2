import { useEffect, useState } from 'react';

import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import type { HasStateHook } from '~/lib/types/common';

export default function NumberInput({
  stateHook,
  label,
}: HasStateHook<number> & { label: string }) {
  const [value, setValue] = stateHook;

  return (
    <div className="flex flex-row">
      <Label htmlFor="number" className="mr-2 text-nowrap">
        {label}
      </Label>
      <Input
        type="number"
        id="number"
        placeholder={label}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
      />
    </div>
  );
}

export function NumberOutput({
  state,
  label,
  roundTo = 3,
}: {
  state: number;
  label: string;
  roundTo?: number;
}) {
  const [stringified, setStringified] = useState(state.toFixed(roundTo));

  useEffect(() => {
    setStringified(state.toFixed(roundTo));
  }, [state, roundTo]);

  return (
    <div className="flex flex-row">
      <Label htmlFor="measurement" className="mr-2 text-nowrap">
        {label}
      </Label>
      <Input
        type="number"
        id="measurement"
        disabled
        placeholder={label}
        value={stringified}
        className="rounded-r-none"
      />
    </div>
  );
}
