import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CompanionApp } from "@/components/companion-app";
import { APP_SCREENS, type PrimaryScreenKey } from "@/lib/app-navigation";
import { initialData } from "@/lib/bootstrap-data";

type ViewPageProps = {
  params: Promise<{ view: string }>;
};

export async function generateMetadata({ params }: ViewPageProps): Promise<Metadata> {
  const { view } = await params;
  const screen = APP_SCREENS.find((item) => item.key === view && item.key !== "dashboard");
  if (!screen) return {};
  return {
    title: `${screen.label} | NASCAR 25 Setup Lab`,
    description: screen.description,
    robots: { index: true, follow: true },
  };
}

export default async function ViewPage({ params }: ViewPageProps) {
  const { view } = await params;
  const screen = APP_SCREENS.find((item) => item.key === view && item.key !== "dashboard");
  if (!screen) notFound();
  return <CompanionApp initialData={initialData} initialScreen={screen.key as PrimaryScreenKey} />;
}

