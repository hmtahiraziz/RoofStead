import { Suspense } from "react";
import { StitchAdminPanel } from "@/components/stitch/StitchAdminPanel";

export default function AdminHomePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background">Loading admin…</div>}>
      <StitchAdminPanel />
    </Suspense>
  );
}
