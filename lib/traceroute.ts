export type Hop = { line: string };

function r(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function ip() {
  const pick = r(0, 3);
  const o = () => r(1, 254);
  switch (pick) {
    case 0: return `10.${o()}.${o()}.${o()}`;
    case 1: return `192.0.2.${o()}`;
    case 2: return `198.51.100.${o()}`;
    default: return `203.0.113.${o()}`;
  }
}

export function generateTraceroute(destLabel: string) {
  const hops = r(8, 16);
  const timeouts = new Set<number>();
  if (Math.random() < 0.7) {
    const cnt = r(1, 2);
    while (timeouts.size < cnt) timeouts.add(r(2, hops - 1)); // avoid first/last
  }
  let latency = r(5, 20);
  const lines: string[] = [];
  for (let i = 1; i <= hops; i++) {
    if (timeouts.has(i)) {
      lines.push(`HOP ${i}: * * * Request timed out`);
      latency += r(5, 20);
      continue;
    }
    latency = Math.min(200, latency + r(5, 15));
    const ms = latency + r(0, 9);
    lines.push(`HOP ${i}: ${ip()} -> ${ms}ms`);
  }
  lines.push('FINAL HANDSHAKE... OK');
  lines.push('TRACE COMPLETE.');
  return lines;
}
