import React, { useEffect, useRef } from 'react';

export default function LoginBackground3D() {
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

    // 3D Particles / Nodes
    const numParticles = 45;
    const particles = [];
    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: (Math.random() - 0.5) * width * 1.5,
        y: (Math.random() - 0.5) * height * 1.5,
        z: Math.random() * 800 + 100,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        vz: (Math.random() - 0.5) * 0.5,
        radius: Math.random() * 2 + 1.5
      });
    }

    // 3D Wireframe Cubes / Structures representing Industrial Plants
    const structures = [
      { x: -width * 0.3, y: -height * 0.2, z: 400, size: 120, rx: 0, ry: 0, rz: 0 },
      { x: width * 0.32, y: height * 0.15, z: 350, size: 160, rx: 0, ry: 0, rz: 0 },
      { x: -width * 0.1, y: height * 0.35, z: 600, size: 200, rx: 0, ry: 0, rz: 0 }
    ];

    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e) => {
      mouseX = (e.clientX - width / 2) * 0.05;
      mouseY = (e.clientY - height / 2) * 0.05;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const focalLength = 400;

    const project = (x, y, z) => {
      const scale = focalLength / (focalLength + z);
      return {
        x: width / 2 + (x + mouseX) * scale,
        y: height / 2 + (y + mouseY) * scale,
        scale
      };
    };

    let angle = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      angle += 0.005;

      // Draw background 3D grid plane
      ctx.strokeStyle = 'rgba(11, 74, 139, 0.12)';
      ctx.lineWidth = 1;
      const horizonY = height * 0.65;
      for (let i = -width; i < width * 2; i += 80) {
        ctx.beginPath();
        ctx.moveTo(width / 2 + (i - width / 2) * 0.1, horizonY);
        ctx.lineTo(i, height);
        ctx.stroke();
      }
      for (let j = 0; j < 10; j++) {
        const y = horizonY + Math.pow(j / 10, 2) * (height - horizonY);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Update & Draw 3D Particles
      particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;

        if (p.z > 900) p.z = 100;
        if (p.z < 100) p.z = 900;
        if (p.x > width) p.x = -width;
        if (p.x < -width) p.x = width;

        const proj = project(p.x, p.y, p.z);
        const alpha = Math.min(1, Math.max(0.1, 1 - p.z / 900));

        // Draw particle dot
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, p.radius * proj.scale * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = idx % 3 === 0 ? `rgba(217, 119, 6, ${alpha * 0.8})` : `rgba(147, 197, 253, ${alpha * 0.6})`;
        ctx.fill();

        // Connect nearby particles with glowing lines
        for (let j = idx + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dz = p.z - p2.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist < 220) {
            const proj2 = project(p2.x, p2.y, p2.z);
            const lineAlpha = (1 - dist / 220) * alpha * 0.35;
            ctx.beginPath();
            ctx.moveTo(proj.x, proj.y);
            ctx.lineTo(proj2.x, proj2.y);
            ctx.strokeStyle = idx % 2 === 0 ? `rgba(217, 119, 6, ${lineAlpha})` : `rgba(59, 130, 246, ${lineAlpha})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      });

      // Draw Rotating 3D Industrial Structures
      structures.forEach((s, idx) => {
        s.rx += 0.003 * (idx % 2 === 0 ? 1 : -1);
        s.ry += 0.004;

        const half = s.size / 2;
        const vertices = [
          { x: -half, y: -half, z: -half },
          { x: half, y: -half, z: -half },
          { x: half, y: half, z: -half },
          { x: -half, y: half, z: -half },
          { x: -half, y: -half, z: half },
          { x: half, y: -half, z: half },
          { x: half, y: half, z: half },
          { x: -half, y: half, z: half }
        ];

        // Rotate vertices in 3D
        const rotated = vertices.map((v) => {
          // rotate Y
          let x1 = v.x * Math.cos(s.ry) - v.z * Math.sin(s.ry);
          let z1 = v.x * Math.sin(s.ry) + v.z * Math.cos(s.ry);
          // rotate X
          let y2 = v.y * Math.cos(s.rx) - z1 * Math.sin(s.rx);
          let z2 = v.y * Math.sin(s.rx) + z1 * Math.cos(s.rx);

          return project(s.x + x1, s.y + y2, s.z + z2);
        });

        const edges = [
          [0, 1], [1, 2], [2, 3], [3, 0],
          [4, 5], [5, 6], [6, 7], [7, 4],
          [0, 4], [1, 5], [2, 6], [3, 7]
        ];

        ctx.strokeStyle = idx === 0 ? 'rgba(217, 119, 6, 0.25)' : 'rgba(59, 130, 246, 0.25)';
        ctx.lineWidth = 1.5;

        edges.forEach(([start, end]) => {
          ctx.beginPath();
          ctx.moveTo(rotated[start].x, rotated[start].y);
          ctx.lineTo(rotated[end].x, rotated[end].y);
          ctx.stroke();
        });
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
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
        zIndex: 1
      }}
    />
  );
}

