/* Shared mockup background: slow starfield + stardust on the desktop margins. */
(() => {
    const sky = document.getElementById('sky'), ctx = sky.getContext('2d');
    let W, H, stars = [], dust = [], mx = 0, my = 0;
    function resize() {
        const dpr = Math.min(devicePixelRatio, 2); W = innerWidth; H = innerHeight; sky.width = W * dpr; sky.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        stars = [...Array(Math.round(W * H / 5000))].map(() => ({ x: (Math.random() - 0.5) * W * 2, y: (Math.random() - 0.5) * H * 2, z: Math.random() * W, pz: 0 }));
        dust = [];
        if (W <= 880) return;
        const band = Math.max(140, (W - 1200) / 2 + 160), n = Math.round(band * H / 700);
        for (const side of [0, 1]) for (let i = 0; i < n; i++) {
            const d = band * Math.pow(Math.random(), 1.8);
            dust.push({ x: side ? W - d : d, y: Math.random() * H, r: Math.random() < 0.07 ? 1.4 : 0.35 + Math.random() * 0.65, a: 0.12 + Math.random() * 0.6, ph: Math.random() * 6.3, sp: 0.4 + Math.random() * 1.8, gold: Math.random() < 0.12, depth: 0.3 + Math.random() * 0.7 });
        }
    }
    addEventListener('resize', resize); resize();
    addEventListener('pointermove', e => { mx = e.clientX / W - 0.5; my = e.clientY / H - 0.5; });
    (function frame(t = 0) {
        ctx.fillStyle = '#070d1f'; ctx.fillRect(0, 0, W, H);
        for (const p of dust) {
            p.y -= 0.03 * p.depth; if (p.y < -2) p.y = H + 2;
            const a = (p.a * (0.55 + 0.45 * Math.sin(t / 1000 * p.sp + p.ph))).toFixed(3);
            ctx.fillStyle = p.gold ? `rgba(232,180,90,${a})` : `rgba(230,236,255,${a})`;
            ctx.beginPath(); ctx.arc(p.x - mx * 16 * p.depth, p.y - my * 16 * p.depth, p.r, 0, 6.283); ctx.fill();
        }
        for (const s of stars) {
            s.pz = s.z; s.z -= 0.12;
            if (s.z < 1) { s.z = s.pz = W; s.x = (Math.random() - 0.5) * W * 2; s.y = (Math.random() - 0.5) * H * 2; }
            const k = 128 / s.z;
            ctx.fillStyle = `rgba(230,236,255,${Math.min(1, (1 - s.z / W) * 1.4)})`;
            ctx.fillRect(s.x * k + W / 2 - mx * 30 * k, s.y * k + H / 2 - my * 30 * k, Math.max(0.8, (1 - s.z / W) * 2), Math.max(0.8, (1 - s.z / W) * 2));
        }
        requestAnimationFrame(frame);
    })();
})();
