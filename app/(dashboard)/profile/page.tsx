import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getActivity, getProfile, getSecurity } from "@/lib/api/auth";
import { getCurrentUser } from "@/lib/auth/session";
import { BreadcrumbLabel } from "@/components/layout/breadcrumb-label";
import { ProfileHeaderCard, ProfilePanels } from "@/features/profile/profile-panels";
import { PreferencesPanel } from "@/features/profile/preferences-panel";
import { ActivityPanel, SecurityPanel } from "@/features/profile/account-settings";

/**
 * My Profile — Account Settings.
 *
 * Reachable by anyone signed in and by nobody else: every endpoint behind it
 * acts on the token's owner and takes no id, so there is no other person's
 * account this page could be pointed at. It carries no permission gate for the
 * same reason — seeing your own record is not a privilege.
 *
 * Security and Activity fail soft. Both are supporting detail assembled from
 * the audit trail, and neither is a reason for somebody to lose access to
 * their own profile if that read is briefly unavailable.
 */
export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const profile = await getProfile();

  const [security, activity] = await Promise.all([
    getSecurity().catch(() => null),
    getActivity(30).catch(() => []),
  ]);

  return (
    <div className="space-y-4">
      <BreadcrumbLabel label="My Profile" />

      <ProfileHeaderCard profile={profile} />

      <Tabs defaultValue="profile">
        <TabsList className="max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="activity">Activity ({activity.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfilePanels profile={profile} />
        </TabsContent>

        <TabsContent value="security">
          {security === null ? (
            <p className="text-sm text-muted-foreground">
              Security details are unavailable right now.
            </p>
          ) : (
            <SecurityPanel security={security} />
          )}
        </TabsContent>

        <TabsContent value="preferences">
          <PreferencesPanel profile={profile} />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityPanel entries={activity} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
