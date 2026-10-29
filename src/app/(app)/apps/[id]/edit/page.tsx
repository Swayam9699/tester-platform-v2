import { notFound } from "next/navigation";
import { getDb } from "@/db";
import { AppForm } from "@/components/forms/AppForm";
import { PageHeader } from "@/components/common";
import { googleGroup } from "@/lib/config";
import { requireOnboardedUser } from "@/api/auth";
import { getAppDetail } from "@/api/queries";

export const metadata = { title: "Edit app" };

export default async function EditAppPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireOnboardedUser();
  const detail = await getAppDetail(await getDb(), user.id, id);
  if (!detail) notFound();
  const { app } = detail;
  return (
    <div>
      <PageHeader title={`Edit ${app.name}`} />
      <AppForm
        joinedGroup={user.joinedGoogleGroup}
        group={googleGroup}
        initial={{ ...app, testingLink: app.joinWebLink, published: app.status !== "draft" }}
      />
    </div>
  );
}
