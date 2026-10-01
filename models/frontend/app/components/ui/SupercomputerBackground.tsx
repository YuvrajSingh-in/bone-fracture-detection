"use client";
import React, { useRef, useEffect } from 'react';

export default function SupercomputerBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;

        // Hex characters for "Data"
        const chars = "0123456789ABCDEF".split("");
        let drops: number[] = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            const columns = canvas.width / 20; // 20px font size
            drops = [];
            for (let i = 0; i < columns; i++) {
                drops[i] = Math.random() * -100; // Start above screen randomly
            }
        };

        const draw = () => {
            // Semi-transparent black to create "trail" effect
            ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = "#0ea5e9"; // Sky-500 (Primary Blue)
            ctx.font = "14px monospace";

            for (let i = 0; i < drops.length; i++) {
                const text = chars[Math.floor(Math.random() * chars.length)];
                ctx.fillText(text, i * 20, drops[i] * 20);

                // Reset drop if it's below screen (randomly)
                if (drops[i] * 20 > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
            animationFrameId = requestAnimationFrame(draw);
        }

        window.addEventListener('resize', resize);
        resize();
        draw();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        }
    }, []);

    return <canvas ref={canvasRef} className="fixed inset-0 -z-10 opacity-20" />;
}
