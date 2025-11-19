import type { Page } from '@playwright/test';

export interface TestCase {
  field: string;
  value: string;
  runBefore?: (page: Page) => Promise<void>;
}
