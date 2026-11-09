import Link from 'next/link';
export default function Home() {
  return (<main style={{ padding: 24 }}>
    <div id="hero" data-credit="hero" style={{ width: 200, height: 120, background: '#36c', borderRadius: 12 }} />
    <p><Link href="/second" id="to-second">Second page</Link></p>
  </main>);
}
