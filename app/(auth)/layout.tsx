import { Landmark } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-muted/40 p-6">
      <div className="flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Landmark className="size-5" aria-hidden />
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-sm font-semibold">Mikopofasta</span>
          <span className="text-xs text-muted-foreground">Microfinance OS</span>
        </div>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
