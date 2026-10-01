"use client";
import React from 'react';

export default function HolographicBorder({ children, className = "" }: { children: React.ReactNode, className?: string }) {
    return (
        <div className={`relative group ${className}`}>
            {/* Technical Static Border with Corners */}
            <div className="absolute inset-0 rounded-xl border border-primary/20 bg-black/40" />

            {/* Glowing Corners */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl-xl shadow-[0_0_10px_var(--primary)]" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr-xl shadow-[0_0_10px_var(--primary)]" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl-xl shadow-[0_0_10px_var(--primary)]" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br-xl shadow-[0_0_10px_var(--primary)]" />

            {/* Content Container */}
            <div className="relative h-full bg-black/20 backdrop-blur-sm rounded-xl overflow-hidden">
                {children}

                {/* Subtle "Supercomputer" Hum/Pulse Overlay */}
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none mix-blend-overlay" />
            </div>
        </div>
    );
}
