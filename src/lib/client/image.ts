/** Kompres gambar di sisi klien (sisi terpanjang ≤ maxDim, JPEG) agar upload ringan di jaringan lemah. */
export async function compressImage(file: Blob, maxDim = 1280, quality = 0.7): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("Gagal kompres"))), "image/jpeg", quality),
  );
}

export async function uploadImage(blob: Blob): Promise<string> {
  const fd = new FormData();
  fd.append("file", blob, "upload");
  const r = await fetch("/api/v1/uploads", { method: "POST", body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? "Upload gagal");
  return j.key as string;
}

export function currentPosition(timeoutMs = 4000): Promise<{ lat: string; lng: string } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) }),
      () => resolve(null),
      { timeout: timeoutMs, maximumAge: 30000 },
    );
  });
}
