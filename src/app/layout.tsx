import type { Metadata } from "next";
import { Roboto_Mono, Inter } from "next/font/google";
import "./globals.css";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Providers from "@/components/Providers";
import TerminalWindow from "@/components/TerminalWindow";
import Background3D from "@/components/Background3D";
import { Toaster } from "react-hot-toast";
import { FaCheck, FaTimes } from "react-icons/fa";

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-roboto-mono",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "CTFrbt",
  description: "Capture The Flag Platform",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={`${robotoMono.variable} ${inter.variable}`}>
        <Providers session={session}>
          <Background3D />
          <TerminalWindow>{children}</TerminalWindow>
          <Toaster
            position="top-center"
            toastOptions={{
              className: "font-mono",
              style: {
                background: "#000000",
                border: "2px solid",
                fontSize: "14px",
                padding: "12px 20px",
                fontFamily: "var(--font-mono)",
                maxWidth: "500px",
                width: "100%",
                borderRadius: "0",
              },
              success: {
                style: {
                  borderColor: "#00ff00",
                  color: "#00ff00",
                },
                icon: <FaCheck style={{ color: "#00ff00" }} />,
              },
              error: {
                style: {
                  borderColor: "#ff0000",
                  color: "#ff0000",
                },
                icon: <FaTimes style={{ color: "#ff0000" }} />,
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
