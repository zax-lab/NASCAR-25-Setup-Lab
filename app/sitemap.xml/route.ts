import { APP_SCREENS } from "@/lib/app-navigation";

const SITE_URL = "https://nascar-25-setup-lab.zaxcracked.chatgpt.site";

export function GET() {
  const paths = ["/review", ...APP_SCREENS.map((screen) => screen.href)];
  const urls = [...new Set(paths)].map(
    (path) => `  <url><loc>${SITE_URL}${path === "/" ? "" : path}</loc></url>`,
  );
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
  ].join("\n");

  return new Response(xml, {
    headers: {
      "cache-control": "public, max-age=3600",
      "content-type": "application/xml; charset=utf-8",
    },
  });
}

