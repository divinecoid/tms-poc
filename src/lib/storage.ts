import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const dir = () => path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? "./uploads");
export const KEY_RE = /^[0-9a-f]{32}\.(jpg|png)$/;

const sniff = (b: Buffer) =>
  b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff ? "jpg"
  : b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])) ? "png"
  : null;

/** Simpan gambar (jpeg/png) ke disk; tipe ditentukan dari isi file, bukan dari klien. */
export async function saveImage(data: Buffer) {
  const ext = sniff(data);
  if (!ext) throw new Error("Hanya JPEG/PNG");
  const key = `${randomBytes(16).toString("hex")}.${ext}`;
  await mkdir(/*turbopackIgnore: true*/ dir(), { recursive: true });
  await writeFile(path.join(/*turbopackIgnore: true*/ dir(), key), data);
  return key;
}

export async function readImage(key: string) {
  if (!KEY_RE.test(key)) return null;
  try {
    return await readFile(path.join(/*turbopackIgnore: true*/ dir(), key));
  } catch {
    return null;
  }
}
