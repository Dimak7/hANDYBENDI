import type { Metadata } from "next";
import "./globals.css";
import "./brand.css";
import "./public.css";
export const metadata: Metadata = {
  title: { default: "HandyBandi · Business OS", template: "%s · HandyBandi" },
  description: "The connected workspace for HandyBandi operations.",
  robots: { index: false, follow: false },
  icons: { icon: "/handybandi-logo.png" },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
