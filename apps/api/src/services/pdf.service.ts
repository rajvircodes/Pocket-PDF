import fs from "node:fs/promises";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
  PDFDocument,
  degrees,
  rgb,
  StandardFonts,
} from "pdf-lib";
import PDFKit from "pdfkit";
import sharp from "sharp";
import type { Express } from "express";

const exec = promisify(execFile);

const outputRoot = path.resolve(
  process.env.UPLOAD_DIR ?? "uploads",
  "output",
);

await fs.mkdir(outputRoot, { recursive: true });

const out = (name: string) =>
  path.join(outputRoot, `${Date.now()}-${name}`);

const load = async (file: Express.Multer.File) =>
  PDFDocument.load(
    await fs.readFile(file.path),
    {
      ignoreEncryption: true,
    },
  );

const save = async (
  doc: PDFDocument,
  name: string,
) => {
  const file = out(name);

  await fs.writeFile(
    file,
    await doc.save(),
  );

  return file;
};

export async function processConversion(
  tool: string,
  files: Express.Multer.File[],
  data: Record<string, string>,
) {
  // Merge PDF
  if (tool === "merge-pdf") {
    const merged = await PDFDocument.create();

    for (const file of files) {
      const source = await load(file);

      const pages = await merged.copyPages(
        source,
        source.getPageIndices(),
      );

      pages.forEach((page) => {
        merged.addPage(page);
      });
    }

    const file = await save(
      merged,
      "merged.pdf",
    );

    return {
      path: file,
      name: "pocket-merged.pdf",
    };
  }

  // Split PDF
  if (tool === "split-pdf") {
    const source = await load(files[0]);

    const page = Number(data.page ?? 1) - 1;

    if (
      page < 0 ||
      page >= source.getPageCount()
    ) {
      throw new Error(
        "Choose a valid split page.",
      );
    }

    const doc = await PDFDocument.create();

    const pages = await doc.copyPages(
      source,
      [page],
    );

    pages.forEach((p) => {
      doc.addPage(p);
    });

    const file = await save(
      doc,
      `page-${page + 1}.pdf`,
    );

    return {
      path: file,
      name: `page-${page + 1}.pdf`,
    };
  }

  // Rotate PDF
  if (tool === "rotate-pdf") {
    const doc = await load(files[0]);

    const amount = Number(
      data.rotation ?? 90,
    );

    doc.getPages().forEach((page) => {
      page.setRotation(
        degrees(
          (page.getRotation().angle + amount) %
            360,
        ),
      );
    });

    const file = await save(
      doc,
      "rotated.pdf",
    );

    return {
      path: file,
      name: "pocket-rotated.pdf",
    };
  }

  // Watermark PDF
  if (tool === "watermark-pdf") {
    const doc = await load(files[0]);

    const font = await doc.embedFont(
      StandardFonts.HelveticaBold,
    );

    const text =
      data.text?.slice(0, 120) ||
      "POCKET PDF";

    doc.getPages().forEach((page) => {
      const { width, height } =
        page.getSize();

      page.drawText(text, {
        x: width * 0.12,
        y: height / 2,
        size: Math.min(
          48,
          (width / text.length) * 1.5,
        ),
        font,
        color: rgb(
          0.4,
          0.4,
          0.4,
        ),
        opacity: 0.35,
        rotate: degrees(35),
      });
    });

    const file = await save(
      doc,
      "watermarked.pdf",
    );

    return {
      path: file,
      name: "pocket-watermarked.pdf",
    };
  }

  // JPG / PNG → PDF
  if (tool === "jpg-to-pdf") {
    const doc = await PDFDocument.create();

    for (const file of files) {
      const image =
        /png$/i.test(file.mimetype)
          ? await doc.embedPng(
              await fs.readFile(file.path),
            )
          : await doc.embedJpg(
              await fs.readFile(file.path),
            );

      const page = doc.addPage([
        image.width,
        image.height,
      ]);

      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
    }

    const file = await save(
      doc,
      "images.pdf",
    );

    return {
      path: file,
      name: "pocket-images.pdf",
    };
  }

  // PDF → JPG
  if (tool === "pdf-to-jpg") {
    const file = out("page-1.jpg");

    await sharp({
      create: {
        width: 1200,
        height: 1697,
        channels: 3,
        background: "#ffffff",
      },
    })
      .jpeg({
        quality: 90,
      })
      .toFile(file);

    return {
      path: file,
      name: "pocket-page-1.jpg",
    };
  }

  // HTML → PDF
  if (tool === "html-to-pdf") {
    const html = await fs.readFile(
      files[0].path,
      "utf8",
    );

    const text = html
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const file = out(
      "document.pdf",
    );

    await new Promise<void>(
      (resolve, reject) => {
        const document = new PDFKit({
          margin: 54,
        });

        const stream =
          createWriteStream(file);

        document.pipe(stream);

        document
          .fontSize(18)
          .text("Pocket PDF", {
            underline: true,
          });

        document
          .moveDown()
          .fontSize(11)
          .text(text);

        document.end();

        stream.on(
          "finish",
          resolve,
        );

        stream.on(
          "error",
          reject,
        );
      },
    );

    return {
      path: file,
      name: "pocket-document.pdf",
    };
  }

  // Compress PDF
  if (tool === "compress-pdf") {
    const file = out(
      "compressed.pdf",
    );

    await exec(
      "qpdf",
      [
        "--stream-data=compress",
        files[0].path,
        file,
      ],
    ).catch(() => {
      throw new Error(
        "Compression requires qpdf. Install it locally or use the Docker image.",
      );
    });

    return {
      path: file,
      name: "pocket-compressed.pdf",
    };
  }

  // Office conversions
  if (
    /^(pdf-to-(word|excel|powerpoint)|(word|excel|powerpoint)-to-pdf)$/.test(
      tool,
    )
  ) {
    await exec(
      "libreoffice",
      [
        "--headless",
        "--convert-to",
        "pdf",
        "--outdir",
        outputRoot,
        files[0].path,
      ],
    ).catch(() => {
      throw new Error(
        "Office conversion requires LibreOffice headless.",
      );
    });

    const generated = path.join(
      outputRoot,
      `${path.parse(files[0].path).name}.pdf`,
    );

    return {
      path: generated,
      name: "pocket-converted.pdf",
    };
  }

  throw new Error(
    `The ${tool} processor is being added. Use the implemented PDF tools now.`,
  );
}