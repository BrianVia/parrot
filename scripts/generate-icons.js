const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'resources', 'icons');

// Ensure directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create tray icon (16x16 for Linux, 22x22 for some DEs)
function createTrayIcon(filename, color, size = 16) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Draw circle
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  // Add subtle border
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(iconsDir, filename), buffer);
  console.log(`Created ${filename}`);
}

// Create app icon (256x256)
function createAppIcon(filename, size = 256) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background circle
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#10B981');
  gradient.addColorStop(1, '#059669');
  ctx.fillStyle = gradient;
  ctx.fill();

  // Parrot beak shape (simplified)
  ctx.beginPath();
  ctx.moveTo(size * 0.55, size * 0.35);
  ctx.quadraticCurveTo(size * 0.8, size * 0.45, size * 0.7, size * 0.55);
  ctx.quadraticCurveTo(size * 0.6, size * 0.5, size * 0.55, size * 0.45);
  ctx.fillStyle = '#FCD34D';
  ctx.fill();

  // Eye
  ctx.beginPath();
  ctx.arc(size * 0.45, size * 0.4, size * 0.05, 0, Math.PI * 2);
  ctx.fillStyle = '#1F2937';
  ctx.fill();

  // Sound waves
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = size * 0.02;
  ctx.lineCap = 'round';

  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.arc(size * 0.65, size * 0.5, size * 0.1 * i, -Math.PI * 0.3, Math.PI * 0.3);
    ctx.stroke();
  }

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(iconsDir, filename), buffer);
  console.log(`Created ${filename}`);
}

// Generate all icons
createTrayIcon('tray-idle.png', '#10B981', 16);
createTrayIcon('tray-idle@2x.png', '#10B981', 32);
createTrayIcon('tray-recording.png', '#EF4444', 16);
createTrayIcon('tray-recording@2x.png', '#EF4444', 32);

// App icons in various sizes for Linux
const iconSizes = [16, 32, 48, 64, 128, 256, 512];
for (const size of iconSizes) {
  createAppIcon(`${size}x${size}.png`, size);
}
createAppIcon('icon.png', 256);

console.log('All icons generated!');
