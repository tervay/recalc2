import { expect, test, type Page } from '@playwright/test';

const FAMILIES = ['Gear', 'Belt', 'Chain', 'Planetary'] as const;

// The worker loads the full COTS dataset and enumerates thousands of stage
// combinations, so the first computation can take several seconds.
const COMPUTE_TIMEOUT = 30_000;

async function waitForResults(page: Page) {
  await expect(page.getByTestId('gearbox-list')).toBeVisible({
    timeout: COMPUTE_TIMEOUT,
  });
}

test.describe('Ratio Finder - per-stage transmission type', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/ratio-finder');
    await page.waitForLoadState('networkidle');
  });

  test('per-stage type filters are visible by default and fully selected', async ({
    page,
  }) => {
    // The feature is discoverable without opening any menu.
    await expect(page.getByTestId('stage-1-families')).toBeVisible();
    await expect(page.getByTestId('stage-2-families')).toBeVisible();

    for (const stage of ['Stage 1', 'Stage 2']) {
      for (const family of FAMILIES) {
        await expect(
          page.getByRole('checkbox', { name: `${stage} ${family}` }),
        ).toBeChecked();
      }
    }
  });

  test('restricting both stages to gears removes belt/chain/planetary results', async ({
    page,
  }) => {
    await waitForResults(page);
    const list = page.getByTestId('gearbox-list');

    for (const stage of ['Stage 1', 'Stage 2']) {
      for (const family of ['Belt', 'Chain', 'Planetary']) {
        await page
          .getByRole('checkbox', { name: `${stage} ${family}` })
          .click();
      }
    }

    // Gears-only solutions must still exist for the default 20:1 target.
    await expect(list).toContainText('Gear', { timeout: COMPUTE_TIMEOUT });
    // ...and no belt, chain, or planetary components may appear.
    await expect(list).not.toContainText('Pulley', {
      timeout: COMPUTE_TIMEOUT,
    });
    await expect(list).not.toContainText('Sprocket', {
      timeout: COMPUTE_TIMEOUT,
    });
    await expect(list).not.toContainText('Planetary', {
      timeout: COMPUTE_TIMEOUT,
    });
  });

  test('stages honor their own type filter positionally (gears then chain)', async ({
    page,
  }) => {
    await waitForResults(page);
    const list = page.getByTestId('gearbox-list');

    // Stage 1 -> gears only.
    for (const family of ['Belt', 'Chain', 'Planetary']) {
      await page.getByRole('checkbox', { name: `Stage 1 ${family}` }).click();
    }
    // Stage 2 -> chain only.
    for (const family of ['Gear', 'Belt', 'Planetary']) {
      await page.getByRole('checkbox', { name: `Stage 2 ${family}` }).click();
    }

    // Every resulting two-stage gearbox must run gears into chain. The stage
    // header renders as "Stage 1(Gear)" (no space before the parenthesis).
    await expect(list.getByText(/Stage 1\s*\(Gear\)/).first()).toBeVisible({
      timeout: COMPUTE_TIMEOUT,
    });
    await expect(list.getByText(/Stage 2\s*\(Chain\)/).first()).toBeVisible({
      timeout: COMPUTE_TIMEOUT,
    });
    await expect(list.getByText(/Stage 1\s*\([^)]*Belt[^)]*\)/)).toHaveCount(0);
    await expect(list.getByText(/Stage 2\s*\([^)]*Gear[^)]*\)/)).toHaveCount(0);
  });
});
