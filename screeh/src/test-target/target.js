const canvas = document.getElementById("target-canvas");
const context = canvas.getContext("2d");
const start = performance.now();

function render(now) {
  const elapsed = now - start;
  const { width, height } = canvas;

  context.fillStyle = "#061017";
  context.fillRect(0, 0, width, height);

  const stripeWidth = 48;
  for (let index = -2; index < width / stripeWidth + 4; index += 1) {
    const x = ((index * stripeWidth + elapsed / 12) % (width + stripeWidth)) - stripeWidth;
    context.fillStyle = index % 2 === 0 ? "#55d6ff" : "#ffb347";
    context.fillRect(x, 0, stripeWidth * 0.62, height);
  }

  const pulse = (Math.sin(elapsed / 220) + 1) / 2;
  context.fillStyle = `rgba(183, 255, 104, ${0.35 + pulse * 0.45})`;
  context.beginPath();
  context.arc(width * 0.65, height * 0.5, 80 + pulse * 45, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "rgba(6, 16, 23, 0.72)";
  context.fillRect(44, height - 132, 392, 88);
  context.fillStyle = "#ffffff";
  context.font = "800 42px Consolas, monospace";
  context.fillText(`TICK ${Math.floor(elapsed / 100)}`, 66, height - 76);

  requestAnimationFrame(render);
}

requestAnimationFrame(render);
