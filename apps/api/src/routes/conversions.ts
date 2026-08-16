import { Router } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { processConversion } from "../services/pdf.service.js";
import { validateBody, validateParams } from '../middleware/validate.ts'
import { conversionParamsSchema } from '../validation/conversion.schema.js';

import {
  conversionBodySchema,
  conversionParamsSchema,
} from '../validation/conversion.schema.js';



const root = path.resolve(process.env.UPLOAD_DIR ?? "uploads");
await fs.mkdir(root, { recursive: true });
const storage = multer.diskStorage({
  destination: root,
  filename: (_r, f, cb) =>
    cb(null, `${randomUUID()}-${f.originalname.replace(/[^\w.-]/g, "_")}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024, files: 20 },
  fileFilter: (_r, f, cb) =>
    cb(
      null,
      /pdf|image|word|sheet|presentation|html|text/.test(f.mimetype) ||
        /\.(pdf|jpe?g|png|docx?|xlsx?|pptx?|html?)$/i.test(f.originalname),
    ),
});
export const router = Router();

router.post("/:tool", validateParams(conversionParamsSchema),
    validateBody(conversionBodySchema),
 upload.array("files", 20), async (req, res, next) => {
  const files = (req.files as Express.Multer.File[]) ?? [];
  try {
    if (!files.length)
      return res.status(400).json({ error: "Select at least one file." });
    const result = await processConversion(req.params.tool, files, req.body);
    res.download(result.path, result.name, async () => {
      await Promise.all([
        ...files.map((f) => fs.rm(f.path, { force: true })),
        fs.rm(result.path, { force: true }),
      ]);
    });
  } catch (error) {
    await Promise.all(files.map((f) => fs.rm(f.path, { force: true })));
    next(error);
  }
});
