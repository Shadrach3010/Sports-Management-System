import type { Metadata } from "next";

import { ApplicationShell } from "@/components/layout/application-shell";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "CSMIS", template: "%s | CSMIS" },
  description:
    "College Sports Management & Integrity System foundation for verified participation, results, and scoring.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <ApplicationShell>{children}</ApplicationShell>
      </body>
    </html>
  );
}
