import { Router } from "express";
import fs from "node:fs/promises";

import { prisma } from "../lib/prisma.js";
import { processConversion } from "../services/pdf.service.js";
import { upload } from "../config/upload.js";
import { requireAuth } from "../middleware/auth.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../middleware/validate.js";
import {
  conversionBodySchema,
  conversionParamsSchema,
  paginationSchema,
} from "../validation/conversion.schema.js";

export const router = Router();

router.get(
  "/",
  requireAuth,
  validateQuery(paginationSchema),
  async (req, res, next) => {
    try {
      const page = req.query.page as number;
      const limit = req.query.limit as number;

      const skip = (page - 1) * limit;

      const [conversions, total] =
        await Promise.all([
          prisma.conversion.findMany({
            where: {
              userId: req.userId!,
            },
            orderBy: {
              createdAt: "desc",
            },
            skip,
            take: limit,
            select: {
              id: true,
              tool: true,
              status: true,
              originalFilename: true,
              filename: true,
              fileSize: true,
              createdAt: true,
              completedAt: true,
            },
          }),

          prisma.conversion.count({
            where: {
              userId: req.userId!,
            },
          }),
        ]);

      const totalPages = Math.ceil(
        total / limit,
      );

      res.json({
        success: true,
        data: {
          conversions,
          pagination: {
            page,
            limit,
            total,
            totalPages,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/:tool",
  requireAuth,
  validateParams(conversionParamsSchema),
  validateBody(conversionBodySchema),
  upload.array("files", 20),
  async (req, res, next) => {
    const files =
      (req.files as Express.Multer.File[]) ?? [];

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

     await prisma.conversion.create({
  data: {
    tool: req.params.tool,
    status: "complete",
    originalFilename: files[0]?.originalname,
    filename: result.name,
    fileSize: files.reduce(
      (total, file) => total + file.size,
      0,
    ),
    completedAt: new Date(),
    userId: req.userId!,
  },
});

      res.download(
        result.path,
        result.name,
        async () => {
          await Promise.all([
            ...files.map((file) =>
              fs.rm(file.path, {
                force: true,
              }),
            ),
            fs.rm(result.path, {
              force: true,
            }),
          ]);
        },
      );
    } catch (error) {
      await Promise.all(
        files.map((file) =>
          fs.rm(file.path, {
            force: true,
          }),
        ),
      );

      next(error);
    }
  },
);