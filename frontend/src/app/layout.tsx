import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/src/styles/globals.css";

import { MainProvider } from "@/src/shared/providers";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chat app",
  description: "Курсовая работа, йоу",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="relative min-h-screen flex flex-col justify-center items-center">
        <MainProvider>
          <div>{children}</div>
        </MainProvider>
      </body>
    </html>
  );
}
