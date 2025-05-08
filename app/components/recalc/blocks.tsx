import type { ReactNode } from 'react';

import { cn } from '~/lib/utils';

export default function IOLine({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-row flex-wrap gap-x-4 md:flex-nowrap [&>*]:flex-1',
        className,
      )}
    >
      {children}
    </div>
  );
}
