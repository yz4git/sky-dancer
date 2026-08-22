import type { Metadata, Viewport } from "next";
import "./globals.css";
import SkyViewportSync from "./SkyViewportSync";

const isGitHubPagesBuild = process.env.SKY_DANCER_PAGES === "1";
const githubPagesBasePath = isGitHubPagesBuild
  ? `/${process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "sky-dancer"}`
  : "";

export const metadata: Metadata = {
  title: "Sky Dancer — Air Combat",
  description: "iPhone Safari向けの空中シューティングゲーム。飛行機を操縦し、飛来するドローンを撃破する。",
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
