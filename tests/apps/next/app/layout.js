import Script from 'next/script';
export const metadata = { title: 'Shoutout in Next.js' };
export default function Layout({ children }) {
  return (
    <html lang="en">
      <head><link rel="credits" href="/credits.json" /></head>
      <body style={{ margin: 0, fontFamily: 'sans-serif' }}>
        {children}
        <footer style={{ padding: 16 }}>Footer</footer>
        <Script src="/shoutout.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
