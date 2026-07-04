function gradientStop(index, elapsed) {
  return (Math.sin(elapsed / 1000 + index * 0.8) + 1) / 2;
}

export function startStage(canvas) {
  const context = canvas.getContext("2d");
  const origin = performance.now();
  let rafId = 0;

  function render(now) {
    const elapsed = now - origin;
    const { width, height } = canvas;
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, `hsl(${200 + gradientStop(0, elapsed) * 50} 78% 18%)`);
    gradient.addColorStop(0.5, `hsl(${35 + gradientStop(1, elapsed) * 60} 82% 22%)`);
    gradient.addColorStop(1, `hsl(${110 + gradientStop(2, elapsed) * 30} 76% 18%)`);

    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    for (let column = 0; column < 12; column += 1) {
      const offset = ((elapsed / 14) + column * 60) % (height + 120);
      context.fillStyle = column % 2 === 0 ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.14)";
      context.fillRect(column * 96, offset - 120, 40, 180);
    }

    for (let ring = 0; ring < 5; ring += 1) {
      const x = width * 0.2 + Math.sin(elapsed / (700 + ring * 120)) * (120 + ring * 55);
      const y = height * 0.3 + Math.cos(elapsed / (850 + ring * 150)) * (95 + ring * 45);
      context.beginPath();
      context.lineWidth = 8;
      context.strokeStyle = `hsla(${190 + ring * 34} 100% 70% / 0.36)`;
      context.arc(x + ring * 90, y + ring * 38, 36 + ring * 18, 0, Math.PI * 2);
      context.stroke();
    }

    const tick = Math.floor(elapsed / 100);
    context.fillStyle = "rgba(255,255,255,0.9)";
    context.font = "700 76px Consolas, monospace";
    context.fillText(String(tick).padStart(4, "0"), 48, height - 68);

    context.fillStyle = "rgba(255,255,255,0.75)";
    context.font = "600 24px Segoe UI, sans-serif";
    context.fillText(`elapsed ${Math.floor(elapsed)} ms`, 54, 84);
    context.fillText(`canvas ${width} x ${height}`, 54, 118);

    rafId = requestAnimationFrame(render);
  }

  rafId = requestAnimationFrame(render);

  return () => cancelAnimationFrame(rafId);
}
