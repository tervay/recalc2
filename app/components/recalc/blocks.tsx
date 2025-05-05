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
        'flex flex-row flex-wrap gap-x-4 md:flex-nowrap [&>*]:w-full [&>*]:md:w-1/2',
        className,
      )}
    >
      {children}
    </div>
  );
}
