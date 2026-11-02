import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TMS Driver",
    short_name: "TMS Driver",
    start_url: "/driver",
    scope: "/driver",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#111111",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
