"use client";
import React, { useEffect } from "react";
import Lenis from "lenis";
import MultiModeAnalysis from "../components/MultiModeAnalysis";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AnalysisPage() {

    // Initialize Smooth Scrolling (Lenis) for this page too
    useEffect(() => {
        const lenis = new Lenis();

        function raf(time: number) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }

        requestAnimationFrame(raf);
        return () => { lenis.destroy() };
    }, []);

    return (
        <main className="bg-[#090D16] text-[#F1F5F9] selection:bg-blue-600/20 selection:text-blue-400 flex flex-col">
            {/* Navigation / Header */}
            <header className="h-16 md:h-20 shrink-0 px-4 md:px-6 flex items-center justify-between border-b border-slate-800/80 bg-[#090D16]/80 backdrop-blur-md z-50 sticky top-0">
                <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-blue-400 transition-colors text-sm md:text-base group">
                    <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="hidden md:inline font-medium">Back to Home</span>
                    <span className="md:hidden font-medium">Back</span>
                </Link>
                <div className="font-bold text-lg md:text-xl text-white tracking-tight">
                    Fracture<span className="text-blue-500">AI</span>
                </div>
            </header>

            {/* The Dashboard Component */}
            <div className="flex-1 w-full max-w-[1920px] mx-auto">
                <MultiModeAnalysis />
            </div>
        </main>
    );
}
