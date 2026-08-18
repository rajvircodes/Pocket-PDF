import type { RequestHandler } from 'express';
import { ZodError, type ZodType } from 'zod';
import { AppError } from '../errors/AppError.js';

export const validateParams = (
  schema: ZodType,
): RequestHandler => {
  return (req, _res, next) => {
    try {
      schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new AppError(
            error.issues.map((issue) => issue.message).join(', '),
            400,
          ),
        );
        return;
      }

      next(error);
    }
  };
};

export const validateBody = (
  schema: ZodType,
): RequestHandler => {
  return (req, _res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new AppError(
            error.issues.map((issue) => issue.message).join(', '),
            400,
          ),
        );
        return;
      }

      next(error);
    }
  };
};


export const validateQuery = (
  schema: ZodType,
): RequestHandler => {
  return (req, _res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new AppError(
            error.issues
              .map((issue) => issue.message)
              .join(", "),
            400,
          ),
        );
        return;
      }

      next(error);
    }
  };
};
