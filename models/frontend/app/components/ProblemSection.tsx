"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export default function ProblemSection() {
    const containerRef = useRef(null);

    // Create a scroll sequence
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"],
    });

    // Parallax effects
    const xLeft = useTransform(scrollYProgress, [0, 1], [-100, 100]);
    const xRight = useTransform(scrollYProgress, [0, 1], [100, -100]);

    return (
        <section ref={containerRef} className="min-h-screen flex flex-col justify-center relative overflow-hidden py-20 md:py-32">
            <div className="container mx-auto px-4 md:px-6 relative z-10">

                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">

                    {/* Story Text */}
                    <div className="space-y-8 md:space-y-12 order-2 md:order-1">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="text-3xl md:text-6xl font-bold mb-4 md:mb-6">The Hidden Cost of <span className="text-red-500">Missed</span> Diagnoses.</h2>
                            <p className="text-lg md:text-xl text-gray-400 leading-relaxed">
                                In the rush of emergency rooms, subtle fractures are often overlooked.
                                Millions of misdiagnoses occur annually, leading to improper healing and chronic pain.
                            </p>
                        </motion.div>

                        <div className="grid grid-cols-2 gap-4 md:gap-8">
                            <Stat number="15%" label="Missed Fractures" />
                            <Stat number="24/7" label="Radiologist Fatigue" />
                        </div>
                    </div>

                    {/* Visual Metaphor */}
                    <div className="order-1 md:order-2 relative h-[400px] md:h-[600px] w-full bg-slate-900 rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
                        {/* Simulated X-Ray Noise */}
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>

                        {/* Floating Elements */}
                        <motion.div
                            style={{ x: xRight }}
                            className="absolute top-10 md:top-20 right-4 md:right-10 p-4 md:p-6 bg-red-500/10 border border-red-500/50 backdrop-blur-md rounded-xl max-w-[200px] md:max-w-xs"
                        >
                            <div className="text-red-400 font-mono text-xs md:text-sm mb-2">⚠ ERROR DETECTED</div>
                            <div className="text-white text-sm md:text-lg">Hairline Fracture ignored in initial scan.</div>
                        </motion.div>

                        <motion.div
                            style={{ x: xLeft }}
                            className="absolute bottom-20 md:bottom-40 left-4 md:left-10 p-4 md:p-6 bg-gray-800/80 border border-white/10 backdrop-blur-md rounded-xl max-w-[200px] md:max-w-xs"
                        >
                            <div className="text-gray-400 font-mono text-xs md:text-sm mb-2">STATUS</div>
                            <div className="text-white text-sm md:text-lg">Patient discharged prematurely.</div>
                        </motion.div>
                    </div>

                </div>

            </div>
        </section>
    );
}

function Stat({ number, label }: { number: string; label: string }) {
    return (
        <div className="border-l-2 border-primary/50 pl-6">
            <h3 className="text-5xl font-bold text-white mb-1">{number}</h3>
            <p className="text-gray-500 uppercase text-sm tracking-wider">{label}</p>
        </div>
    );
}
