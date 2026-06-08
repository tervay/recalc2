import { describe, expect, it } from 'vitest';

import type { FindGearboxesFilters } from '~/lib/math/ratioFinder.worker';
import { findGearboxes } from '~/lib/math/ratioFinder.worker';
import Ratio, { RatioType } from '~/lib/models/Ratio';
import type { StageFamily } from '~/lib/types/common';

const baseFilters: FindGearboxesFilters = {
  enableREV: true,
  enableWCP: true,
  enableAM: true,
  enableTTB: true,
  enableLastAnvil: true,
  enableSDS: true,
  enablePlanetaries: true,
  enable20DP: true,
  enable32DP: true,
  enableGT2: true,
  enableHTD: true,
  enableRT25: true,
  enable25Chain: true,
  enable35Chain: true,
  enableBore12Hex: true,
  enableBore38Hex: true,
  enableBore1125: true,
  enableBoreMAXSpline: true,
  enableBoreSplineXL: true,
  enableBore5mmHex: true,
  enableBore14Round: true,
  enableCustomGears: false,
  enableCustomPulleys: false,
  enableCustomSprockets: false,
  minGearTeeth: 6,
  maxGearTeeth: 84,
  minPulleyTeeth: 8,
  maxPulleyTeeth: 84,
  minSprocketTeeth: 8,
  maxSprocketTeeth: 84,
};

/** Maps the user-facing stage family to the internal SkuInfo.family value. */
const SKU_FAMILY: Record<StageFamily, string> = {
  Gear: 'Gear',
  Belt: 'Pulley',
  Chain: 'Sprocket',
  Planetary: 'Planetary',
};

const allowedSkuFamilies = (families: StageFamily[]): Set<string> =>
  new Set(families.map((family) => SKU_FAMILY[family]));

describe('ratioFinderWorker', () => {
  it('should find gearboxes with default settings', async () => {
    const result = await findGearboxes(
      new Ratio(20, RatioType.REDUCTION),
      0.25,
      'SplineXS',
      baseFilters,
    );

    expect(result).toMatchSnapshot();
  }, 10_000);

  it('omitting stageConstraints matches an empty stageConstraints exactly', async () => {
    const target = new Ratio(20, RatioType.REDUCTION);
    const withoutField = await findGearboxes(target, 0.25, 'SplineXS', {
      ...baseFilters,
    });
    const withEmpty = await findGearboxes(target, 0.25, 'SplineXS', {
      ...baseFilters,
      stageConstraints: [],
    });

    expect(withEmpty).toEqual(withoutField);
  }, 10_000);

  it('restricts the first stage to a single transmission family', async () => {
    const result = await findGearboxes(
      new Ratio(20, RatioType.REDUCTION),
      0.25,
      'SplineXS',
      { ...baseFilters, stageConstraints: [['Gear'], []] },
    );

    expect(result.solutions.length).toBeGreaterThan(0);
    const allowed = allowedSkuFamilies(['Gear']);
    for (const solution of result.solutions) {
      const firstStage = solution.stages[0];
      for (const sku of [...firstStage.from.skus, ...firstStage.to.skus]) {
        expect(allowed.has(sku.family)).toBe(true);
      }
    }
  }, 10_000);

  it('constrains each stage positionally (gears then chain)', async () => {
    const result = await findGearboxes(
      new Ratio(20, RatioType.REDUCTION),
      0.25,
      'SplineXS',
      { ...baseFilters, stageConstraints: [['Gear'], ['Chain']] },
    );

    expect(result.solutions.length).toBeGreaterThan(0);
    const stageAllowed = [
      allowedSkuFamilies(['Gear']),
      allowedSkuFamilies(['Chain']),
    ];
    let sawTwoStage = false;
    for (const solution of result.solutions) {
      solution.stages.forEach((stage, index) => {
        if (index === 1) {
          sawTwoStage = true;
        }
        for (const sku of [...stage.from.skus, ...stage.to.skus]) {
          expect(stageAllowed[index].has(sku.family)).toBe(true);
        }
      });
    }
    // A single gear stage cannot reach 20:1 within the tooth range, so every
    // solution must be a two-stage gear -> chain gearbox.
    expect(sawTwoStage).toBe(true);
  }, 10_000);

  it('an empty per-stage list leaves that stage unconstrained', async () => {
    const target = new Ratio(20, RatioType.REDUCTION);
    const stage2AnyExplicit = await findGearboxes(target, 0.25, 'SplineXS', {
      ...baseFilters,
      stageConstraints: [['Gear'], []],
    });
    const stage2AnyAllFamilies = await findGearboxes(target, 0.25, 'SplineXS', {
      ...baseFilters,
      stageConstraints: [['Gear'], ['Gear', 'Belt', 'Chain', 'Planetary']],
    });

    expect(stage2AnyExplicit).toEqual(stage2AnyAllFamilies);
  }, 10_000);

  it('narrowing a stage never yields more solutions than leaving it open', async () => {
    const target = new Ratio(20, RatioType.REDUCTION);
    const unconstrained = await findGearboxes(
      target,
      0.25,
      'SplineXS',
      baseFilters,
    );
    const gearsOnly = await findGearboxes(target, 0.25, 'SplineXS', {
      ...baseFilters,
      stageConstraints: [['Gear'], ['Gear']],
    });

    expect(gearsOnly.count).toBeLessThanOrEqual(unconstrained.count);
    expect(gearsOnly.count).toBeGreaterThan(0);
  }, 15_000);

  it('defaults to at most two stages', async () => {
    const result = await findGearboxes(
      new Ratio(20, RatioType.REDUCTION),
      0.25,
      'SplineXS',
      baseFilters,
    );
    expect(result.solutions.every((s) => s.stages.length <= 2)).toBe(true);
  }, 15_000);

  // With planetaries disabled a single toothed stage tops out near 14:1, so two
  // stages cannot exceed ~196:1 and a 250:1 target needs exactly three stages.
  const highRatioFilters = { ...baseFilters, enablePlanetaries: false };

  it('generates three-stage gearboxes for ratios unreachable in two stages', async () => {
    const result = await findGearboxes(
      new Ratio(250, RatioType.REDUCTION),
      5,
      'SplineXS',
      highRatioFilters,
      3,
    );
    expect(result.solutions.length).toBeGreaterThan(0);
    expect(result.solutions.length).toBeLessThanOrEqual(50);
    for (const s of result.solutions) {
      expect(s.stages.length).toBe(3);
      expect(Math.abs(s.ratio - 250)).toBeLessThanOrEqual(5);
    }
  }, 30_000);

  it('does not generate three-stage gearboxes for that target when maxStages is 2', async () => {
    const result = await findGearboxes(
      new Ratio(250, RatioType.REDUCTION),
      5,
      'SplineXS',
      highRatioFilters,
    );
    // Two toothed stages cannot reach 250:1, so there are no solutions.
    expect(result.solutions.length).toBe(0);
  }, 15_000);

  it('applies per-stage constraints positionally across three stages', async () => {
    const result = await findGearboxes(
      new Ratio(20, RatioType.REDUCTION),
      0.25,
      'SplineXS',
      { ...baseFilters, stageConstraints: [['Gear'], ['Belt'], ['Chain']] },
      3,
    );
    expect(result.solutions.length).toBeGreaterThan(0);
    const expected = ['Gear', 'Pulley', 'Sprocket'];
    for (const s of result.solutions) {
      s.stages.forEach((stage, index) => {
        for (const sku of [...stage.from.skus, ...stage.to.skus]) {
          expect(sku.family).toBe(expected[index]);
        }
      });
    }
  }, 30_000);
});
