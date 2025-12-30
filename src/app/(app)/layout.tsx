import type { ReactNode } from "react";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  // Authentication handled by middleware

  return <>{children}</>;
}
