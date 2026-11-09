import Link from 'next/link';
export default function Second() {
  return (<main style={{ padding: 24 }}>
    <div id="card" data-credit="card" style={{ width: 160, height: 100, background: '#c63', borderRadius: 8 }} />
    <p><Link href="/" id="to-home">Home</Link></p>
  </main>);
}
