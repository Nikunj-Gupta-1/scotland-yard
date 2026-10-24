import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scotland Yard - Digital Asymmetric Deduction Game",
  description: "Modern digital edition of Scotland Yard featuring multiple cities, smart AI, and real-time multiplayer.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className="bg-noir-950 text-slate-100 antialiased h-screen w-screen overflow-hidden"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
