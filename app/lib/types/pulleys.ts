import { z } from 'zod';

import { type Bore, zBore } from '~/lib/types/common';

export const zJSONPulley = z.object({
  teeth: z.number(),
  width: z.number().min(1), // (mm)
  profile: z.string(),
  pitch: z.number().min(1), // (mm)
  sku: z.string().nullable(),
  url: z.string().url(),
  bore: zBore,
  vendor: z.string(),
});

export type JSONPulley = z.infer<typeof zJSONPulley>;

export const zWCPPulleyBore = z.enum([
  '1/2" Hex',
  '8mm',
  '8mm Key',
  '8mm SplineXS',
  'Falcon',
  'RS775',
  'RS550',
] as const);
export type WCPPulleyBore = z.infer<typeof zWCPPulleyBore>;

export const zWCPPulley = z.object({
  teeth: z.number(),
  width: z.number().min(1), // (mm)
  profile: z.string(),
  pitch: z.number().min(1), // (mm)
  sku: z.string().nullable(),
  url: z.string().url(),
  bore: zWCPPulleyBore,
});

export type WCPPulley = z.infer<typeof zWCPPulley>;

export function wcpPulleyToJsonPulley(pulley: WCPPulley): JSONPulley {
  const wcpBoreToJsonBore: Record<WCPPulleyBore, Bore> = {
    '8mm': '8mm',
    '1/2" Hex': '1/2" Hex',
    '8mm Key': '8mm',
    '8mm SplineXS': 'SplineXS',
    Falcon: 'Falcon',
    RS775: 'RS775',
    RS550: 'RS550',
  };

  return {
    ...pulley,
    bore: wcpBoreToJsonBore[pulley.bore],
    vendor: 'WCP',
  };
}
