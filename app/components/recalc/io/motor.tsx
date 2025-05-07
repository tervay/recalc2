import { useEffect, useState } from 'react';

import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import Motor from '~/lib/models/Motor';
import { ALL_MOTORS } from '~/lib/models/Motor';
import type { HasStateHook } from '~/lib/types/common';

export function MotorInput({ stateHook }: HasStateHook<Motor>) {
  const [motor, setMotor] = stateHook;
  const [name, setName] = useState(motor.identifier);
  const [quantity, setQuantity] = useState(motor.quantity);

  useEffect(() => {
    setMotor(Motor.fromName(name, quantity));
  }, [name, quantity, setMotor]);

  return (
    <div className="flex flex-row">
      <Label htmlFor="measurement" className="mr-2 text-nowrap">
        Motor
      </Label>
      <div className="flex w-full flex-row">
        <Input
          type="number"
          id="measurement"
          value={quantity}
          onChange={(e) => {
            setQuantity(Number(e.target.value));
          }}
          className="rounded-r-none"
        />
        <Select value={name} onValueChange={setName}>
          <SelectTrigger className="rounded-l-none">
            <SelectValue placeholder="Theme" />
          </SelectTrigger>
          <SelectContent>
            {ALL_MOTORS.map((m) => (
              <SelectItem key={m.name} value={m.name}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
