import React, { useEffect, useRef } from 'react';

export default function IndianFlagBackground3D() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.012; // Slow, majestic wave motion

      // Smooth wave function for any X coordinate
      const getWaveY = (x, baseY) => {
        const wave1 = Math.sin(x * 0.003 - time) * 22;
        const wave2 = Math.sin(x * 0.006 + time * 0.7) * 12;
        return baseY + wave1 + wave2;
      };

      const bandHeight = height / 3;

      // --- 1. SAFFRON BAND (TOP) ---
      const saffGrad = ctx.createLinearGradient(0, 0, 0, bandHeight);
      saffGrad.addColorStop(0, '#FF9933');
      saffGrad.addColorStop(1, '#FF7700');
      ctx.fillStyle = saffGrad;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let x = 0; x <= width; x += 10) {
        ctx.lineTo(x, getWaveY(x, bandHeight));
      }
      ctx.lineTo(width, 0);
      ctx.closePath();
      ctx.fill();

      // --- 2. WHITE BAND (MIDDLE) ---
      const whiteGrad = ctx.createLinearGradient(0, bandHeight, 0, bandHeight * 2);
      whiteGrad.addColorStop(0, '#FFFFFF');
      whiteGrad.addColorStop(1, '#F2F2F2');
      ctx.fillStyle = whiteGrad;

      ctx.beginPath();
      for (let x = 0; x <= width; x += 10) {
        if (x === 0) ctx.moveTo(x, getWaveY(x, bandHeight));
        else ctx.lineTo(x, getWaveY(x, bandHeight));
      }
      for (let x = width; x >= 0; x -= 10) {
        ctx.lineTo(x, getWaveY(x, bandHeight * 2));
      }
      ctx.closePath();
      ctx.fill();

      // --- 3. INDIA GREEN BAND (BOTTOM) ---
      const greenGrad = ctx.createLinearGradient(0, bandHeight * 2, 0, height);
      greenGrad.addColorStop(0, '#138808');
      greenGrad.addColorStop(1, '#0B5E05');
      ctx.fillStyle = greenGrad;

      ctx.beginPath();
      for (let x = 0; x <= width; x += 10) {
        if (x === 0) ctx.moveTo(x, getWaveY(x, bandHeight * 2));
        else ctx.lineTo(x, getWaveY(x, bandHeight * 2));
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();

      // --- 4. WAVE LIGHTING / SHADING OVERLAY ---
      ctx.save();
      for (let x = 0; x < width; x += 15) {
        const slope = Math.cos(x * 0.003 - time);
        const shade = slope * 0.12; // subtle lighting highlights & shadows
        if (shade > 0) {
          ctx.fillStyle = `rgba(255, 255, 255, ${shade})`;
        } else {
          ctx.fillStyle = `rgba(0, 0, 0, ${Math.abs(shade)})`;
        }
        ctx.fillRect(x, 0, 15, height);
      }
      ctx.restore();

      // --- 5. ASHOKA CHAKRA (CENTER OF WHITE BAND) ---
      const centerX = width / 2;
      const centerY = getWaveY(centerX, bandHeight * 1.5);
      const radius = Math.min(width, height) * 0.11;

      ctx.save();
      ctx.translate(centerX, centerY);

      // Outer Ring
      ctx.strokeStyle = '#000080'; // Navy Blue
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner Hub
      ctx.fillStyle = '#000080';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.16, 0, Math.PI * 2);
      ctx.fill();

      // 24 Spokes
      ctx.lineWidth = 2;
      for (let i = 0; i < 24; i++) {
        const angle = (i * Math.PI) / 12 + time * 0.05; // slow spin
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        ctx.stroke();
      }
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
        opacity: 0.85
      }}
    />
  );
}

