import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import TopHeader from "@/components/shell/TopHeader";
import BottomNav from "@/components/shell/BottomNav";

export const metadata: Metadata = {
  title: "매매노트",
  description: "매매 기록과 복기, 그리고 기회비용까지",
};

export const viewport: Viewport = {
  themeColor: "#EAF3EC",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="ko" className="h-full antialiased">
        <body className="min-h-full">
          <div className="mx-auto w-full max-w-[480px] min-h-screen flex flex-col">
            <TopHeader />
            <main className="flex-1 pb-28 px-4">{children}</main>
            <BottomNav />
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
