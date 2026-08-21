import { APP_SCREENS, type ScreenKey } from "@/lib/app-navigation";

export type { ScreenKey } from "@/lib/app-navigation";

export function AppNav({
  active,
}: {
  active: ScreenKey;
}) {
  return (
    <nav className="app-nav" aria-label="Companion screens">
      {APP_SCREENS.map((item) => (
        <a
          className="nav-item"
          data-active={active === item.key}
          href={item.href}
          key={item.key}
        >
          <span className="nav-marker" aria-hidden="true">
            {item.marker}
          </span>
          <span>{item.label}</span>
        </a>
      ))}
    </nav>
  );
}
