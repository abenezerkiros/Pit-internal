import type { Metadata } from "next";
import "./globals.css";
import localFont from "next/font/local";
const geist = localFont({
  src: "../../public/fonts/Geist.ttf",
  variable: "--font-body",
  display: "swap",
});

const fragmentGlare = localFont({
  src: "../../public/fonts/pp-fragment-glare.ttf",
  variable: "--font-heading",
  display: "swap",
});
export const metadata: Metadata = {
  title: "Premier | Client Experience",
  description: "Premier internal booking workspace",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
          <body className={`${geist.variable} ${fragmentGlare.variable}`}>{children}</body>
    </html>
  );
}
