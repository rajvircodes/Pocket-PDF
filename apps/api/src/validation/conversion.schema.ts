import { z } from "zod";

export const conversionToolSchema = z.enum([
  "merge-pdf",
  "split-pdf",
  "compress-pdf",
  "pdf-to-word",
  "word-to-pdf",
  "pdf-to-excel",
  "excel-to-pdf",
  "pdf-to-powerpoint",
  "powerpoint-to-pdf",
  "jpg-to-pdf",
  "pdf-to-jpg",
  "rotate-pdf",
  "watermark-pdf",
  "sign-pdf",
  "edit-pdf",
  "protect-pdf",
  "unlock-pdf",
  "html-to-pdf",
]);

export const conversionParamsSchema = z.object({
  tool: conversionToolSchema,
});

export const conversionBodySchema = z.record(
  z.string(),
  z.unknown(),
);

export type ConversionTool = z.infer<
  typeof conversionToolSchema
>;