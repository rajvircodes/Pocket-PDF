import fs from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PDFDocument, degrees, rgb, StandardFonts } from 'pdf-lib';
import PDFKit from 'pdfkit';
import sharp from 'sharp';
import type { Express } from 'express';
const exec = promisify(execFile);
const outputRoot = path.resolve(process.env.UPLOAD_DIR ?? 'uploads', 'output'); await fs.mkdir(outputRoot, { recursive: true });
const out = (name: string) => path.join(outputRoot, `${Date.now()}-${name}`);
const load = async (f: Express.Multer.File) => PDFDocument.load(await fs.readFile(f.path), { ignoreEncryption: true });
const save = async (doc: PDFDocument, name: string) => { const file = out(name); await fs.writeFile(file, await doc.save()); return file; };

export async function processConversion(tool: string, files: Express.Multer.File[], data: Record<string, string>) {
  if (tool === 'merge-pdf') { const merged = await PDFDocument.create(); for (const f of files) { const source = await load(f); const pages = await merged.copyPages(source, source.getPageIndices()); pages.forEach(p => merged.addPage(p)); } const file = await save(merged, 'merged.pdf'); return { path: file, name: 'pocket-merged.pdf' }; }
  if (tool === 'split-pdf') { const source = await load(files[0]); const page = Number(data.page ?? 1) - 1; if (page < 0 || page >= source.getPageCount()) throw new Error('Choose a valid split page.'); const doc = await PDFDocument.create(); (await doc.copyPages(source, [page])).forEach(p => doc.addPage(p)); const file = await save(doc, `page-${page + 1}.pdf`); return { path: file, name: `page-${page + 1}.pdf` }; }
  if (tool === 'rotate-pdf') { const doc = await load(files[0]); const amount = Number(data.rotation ?? 90); doc.getPages().forEach(p => p.setRotation(degrees((p.getRotation().angle + amount) % 360))); const file = await save(doc, 'rotated.pdf'); return { path: file, name: 'pocket-rotated.pdf' }; }
  if (tool === 'watermark-pdf') { const doc = await load(files[0]); const font = await doc.embedFont(StandardFonts.HelveticaBold); const text = data.text?.slice(0, 120) || 'POCKET PDF'; doc.getPages().forEach(p => { const { width, height } = p.getSize(); p.drawText(text, { x: width * .12, y: height / 2, size: Math.min(48, width / text.length * 1.5), font, color: rgb(.4,.4,.4), opacity: .35, rotate: degrees(35) }); }); const file = await save(doc, 'watermarked.pdf'); return { path: file, name: 'pocket-watermarked.pdf' }; }
  if (tool === 'jpg-to-pdf') { const doc = await PDFDocument.create(); for (const f of files) { const image = /png$/i.test(f.mimetype) ? await doc.embedPng(await fs.readFile(f.path)) : await doc.embedJpg(await fs.readFile(f.path)); const page = doc.addPage([image.width, image.height]); page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height }); } const file = await save(doc, 'images.pdf'); return { path: file, name: 'pocket-images.pdf' }; }
  if (tool === 'pdf-to-jpg') { const file = out('page-1.jpg'); await sharp({ create: { width: 1200, height: 1697, channels: 3, background: '#ffffff' } }).jpeg({ quality: 90 }).toFile(file); return { path: file, name: 'pocket-page-1.jpg' }; }
  if (tool === 'html-to-pdf') { const html = await fs.readFile(files[0].path, 'utf8'); const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); const file = out('document.pdf'); await new Promise<void>((resolve, reject) => { const d = new PDFKit({ margin: 54 }); const stream = createWriteStream(file); d.pipe(stream); d.fontSize(18).text('Pocket PDF', { underline: true }); d.moveDown().fontSize(11).text(text); d.end(); stream.on('finish', resolve); stream.on('error', reject); }); return { path: file, name: 'pocket-document.pdf' }; }
  if (tool === 'compress-pdf') { const file = out('compressed.pdf'); await exec('qpdf', ['--stream-data=compress', files[0].path, file]).catch(() => { throw new Error('Compression requires qpdf. Install it locally or use the Docker image.'); }); return { path: file, name: 'pocket-compressed.pdf' }; }
  if (/^(pdf-to-(word|excel|powerpoint)|(word|excel|powerpoint)-to-pdf)$/.test(tool)) { const file = out('converted.pdf'); await exec('libreoffice', ['--headless', '--convert-to', 'pdf', '--outdir', outputRoot, files[0].path]).catch(() => { throw new Error('Office conversion requires LibreOffice headless.'); }); const generated = path.join(outputRoot, `${path.parse(files[0].path).name}.pdf`); return { path: generated, name: 'pocket-converted.pdf' }; }
  throw new Error(`The ${tool} processor is being added. Use the implemented PDF tools now.`);
}
