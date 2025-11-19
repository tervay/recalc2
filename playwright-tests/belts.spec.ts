import { expect, test } from '@playwright/test';
import type { TestCase } from 'playwright-tests/testTypes';

test.describe('Belt Calculator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/belts');
    await page.waitForLoadState('networkidle');
  });

  const magnitudeTests: TestCase[] = [
    { field: 'pitch', value: '3' },
    { field: 'desiredCenter', value: '10' },
    { field: 'extraCenter', value: '1' },
    { field: 'beltToothIncrement', value: '10' },
    { field: 'specificBeltTeeth', value: '100' },
    { field: 'p1Teeth', value: '20' },
    { field: 'p2Teeth', value: '40' },
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
    { field: 'pitch', value: 'in' },
    {
      field: 'desiredCenter',
      value: 'cm',
      runBefore: async (page) => {
        await page.getByTestId('desiredCenter').fill('1');
      },
    },
    { field: 'extraCenter', value: 'in' },
    { field: 'p1PitchDiameter', value: 'mm' },
    { field: 'p2PitchDiameter', value: 'mm' },
    { field: 'smallerCenter', value: 'cm' },
    { field: 'smallerPulleyGap', value: 'cm' },
    { field: 'smallerDiffFromTarget', value: 'cm' },
    { field: 'largerCenter', value: 'cm' },
    { field: 'largerPulleyGap', value: 'cm' },
    { field: 'largerDiffFromTarget', value: 'cm' },
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
});
