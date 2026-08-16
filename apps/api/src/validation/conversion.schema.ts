import { z } from 'zod';

export const conversionToolSchema = z.enum([
  'merge',
  'split',
  'compress',
  'pdf-to-word',
  'word-to-pdf',
  'pdf-to-excel',
  'excel-to-pdf',
  'pdf-to-ppt',
  'ppt-to-pdf',
  'jpg-to-pdf',
  'pdf-to-jpg',
  'rotate',
  'watermark',
  'sign',
  'edit',
  'protect',
  'unlock',
  'html-to-pdf',
]);

export const conversionParamsSchema = z.object({
  tool: conversionToolSchema,
});

export const conversionBodySchema = z.record(z.string(), z.unknown());

export type ConversionTool = z.infer<typeof conversionToolSchema>;