import type { Metadata } from "next";
import { Raleway } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { CalmLoadingScreen } from "@/components/CalmLoadingScreen";

export const metadata: Metadata = {
  title: "ImagineHumans Academy",
  description: "Learn and grow with ImagineHumans Academy courses",
};

// Initialize Inter font
const font = Raleway({
  subsets: ["latin"],
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={font.className}>
      <body className="bg-[#f8fafc] text-slate-900">
        {/* AppShell is a client component that handles auth state */}
        <Suspense
          fallback={
            <CalmLoadingScreen message="Loading..." />
          }
        >
        <AppShell>{children}</AppShell>
        </Suspense>
      </body>
    </html>
  );
}
