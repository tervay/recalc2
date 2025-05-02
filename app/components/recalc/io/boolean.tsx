import { Label } from '~/components/ui/label';
import { Switch } from '~/components/ui/switch';
import type { HasStateHook } from '~/lib/types/common';

export default function BooleanInput({
  stateHook,
  label,
}: HasStateHook<boolean> & { label: string }) {
  const [value, setValue] = stateHook;

  return (
    <div className="flex flex-row items-center gap-2">
      <Switch id={label} checked={value} onCheckedChange={setValue} />
      <Label htmlFor={label}>{label}</Label>
    </div>
  );
}
