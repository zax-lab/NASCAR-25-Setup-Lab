const SITE_URL = "https://nascar-25-setup-lab.zaxcracked.chatgpt.site";

export function GET() {
  return new Response(
    `User-Agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`,
    {
      headers: {
        "cache-control": "public, max-age=3600",
        "content-type": "text/plain; charset=utf-8",
      },
    },
  );
}

