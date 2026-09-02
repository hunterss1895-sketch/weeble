'use client';

/** Simple QR-like visual using a deterministic SVG pattern from the payload. Demo only. */
export function QrDisplay({ payload, size = 180 }: { payload: string; size?: number }) {
  const cells = 21;
  const cell = size / cells;
  const bits: boolean[] = [];
  let h = 0;
  for (let i = 0; i < payload.length; i++) h = (h * 31 + payload.charCodeAt(i)) >>> 0;
  for (let i = 0; i < cells * cells; i++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    bits.push((h & 1) === 1);
  }
  // finder patterns
  const setBlock = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y++)
      for (let x = 0; x < 7; x++) {
        const edge = x === 0 || y === 0 || x === 6 || y === 6;
        const center = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        bits[(oy + y) * cells + (ox + x)] = edge || center;
      }
  };
  setBlock(0, 0);
  setBlock(cells - 7, 0);
  setBlock(0, cells - 7);

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <svg width={size} height={size} className="rounded-lg border border-slate-200 bg-white p-2">
        {bits.map((on, i) => {
          if (!on) return null;
          const x = (i % cells) * cell;
          const y = Math.floor(i / cells) * cell;
          return <rect key={i} x={x} y={y} width={cell} height={cell} fill="#0f172a" />;
        })}
      </svg>
      <p className="max-w-[200px] break-all text-center font-mono text-[10px] text-slate-400">{payload}</p>
    </div>
  );
}
