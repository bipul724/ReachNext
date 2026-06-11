import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "../components/layout/sidebar";
import { Header } from "../components/layout/header";
import { Toaster } from "../components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CRM",
  description: "AI-native Campaign Management CRM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        <div className="relative flex min-h-screen">
          {/* Sidebar Nav */}
          <Sidebar />

          {/* Main Layout Area */}
          <div className="flex-1 pl-64 flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 p-8 bg-muted/20">
              {children}
            </main>
          </div>
        </div>

        {/* Global Toast Provider */}
        <Toaster position="top-right" closeButton richColors />
      </body>
    </html>
  );
}
