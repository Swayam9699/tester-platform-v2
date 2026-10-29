import { AppForm } from "@/components/AppForm";
import { PageHeader } from "@/components/ui";
import { googleGroup } from "@/lib/config";
import { requireOnboardedUser } from "@/server/auth";

export const metadata = { title: "Submit app" };

export default async function NewAppPage() {
  const user = await requireOnboardedUser();
  return (
    <div>
      <PageHeader title="Submit your app" subtitle="Four quick steps. Publishing stays locked until each one is done." />
      <AppForm joinedGroup={user.joinedGoogleGroup} group={googleGroup} />
    </div>
  );
}
