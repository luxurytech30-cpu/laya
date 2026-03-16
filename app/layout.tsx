import type { Metadata } from "next";
import { Frank_Ruhl_Libre, Heebo } from "next/font/google";
import MainNavbar from "@/components/MainNavbar";
import Footer from "@/components/home/Footer";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-hebrew-sans",
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "700", "900"],
  display: "swap",
});

const frankRuhl = Frank_Ruhl_Libre({
  variable: "--font-hebrew-serif",
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LAYA LUXE | חוויית יוקרה דיגיטלית",
  description: "חנות יוקרה בעברית לשעונים, תיקים ובשמים",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${heebo.variable} ${frankRuhl.variable} antialiased`}>
        <MainNavbar />
        {children}
        <Footer year={new Date().getFullYear()} />
      </body>
    </html>
  );
}
