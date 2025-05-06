import { program } from 'commander';
import { mkdir, writeFile } from 'fs/promises';
import NodeFetchCache, { FileSystemCache } from 'node-fetch-cache';
import { join } from 'path';

import { SimpleBelt } from '~/lib/models/Belt';
import Measurement from '~/lib/models/Measurement';
import { type JSONBelt, wcpBeltToJsonBelt, zWCPBelt } from '~/lib/types/belts';
import { type JSONGear, wcpGearToJsonGear, zWCPGear } from '~/lib/types/gears';
import {
  type JSONPulley,
  thriftyPulleyToJsonPulley,
  wcpPulleyToJsonPulley,
  zThriftyPulley,
  zWCPPulley,
} from '~/lib/types/pulleys';
import type {
  ShopifyConfig,
  ShopifyProduct,
  ShopifyResponse,
} from '~/lib/types/shopify';
import {
  type JSONSprocket,
  wcpSprocketToJsonSprocket,
  zWCPSprocket,
} from '~/lib/types/sprockets';

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
  {
    vendorName: 'Swyft',
    rootDomain: 'https://swyftrobotics.com',
  },
  {
    vendorName: 'TheThriftyBot',
    rootDomain: 'https://www.thethriftybot.com',
  },
  {
    vendorName: 'VBeltGuys',
    rootDomain: 'https://www.vbeltguys.com',
  },
];

const fetch = NodeFetchCache.create({
  cache: new FileSystemCache({
    cacheDirectory: join(process.cwd(), '.cache'),
  }),
  shouldCacheResponse: (response) => [200, 404].includes(response.status),
});

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
  data: (JSONBelt | JSONPulley | JSONGear | JSONSprocket)[],
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
          vendor: 'WCP',
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

async function wcpSprockets() {
  const allProducts = await getAllProducts('WCP');
  const sprockets: JSONSprocket[] = [];
  const regex = /(?<tooth>\d+)t.*?\((?<chain>#\d+)[^)]+,\s*(?<bore>[^)]+)\)/;

  for (const product of allProducts) {
    if (product.title.includes('Sprocket')) {
      const match = product.title.match(regex);
      if (match?.groups) {
        const { tooth, chain, bore } = match.groups;

        const wcpSprocket = zWCPSprocket.parse({
          teeth: parseInt(tooth),
          chainType: chain,
          bore,
          url: urlForHandle(product.handle, 'WCP'),
          sku: product.variants[0].sku,
        });
        sprockets.push(wcpSprocketToJsonSprocket(wcpSprocket));
      }
    }
  }

  await writeJson(sprockets, 'WCP', 'sprockets');
}

async function swyftBelts() {
  const allProducts = await getAllProducts('Swyft');
  const belts: JSONBelt[] = [];

  for (const product of allProducts) {
    if (product.title.includes('Timing Belt')) {
      const width = product.title.startsWith('15') ? 15 : 9;

      for (const variant of product.variants) {
        belts.push({
          teeth: Number(variant.title),
          width,
          profile: 'HTD',
          pitch: 5,
          sku: variant.sku,
          url: urlForHandle(product.handle, 'Swyft'),
          vendor: 'Swyft',
        });
      }
    }
  }

  await writeJson(belts, 'Swyft', 'belts');
}

async function vbeltGuysBelts() {
  const belts: JSONBelt[] = [];
  const toothIncrement = 5;

  for (const pitchMm of [3, 5]) {
    for (const widthMm of [9, 15]) {
      let toothCount = 5;

      while (toothCount <= 1000) {
        const simpleBelt = new SimpleBelt(
          toothCount,
          new Measurement(pitchMm, 'mm'),
        );
        const beltLength = Math.round(simpleBelt.length.to('mm').scalar);
        const pitchStr = simpleBelt.pitch.format().replace(' mm', 'm');
        const widthStr = new Measurement(widthMm, 'mm')
          .format()
          .replace(' mm', '')
          .padStart(2, '0');

        const url = `https://www.vbeltguys.com/products/${beltLength}-${pitchStr}-${widthStr}-synchronous-timing-belt`;

        const response = await fetch(url);
        if (response.status === 200) {
          belts.push({
            teeth: toothCount,
            width: widthMm,
            profile: pitchMm === 3 ? 'GT2' : 'HTD',
            pitch: pitchMm,
            sku: `${beltLength}-${pitchStr}-${widthStr}`,
            url: url,
            vendor: 'VBeltGuys',
          });
        }

        toothCount += toothIncrement;
        console.log(`${url} // ${response.status}`);
      }
    }
  }

  await writeJson(belts, 'VBeltGuys', 'belts');
}

async function thriftyPulleys() {
  const allProducts = await getAllProducts('TheThriftyBot');
  const pulleys: JSONPulley[] = [];

  for (const product of allProducts) {
    if (product.title.includes('Pulley')) {
      /* 2 cases:
      QTY 1 - 48 Tooth HTD Pulley - Bearing / Hub Bore
      QTY 1 - 36 Tooth HTD Pulley 1/2" Hex Bore
      QTY 1 - 24 Tooth HTD Pulley 1/2" Hex Bore

      or

      QTY 1 - 11 Tooth HTD Falcon Motor Output Pulley
      QTY 1 - 11 Tooth HTD 8mm Keyed Motor Output Pulley
      */

      if (product.title.endsWith('Pulley')) {
        const regex =
          /QTY \d+ - (?<tooth>\d+) Tooth (?<profile>\w+) (?<bore>[\w\s]+) Motor Output Pulley/i;

        const match = product.title.match(regex);
        if (match?.groups) {
          const { tooth, profile, bore } = match.groups;
          try {
            const thriftyPulley = zThriftyPulley.parse({
              teeth: parseInt(tooth),
              profile,
              bore,
              sku: product.variants[0].sku,
              url: urlForHandle(product.handle, 'TheThriftyBot'),
            });
            pulleys.push(thriftyPulleyToJsonPulley(thriftyPulley));
          } catch {
            console.log(`Error parsing pulley: ${product.title}`);
          }
        }
      } else {
        const regex =
          /QTY \d+ - (?<tooth>\d+) Tooth (?<profile>\w+) Pulley(?: - (?<bore1>.+?)| (?<bore2>.+?)) Bore/i;

        const match = product.title.match(regex);
        if (match?.groups) {
          const { tooth, profile, bore1, bore2 } = match.groups;
          const bore = bore1 ?? bore2;
          try {
            const thriftyPulley = zThriftyPulley.parse({
              teeth: parseInt(tooth),
              profile,
              bore,
              sku: product.variants[0].sku,
              url: urlForHandle(product.handle, 'TheThriftyBot'),
            });
            pulleys.push(thriftyPulleyToJsonPulley(thriftyPulley));
          } catch {
            console.log(`Error parsing pulley: ${product.title}`);
          }
        }
      }
    }
  }

  await writeJson(pulleys, 'Thrifty', 'pulleys');
}

async function dispatch(vendor: string, productType: string) {
  if (vendor === 'wcp') {
    if (productType === 'belts') {
      await wcpBelts();
    }
    if (productType === 'pulleys') {
      await wcpPulleys();
    }
    if (productType === 'gears') {
      await wcpGears();
    }
    if (productType === 'sprockets') {
      await wcpSprockets();
    }
  }
  if (vendor === 'swyft') {
    if (productType === 'belts') {
      await swyftBelts();
    }
  }
  if (vendor === 'vbg') {
    if (productType === 'belts') {
      await vbeltGuysBelts();
    }
  }
  if (vendor === 'thrifty') {
    if (productType === 'pulleys') {
      await thriftyPulleys();
    }
  }

  if (vendor === 'all' && productType === 'all') {
    await Promise.all([
      wcpBelts(),
      wcpPulleys(),
      wcpGears(),
      wcpSprockets(),
      swyftBelts(),
      thriftyPulleys(),
    ]);
  }
}

program
  .name('download-products')
  .description('Download products from Shopify')
  .argument('<vendor>', 'Vendor name (e.g. WCP, TTB, SDS')
  .argument('<productType>', 'Product type (e.g. belts)')
  .action(async (vendor: string, productType: string) => {
    await dispatch(vendor.toLowerCase(), productType.toLowerCase());
  });

program.parse();
