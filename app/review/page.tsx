import type { Metadata } from "next";

import { APP_SCREENS } from "@/lib/app-navigation";

export const metadata: Metadata = {
  title: "AI Review Map | NASCAR 25 Setup Lab",
  description: "Crawler-readable route map for reviewing the NASCAR 25 Setup Lab interface.",
  robots: { index: true, follow: true },
};

export default function ReviewPage() {
  return (
    <main className="review-map">
      <header>
        <p className="eyebrow">Crawler-readable product inventory</p>
        <h1>AI review map</h1>
        <p>
          Use the direct links below to review every primary app screen without clicking
          JavaScript controls. The server response contains seeded reference content only;
          device-local records are not embedded in this review surface.
        </p>
      </header>

      <section aria-labelledby="review-routes-title">
        <div className="review-map-heading">
          <h2 id="review-routes-title">Primary views</h2>
          <span>{APP_SCREENS.length} crawlable routes</span>
        </div>
        <nav aria-label="Crawler-readable app views" className="review-route-list">
          {APP_SCREENS.map((screen) => (
            <a href={screen.href} key={screen.key}>
              <span>{screen.marker}</span>
              <div>
                <strong>{screen.label}</strong>
                <small>{screen.description}</small>
              </div>
              <code>{screen.href}</code>
            </a>
          ))}
        </nav>
      </section>

      <aside>
        <strong>Review boundary</strong>
        <p>
          Personal races, sessions, and setup notes remain in each visitor&apos;s browser. An
          external reviewer can inspect structure, copy, accessibility, responsive behavior,
          seeded references, and empty states without receiving the owner&apos;s local records.
        </p>
      </aside>
    </main>
  );
}

