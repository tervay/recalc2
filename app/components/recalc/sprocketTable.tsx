import { useMemo } from 'react';
import { Link } from 'react-router';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import wcpSprockets from '~/genData/WCP/sprockets.json';
import Sprocket from '~/lib/models/Sprocket';
import type { Bore } from '~/lib/types/common';
import type { ChainType } from '~/lib/types/sprockets';

export function SprocketTable({
  filterFn = () => true,
}: {
  filterFn?: (sprocket: Sprocket) => boolean;
}) {
  const sprockets = useMemo(() => {
    return [...wcpSprockets]
      .map((p) => {
        const sprocketData = {
          ...p,
          bore: p.bore as Bore,
          chainType: p.chainType as ChainType,
        };
        return Sprocket.fromJson(sprocketData);
      })
      .filter(filterFn)
      .sort((a, b) => a.teeth - b.teeth || a.bore.localeCompare(b.bore));
  }, [filterFn]);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead colSpan={6} className="text-center font-bold">
              Matching COTS Sprockets
            </TableHead>
          </TableRow>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Teeth</TableHead>
            <TableHead>Bore</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sprockets.map((sprocket) => (
            <TableRow key={sprocket.sku}>
              <TableCell className="font-medium">
                <Link to={sprocket.url}>
                  {sprocket.vendor} - {sprocket.sku}
                </Link>
              </TableCell>
              <TableCell>{sprocket.teeth}</TableCell>
              <TableCell>{sprocket.bore}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
