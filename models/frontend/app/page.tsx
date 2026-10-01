"use client";
import React, { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import HeroSection from "./components/HeroSection";
import ProblemSection from "./components/ProblemSection";
import { motion, MotionValue, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Brain, Activity, ShieldCheck, Zap, Layers } from "lucide-react";

export default function Home() {

  // Initialize Smooth Scrolling (Lenis)
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
    <main className="bg-black text-white selection:bg-primary selection:text-black">
      {/* Progress Bar */}
      <ProgressBar />

      {/* Sections */}
      <HeroSection />
      <ProblemSection />
      <WorkflowTeaser />
      <FeaturesSection />
      <TechSpecsSection />

      {/* CTA Section */}
      <section className="h-[40vh] md:h-[50vh] flex items-center justify-center bg-gradient-to-t from-primary/10 to-transparent px-4">
        <div className="text-center space-y-4 md:space-y-6">
          <h2 className="text-3xl md:text-6xl font-bold">Ready to Diagnose?</h2>
          <Link href="/analysis" className="inline-flex items-center gap-2 md:gap-3 px-6 md:px-8 py-3 md:py-4 bg-primary text-black rounded-full font-bold text-lg md:text-xl hover:scale-105 transition-transform">
            Launch Platform <ArrowRight className="w-5 h-5 md:w-6 md:h-6" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 md:py-12 text-center text-gray-600 text-xs md:text-sm border-t border-white/5">
        <p>FRACTURE AI / v1.0.0 / 2026</p>
      </footer>
    </main>
  );
}

function ProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <motion.div
      style={{ scaleX }}
      className="fixed top-0 left-0 right-0 h-1 bg-primary origin-left z-50 mix-blend-difference"
    />
  )
}

function WorkflowTeaser() {
  return (
    <section className="py-20 md:py-32 bg-white/5 border-y border-white/5">
      <div className="container mx-auto px-6 text-center">
        <p className="font-mono text-primary mb-6 md:mb-8 text-sm md:text-base">SYSTEM ARCHITECTURE</p>
        <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-16 opacity-80">
          <Step title="Ingest" desc="High-Res DICOM/JPG" />
          <div className="w-px h-8 md:w-px md:h-16 bg-white/20 rotate-90 md:rotate-0" />
          <Step title="Process" desc="Deep Learning Inference" />
          <div className="w-px h-8 md:w-px md:h-16 bg-white/20 rotate-90 md:rotate-0" />
          <Step title="Visualize" desc="Heatmap & Confidence" />
        </div>
      </div>
    </section>
  )
}

function Step({ title, desc }: { title: string, desc: string }) {
  return (
    <div>
      <h3 className="text-2xl md:text-3xl font-bold mb-1 md:mb-2">{title}</h3>
      <p className="text-gray-400 text-xs md:text-sm">{desc}</p>
    </div>
  )
}

function FeaturesSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const features = [
    {
      title: "AI-Assisted Precision",
      desc: "Augmenting radiologist expertise with deep-learning classification to identify subtle fractures that might be missed by the human eye.",
      icon: <Brain className="w-full h-full text-primary" />,
      stat: "99.2% Sensitivity"
    },
    {
      title: "Instant Triage",
      desc: "Sub-second inference allows for rapid emergency room prioritization, ensuring critical cases are flagged immediately.",
      icon: <Zap className="w-full h-full text-yellow-400" />,
      stat: "<120ms Latency"
    },
    {
      title: "Private & Secure",
      desc: "Local-first processing ensures zero data egress. Patient data never leaves the facility, ensuring full HIPAA compliance.",
      icon: <ShieldCheck className="w-full h-full text-emerald-400" />,
      stat: "On-Premises"
    },
    {
      title: "Clinical Workflow",
      desc: "Seamless Integration into existing DICOM/PACS infrastructure. No new hardware required.",
      icon: <Layers className="w-full h-full text-blue-400" />,
      stat: "Universal API"
    },
  ];

  return (
    <section ref={containerRef} className="relative h-[450vh] md:h-[500vh] bg-black">

      {/* Sticky Scroll Animation (Unified for Mobile & Desktop) */}
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center overflow-hidden">

        {/* Ambient Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-black to-black opacity-50" />

        <div className="relative z-10 text-center mb-8 md:mb-12 px-4">
          <h2 className="text-xs md:text-sm font-mono text-primary tracking-[0.5em] mb-2 md:mb-4 uppercase">System Capabilities</h2>
          <h3 className="text-3xl md:text-6xl font-bold text-white">Diagnostic Intelligence</h3>
        </div>

        <div className="relative w-full max-w-4xl h-[400px] md:h-[500px] flex items-center justify-center px-4">
          {features.map((f, i) => {
            // Calculate scroll range for this specific card
            const rangeStart = i * 0.25;
            const rangeEnd = rangeStart + 0.25;

            return (
              <FeatureCard
                key={i}
                feature={f}
                progress={scrollYProgress}
                range={[rangeStart, rangeEnd]}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

type Feature = {
  title: string;
  desc: string;
  icon: React.ReactNode;
  stat: string;
};

function FeatureCard({ feature, progress, range }: { feature: Feature; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, [range[0], range[0] + 0.1, range[1] - 0.1, range[1]], [0, 1, 1, 0]);
  const scale = useTransform(progress, [range[0], range[0] + 0.1, range[1]], [0.8, 1, 1.1]);
  const y = useTransform(progress, [range[0], range[0] + 0.1, range[1]], [50, 0, -50]);
  const blur = useTransform(progress, [range[1] - 0.1, range[1]], [0, 10]);

  return (
    <motion.div
      style={{ opacity, scale, y, filter: blur ? `blur(${blur}px)` : "none", pointerEvents: "none" }}
      className="absolute inset-0 flex items-center justify-center p-0 md:p-6"
    >
      <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-6 md:p-12 rounded-3xl max-w-2xl w-full shadow-2xl relative overflow-hidden group mx-4 md:mx-0">
        {/* Glow Effect */}
        <div className="absolute top-0 right-0 p-40 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-12 text-center md:text-left">
          <div className="w-24 h-24 md:w-40 md:h-40 shrink-0 relative bg-white/5 rounded-2xl p-6 md:p-8 border border-white/5 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center justify-center">
            {feature.icon}
          </div>
          <div className="">
            <div className="text-[10px] md:text-xs font-mono text-gray-500 mb-2 uppercase tracking-wider">{feature.stat}</div>
            <h4 className="text-2xl md:text-3xl font-bold mb-2 md:mb-4">{feature.title}</h4>
            <p className="text-gray-400 text-sm md:text-lg leading-relaxed">{feature.desc}</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function TechSpecsSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [scrollDist, setScrollDist] = useState(0);
  const [containerHeight, setContainerHeight] = useState("100vh"); // Initial safe height

  // Dynamic Scroll Calculation & Mobile Check
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768; // Tailwind md breakpoint

      if (trackRef.current) {
        const trackWidth = trackRef.current.scrollWidth;
        const windowWidth = window.innerWidth;
        const distance = trackWidth - windowWidth;
        const safeDistance = Math.max(0, distance);
        setScrollDist(safeDistance);

        // Use faster pacing on mobile (scrolling feels slower on touch, so we need less distance)
        const pacingFactor = mobile ? 3.5 : 3.0;

        setContainerHeight(`${safeDistance * pacingFactor + window.innerHeight}px`);
      }
    };

    handleResize(); // Initial call

    // Slight delay to ensure DOM is fully rendered before measuring
    const timer = setTimeout(handleResize, 100);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    }
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Map vertical progress to exact horizontal pixel distance
  const x = useTransform(scrollYProgress, [0, 1], ["0px", `-${scrollDist}px`]);

  const models = [
    {
      id: "cnn",
      name: "EfficientNetB3",
      specs: [
        { label: "Training Images", value: "11,778" },
        { label: "Input Resolution", value: "224 x 224" },
        { label: "Architecture", value: "EfficientNetB3" },
        { label: "Test Accuracy", value: "95.7%" },
        { label: "Target", value: "Cloud / Local GPU" },
      ],
      desc: "Binary classification (Fracture / Normal).",
      dataset: "Composite X-ray archive",
      color: "text-primary"
    },
    {
      id: "mobilenet",
      name: "MobileNetV2",
      specs: [
        { label: "Training Images", value: "11,778" },
        { label: "Input Resolution", value: "224 x 224" },
        { label: "Architecture", value: "MobileNetV2" },
        { label: "Test Accuracy", value: "76.8%" },
        { label: "Target", value: "Edge / Mobile" },
      ],
      desc: "Lightweight baseline for edge & mobile inference.",
      dataset: "Composite X-ray archive",
      color: "text-yellow-400"
    },
    {
      id: "cnn_advance",
      name: "DenseNet121",
      specs: [
        { label: "Training Images", value: "11,778" },
        { label: "Input Resolution", value: "224 x 224" },
        { label: "Architecture", value: "DenseNet121" },
        { label: "Test Accuracy", value: "93.3%" },
        { label: "Target", value: "High Precision Classification" },
      ],
      desc: "High-accuracy transfer-learning classifier.",
      dataset: "Composite X-ray archive",
      color: "text-orange-500"
    },
  ];

  return (
    <section ref={containerRef} style={{ height: containerHeight }} className="relative bg-black border-t border-white/5">

      {/* Sticky Scroll Animation (Unified for Mobile & Desktop) */}
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">

        {/* Ambient Dark Gradient Overlay to match site theme */}
        <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/50 z-10 pointer-events-none" />

        {/* Header Overlay - Always visible */}
        <div className="absolute top-6 left-6 md:top-10 md:left-10 z-20">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-xs font-mono text-primary tracking-widest uppercase">Model Registry</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white">Technical Specifications</h2>
        </div>

        {/* Horizontal Track */}
        <motion.div ref={trackRef} style={{ x }} className="flex w-max will-change-transform">
          {models.map((model, i) => (
            <div key={model.id} className="w-screen h-screen flex-shrink-0 flex items-center justify-center p-4 md:p-24 relative overflow-hidden border-r border-white/5">

              {/* Background Grid */}
              <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div className={`absolute inset-0 bg-[linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] bg-[size:40px_40px] ${model.color}`} />
              </div>

              <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 relative z-10 pt-20 md:pt-0">

                {/* Left: Specs */}
                <div className="flex flex-col justify-center text-center md:text-left">
                  <div className={`hidden md:block text-6xl md:text-8xl font-black mb-4 opacity-75 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] ${model.color}`}>0{i + 1}</div>
                  <h3 className="text-2xl md:text-5xl font-bold mb-2">{model.name}</h3>
                  <p className="text-sm md:text-xl text-gray-400 mb-6 md:mb-8">{model.desc}</p>

                  <div className="space-y-3 md:space-y-4 font-mono text-xs md:text-sm bg-black/40 p-4 md:p-6 rounded-xl border border-white/10 backdrop-blur-sm text-left">
                    {model.specs.map((spec, j) => (
                      <div key={j} className="flex justify-between items-center border-b border-white/10 pb-2 last:border-0 last:pb-0">
                        <span className="text-gray-400 uppercase tracking-wider">{spec.label}</span>
                        <span className={`font-bold ${model.color}`}>{spec.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Visual */}
                <div className="hidden md:flex relative h-[300px] md:h-auto bg-black/60 rounded-2xl border border-white/10 items-center justify-center overflow-hidden group">
                  {/* Dynamic Visual placeholder */}
                  <div className={`absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity bg-gradient-to-br from-white to-transparent`} />

                  <div className="text-center">
                    <div className={`text-6xl font-bold mb-2 ${model.color}`}>{model.specs[0].value}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-[0.2em]">Training Samples</div>

                    <div className="mt-8 flex justify-center gap-4">
                      <div className="px-4 py-1 rounded-full border border-white/20 text-xs text-gray-400">{model.dataset}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
