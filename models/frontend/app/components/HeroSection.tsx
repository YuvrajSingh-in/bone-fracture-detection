"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowDown } from "lucide-react";

export default function HeroSection() {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end start"],
    });

    const yText = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
    const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

    return (
        <section ref={ref} className="h-[100dvh] relative flex items-center justify-center overflow-hidden">
            {/* Background Elements */}
            <div className="absolute inset-0 z-0 text-center">
                <div className="absolute top-1/4 left-1/4 w-[60vw] max-w-96 h-[60vw] max-h-96 bg-primary/20 rounded-full blur-[80px] md:blur-[100px] animate-pulse -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-1/4 right-1/4 w-[60vw] max-w-96 h-[60vw] max-h-96 bg-secondary/10 rounded-full blur-[80px] md:blur-[120px] translate-x-1/4 translate-y-1/4" />
            </div>

            <motion.div
                style={{ y: yText, opacity }}
                className="relative z-10 text-center px-4 md:px-6 max-w-5xl mx-auto w-full"
            >
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="mb-6 flex items-center justify-center gap-3"
                >
                    <span className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[10px] md:text-xs tracking-widest uppercase text-gray-400 backdrop-blur-sm">
                        Next Gen Diagnostics
                    </span>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className="text-5xl md:text-8xl lg:text-9xl font-bold tracking-tighter mb-6 md:mb-8"
                >
                    Fracture<span className="text-primary">AI</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="text-lg md:text-2xl text-gray-400 max-w-2xl mx-auto leading-relaxed px-4"
                >
                    Precision mechanics meets biological insight.<br className="hidden md:block" />
                    The future of orthopedic imaging analysis is here.
                </motion.p>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.8 }}
                    className="mt-8 md:mt-12"
                >
                    <a href="/analysis" className="px-8 py-3 rounded-full border border-white/20 hover:bg-white/10 transition-colors text-xs md:text-sm uppercase tracking-widest backdrop-blur-md">
                        Launch App
                    </a>
                </motion.div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5, duration: 1 }}
                className="absolute bottom-6 md:bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-500"
            >
                <span className="text-[10px] md:text-xs uppercase tracking-widest">Scroll</span>
                <ArrowDown className="animate-bounce w-4 h-4 md:w-5 md:h-5 text-primary" />
            </motion.div>
        </section>
    );
}
