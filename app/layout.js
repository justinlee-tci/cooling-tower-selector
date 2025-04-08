import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/authContext";
import { LastLoginTracking } from "@/components/LastLoginTracking";
import { Toaster } from "react-hot-toast";
import "./globals.css"; // Keep this import in layout.js

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "NSK Cooling Tower Selector", // Change this to your preferred website name
  description: "Cooling Tower Selection Software for Thermal-Cell NSK Series Cooling Tower", // Update this description
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: { url: '/apple-touch-icon.png' },
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <LastLoginTracking />
          {children}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}