import { CompanionApp } from "@/components/companion-app";
import { initialData } from "@/lib/bootstrap-data";

export default function Home() {
  return <CompanionApp initialData={initialData} initialScreen="dashboard" />;
}
