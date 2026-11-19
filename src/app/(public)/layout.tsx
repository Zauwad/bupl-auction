import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <SiteHeader />
      <main className="flex flex-1 flex-col">{children}</main>
      <SiteFooter />
    </div>
  );
}
