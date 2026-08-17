import "dotenv/config";
import jwt from "jsonwebtoken";
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured.");
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "15m";

export interface AuthTokenPayload {
  userId: string;
}

export function signAuthToken(userId: string): string {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    },
  );
}

export function verifyAuthToken(
  token: string,
): AuthTokenPayload {
  return jwt.verify(
    token,
    JWT_SECRET,
  ) as AuthTokenPayload;
}