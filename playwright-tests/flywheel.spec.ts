import { expect, test } from '@playwright/test';
import type { TestCase } from 'playwright-tests/testTypes';

test.describe('Flywheel Calculator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/flywheel');
    await page.waitForLoadState('networkidle');
  });

  const magnitudeTests: TestCase[] = [
    { field: 'motor', value: '3' },
    {
      field: 'ratio',
      value: '2',
      runBefore: async (page) => {
        await page.getByTestId('shooterTargetSpeed').fill('2000');
      },
    },
    { field: 'statorLimit', value: '40' },
    { field: 'supplyLimit', value: '100' },
    { field: 'supplyVoltage', value: '10' },
    { field: 'batteryResistance', value: '0.02' },
    { field: 'efficiency', value: '90' },
    { field: 'shooterDiameter', value: '4' },
    { field: 'shooterWeight', value: '3' },
    { field: 'shooterTargetSpeed', value: '3500' },
    { field: 'projectileWeight', value: '1' },
    { field: 'flywheelDiameter', value: '2' },
    { field: 'flywheelWeight', value: '3' },
    { field: 'flywheelToShooterRatio', value: '2' },
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
    { field: 'motor', value: 'NEO' },
    {
      field: 'ratio',
      value: 'Step-up',
      runBefore: async (page) => {
        await page.getByTestId('ratio').fill('2');
      },
    },
    { field: 'statorLimit', value: 'A' },
    { field: 'supplyLimit', value: 'A' },
    { field: 'supplyVoltage', value: 'V' },
    { field: 'batteryResistance', value: 'Ohm' },
    { field: 'shooterDiameter', value: 'cm' },
    { field: 'shooterWeight', value: 'kg' },
    { field: 'shooterTargetSpeed', value: 'rpm' },
    { field: 'projectileWeight', value: 'kg' },
    { field: 'flywheelDiameter', value: 'cm' },
    { field: 'flywheelWeight', value: 'kg' },
    {
      field: 'flywheelToShooterRatio',
      value: 'Step-up',
      runBefore: async (page) => {
        await page.getByTestId('flywheelToShooterRatio').fill('2');
      },
    },
    { field: 'derivedShooterMoi', value: 'kg*m2' },
    { field: 'derivedFlywheelMoi', value: 'kg*m2' },
    { field: 'kV', value: 'V*s/m' },
    { field: 'kA', value: 'V*s^2/m' },
    { field: 'spinupTime', value: 's' },
    { field: 'effectiveMoi', value: 'kg*m2' },
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
