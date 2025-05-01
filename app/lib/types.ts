import { z } from "zod";

export interface JSONBelt {
  teeth: number;
  width: number; // mm
  profile: string;
  pitch: number; // mm
  sku: string | null;
  url: string;
}

export const JSONPulleySchema = z.object({
  teeth: z.number(),
  width: z.number().min(1), // (mm)
  profile: z.string(),
  pitch: z.number().min(1), // (mm)
  sku: z.string().nullable(),
  url: z.string().url(),
  bore: z.enum(["8mm", '1/2" Hex', "SplineXS"]), // enum for bore types
});

export type JSONPulley = z.infer<typeof JSONPulleySchema>;
