import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Providers } from "@/app/providers";
import "./globals.css";

/**
 * One typeface, for the whole application.
 *
 * It previously loaded two — Geist Sans and Geist Mono — and then rendered
 * almost nothing in either: `.lg-shell` reset `font-family` to the old app's
 * Bootstrap system stack, and `.lg-shell` wraps every screen. So the shell, the
 * tables and the forms drew in the OS UI font while dialogs, dropdowns and
 * toasts — which portal to `<body>`, outside that scope — drew in Geist. Two
 * families were downloaded, one was used, and the page and its own modal did
 * not match.
 *
 * The override is gone (see globals.css) and Geist now applies everywhere, so
 * the webfont this app pays for is the one it actually renders in. Geist Mono
 * is gone with it: a second family of web-delivered faces is a lot to carry for
 * the two dozen short codes that want tabular monospace, and every platform
 * ships a good mono of its own — `--font-mono` names those directly.
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "M-Kopa | Microfinance OS",
  description: "Enterprise microfinance operating system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
