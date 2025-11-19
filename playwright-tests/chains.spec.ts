import { expect, test } from '@playwright/test';
import type { TestCase } from 'playwright-tests/testTypes';

test.describe('Chain Calculator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chains');
    await page.waitForLoadState('networkidle');
  });

  const magnitudeTests: TestCase[] = [
    { field: 'desiredCenter', value: '10' },
    { field: 'extraCenter', value: '1' },
    { field: 'p1Teeth', value: '30' },
    { field: 'p2Teeth', value: '60' },
  ];

  magnitudeTests.forEach(({ field, value }) => {
    const snapshot = `${field}-changed.yaml`;
    test(`should match snapshot with ${field} magnitude changed`, async ({
      page,
    }) => {
      await page.getByTestId(field).fill(value);
      expect(await page.getByRole('main').ariaSnapshot()).toMatchSnapshot({
        name: snapshot,
      });
    });
  });

  const unitTests: TestCase[] = [
    { field: 'desiredCenter', value: 'ft' },
    {
      field: 'extraCenter',
      value: 'cm',
      runBefore: async (page) => {
        await page.getByTestId('extraCenter').fill('1');
      },
    },
    { field: 'p1PitchDiameter', value: 'mm' },
    { field: 'p2PitchDiameter', value: 'mm' },
    { field: 'smallerDistance', value: 'cm' },
    { field: 'largerDistance', value: 'cm' },
  ];

  unitTests.forEach(({ field, value, runBefore }) => {
    const snapshot = `${field}-unit-changed.yaml`;
    test(`should match snapshot with ${field} unit changed`, async ({
      page,
    }) => {
      if (runBefore) {
        await runBefore(page);
      }

      await page.getByTestId(`select${field}`).click();
      await page.getByRole('option', { name: value, exact: true }).click();
      expect(await page.getByRole('main').ariaSnapshot()).toMatchSnapshot({
        name: snapshot,
      });
    });
  });

  const selectTests: TestCase[] = [{ field: 'chainType', value: '#35' }];

  selectTests.forEach(({ field, value }) => {
    const snapshot = `${field}-unit-changed.yaml`;
    test(`should match snapshot with ${field} changed`, async ({ page }) => {
      await page.getByTestId(field).click();
      await page.getByRole('option', { name: value, exact: true }).click();
      expect(await page.getByRole('main').ariaSnapshot()).toMatchSnapshot({
        name: snapshot,
      });
    });
  });
});
