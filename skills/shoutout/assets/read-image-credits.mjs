#!/usr/bin/env node
// Read the credit already inside image files: who made them, the credit line they ask for, and whether they carry
// Content Credentials (C2PA), which often name the tool, including AI tools.
//
//   node read-image-credits.mjs <folder or files …>          a short list
//   node read-image-credits.mjs --json <folder or files …>   everything, as JSON
//
// It reads, and never changes, the files. What it finds is for the user to choose from: show it as options, and
// credit only what they pick. No dependencies.
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, extname, relative } from 'node:path';

const IMAGES = new Set(['.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.avif', '.heic', '.gif']);

async function* walk(path) {
  const s = await stat(path);
  if (s.isFile()) { if (IMAGES.has(extname(path).toLowerCase())) yield path; return; }
  for (const name of await readdir(path)) {
    if (name.startsWith('.') || name === 'node_modules') continue;
    yield* walk(join(path, name));
  }
}

const clean = (s) => (s || '').replace(/\s+/g, ' ').trim().slice(0, 300);
const decodeXml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

// ---------- XMP: the XML packet most tools write (Photoshop, Lightroom, Figma exports, stock sites) ----------
function xmp(text) {
  const start = text.indexOf('<x:xmpmeta');
  if (start < 0) return {};
  const end = text.indexOf('</x:xmpmeta>', start);
  const x = text.slice(start, end < 0 ? start + 200000 : end);
  // a property as an attribute (ns:prop="…"), as an element with text, or as an rdf list (Seq, Bag, Alt)
  const get = (tag) => {
    const attr = new RegExp(`\\b${tag}="([^"]*)"`).exec(x);
    if (attr) return decodeXml(attr[1]);
    const el = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`).exec(x);
    if (!el) return '';
    const items = [...el[1].matchAll(/<rdf:li(?:\s[^>]*)?>([\s\S]*?)<\/rdf:li>/g)].map((m) => decodeXml(m[1].replace(/<[^>]+>/g, '')).trim()).filter(Boolean);
    return items.length ? items.join(', ') : decodeXml(el[1].replace(/<[^>]+>/g, '')).trim();
  };
  const source = get('Iptc4xmpExt:DigitalSourceType') || get('Iptc4xmpCore:DigitalSourceType');
  return {
    creator: clean(get('dc:creator')),
    creditLine: clean(get('photoshop:Credit')),
    copyright: clean(get('dc:rights')),
    source: clean(get('photoshop:Source')),
    webStatement: clean(get('xmpRights:WebStatement')),
    title: clean(get('dc:title')),
    tool: clean(get('xmp:CreatorTool')),
    ai: /trainedAlgorithmicMedia|compositeWithTrainedAlgorithmicMedia|algorithmicMedia/i.test(source) || undefined,
  };
}

// ---------- IPTC IIM: the older fields, in JPEG's Photoshop block (record 2) ----------
function iptc(buf) {
  const out = {};
  const names = { 5: 'title', 80: 'creator', 110: 'creditLine', 115: 'source', 116: 'copyright' };
  for (let i = 0; i < buf.length - 5; i++) {
    if (buf[i] !== 0x1c || buf[i + 1] !== 0x02) continue;
    const ds = buf[i + 2], len = buf.readUInt16BE(i + 3);
    if (!names[ds] || len === 0 || len > 2000 || i + 5 + len > buf.length) continue;
    const v = clean(buf.subarray(i + 5, i + 5 + len).toString('utf8'));
    if (v && !/[\u0000-\u0008]/.test(v)) out[names[ds]] = out[names[ds]] ? out[names[ds]] + ', ' + v : v;
    i += 4 + len;
  }
  return out;
}

// ---------- PNG text chunks ----------
function pngText(buf) {
  const out = {};
  if (buf.readUInt32BE(0) !== 0x89504e47) return out;
  const want = { Author: 'creator', Copyright: 'copyright', Source: 'source', Software: 'tool', Title: 'title', Description: 'description' };
  let p = 8;
  while (p + 8 < buf.length) {
    const len = buf.readUInt32BE(p), type = buf.toString('latin1', p + 4, p + 8), data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'tEXt' || type === 'iTXt') {
      const zero = data.indexOf(0), key = data.toString('latin1', 0, zero);
      if (want[key]) {
        let value = data.subarray(zero + 1);
        if (type === 'iTXt') { let z = 2, n = 0; for (let i = 2; i < value.length && n < 2; i++) if (value[i] === 0) { n++; z = i + 1; } value = value.subarray(z); }
        out[want[key]] = clean(value.toString(type === 'iTXt' ? 'utf8' : 'latin1'));
      }
    }
    if (type === 'IEND') break;
    p += 12 + len;
  }
  return out;
}

// ---------- Content Credentials (C2PA): a signed record of how the image was made ----------
function c2pa(buf, text) {
  if (!/c2pa/.test(text) || !/jumb|jumd/.test(text)) return undefined;
  const found = { present: true };
  const gen = /claim_generator[\s\S]{0,4}?([\x20-\x7e]{3,120})/.exec(text);
  if (gen) found.generator = clean(gen[1].replace(/^[^A-Za-z]+/, ''));
  const agents = [...text.matchAll(/softwareAgent[\s\S]{0,6}?(?:name[\s\S]{0,4}?)?([A-Za-z][\x20-\x7e]{2,80})/g)].map((m) => clean(m[1])).filter((v) => !/^(name|version)$/i.test(v));
  if (agents.length) found.tools = [...new Set(agents)].slice(0, 5);
  const authors = [...text.matchAll(/"author"\s*:\s*\[?\s*\{[^}]*?"name"\s*:\s*"([^"]{1,120})"/g)].map((m) => clean(m[1]));
  if (authors.length) found.author = [...new Set(authors)].join(', ');
  if (/trainedAlgorithmicMedia|c2pa\.created[\s\S]{0,200}?ai\b/i.test(text)) found.ai = true;
  return found;
}

export function readCreditsFrom(buf) {
  const text = buf.toString('latin1');
  const fromXmp = xmp(buf.toString('utf8').includes('<x:xmpmeta') ? buf.toString('utf8') : text);
  const merged = { ...pngText(buf), ...iptc(buf) };
  for (const [k, v] of Object.entries(fromXmp)) if (v) merged[k] = merged[k] || v;
  const cc = c2pa(buf, text);
  if (cc) merged.contentCredentials = cc;
  if (cc && cc.ai) merged.ai = true;
  for (const k of Object.keys(merged)) if (merged[k] === '' || merged[k] === undefined) delete merged[k];
  return merged;
}

async function main(args) {
  const json = args.includes('--json');
  const paths = args.filter((a) => a !== '--json');
  if (!paths.length) { console.log('Usage: node read-image-credits.mjs [--json] <folder or files …>'); process.exit(1); }
  const results = [];
  for (const p of paths) for await (const file of walk(p)) {
    try {
      const found = readCreditsFrom(await readFile(file));
      if (Object.keys(found).length) results.push({ file: relative(process.cwd(), file) || file, ...found });
    } catch (e) { /* unreadable: skip */ }
  }
  if (json) return console.log(JSON.stringify(results, null, 2));
  if (!results.length) return console.log('No credits found inside these images.');
  for (const r of results) {
    const who = r.creator || (r.contentCredentials && r.contentCredentials.author) || '';
    const bits = [who && 'by ' + who, r.creditLine && `asks for: "${r.creditLine}"`, r.copyright && '© ' + r.copyright.replace(/^(©|\(c\)|copyright)\s*/i, ''),
      r.source && 'from ' + r.source, r.webStatement && 'licence: ' + r.webStatement,
      r.contentCredentials && ('Content Credentials' + (r.contentCredentials.generator ? ' (' + r.contentCredentials.generator + ')' : '')),
      r.ai && 'made with AI', r.tool && 'tool: ' + r.tool].filter(Boolean);
    console.log(`${r.file}\n   ${bits.join(' · ')}`);
  }
  console.log(`\n${results.length} image${results.length === 1 ? '' : 's'} with credit inside. Offer these to the user as options; credit only what they choose.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main(process.argv.slice(2));
