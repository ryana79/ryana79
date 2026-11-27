/** Detect allowed raster image types by magic bytes (never trust client MIME or file extension). */
export function sniffImage(bytes: Uint8Array): { mime: string; ext: string } | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: "image/jpeg", ext: "jpg" };
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { mime: "image/png", ext: "png" };
  const riff = String.fromCharCode(...bytes.slice(0, 4));
  const webp = String.fromCharCode(...bytes.slice(8, 12));
  if (riff === "RIFF" && webp === "WEBP") return { mime: "image/webp", ext: "webp" };
  const ftyp = String.fromCharCode(...bytes.slice(4, 12));
  if (ftyp.startsWith("ftyp") && /avif|avis/.test(ftyp)) return { mime: "image/avif", ext: "avif" };
  return null;
}
