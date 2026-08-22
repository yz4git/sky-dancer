import type { Metadata, Viewport } from "next";
import "./globals.css";
import SkyViewportSync from "./SkyViewportSync";

const isGitHubPagesBuild = process.env.SKY_DANCER_PAGES === "1";
const githubPagesBasePath = isGitHubPagesBuild
  ? `/${process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "sky-dancer"}`
  : "";

export const metadata: Metadata = {
  title: "Sky Dancer — Airborne Turbo Run",
  description: "Cart Rogueの操作とゲームループを引き継ぎ、航空機と空中飛行面へ置き換えたiPhone Safari向けゲーム。",
  manifest: `${githubPagesBasePath}/manifest.json`,
  appleWebApp: { capable: true, title: "Sky Dancer", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: { icon: `${githubPagesBasePath}/favicon.svg`, shortcut: `${githubPagesBasePath}/favicon.svg` },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#07152d",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body><SkyViewportSync />{children}</body></html>;
}
