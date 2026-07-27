import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/layout/AppShell";
import { MessagesRealtimeProvider } from "@/lib/messages/MessagesRealtimeProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RoofStead | Premium Real Estate Marketplace",
  description: "House rental and sale marketplace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${sourceSerif.variable}`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"
          rel="stylesheet"
        />
      </head>
      <body className="font-body-lg text-on-surface bg-surface">
        <AuthProvider>
          <MessagesRealtimeProvider>
            <AppShell>{children}</AppShell>
          </MessagesRealtimeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
