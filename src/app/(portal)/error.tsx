"use client";

import { ErrorView } from "@/components/shell/error-view";

export default function PortalError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView {...props} />;
}
