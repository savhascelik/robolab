/**
 * Dynamically generates subtle technical PCB circuit traces and solder pads
 * in the background SVG (#traces), matching the aesthetic of learn-arduino-red.vercel.app.
 */
export function buildTraces(svgEl) {
  if (!svgEl) return;
  const NS = 'http://www.w3.org/2000/svg';

  function render() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    svgEl.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svgEl.innerHTML = '';

    const g = document.createElementNS(NS, 'g');
    g.setAttribute('fill', 'none');
    g.setAttribute('stroke', 'currentColor');
    g.setAttribute('stroke-width', '1.2');

    // Top framing rail + angled circuit traces
    const paths = [
      `M 68 ${h - 14} L 68 78 L 88 58 L ${Math.round(w * 0.38)} 58 L ${Math.round(w * 0.38) + 18} 40`,
      `M ${Math.round(w * 0.41)} 58 L ${Math.round(w * 0.43)} 38 L ${Math.round(w * 0.56)} 38`,
      `M ${Math.round(w * 0.68)} 48 L ${Math.round(w * 0.70)} 28 L ${Math.round(w * 0.74)} 28`,
      `M 68 ${Math.round(h * 0.42)} L 90 ${Math.round(h * 0.42)} L 104 ${Math.round(h * 0.42) - 14} L 104 ${Math.round(h * 0.33)}`,
      `M 68 ${Math.round(h * 0.48)} L 82 ${Math.round(h * 0.48)} L 94 ${Math.round(h * 0.48) + 12} L 94 ${Math.round(h * 0.56)}`,
      `M ${w - 418} 78 L ${w - 404} 64 L ${w - 22} 64`,
      `M ${w - 412} ${h - 134} L ${w - 18} ${h - 134}`
    ];

    const pads = [
      [Math.round(w * 0.38) + 18, 40],
      [Math.round(w * 0.41), 58],
      [Math.round(w * 0.56), 38],
      [Math.round(w * 0.68), 48],
      [Math.round(w * 0.74), 28],
      [104, Math.round(h * 0.33)],
      [94, Math.round(h * 0.56)]
    ];

    for (const d of paths) {
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', d);
      g.appendChild(p);
    }

    for (const [cx, cy] of pads) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', String(cx));
      c.setAttribute('cy', String(cy));
      c.setAttribute('r', '4');
      c.setAttribute('fill', '#f6eddd');
      g.appendChild(c);
    }

    // Pixel cluster decorative squares near top center
    const clusters = [
      [Math.round(w * 0.49), 22, 7],
      [Math.round(w * 0.57), 12, 6],
      [Math.round(w * 0.578), 18, 6],
      [Math.round(w * 0.562), 20, 5]
    ];
    for (const [x, y, s] of clusters) {
      const r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', String(x));
      r.setAttribute('y', String(y));
      r.setAttribute('width', String(s));
      r.setAttribute('height', String(s));
      r.setAttribute('fill', 'currentColor');
      r.setAttribute('stroke', 'none');
      r.setAttribute('opacity', '0.55');
      g.appendChild(r);
    }

    svgEl.appendChild(g);
  }

  render();
  window.addEventListener('resize', render);
}
