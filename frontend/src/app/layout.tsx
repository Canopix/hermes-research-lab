import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibex-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Hermes Research Lab",
    template: "%s — Hermes Research Lab",
  },
  description: "Plataforma de investigaci\u00f3n y an\u00e1lisis multi-agente",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${ibmPlexMono.variable} ${jetBrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-full bg-background text-foreground">
        <div className="flex min-h-dvh">
          <Sidebar />
          <div className="flex min-h-0 flex-1 flex-col min-w-0">
            <Header />
            <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6 lg:p-8 max-md:pt-2">
              {children}
            </main>
          </div>
        </div>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
