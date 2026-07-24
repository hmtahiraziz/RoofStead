import { Suspense } from "react";
import { StitchMessages } from "@/components/stitch/StitchMessages";

function MessagesFallback() {
  return (
    <div className="flex items-center justify-center py-24 text-on-surface-variant">
      Loading messages…
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<MessagesFallback />}>
      <StitchMessages />
    </Suspense>
  );
}
