import { Link } from 'react-router';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import wcpBelts from '~/genData/WCP/belts.json';

export function BeltTable({
  filterFn = () => true,
}: {
  filterFn?: (belt: (typeof wcpBelts)[number]) => boolean;
}) {
  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>SKU</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Pitch</TableHead>
            <TableHead>Teeth</TableHead>
            <TableHead>Width</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {wcpBelts
            .filter(filterFn)
            .sort((belt) => belt.teeth)
            .map((belt) => (
              <TableRow key={belt.sku}>
                <TableCell className="font-medium">
                  <Link to={belt.url}>{belt.sku}</Link>
                </TableCell>
                <TableCell>{belt.profile}</TableCell>
                <TableCell>{belt.pitch}</TableCell>
                <TableCell>{belt.teeth}</TableCell>
                <TableCell>{belt.width}</TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
