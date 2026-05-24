import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Seshat — Proposta profissional em 60 segundos',
  description: 'Descreve o projeto, a Seshat escreve a proposta comercial completa. Exporta em PDF profissional e envia ao cliente. Grátis para começar.',
  metadataBase: new URL('https://seshatwork.com'),
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Seshat — Proposta profissional em 60 segundos',
    description: 'Descreve o projeto, a Seshat escreve a proposta comercial completa. Exporta em PDF profissional e envia ao cliente.',
    url: 'https://seshatwork.com',
    siteName: 'Seshat',
    locale: 'pt_PT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Seshat — Proposta profissional em 60 segundos',
    description: 'Descreve o projeto, a Seshat escreve a proposta comercial completa. Exporta em PDF profissional e envia ao cliente.',
  },
  robots: { index: true, follow: true },
  verification: { google: 'rsM-3riKrGIZZ5KU7d2ubeF0dRnpXRTqr5QDwr-6tzI' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-4EW8E0HMW3"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-4EW8E0HMW3');
        `}
      </Script>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}