import { program } from 'commander';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

import { type JSONBelt, wcpBeltToJsonBelt, zWCPBelt } from '~/lib/types/belts';
import { type JSONGear, wcpGearToJsonGear, zWCPGear } from '~/lib/types/gears';
import {
  type JSONPulley,
  wcpPulleyToJsonPulley,
  zWCPPulley,
} from '~/lib/types/pulleys';
import type {
  ShopifyConfig,
  ShopifyProduct,
  ShopifyResponse,
} from '~/lib/types/shopify';

function urlForHandle(handle: string, vendor: string) {
  const conf = CONFIGS.find((c) => c.vendorName === vendor);
  if (!conf) {
    throw new Error(`Config not found for vendor: ${vendor}`);
  }
  return `${conf.rootDomain}/products/${handle}`;
}

const CONFIGS: ShopifyConfig[] = [
  {
    vendorName: 'WCP',
    rootDomain: 'https://wcproducts.com',
  },
];

async function getAllProducts(vendor: string): Promise<ShopifyProduct[]> {
  const config = CONFIGS.find((c) => c.vendorName === vendor);
  if (!config) {
    throw new Error(`Config not found for vendor: ${vendor}`);
  }

  let pageNum = 1;
  const products: ShopifyProduct[] = [];

  while (true) {
    const response = await fetch(
      `${config.rootDomain}/products.json?page=${pageNum}&limit=250`,
    );
    const data = (await response.json()) as ShopifyResponse;
    if (data.products.length === 0) {
      break;
    }
    products.push(...data.products);
    pageNum++;
  }

  return products;
}

async function writeJson(
  data: (JSONBelt | JSONPulley | JSONGear)[],
  vendor: string,
  productType: string,
) {
  const outdir = join(process.cwd(), 'app/genData', vendor);
  const outFile = join(outdir, `${productType}.json`);

  await mkdir(outdir, { recursive: true });
  await writeFile(outFile, JSON.stringify(data, null, 2));
}

async function wcpBelts() {
  const regex =
    /(?<teeth>\d+)t\s*x\s*(?<width>\d+)mm.*\((?<profile>HTD|GT2)\s*(?<pitch>\d+)mm\)/;
  const allProducts = await getAllProducts('WCP');
  const belts: JSONBelt[] = [];

  for (const product of allProducts) {
    if (product.title.includes('Timing Belt')) {
      const match = product.title.match(regex);
      if (match?.groups) {
        const { teeth, width, profile, pitch } = match.groups;
        const wcpBelt = zWCPBelt.parse({
          teeth: parseInt(teeth),
          width: parseInt(width),
          profile,
          pitch: parseInt(pitch),
          url: urlForHandle(product.handle, 'WCP'),
          sku: product.variants[0].sku,
        });
        belts.push(wcpBeltToJsonBelt(wcpBelt));
      }
    }
  }

  await writeJson(belts, 'WCP', 'belts');
}

async function wcpPulleys() {
  const regex =
    /(?<teeth>\d+)t\s*x\s*(?<width>\d+)mm\s*Wide\s*(?<flangeType>.*)\s*(?<profile>GT2|HTD)\s*(?<pitch>\d+)mm(?:.*,\s*(?<bore>.*?) Bore\))?/;
  const allProducts = await getAllProducts('WCP');
  const pulleys: JSONPulley[] = [];

  for (const product of allProducts) {
    if (product.title.includes('Pulley')) {
      const match = product.title.match(regex);
      if (match?.groups) {
        const { teeth, width, profile, pitch, bore } = match.groups;
        if (bore === undefined) {
          continue;
        }

        const wcpPulley = zWCPPulley.parse({
          teeth: parseInt(teeth),
          width: parseInt(width),
          profile,
          pitch: parseInt(pitch),
          bore,
          url: urlForHandle(product.handle, 'WCP'),
          sku: product.variants[0].sku,
        });
        pulleys.push(wcpPulleyToJsonPulley(wcpPulley));
      }
    }
  }

  await writeJson(pulleys, 'WCP', 'pulleys');
}

async function wcpGears() {
  const allProducts = await getAllProducts('WCP');
  const gears: JSONGear[] = [];
  const regex =
    /(?<toothCount>\d+)t.*?\(\s*(?<dp>\d+)\s*DP(?:,\s*[^,]+)?,\s*(?<bore>[^)]+)\)/;

  for (const product of allProducts) {
    if (product.title.includes('Gear')) {
      const match = product.title.match(regex);
      if (match?.groups) {
        const { toothCount, dp, bore } = match.groups;
        try {
          const wcpGear = zWCPGear.parse({
            teeth: parseInt(toothCount),
            dp: parseInt(dp),
            bore,
            url: urlForHandle(product.handle, 'WCP'),
            sku: product.variants[0].sku,
          });
          gears.push(wcpGearToJsonGear(wcpGear));
        } catch {
          console.error(`Error parsing gear: ${product.title}`);
        }
      }
    }
  }

  await writeJson(gears, 'WCP', 'gears');
}

async function dispatch(vendor: string, productType: string) {
  if (vendor === 'WCP') {
    if (productType === 'belts') {
      await wcpBelts();
    }
    if (productType === 'pulleys') {
      await wcpPulleys();
    }
    if (productType === 'gears') {
      await wcpGears();
    }
  }
}

program
  .name('download-products')
  .description('Download products from Shopify')
  .argument('<vendor>', 'Vendor name (e.g. WCP, TTB, SDS')
  .argument('<productType>', 'Product type (e.g. belts)')
  .action(async (vendor: string, productType: string) => {
    await dispatch(vendor, productType);
  });

program.parse();
