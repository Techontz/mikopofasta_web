import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { ADMIN_SECTIONS, isSectionVisible } from "@/config/admin-sections";

export default async function AdminLandingPage() {
  const user = await getCurrentUser();
  const sections = user ? ADMIN_SECTIONS.filter((section) => isSectionVisible(user, section)) : [];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sections.map((section) => (
        <Link key={section.slug} href={`/admin/${section.slug}`}>
          <Card className="h-full transition-colors hover:border-primary/40 hover:bg-accent/40">
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                <section.icon className="size-4.5" />
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-1">
              <CardTitle className="text-base">{section.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{section.description}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
