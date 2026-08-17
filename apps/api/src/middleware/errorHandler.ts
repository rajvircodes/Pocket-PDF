import type { ErrorRequestHandler } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError.js";

export const errorHandler: ErrorRequestHandler = (
  err,
  _req,
  res,
  _next,
) => {
  console.error(err);

  // Multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({
        success: false,
        error: "File too large. Maximum size is 100 MB.",
      });
      return;
    }

    if (err.code === "LIMIT_FILE_COUNT") {
      res.status(400).json({
        success: false,
        error: "Too many files. Maximum is 20 files.",
      });
      return;
    }

    res.status(400).json({
      success: false,
      error: `Upload error: ${err.message}`,
    });
    return;
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: err.issues.map((issue) => issue.message).join(", "),
    });
    return;
  }

  // Application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Unknown/unexpected errors
  res.status(500).json({
    success: false,
    error: "Internal server error.",
  });
};