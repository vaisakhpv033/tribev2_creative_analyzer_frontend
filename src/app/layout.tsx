import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TRIBEv2 Neural Engagement Analyzer",
  description: "AI-Powered Ad Video Neural Engagement Scoring",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <nav className="glass-panel sticky top-0 z-50 mx-4 mt-4 px-6 py-4 flex items-center justify-between">
          <div className="text-xl font-bold tracking-tight">
            <span className="gradient-text">TRIBEv2</span> Analyzer
          </div>
          <div className="text-sm text-gray-400">Neural Engagement Scorer</div>
        </nav>
        <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 mt-6">
          {children}
        </main>
      </body>
    </html>
  );
}
