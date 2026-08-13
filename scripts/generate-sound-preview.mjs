import fs from 'fs'
import path from 'path'

function wav({
  freqs = [],
  durationMs,
  volume = 0.2,
  sampleRate = 22050,
  attack = 0.008,
  release = 0.06,
  glide = null,
  harmonics = 1,
}) {
  const n = Math.floor((sampleRate * durationMs) / 1000)
  const data = Buffer.alloc(n * 2)
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate
    const env =
      Math.min(1, t / attack) *
      Math.min(1, Math.max(0, durationMs / 1000 - t) / release)
    let s = 0
    if (glide) {
      const f = glide.from + (glide.to - glide.from) * (t / (durationMs / 1000))
      for (let h = 1; h <= harmonics; h++) {
        s += (Math.sin(2 * Math.PI * f * h * t) / h) * (h === 1 ? 1 : 0.35)
      }
    } else {
      for (const f of freqs) {
        for (let h = 1; h <= harmonics; h++) {
          s += (Math.sin(2 * Math.PI * f * h * t) / h) * (h === 1 ? 1 : 0.3)
        }
      }
      s /= Math.max(1, freqs.length)
    }
    s *= env * volume
    data.writeInt16LE(Math.max(-32767, Math.min(32767, Math.floor(s * 32767))), i * 2)
  }
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

function concatWav(parts, gapSec = 0.05) {
  const sampleRate = 22050
  const pcmParts = []
  for (let pi = 0; pi < parts.length; pi++) {
    const w = wav({ ...parts[pi], sampleRate })
    pcmParts.push(w.subarray(44))
    if (pi < parts.length - 1) {
      pcmParts.push(Buffer.alloc(Math.floor(sampleRate * gapSec) * 2))
    }
  }
  const data = Buffer.concat(pcmParts)
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + data.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20)
  header.writeUInt16LE(1, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(sampleRate * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(data.length, 40)
  return Buffer.concat([header, data])
}

const dir = path.join('frontend', 'public', 'sounds', 'preview')
fs.mkdirSync(dir, { recursive: true })

/** @type {Record<string, Buffer>} */
const sounds = {
  // —— Notifications ——
  N1: wav({ freqs: [1318], durationMs: 220, volume: 0.22, attack: 0.005, release: 0.12 }),
  N2: concatWav([
    { freqs: [1200], durationMs: 70, volume: 0.2, attack: 0.003, release: 0.04 },
    { freqs: [1200], durationMs: 90, volume: 0.18, attack: 0.003, release: 0.05 },
  ]),
  N3: concatWav([
    { freqs: [784], durationMs: 90, volume: 0.18 },
    { freqs: [988], durationMs: 90, volume: 0.18 },
    { freqs: [1175], durationMs: 140, volume: 0.2 },
  ]),
  N4: wav({ freqs: [1046], durationMs: 180, volume: 0.14, attack: 0.01, release: 0.1 }),
  N5: wav({ freqs: [700, 1400], durationMs: 120, volume: 0.2, attack: 0.002, release: 0.05 }),
  N6: wav({ freqs: [523, 784, 1046], durationMs: 320, volume: 0.16, attack: 0.01, release: 0.15, harmonics: 2 }), // glass
  N7: concatWav(
    [
      { freqs: [880], durationMs: 55, volume: 0.18, attack: 0.002, release: 0.03 },
      { freqs: [1108], durationMs: 55, volume: 0.17, attack: 0.002, release: 0.03 },
      { freqs: [1318], durationMs: 90, volume: 0.18, attack: 0.002, release: 0.05 },
    ],
    0.02
  ), // marimba up
  N8: wav({
    freqs: [],
    durationMs: 260,
    volume: 0.15,
    attack: 0.002,
    release: 0.14,
    glide: { from: 1600, to: 900 },
    harmonics: 2,
  }), // drop
  N9: concatWav([
    { freqs: [988], durationMs: 100, volume: 0.17 },
    { freqs: [784], durationMs: 160, volume: 0.16, release: 0.1 },
  ]), // doorbell
  N10: wav({ freqs: [440, 554, 659], durationMs: 280, volume: 0.14, attack: 0.02, release: 0.16 }), // soft chord
  N11: concatWav(
    [
      { freqs: [1500], durationMs: 40, volume: 0.16, attack: 0.001, release: 0.02 },
      { freqs: [1500], durationMs: 40, volume: 0.14, attack: 0.001, release: 0.02 },
      { freqs: [1500], durationMs: 70, volume: 0.15, attack: 0.001, release: 0.03 },
    ],
    0.035
  ), // triple tick
  N12: wav({ freqs: [1175], durationMs: 400, volume: 0.12, attack: 0.015, release: 0.25, harmonics: 3 }), // bell long

  // —— Messages ——
  M1: wav({ freqs: [600, 900], durationMs: 90, volume: 0.16, attack: 0.002, release: 0.04 }),
  M2: wav({
    freqs: [],
    durationMs: 140,
    volume: 0.12,
    attack: 0.01,
    release: 0.08,
    glide: { from: 900, to: 420 },
  }),
  M3: concatWav([
    { freqs: [880], durationMs: 80, volume: 0.16 },
    { freqs: [659], durationMs: 110, volume: 0.15 },
  ]),
  M4: wav({ freqs: [1600], durationMs: 45, volume: 0.12, attack: 0.001, release: 0.02 }),
  M5: concatWav([
    { freqs: [1400], durationMs: 50, volume: 0.14 },
    { freqs: [1800], durationMs: 60, volume: 0.12 },
  ]),
  M6: wav({ freqs: [520], durationMs: 70, volume: 0.18, attack: 0.001, release: 0.035 }), // wood knock
  M7: concatWav(
    [
      { freqs: [740], durationMs: 55, volume: 0.15, attack: 0.002, release: 0.03 },
      { freqs: [990], durationMs: 85, volume: 0.14, attack: 0.002, release: 0.05 },
    ],
    0.015
  ), // messenger classic-ish
  M8: wav({
    freqs: [],
    durationMs: 110,
    volume: 0.13,
    attack: 0.004,
    release: 0.06,
    glide: { from: 500, to: 1100 },
  }), // rise
  M9: wav({ freqs: [880, 1320], durationMs: 65, volume: 0.14, attack: 0.001, release: 0.03 }), // water drop
  M10: concatWav(
    [
      { freqs: [1000], durationMs: 35, volume: 0.13, attack: 0.001, release: 0.015 },
      { freqs: [750], durationMs: 55, volume: 0.12, attack: 0.001, release: 0.025 },
    ],
    0.01
  ), // iMessage-ish short
  M11: wav({ freqs: [300, 450], durationMs: 100, volume: 0.15, attack: 0.003, release: 0.05 }), // low thump
  M12: concatWav(
    [
      { freqs: [1200], durationMs: 40, volume: 0.12 },
      { freqs: [900], durationMs: 40, volume: 0.12 },
      { freqs: [1500], durationMs: 50, volume: 0.11 },
    ],
    0.012
  ), // playful
}

for (const [id, buf] of Object.entries(sounds)) {
  fs.writeFileSync(path.join(dir, `${id}.wav`), buf)
}

const notifs = [
  ['N1', 'Ding clair', 'Note brillante type cloche'],
  ['N2', 'Double bip', 'Deux bips rapides'],
  ['N3', 'Chime', '3 notes montantes'],
  ['N4', 'Soft ping', 'Ping doux'],
  ['N5', 'Pop alerte', 'Pop sec type badge'],
  ['N6', 'Glass', 'Accord cristallin'],
  ['N7', 'Marimba', '3 notes type xylo'],
  ['N8', 'Drop', 'Descente rapide'],
  ['N9', 'Doorbell', '2 notes style sonnette'],
  ['N10', 'Soft chord', 'Accord doux prolongé'],
  ['N11', 'Triple tick', '3 ticks secs'],
  ['N12', 'Bell long', 'Cloche plus longue'],
]

const msgs = [
  ['M1', 'Bubble pop', 'Pop de bulle'],
  ['M2', 'Soft whoosh', 'Whoosh léger'],
  ['M3', 'Two-tone', '2 notes descendantes'],
  ['M4', 'Click soft', 'Clic très court'],
  ['M5', 'Chirp', 'Petit gazouillis'],
  ['M6', 'Wood knock', 'Toc bois court'],
  ['M7', 'Messenger-ish', 'Style chat classique'],
  ['M8', 'Rise', 'Montée rapide'],
  ['M9', 'Water drop', 'Goutte'],
  ['M10', 'SMS short', 'Très court type SMS'],
  ['M11', 'Low thump', 'Basse douce'],
  ['M12', 'Playful', '3 notes ludiques'],
]

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Choix des sons — EL MECANO</title>
  <style>
    body { font-family: system-ui, Segoe UI, sans-serif; margin: 0; background: #f4f5f7; color: #111827; }
    .wrap { max-width: 760px; margin: 0 auto; padding: 24px 16px 48px; }
    h1 { font-size: 1.35rem; margin: 0 0 6px; }
    p { color: #6b7280; margin: 0 0 20px; font-size: 0.95rem; }
    h2 { font-size: 0.85rem; text-transform: uppercase; letter-spacing: .06em; color: #6b7280; margin: 28px 0 10px; }
    .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 14px; overflow: hidden; }
    .row { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-top: 1px solid #f3f4f6; }
    .row:first-child { border-top: 0; }
    .code { font-weight: 800; min-width: 2.6rem; color: #ea580c; }
    .meta { flex: 1; min-width: 0; }
    .meta strong { display: block; font-size: 0.95rem; }
    .meta span { font-size: 0.8rem; color: #6b7280; }
    button { border: 0; background: #111827; color: #fff; border-radius: 10px; padding: 8px 12px; font-weight: 700; cursor: pointer; }
    button:hover { background: #ea580c; }
    .pick { margin-top: 20px; padding: 14px; background: #fff7ed; border: 1px solid #fdba74; border-radius: 12px; font-size: 0.9rem; }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>Écoute des sons (liste élargie)</h1>
    <p>12 notifications + 12 messages. Dites-moi ensuite votre choix (ex. <strong>N7 + M10</strong>).</p>
    <h2>Notifications</h2>
    <div class="card" id="notif"></div>
    <h2>Messages</h2>
    <div class="card" id="msg"></div>
    <div class="pick">Répondez dans Cursor avec la combinaison voulue.</div>
  </div>
  <script>
    const notifs = ${JSON.stringify(notifs)};
    const msgs = ${JSON.stringify(msgs)};
    function render(el, list) {
      el.innerHTML = list.map(([id, title, desc]) => \`
        <div class="row">
          <div class="code">\${id}</div>
          <div class="meta"><strong>\${title}</strong><span>\${desc}</span></div>
          <button type="button" data-src="./\${id}.wav">Lecture</button>
        </div>\`).join('');
      el.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          const a = new Audio(btn.dataset.src + '?t=' + Date.now());
          a.play().catch(() => alert('Impossible de lire le son'));
        });
      });
    }
    render(document.getElementById('notif'), notifs);
    render(document.getElementById('msg'), msgs);
  </script>
</body>
</html>
`

fs.writeFileSync(path.join(dir, 'index.html'), html)
console.log(`Wrote ${Object.keys(sounds).length} sounds + preview page`)
