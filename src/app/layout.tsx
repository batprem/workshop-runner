import type { Metadata } from "next";
import { Pixelify_Sans } from "next/font/google";
import "./globals.css";

const pixel = Pixelify_Sans({ variable: "--font-pixel", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Forward Deploy Workshop",
  description: "Run online workshops and see which students need help",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${pixel.variable} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
