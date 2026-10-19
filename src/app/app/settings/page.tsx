import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { SettingsForm } from "@/components/settings-form";
export default async function Settings() {
  await requireUser("settings:write");
  const [settings, stages, services] = await Promise.all([
    db.businessSettings.findUniqueOrThrow({ where: { id: "business" } }),
    db.pipelineStage.findMany({ orderBy: { position: "asc" } }),
    db.service.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="MAKE IT YOUR OWN"
        title="Settings"
        description="Shared policies and service references. Every change is recorded in the audit log."
      />
      <SettingsForm settings={settings} stages={stages} services={services} />
    </>
  );
}
