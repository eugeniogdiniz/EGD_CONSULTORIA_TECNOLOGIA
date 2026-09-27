"use client";

import { ErrorView } from "@/components/shell/error-view";

export default function AdminError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView {...props} />;
}
