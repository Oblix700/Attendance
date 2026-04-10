import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EventCheck | Professional QR Attendance",
  description: "Seamless real-time attendance tracking and networking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var theme = localStorage.getItem('theme');
              if (theme) document.documentElement.setAttribute('data-theme', theme);
            } catch (e) {}
          })();
        ` }} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
