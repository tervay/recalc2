import { program } from "commander";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { JSONPulleySchema, type JSONBelt, type JSONPulley } from "~/lib/types";

interface ShopifyConfig {
  vendorName: string;
  rootDomain: string;
}

function urlForHandle(handle: string, vendor: string) {
  const conf = CONFIGS.find((c) => c.vendorName === vendor);
  if (!conf) {
    throw new Error(`Config not found for vendor: ${vendor}`);
  }
  return `${conf.rootDomain}/products/${handle}`;
}

const CONFIGS: ShopifyConfig[] = [
  {
    vendorName: "WCP",
    rootDomain: "https://wcproducts.com",
  },
];

export interface ShopifyResponse {
  products: ShopifyProduct[];
}

export interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  body_html: string;
  published_at: string;
  created_at: string;
  updated_at: string;
  vendor: string;
  product_type: string;
  tags: string[];
  variants: ShopifyVariant[];
  images: ShopifyImage[];
  options: ShopifyOption[];
}

export interface ShopifyImage {
  id: number;
  created_at: string;
  position: number;
  updated_at: string;
  product_id: number;
  variant_ids: number[];
  src: string;
  width: number;
  height: number;
}

export interface ShopifyOption {
  name: string;
  position: number;
  values: string[];
}

export interface ShopifyVariant {
  id: number;
  title: string;
  option1: string;
  option2: null;
  option3: null;
  sku: null | string;
  requires_shipping: boolean;
  taxable: boolean;
  featured_image: null;
  available: boolean;
  price: string;
  grams: number;
  compare_at_price: null;
  position: number;
  product_id: number;
  created_at: string;
  updated_at: string;
}

async function getAllProducts(vendor: string): Promise<ShopifyProduct[]> {
  const config = CONFIGS.find((c) => c.vendorName === vendor);
  if (!config) {
    throw new Error(`Config not found for vendor: ${vendor}`);
  }

  let pageNum = 1;
  const products: ShopifyProduct[] = [];

  while (true) {
    const response = await fetch(
      `${config.rootDomain}/products.json?page=${pageNum}&limit=250`
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
  data: JSONBelt[],
  vendor: string,
  productType: string
) {
  const outdir = join(process.cwd(), "app/genData", vendor);
  const outFile = join(outdir, `${productType}.json`);

  await mkdir(outdir, { recursive: true });
  await writeFile(outFile, JSON.stringify(data, null, 2));
}

async function wcpBelts() {
  const regex =
    /(?<teeth>\d+)t\s*x\s*(?<width>\d+)mm.*\((?<profile>HTD|GT2)\s*(?<pitch>\d+)mm\)/;
  const allProducts = await getAllProducts("WCP");
  const belts: JSONBelt[] = [];

  for (const product of allProducts) {
    if (product.title.includes("Timing Belt")) {
      const match = product.title.match(regex);
      if (match?.groups) {
        const { teeth, width, profile, pitch } = match.groups;
        belts.push({
          teeth: parseInt(teeth),
          width: parseInt(width),
          profile,
          pitch: parseInt(pitch),
          url: urlForHandle(product.handle, "WCP"),
          sku: product.variants[0].sku,
        });
      } else {
        console.error(`No match found for product: ${product.title}`);
      }
    }
  }

  await writeJson(belts, "WCP", "belts");
}

async function wcpPulleys() {
  const regex =
    /(?<teeth>\d+)t\s*x\s*(?<width>\d+)mm\s*Wide\s*(?<flangeType>.*)\s*(?<profile>GT2|HTD)\s*(?<pitch>\d+)mm(?:.*,\s*(?<bore>.*?) Bore\))?/;
  const allProducts = await getAllProducts("WCP");
  const pulleys: JSONPulley[] = [];

  for (const product of allProducts) {
    if (product.title.includes("Pulley")) {
      const match = product.title.match(regex);
      if (match?.groups) {
        const { teeth, width, profile, pitch, bore } = match.groups;
        const pulley: JSONPulley = {
          teeth: parseInt(teeth),
          width: parseInt(width),
          profile,
          pitch: parseInt(pitch),
          bore: bore as "8mm" | '1/2" Hex' | "SplineXS",
          url: urlForHandle(product.handle, "WCP"),
          sku: product.variants[0].sku,
        };

        pulleys.push(JSONPulleySchema.parse(pulley));
      } else {
        console.error(`No match found for product: ${product.title}`);
      }
    }
  }

  await writeJson(pulleys, "WCP", "pulleys");
}

async function dispatch(vendor: string, productType: string) {
  if (vendor === "WCP") {
    if (productType === "belts") {
      await wcpBelts();
    }
    if (productType === "pulleys") {
      await wcpPulleys();
    }
  }
}

program
  .name("download-products")
  .description("Download products from Shopify")
  .argument("<vendor>", "Vendor name (e.g. WCP, TTB, SDS")
  .argument("<productType>", "Product type (e.g. belts)")
  .action(async (vendor: string, productType: string) => {
    await dispatch(vendor, productType);
  });

program.parse();
