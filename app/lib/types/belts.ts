import { z } from "zod";

export const zJSONBelt = z.object({
  teeth: z.number(),
  width: z.number().min(1), // mm
  profile: z.string(),
  pitch: z.number().min(1), // mm
  sku: z.string().nullable(),
  url: z.string().url(),
});

export type JSONBelt = z.infer<typeof zJSONBelt>;

export const zWCPBelt = zJSONBelt;
export type WCPBelt = z.infer<typeof zWCPBelt>;

export function wcpBeltToJsonBelt(belt: WCPBelt): JSONBelt {
  return { ...belt };
}
