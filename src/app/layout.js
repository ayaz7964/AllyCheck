import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "AllyCheck - Accessibility Testing & AI-Powered Fixes",
  description: "Automated accessibility testing for websites. Find WCAG 2.1 violations and get AI-powered explanations and fix recommendations.",
  keywords: "accessibility, WCAG, a11y, axe-core, testing, disability, inclusion",
  authors: [{ name: "AllyCheck Team" }],
  viewport: "width=device-width, initial-scale=1",
  robots: "index, follow",
  openGraph: {
    title: "AllyCheck - Accessibility Testing",
    description: "Build inclusive websites with automated accessibility testing",
    type: "website",
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
