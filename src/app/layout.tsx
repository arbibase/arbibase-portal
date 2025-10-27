import "@/app/globals.css";
import Header from "@/components/Header";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#10b981" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Arbibase" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="min-h-dvh bg-[#071019] text-white antialiased">
        <Header />
        <main className="relative">{children}</main>
        {/* Safe SW registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', async function() {
                  try {
                    const reg = await navigator.serviceWorker.register('/sw.js');
                    console.log('ServiceWorker registered', reg);
                  } catch (err) {
                    console.warn('ServiceWorker registration failed', err);
                  }
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
