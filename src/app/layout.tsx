import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BenefitBridge",
  description: "One conversation instead of a dozen benefit applications.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
