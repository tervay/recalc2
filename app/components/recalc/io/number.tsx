import { useEffect, useState } from 'react';

import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { TooltipContent, TooltipProvider } from '~/components/ui/tooltip';
import { Tooltip, TooltipTrigger } from '~/components/ui/tooltip';
import type { HasStateHook } from '~/lib/types/common';

export default function NumberInput({
  stateHook,
  label,
  tooltip,
}: HasStateHook<number> & { label: string; tooltip?: string }) {
  const [value, setValue] = stateHook;
  const [proxyValue, setProxyValue] = useState(value.toString());

  useEffect(() => {
    if (proxyValue !== '' && proxyValue !== '0') {
      setValue(Number(proxyValue));
    } else {
      setValue(0);
    }
  }, [proxyValue, setValue]);

  return (
    <div className="flex flex-row">
      {tooltip === undefined ? (
        <Label htmlFor="number" className="mr-2 text-nowrap">
          {label}
        </Label>
      ) : (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Label htmlFor="number" className="mr-2 text-nowrap">
                {label}
              </Label>
            </TooltipTrigger>
            <TooltipContent>{tooltip}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <Input
        value={proxyValue}
        onChange={(e) => {
          if (e.target.value !== '') {
            setProxyValue(e.target.value);
          } else {
            setProxyValue('');
          }
        }}
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
        className="disabled:bg-gray-100 disabled:text-gray-900"
      />
    </div>
  );
}
