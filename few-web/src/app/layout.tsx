import type { Metadata } from "next";
import { Nunito_Sans, Poppins } from "next/font/google";
import { RegisterSw } from "@/components/pwa/RegisterSw";
import { SiteHeader } from "@/components/site/SiteHeader";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-poppins",
});

const nunito = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "Families Eat Well",
  description:
    "Recipes and meal planning for pregnant and breastfeeding women. Food safety is shown only when a source states it.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${poppins.variable} ${nunito.variable} h-full`}>
      <body className="flex h-dvh flex-col overflow-hidden bg-blush font-body text-base text-ink antialiased">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <RegisterSw />
        <SiteHeader />
        <div className="app-scroll h-full min-h-0 flex-1 overflow-y-auto">{children}</div>
      </body>
    </html>
  );
}
