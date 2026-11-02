import { auth } from "@/lib/auth";
import { readImage } from "@/lib/storage";

export async function GET(req: Request, ctx: { params: Promise<{ key: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return new Response("Unauthorized", { status: 401 });
  const { key } = await ctx.params;
  const data = await readImage(key);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "content-type": key.endsWith(".png") ? "image/png" : "image/jpeg",
      "cache-control": "private, max-age=3600",
      "x-content-type-options": "nosniff",
    },
  });
}
