import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Local Lead Finder AI",
  description: "Discover qualified local businesses from Google Maps",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const pathname = headersList.get("x-invoke-path") ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = pathname === "/login" || pathname.startsWith("/auth/");

  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-slate-50`}>
        {!isLoginPage && <Navbar userEmail={user?.email} />}
        <main className={`container mx-auto px-4 py-8 ${isLoginPage ? "p-0" : ""}`}>
          {children}
        </main>
      </body>
    </html>
  );
}
