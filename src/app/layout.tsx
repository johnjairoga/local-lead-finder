import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { Navbar } from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LatamEasy",
  description: "Consigue más clientes latinos en Estados Unidos.",
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

  const hideNavbar = pathname === "/login" || pathname.startsWith("/auth/");

  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-slate-50`}>
        {!hideNavbar && <Navbar userEmail={user?.email} />}
        <main>{children}</main>
      </body>
    </html>
  );
}
