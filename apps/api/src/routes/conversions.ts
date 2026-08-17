import { Router } from "express";
import fs from "node:fs/promises";

import { processConversion } from "../services/pdf.service.js";
import { upload } from "../config/upload.js";
import { validateBody, validateParams } from "../middleware/validate.js";
import {
  conversionBodySchema,
  conversionParamsSchema,
} from "../validation/conversion.schema.js";

export const router = Router();

router.post(
  "/:tool",
  validateParams(conversionParamsSchema),
  validateBody(conversionBodySchema),
  upload.array("files", 20),
  async (req, res, next) => {
    const files = (req.files as Express.Multer.File[]) ?? [];

    try {
      if (!files.length) {
        return res.status(400).json({
          error: "Select at least one file.",
        });
      }

      const result = await processConversion(
        req.params.tool,
        files,
        req.body,
      );

      res.download(result.path, result.name, async () => {
        await Promise.all([
          ...files.map((file) =>
            fs.rm(file.path, { force: true }),
          ),
          fs.rm(result.path, { force: true }),
        ]);
      });
    } catch (error) {
      await Promise.all(
        files.map((file) =>
          fs.rm(file.path, { force: true }),
        ),
      );

      next(error);
    }
  },
);