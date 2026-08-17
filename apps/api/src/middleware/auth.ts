import type { RequestHandler } from "express";
import { AppError } from "../errors/AppError.js";
import { verifyAuthToken } from "../utils/jwt.js";

export const requireAuth: RequestHandler = (
  req,
  _res,
  next,
) => {
  try {
    const token = req.cookies?.access_token;

    if (!token) {
      throw new AppError(
        "Authentication required.",
        401,
      );
    }

    const payload = verifyAuthToken(token);

    req.userId = payload.userId;

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }

    next(
      new AppError(
        "Invalid or expired authentication token.",
        401,
      ),
    );
  }
};