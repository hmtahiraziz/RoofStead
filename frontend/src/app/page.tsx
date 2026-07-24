import { Suspense } from "react";
import { StitchPropertyBrowse } from "@/components/stitch/StitchPropertyBrowse";

function BrowseFallback() {
  return (
    <div className="flex items-center justify-center py-24 text-on-surface-variant">
      Loading properties…
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<BrowseFallback />}>
      <StitchPropertyBrowse />
    </Suspense>
  );
}
