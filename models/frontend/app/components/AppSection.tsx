"use client";
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { Upload, X, Loader2, Brain, AlertTriangle, CheckCircle2, Cpu, Sparkles, Target, TrendingUp, Database, BarChart3, Eye, Maximize2, Clock } from "lucide-react";

const MODELS = [
    { id: "bone_fracture_cnn", name: "EfficientNetB3", type: "Classification", icon: Brain, color: "from-emerald-500 to-teal-500" },
    { id: "bone_fracture_mobilenet", name: "MobileNetV2", type: "Classification", icon: Cpu, color: "from-rose-500 to-red-500" },
    { id: "cnn_advance", name: "DenseNet121", type: "Classification", icon: Sparkles, color: "from-primary to-blue-500" },
];

type DiagnosticResult = {
    model_id: string;
    prediction: string | null;
    confidence: number;
    processed_image_base64?: string | null;
    success: boolean;
    error?: string | null;
    inference_time?: number;
};

type PredictAllResponse = {
    results: DiagnosticResult[];
};

export default function AppSection() {
    const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [result, setResult] = useState<DiagnosticResult | null>(null);
    const [allResults, setAllResults] = useState<DiagnosticResult[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scanProgress, setScanProgress] = useState(0);
    const [mounted, setMounted] = useState(false);
    const [showComparisonModal, setShowComparisonModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailModelResult, setDetailModelResult] = useState<DiagnosticResult | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    useEffect(() => {
        setMounted(true);
        const handleMouseMove = (e: MouseEvent) => {
            mouseX.set(e.clientX);
            mouseY.set(e.clientY);
        };
        window.addEventListener("mousemove", handleMouseMove);
        return () => window.removeEventListener("mousemove", handleMouseMove);
    }, []);

    // Prevent body scroll when modals are open
    useEffect(() => {
        if (showComparisonModal || showDetailModal) {
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';
        } else {
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY || '0') * -1);
            }
        }
        return () => {
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
        };
    }, [showComparisonModal, showDetailModal]);

    useEffect(() => {
        if (loading) {
            const interval = setInterval(() => {
                setScanProgress(prev => {
                    if (prev >= 95) return prev;
                    return prev + Math.random() * 10;
                });
            }, 200);
            return () => clearInterval(interval);
        } else {
            setScanProgress(0);
        }
    }, [loading]);

    const handleFile = (selectedFile: File) => {
        setFile(selectedFile);
        setPreview(URL.createObjectURL(selectedFile));
        setResult(null);
        setAllResults(null);
        setError(null);
        setShowComparisonModal(false);
        setShowDetailModal(false);
    };

    const runPrediction = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append("file", file);

        const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";


        try {
            if (API_URL.includes("localhost")) await new Promise(r => setTimeout(r, 2000));

            const allResponse = await fetch(`${API_URL}/predict-all`, {
                method: "POST",
                body: formData,
            });

            if (!allResponse.ok) {
                const errText = await allResponse.text();
                throw new Error(`Server responded with ${allResponse.status}: ${errText}`);
            }

            const allData = (await allResponse.json()) as PredictAllResponse;
            setAllResults(allData.results);

            const selectedResult = allData.results.find((r) => r.model_id === selectedModel);
            if (selectedResult && selectedResult.success) {
                setResult(selectedResult);
            } else {
                throw new Error(selectedResult?.error || "Selected model failed");
            }

            setScanProgress(100);
            await new Promise(r => setTimeout(r, 300));
        } catch (e: unknown) {
            console.error("Prediction Failed:", e);
            setError(e instanceof Error ? e.message : "Connection failed. Ensure backend is running.");
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setFile(null);
        setPreview(null);
        setResult(null);
        setAllResults(null);
        setError(null);
        setScanProgress(0);
        setShowComparisonModal(false);
        setShowDetailModal(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const selectedModelData = MODELS.find(m => m.id === selectedModel);
    const getConsensus = () => {
        if (!allResults) return null;
        const successful = allResults.filter(r => r.success);
        if (successful.length === 0) {
            return {
                total: 0,
                fracture: 0,
                normal: 0,
                agreement: 0
            };
        }
        const fractureCount = successful.filter(r => (r.prediction || "").toLowerCase().includes("fracture")).length;
        const normalCount = successful.length - fractureCount;
        return {
            total: successful.length,
            fracture: fractureCount,
            normal: normalCount,
            agreement: Math.max(fractureCount, normalCount) / successful.length
        };
    };

    const consensus = getConsensus();

    const openDetailModal = (modelResult: DiagnosticResult) => {
        setDetailModelResult(modelResult);
        setShowDetailModal(true);
    };

    const isFracture = (result?.prediction || "").toLowerCase().includes("fracture");

    return (
        <section className="relative w-full min-h-[calc(100vh-80px)] bg-black overflow-hidden">

            {/* Dynamic Background */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-black to-black" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(56,189,248,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.03)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]" />

            {/* Floating Particles */}
            {mounted && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(15)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-1 h-1 bg-primary/20 rounded-full"
                            initial={{
                                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
                                y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
                                scale: Math.random() * 0.5 + 0.5
                            }}
                            animate={{
                                y: [null, Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080)],
                                opacity: [0, 1, 0],
                            }}
                            transition={{
                                duration: Math.random() * 10 + 10,
                                repeat: Infinity,
                                ease: "linear"
                            }}
                        />
                    ))}
                </div>
            )}

            <div className="relative max-w-[1800px] mx-auto px-4 py-6 lg:p-10">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 lg:mb-10"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <motion.div
                            className="w-2 h-2 rounded-full bg-primary"
                            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                        />
                        <div className="h-px w-16 bg-gradient-to-r from-primary to-transparent" />
                        <span className="text-xs font-mono text-primary/70 tracking-[0.3em] uppercase">Neural Diagnostic Suite</span>
                    </div>
                    <h1 className="text-3xl lg:text-5xl font-black text-white tracking-tight">
                        Medical AI Analysis
                    </h1>
                </motion.div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6 lg:gap-8">

                    {/* LEFT: Viewport & Results */}
                    <div className="order-2 xl:order-1 space-y-6">

                        {/* X-Ray Viewport */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="relative group"
                        >
                            <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-primary/40 z-10" />
                            <div className="absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 border-primary/40 z-10" />
                            <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 border-primary/40 z-10" />
                            <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-primary/40 z-10" />

                            <div className="relative bg-gradient-to-br from-white/[0.03] to-white/[0.01] backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_0_80px_rgba(56,189,248,0.08)]">

                                <div className="relative bg-black/50 border-b border-white/10 px-5 py-3 backdrop-blur-xl">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Target className="w-4 h-4 text-primary animate-pulse" />
                                            <span className="text-xs font-mono text-white/50 uppercase tracking-wider">Diagnostic Viewport</span>
                                        </div>
                                        {loading && (
                                            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 rounded-full">
                                                <Loader2 className="w-3 h-3 text-primary animate-spin" />
                                                <span className="text-xs text-primary font-mono">{scanProgress.toFixed(0)}%</span>
                                            </div>
                                        )}
                                        {preview && !loading && (
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-xs text-emerald-400 font-mono">READY</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="relative bg-black aspect-[16/9] flex items-center justify-center p-6">
                                    <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(56,189,248,0.015)_50%)] bg-[length:100%_4px] pointer-events-none" />

                                    {!preview ? (
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="text-center space-y-6"
                                        >
                                            <motion.div
                                                className="relative w-32 h-32 mx-auto"
                                                animate={{ rotate: 360 }}
                                                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                            >
                                                <div className="absolute inset-0 border-2 border-dashed border-primary/15 rounded-full" />
                                                <div className="absolute inset-4 border-2 border-dashed border-primary/25 rounded-full" />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <Upload className="w-12 h-12 text-primary/30" />
                                                </div>
                                            </motion.div>
                                            <div>
                                                <div className="text-white/30 mb-3 font-mono text-sm">NO RADIOGRAPH LOADED</div>
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="px-5 py-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary rounded-full text-xs font-mono uppercase tracking-wider transition-all"
                                                >
                                                    Upload Image
                                                </button>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <div className="relative w-full h-full">
                                            <AnimatePresence mode="wait">
                                                <motion.img
                                                    key={result ? "result" : "preview"}
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    src={result ? `data:image/jpeg;base64,${result.processed_image_base64}` : preview}
                                                    alt="X-Ray"
                                                    className="w-full h-full object-contain drop-shadow-2xl"
                                                />
                                            </AnimatePresence>

                                            {loading && (
                                                <>
                                                    <motion.div
                                                        className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/15 to-transparent"
                                                        animate={{ y: ["-100%", "200%"] }}
                                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
                                                        <div className="text-center space-y-4">
                                                            <div className="relative w-16 h-16 mx-auto">
                                                                <motion.div
                                                                    className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full"
                                                                    animate={{ rotate: 360 }}
                                                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                                />
                                                            </div>
                                                            <div className="text-white font-mono text-sm">ANALYZING ALL MODELS</div>
                                                            <div className="text-primary/60 text-xs font-mono">Running {MODELS.length} neural networks...</div>
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {loading && (
                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-primary to-blue-500"
                                            initial={{ width: "0%" }}
                                            animate={{ width: `${scanProgress}%` }}
                                            transition={{ duration: 0.3 }}
                                        />
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* Result Card */}
                        {result && !loading && (
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ type: "spring", damping: 25 }}
                                className="space-y-4"
                            >
                                <div className={`relative bg-gradient-to-br ${isFracture ? 'from-red-950/30 to-orange-950/20' : 'from-emerald-950/30 to-teal-950/20'} backdrop-blur-2xl border ${isFracture ? 'border-red-500/20' : 'border-emerald-500/20'} rounded-2xl overflow-hidden`}>

                                    <div className={`absolute top-0 right-0 w-96 h-96 ${isFracture ? 'bg-red-500/10' : 'bg-emerald-500/10'} rounded-full blur-[100px] pointer-events-none`} />

                                    <div className="relative p-6 lg:p-8">
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <motion.div
                                                    initial={{ scale: 0, rotate: -180 }}
                                                    animate={{ scale: 1, rotate: 0 }}
                                                    transition={{ type: "spring", delay: 0.2 }}
                                                    className={`p-3 rounded-xl ${isFracture ? 'bg-red-500/10 border border-red-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'}`}
                                                >
                                                    {isFracture ? (
                                                        <AlertTriangle className="w-6 h-6 text-red-400" />
                                                    ) : (
                                                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                                    )}
                                                </motion.div>
                                                <div>
                                                    <div className="text-xs text-white/40 uppercase tracking-wider font-mono mb-1">Diagnosis</div>
                                                    <motion.div
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: 0.3 }}
                                                        className={`text-2xl font-bold ${isFracture ? 'text-red-400' : 'text-emerald-400'}`}
                                                    >
                                                        {result.prediction}
                                                    </motion.div>
                                                </div>
                                            </div>

                                            <div className="text-right">
                                                <div className="text-xs text-white/40 uppercase tracking-wider font-mono mb-1">Confidence</div>
                                                <div className={`text-3xl font-black ${isFracture ? 'text-red-400' : 'text-emerald-400'}`}>
                                                    {(result.confidence * 100).toFixed(1)}%
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-6">
                                            <div className="relative h-3 bg-black/30 rounded-full overflow-hidden border border-white/10">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${result.confidence * 100}%` }}
                                                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.4 }}
                                                    className={`h-full bg-gradient-to-r ${isFracture ? 'from-red-500 via-orange-500 to-red-600' : 'from-emerald-500 via-teal-500 to-emerald-600'} shadow-[0_0_15px_currentColor]`}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-black/20 border border-white/5 rounded-xl p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Database className="w-4 h-4 text-primary/60" />
                                                    <div className="text-xs text-white/40 font-mono uppercase">Model</div>
                                                </div>
                                                <div className="text-sm text-white font-semibold">{selectedModelData?.name}</div>
                                            </div>
                                            <div className="bg-black/20 border border-white/5 rounded-xl p-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <TrendingUp className="w-4 h-4 text-primary/60" />
                                                    <div className="text-xs text-white/40 font-mono uppercase">Accuracy</div>
                                                </div>
                                                <div className={`text-sm font-semibold ${result.confidence > 0.9 ? 'text-emerald-400' : result.confidence > 0.7 ? 'text-yellow-400' : 'text-orange-400'}`}>
                                                    {result.confidence > 0.9 ? 'High' : result.confidence > 0.7 ? 'Medium' : 'Low'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Compare Button */}
                                {allResults && allResults.length > 0 && (
                                    <motion.button
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.6 }}
                                        onClick={() => setShowComparisonModal(true)}
                                        className="w-full h-14 bg-gradient-to-r from-primary/20 to-blue-500/20 hover:from-primary/30 hover:to-blue-500/30 border border-primary/30 hover:border-primary/50 text-white rounded-xl transition-all group shadow-[0_0_20px_rgba(56,189,248,0.1)]"
                                    >
                                        <div className="flex items-center justify-center gap-3">
                                            <BarChart3 className="w-5 h-5 text-primary" />
                                            <span className="font-bold">Compare All Models</span>
                                            {consensus && (
                                                <span className="text-xs text-white/50">
                                                    ({consensus.total} analyzed)
                                                </span>
                                            )}
                                        </div>
                                    </motion.button>
                                )}
                            </motion.div>
                        )}

                        {/* Error */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-red-950/20 border border-red-500/30 rounded-2xl p-5 backdrop-blur-xl"
                            >
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                                    <div>
                                        <div className="text-sm font-bold text-red-300 mb-1">Analysis Failed</div>
                                        <div className="text-xs text-red-400/80">{error}</div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* RIGHT: Control Panel */}
                    <div className="order-1 xl:order-2 space-y-5">

                        {/* Model Selector */}
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="space-y-3"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <Brain className="w-4 h-4 text-primary" />
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">AI Models</h3>
                            </div>

                            {MODELS.map((model, idx) => {
                                const Icon = model.icon;
                                const isActive = selectedModel === model.id;
                                return (
                                    <motion.button
                                        key={model.id}
                                        initial={{ opacity: 0, x: 50 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.3 + idx * 0.04 }}
                                        whileHover={{ scale: 1.02, x: 3 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => {
                                            setSelectedModel(model.id);
                                            if (allResults) {
                                                const newResult = allResults.find(r => r.model_id === model.id);
                                                if (newResult && newResult.success) {
                                                    setResult(newResult);
                                                }
                                            }
                                        }}
                                        className={`relative w-full text-left p-3.5 rounded-xl border transition-all overflow-hidden group ${isActive
                                            ? "bg-white/[0.05] border-primary/40 shadow-[0_0_25px_rgba(56,189,248,0.12)]"
                                            : "bg-white/[0.02] border-white/5 hover:border-white/15"
                                            }`}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="activeModel"
                                                className={`absolute inset-0 bg-gradient-to-r ${model.color} opacity-10`}
                                                transition={{ type: "spring", damping: 30 }}
                                            />
                                        )}

                                        <div className="relative flex items-center gap-3">
                                            <div className={`p-2 rounded-lg bg-gradient-to-br ${model.color} ${isActive ? 'opacity-100' : 'opacity-40 group-hover:opacity-60'} transition-opacity`}>
                                                <Icon className="w-4 h-4 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className={`font-semibold text-sm ${isActive ? 'text-white' : 'text-white/70'}`}>
                                                    {model.name}
                                                </div>
                                                <div className="text-xs text-white/40 truncate mt-0.5">
                                                    {model.type}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </motion.div>

                        {/* Actions */}
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                            className="space-y-3"
                        >
                            {!file && (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="relative w-full h-14 bg-gradient-to-r from-white to-gray-100 hover:from-gray-100 hover:to-white text-black font-bold uppercase tracking-wider text-sm rounded-xl overflow-hidden group shadow-[0_0_30px_rgba(255,255,255,0.15)] transition-all active:scale-[0.98]"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                                    <div className="relative flex items-center justify-center gap-2">
                                        <Upload className="w-5 h-5" />
                                        Upload X-Ray
                                    </div>
                                </button>
                            )}

                            {file && !result && (
                                <button
                                    onClick={runPrediction}
                                    disabled={loading}
                                    className="relative w-full h-14 bg-gradient-to-r from-primary to-blue-500 hover:from-blue-500 hover:to-primary text-black font-bold uppercase tracking-wider text-sm rounded-xl overflow-hidden group shadow-[0_0_30px_var(--primary)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {!loading && (
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                                    )}
                                    <div className="relative flex items-center justify-center gap-2">
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Analyzing
                                            </>
                                        ) : (
                                            <>
                                                <Brain className="w-5 h-5" />
                                                Run Analysis
                                            </>
                                        )}
                                    </div>
                                </button>
                            )}

                            {result && (
                                <button
                                    onClick={reset}
                                    className="w-full h-14 border-2 border-white/20 hover:bg-white/5 text-white font-bold uppercase tracking-wider text-sm rounded-xl transition-all active:scale-[0.98]"
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <X className="w-5 h-5" />
                                        New Session
                                    </div>
                                </button>
                            )}
                        </motion.div>

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                            className="hidden"
                            accept="image/*"
                        />
                    </div>
                </div>
            </div>

            {/* Comparison Modal */}
            <AnimatePresence>
                {showComparisonModal && allResults && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4"
                        onClick={() => setShowComparisonModal(false)}
                        onWheel={(e) => e.stopPropagation()}
                    >
                        {/* Animated Background */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-blue-500/10"
                            animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
                            transition={{ duration: 10, repeat: Infinity, repeatType: "reverse" }}
                        />

                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 50 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 50 }}
                            transition={{ type: "spring", damping: 25 }}
                            onClick={(e) => e.stopPropagation()}
                            onWheel={(e) => e.stopPropagation()}
                            className="relative bg-gradient-to-br from-slate-900/95 to-black/95 border border-primary/20 rounded-3xl p-6 lg:p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden overscroll-contain shadow-[0_0_80px_rgba(56,189,248,0.15)]"
                        >
                            {/* Glow Effect */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-blue-500/20 to-primary/20 rounded-3xl blur-xl opacity-50 -z-10" />

                            {/* Scan Lines */}
                            <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(56,189,248,0.02)_50%)] bg-[length:100%_4px] pointer-events-none rounded-3xl" />

                            {/* Modal Header */}
                            <div className="flex items-center justify-between mb-6 relative">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
                                            <BarChart3 className="w-6 h-6 text-primary" />
                                        </motion.div>
                                        <h2 className="text-3xl font-black text-white">Model Comparison</h2>
                                    </div>
                                    <p className="text-sm text-white/50 font-mono">Neural Network Consensus Analysis</p>
                                </div>
                                <button
                                    onClick={() => setShowComparisonModal(false)}
                                    className="p-3 hover:bg-white/10 rounded-xl transition-all hover:scale-110 active:scale-95 border border-white/5"
                                >
                                    <X className="w-6 h-6 text-white/70" />
                                </button>
                            </div>

                            {/* Consensus Stats */}
                            {consensus && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="relative bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-primary/20 rounded-2xl p-6 mb-6 overflow-hidden"
                                >
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
                                        animate={{ x: ["-100%", "200%"] }}
                                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                    />

                                    <div className="relative grid grid-cols-4 gap-4 text-center">
                                        <motion.div whileHover={{ scale: 1.05 }} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                                            <motion.div className="text-4xl font-black text-white mb-1" animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}>{consensus.total}</motion.div>
                                            <div className="text-xs text-white/50 uppercase tracking-wider font-mono">Models</div>
                                        </motion.div>
                                        <motion.div whileHover={{ scale: 1.05 }} className="p-3 rounded-xl bg-red-950/20 border border-red-500/20">
                                            <div className="text-4xl font-black text-red-400 mb-1">{consensus.fracture}</div>
                                            <div className="text-xs text-white/50 uppercase tracking-wider font-mono">Fracture</div>
                                        </motion.div>
                                        <motion.div whileHover={{ scale: 1.05 }} className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
                                            <div className="text-4xl font-black text-emerald-400 mb-1">{consensus.normal}</div>
                                            <div className="text-xs text-white/50 uppercase tracking-wider font-mono">Normal</div>
                                        </motion.div>
                                        <motion.div whileHover={{ scale: 1.05 }} className="p-3 rounded-xl bg-white/[0.02] border border-primary/20">
                                            <div className={`text-4xl font-black mb-1 ${consensus.agreement > 0.8 ? 'text-emerald-400' : consensus.agreement > 0.6 ? 'text-yellow-400' : 'text-orange-400'}`}>
                                                {(consensus.agreement * 100).toFixed(0)}%
                                            </div>
                                            <div className="text-xs text-white/50 uppercase tracking-wider font-mono">Agreement</div>
                                        </motion.div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Model Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {allResults.map((modelResult, idx) => {
                                    const modelInfo = MODELS.find(m => m.id === modelResult.model_id);
                                    const Icon = modelInfo?.icon || Brain;
                                    const isFractureResult = (modelResult.prediction || "").toLowerCase().includes("fracture");

                                    return (
                                        <motion.button
                                            key={modelResult.model_id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.15 + idx * 0.05 }}
                                            whileHover={{ scale: 1.03, y: -5 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => modelResult.success && openDetailModal(modelResult)}
                                            className={`relative group bg-gradient-to-br from-white/[0.05] to-white/[0.02] hover:from-white/[0.08] hover:to-white/[0.04] border rounded-xl p-5 text-left transition-all ${modelResult.success ? 'border-white/10 hover:border-primary/40 cursor-pointer' : 'border-red-500/20 opacity-60'
                                                }`}
                                        >
                                            {/* Hover Glow */}
                                            {modelResult.success && (
                                                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                                            )}

                                            <div className="relative flex items-start gap-4 mb-4">
                                                <motion.div
                                                    className={`p-3 rounded-xl bg-gradient-to-br ${modelInfo?.color || 'from-gray-500 to-gray-600'} shadow-lg`}
                                                    whileHover={{ rotate: [0, -10, 10, 0] }}
                                                    transition={{ duration: 0.5 }}
                                                >
                                                    <Icon className="w-6 h-6 text-white" />
                                                </motion.div>
                                                <div className="flex-1">
                                                    <div className="font-bold text-white mb-1 group-hover:text-primary transition-colors">{modelInfo?.name || modelResult.model_id}</div>
                                                    <div className="text-xs text-white/40 font-mono">{modelInfo?.type}</div>
                                                </div>
                                                {modelResult.success && (
                                                    <motion.div
                                                        animate={{ scale: [1, 1.2, 1] }}
                                                        transition={{ duration: 2, repeat: Infinity }}
                                                    >
                                                        <Eye className="w-5 h-5 text-primary/60 group-hover:text-primary" />
                                                    </motion.div>
                                                )}
                                            </div>

                                            {modelResult.success ? (
                                                <>
                                                    <div className={`text-xl font-bold mb-3 ${isFractureResult ? 'text-red-400' : 'text-emerald-400'}`}>
                                                        {modelResult.prediction}
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 h-2.5 bg-black/30 rounded-full overflow-hidden border border-white/10">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${modelResult.confidence * 100}%` }}
                                                                transition={{ duration: 1, delay: 0.2 + idx * 0.05 }}
                                                                className={`h-full bg-gradient-to-r ${isFractureResult ? 'from-red-500 to-orange-500' : 'from-emerald-500 to-teal-500'} shadow-[0_0_10px_currentColor]`}
                                                            />
                                                        </div>
                                                        <span className="text-sm font-bold text-white min-w-[50px] text-right">
                                                            {(modelResult.confidence * 100).toFixed(1)}%
                                                        </span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-sm text-red-400">
                                                    <div className="font-semibold mb-1">Analysis Failed</div>
                                                    <div className="text-xs text-red-400/70">{modelResult.error}</div>
                                                </div>
                                            )}
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Detail Modal */}
            <AnimatePresence>
                {showDetailModal && detailModelResult && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[60] flex items-center justify-center p-4"
                        onClick={() => setShowDetailModal(false)}
                        onWheel={(e) => e.stopPropagation()}
                    >
                        {/* Animated Background */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5"
                            animate={{ backgroundPosition: ["0% 0%", "100% 100%"] }}
                            transition={{ duration: 15, repeat: Infinity, repeatType: "reverse" }}
                        />

                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 50 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 50 }}
                            transition={{ type: "spring", damping: 30 }}
                            onClick={(e) => e.stopPropagation()}
                            onWheel={(e) => e.stopPropagation()}
                            className="relative bg-gradient-to-br from-slate-900/98 to-black/98 border border-primary/30 rounded-3xl p-6 lg:p-8 max-w-6xl w-full max-h-[95vh] overflow-y-auto overflow-x-hidden overscroll-contain shadow-[0_0_100px_rgba(56,189,248,0.2)]"
                        >
                            {/* Glow Effect */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 via-purple-500/30 to-primary/30 rounded-3xl blur-2xl opacity-40 -z-10" />

                            {/* Scan Lines */}
                            <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(56,189,248,0.02)_50%)] bg-[length:100%_4px] pointer-events-none rounded-3xl" />

                            {(() => {
                                const modelInfo = MODELS.find(m => m.id === detailModelResult.model_id);
                                const Icon = modelInfo?.icon || Brain;
                                const isFractureDetail = (detailModelResult.prediction || "").toLowerCase().includes("fracture");

                                return (
                                    <>
                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-4 rounded-2xl bg-gradient-to-br ${modelInfo?.color || 'from-gray-500 to-gray-600'}`}>
                                                    <Icon className="w-8 h-8 text-white" />
                                                </div>
                                                <div>
                                                    <h2 className="text-2xl font-black text-white mb-1">{modelInfo?.name || detailModelResult.model_id}</h2>
                                                    <p className="text-sm text-white/50">{modelInfo?.type} Model • Detailed Analysis</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setShowDetailModal(false)}
                                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                            >
                                                <X className="w-6 h-6 text-white/70" />
                                            </button>
                                        </div>

                                        {/* Content Grid */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* Left: Image */}
                                            <div className="space-y-4">
                                                <div className="relative bg-black border border-white/10 rounded-2xl overflow-hidden aspect-square">
                                                    <img
                                                        src={`data:image/jpeg;base64,${detailModelResult.processed_image_base64}`}
                                                        alt="Analysis Result"
                                                        className="w-full h-full object-contain"
                                                    />
                                                    <button
                                                        onClick={() => window.open(`data:image/jpeg;base64,${detailModelResult.processed_image_base64}`, '_blank')}
                                                        className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm border border-white/20 rounded-lg transition-colors"
                                                    >
                                                        <Maximize2 className="w-5 h-5 text-white" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Right: Details */}
                                            <div className="space-y-6">
                                                {/* Diagnosis */}
                                                <div className={`bg-gradient-to-br ${isFractureDetail ? 'from-red-950/40 to-orange-950/30' : 'from-emerald-950/40 to-teal-950/30'} border ${isFractureDetail ? 'border-red-500/30' : 'border-emerald-500/30'} rounded-2xl p-6`}>
                                                    <div className="flex items-center gap-3 mb-4">
                                                        {isFractureDetail ? (
                                                            <AlertTriangle className="w-8 h-8 text-red-400" />
                                                        ) : (
                                                            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                                                        )}
                                                        <div>
                                                            <div className="text-xs text-white/50 uppercase tracking-wider mb-1">Diagnosis</div>
                                                            <div className={`text-3xl font-black ${isFractureDetail ? 'text-red-400' : 'text-emerald-400'}`}>
                                                                {detailModelResult.prediction}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <div>
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-sm text-white/60">Confidence Level</span>
                                                                <span className={`text-2xl font-black ${isFractureDetail ? 'text-red-400' : 'text-emerald-400'}`}>
                                                                    {(detailModelResult.confidence * 100).toFixed(1)}%
                                                                </span>
                                                            </div>
                                                            <div className="h-4 bg-black/30 rounded-full overflow-hidden border border-white/10">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${detailModelResult.confidence * 100}%` }}
                                                                    transition={{ duration: 1, ease: "easeOut" }}
                                                                    className={`h-full bg-gradient-to-r ${isFractureDetail ? 'from-red-500 to-orange-500' : 'from-emerald-500 to-teal-500'} shadow-[0_0_15px_currentColor]`}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Model Info */}
                                                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
                                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Model Information</h3>
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm text-white/60">Architecture</span>
                                                            <span className="text-sm font-semibold text-white">{modelInfo?.type}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm text-white/60">Model ID</span>
                                                            <span className="text-xs font-mono text-white/80">{detailModelResult.model_id}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-sm text-white/60">Accuracy Rating</span>
                                                            <span className={`text-sm font-semibold ${detailModelResult.confidence > 0.9 ? 'text-emerald-400' : detailModelResult.confidence > 0.7 ? 'text-yellow-400' : 'text-orange-400'}`}>
                                                                {detailModelResult.confidence > 0.9 ? 'High' : detailModelResult.confidence > 0.7 ? 'Medium' : 'Low'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Analysis Timestamp */}
                                                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
                                                    <div className="flex items-center gap-3">
                                                        <Clock className="w-5 h-5 text-primary/60" />
                                                        <div>
                                                            <div className="text-xs text-white/50 uppercase tracking-wider mb-1">Analysis Time</div>
                                                            <div className="text-sm text-white font-mono">
                                                                {new Date().toLocaleString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}
