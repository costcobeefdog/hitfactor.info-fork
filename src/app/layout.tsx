import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "HitFactor.Info",
  description: "A Better Classification System for Action Shooting Sports",
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="en">
    <body>{children}</body>
  </html>
);

export default RootLayout;
