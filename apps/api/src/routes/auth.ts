import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { hashPassword } from "../utils/password.js";
import { AppError } from "../errors/AppError.js";
import { validateBody } from "../middleware/validate.js";
import { registerSchema } from "../validation/auth.schema.js";
import { comparePassword } from "../utils/password.js";
import { signAuthToken } from "../utils/jwt.js";
import { loginSchema } from "../validation/auth.schema.js";
import { requireAuth } from "../middleware/auth.js";

export const authRouter = Router();

authRouter.post("/register", validateBody(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw new AppError(
        "Name, email and password are required.",
        400,
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError(
        "An account with this email already exists.",
        409,
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    res.status(201).json({
      success: true,
      message: "Account created successfully.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post(
  "/login",
  validateBody(loginSchema),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new AppError(
          "Invalid email or password.",
          401,
        );
      }

      const passwordValid = await comparePassword(
        password,
        user.passwordHash,
      );

      if (!passwordValid) {
        throw new AppError(
          "Invalid email or password.",
          401,
        );
      }

      const token = signAuthToken(user.id);

      res.cookie("access_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60 * 1000,
      });

      res.json({
        success: true,
        message: "Login successful.",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

authRouter.get(
  "/me",
  requireAuth,
  async (req, res, next) => {
    try {
      const user = await prisma.user.findUnique({
        where: {
          id: req.userId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new AppError(
          "User not found.",
          404,
        );
      }

      res.json({
        success: true,
        user,
      });
    } catch (error) {
      next(error);
    }
  },
);
authRouter.post("/logout", (_req, res) => {
  res.clearCookie("access_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  res.json({
    success: true,
    message: "Logged out successfully.",
  });
});