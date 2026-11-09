import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readCreditsFrom } from '../../skills/shoutout/assets/read-image-credits.mjs';

const seg = (marker, body) => { const b = Buffer.from(body); const h = Buffer.alloc(4); h.writeUInt16BE(marker); h.writeUInt16BE(b.length + 2, 2); return Buffer.concat([h, b]); };

test('a JPEG: XMP and IPTC fields, and AI from the digital source type', () => {
  const xmpPacket = 'http://ns.adobe.com/xap/1.0/\0<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF><rdf:Description photoshop:Credit="Photo by Ann on Unsplash" xmp:CreatorTool="Figma" Iptc4xmpExt:DigitalSourceType="http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia">'
    + '<dc:creator><rdf:Seq><rdf:li>Ann Maker</rdf:li></rdf:Seq></dc:creator><dc:rights><rdf:Alt><rdf:li xml:lang="x-default">© 2026 Ann Maker</rdf:li></rdf:Alt></dc:rights>'
    + '<xmpRights:WebStatement>https://example.com/licence</xmpRights:WebStatement></rdf:Description></rdf:RDF></x:xmpmeta>';
  const iim = (ds, v) => { const b = Buffer.from(v); const h = Buffer.from([0x1c, 0x02, ds, 0, 0]); h.writeUInt16BE(b.length, 3); return Buffer.concat([h, b]); };
  const app13 = Buffer.concat([Buffer.from('Photoshop 3.0\0' + '8BIM\x04\x04\0\0'), Buffer.alloc(4), iim(110, 'Courtesy of Ann'), iim(115, 'Unsplash')]);
  const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8]), seg(0xffe1, xmpPacket), seg(0xffed, app13), Buffer.from([0xff, 0xd9])]);
  const r = readCreditsFrom(jpeg);
  assert.equal(r.creator, 'Ann Maker');
  assert.equal(r.creditLine, 'Courtesy of Ann');          // the IPTC credit line comes first; XMP fills what's missing
  assert.equal(r.source, 'Unsplash');
  assert.equal(r.copyright, '© 2026 Ann Maker');
  assert.equal(r.webStatement, 'https://example.com/licence');
  assert.equal(r.tool, 'Figma');
  assert.equal(r.ai, true);
});

test('a PNG: text chunks', () => {
  const chunk = (type, data) => { const d = Buffer.from(data, 'latin1'); const h = Buffer.alloc(8); h.writeUInt32BE(d.length); h.write(type, 4, 'latin1'); return Buffer.concat([h, d, Buffer.alloc(4)]); };
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', '\0'.repeat(13)), chunk('tEXt', 'Author\0Bo Maker'), chunk('tEXt', 'Copyright\0CC BY 4.0'), chunk('IEND', '')]);
  const r = readCreditsFrom(png);
  assert.equal(r.creator, 'Bo Maker');
  assert.equal(r.copyright, 'CC BY 4.0');
});

test('Content Credentials (C2PA): present, with the tool and the author', () => {
  const body = 'jumb jumd c2pa c2pa.manifest claim_generator\x78\x1bAdobe_Firefly/1.0 c2pa/0.29 softwareAgent\x6eAdobe Firefly {"author":[{"@type":"Person","name":"Cy Maker"}]} trainedAlgorithmicMedia';
  const r = readCreditsFrom(Buffer.from(body, 'latin1'));
  assert.equal(r.contentCredentials.present, true);
  assert.match(r.contentCredentials.generator, /Adobe_Firefly/);
  assert.equal(r.contentCredentials.author, 'Cy Maker');
  assert.equal(r.ai, true);
});

test('an image with nothing inside: nothing found', () => {
  assert.deepEqual(readCreditsFrom(Buffer.from([0xff, 0xd8, 0xff, 0xd9])), {});
});
