import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const uploadRoot = path.resolve(
  process.env.UPLOAD_DIR ?? 'uploads',
);

await fs.mkdir(uploadRoot, { recursive: true });

const allowedMimeTypes = new Set([
  'application/pdf',

  'image/jpeg',
  'image/png',

  'image/webp',

  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  'text/html',
  'text/plain',
]);

const allowedExtensions = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.html',
  '.txt',
]);

export const upload = multer({
  storage: multer.diskStorage({
    destination: uploadRoot,

    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();

      callback(
        null,
        `${randomUUID()}${extension}`,
      );
    },
  }),

  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 20,
  },

  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    const validMimeType = allowedMimeTypes.has(file.mimetype);
    const validExtension = allowedExtensions.has(extension);

    if (!validMimeType || !validExtension) {
      callback(
        new Error(
          `Unsupported file type: ${extension || file.mimetype}`,
        ),
      );

      return;
    }

    callback(null, true);
  },
});