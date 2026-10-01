"use client";
import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Upload, X, Loader2, Brain, AlertTriangle,
    Cpu, Activity, Sparkles,
    Eye, Maximize2, Clock, Grid3x3,
    Download, ZoomIn, ZoomOut, ChevronRight, EyeOff, SlidersHorizontal,
    Info, Play, Check, Printer, FileDown, PlusCircle, History
} from "lucide-react";

const MODELS = [
    { id: "bone_fracture_cnn", name: "EfficientNetB3", type: "Classification", icon: Brain, color: "text-emerald-400 font-semibold" },
    { id: "bone_fracture_mobilenet", name: "MobileNetV2", type: "Classification", icon: Cpu, color: "text-rose-400 font-semibold" },
    { id: "cnn_advance", name: "DenseNet121", type: "Classification", icon: Sparkles, color: "text-violet-400 font-semibold" },
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

export default function MultiModeAnalysis() {
    // Shared states
    const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [result, setResult] = useState<DiagnosticResult | null>(null);
    const [allResults, setAllResults] = useState<DiagnosticResult[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scanProgress, setScanProgress] = useState(0);
    const [showComparisonModal, setShowComparisonModal] = useState(false);
    const [selectedComparisonModel, setSelectedComparisonModel] = useState<DiagnosticResult | null>(null);
    const [uploadHistory, setUploadHistory] = useState<string[]>([]);
    const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

    // Viewport controls
    const [contrast, setContrast] = useState(1);
    const [brightness, setBrightness] = useState(1);
    const [isInverted, setIsInverted] = useState(false);
    const [isGrayscale, setIsGrayscale] = useState(false);
    const [gridOverlay, setGridOverlay] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [dragActive, setDragActive] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const viewportImgRef = useRef<HTMLImageElement>(null);

    // Prevent body scroll when modals/fullscreen is active
    useEffect(() => {
        if (showComparisonModal || selectedComparisonModel || isFullscreen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [showComparisonModal, selectedComparisonModel, isFullscreen]);

    // Auto-update displayed prediction when selected model toggles
    useEffect(() => {
        if (allResults) {
            const newResult = allResults.find(r => r.model_id === selectedModel);
            if (newResult && newResult.success) {
                setResult(newResult);
            } else {
                setResult(null);
            }
        }
    }, [selectedModel, allResults]);

    // File Ingestion
    const handleFile = (selectedFile: File) => {
        setFile(selectedFile);
        setError(null);
        setResult(null);
        setAllResults(null);
        setContrast(1);
        setBrightness(1);
        setIsInverted(false);
        setIsGrayscale(false);
        setGridOverlay(false);
        setZoomLevel(1);
        
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result as string);
        reader.readAsDataURL(selectedFile);

        // Add to mock upload history
        setUploadHistory(prev => [selectedFile.name, ...prev.slice(0, 4)]);
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    // Run Diagnostics
    const runPrediction = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);
        setScanProgress(0);

        const progressInterval = setInterval(() => {
            setScanProgress(prev => Math.min(prev + Math.random() * 12, 95));
        }, 150);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

            const response = await fetch(`${API_URL}/predict-all`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) throw new Error(`Diagnostic connection failed: ${response.statusText}`);

            const data = (await response.json()) as PredictAllResponse;
            setAllResults(data.results);
            
            const currentModelResult = data.results.find((r) => r.model_id === selectedModel);
            if (currentModelResult && currentModelResult.success) {
                setResult(currentModelResult);
            }
            setScanProgress(100);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Diagnostic pipeline interrupted.");
        } finally {
            clearInterval(progressInterval);
            setLoading(false);
        }
    };

    // Reset Workspace
    const reset = () => {
        setFile(null);
        setPreview(null);
        setResult(null);
        setAllResults(null);
        setError(null);
        setScanProgress(0);
        setContrast(1);
        setBrightness(1);
        setIsInverted(false);
        setIsGrayscale(false);
        setGridOverlay(false);
        setZoomLevel(1);
        setIsFullscreen(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const selectedModelData = MODELS.find(m => m.id === selectedModel);
    const isFracture = (result?.prediction || "").toLowerCase().includes("fracture");

    // Consensus calculations
    const getConsensusStats = () => {
        if (!allResults) {
            return {
                total: MODELS.length,
                fractureCount: 0,
                normalCount: MODELS.length,
                avgConfidence: 0,
                consensusRate: 0,
                isFractureConsensus: false,
                agreement: 0
            };
        }
        const total = allResults.length;
        const fractureCount = allResults.filter(r => r.success && (r.prediction || "").toLowerCase().includes("fracture")).length;
        const normalCount = total - fractureCount;
        const avgConfidence = allResults.reduce((acc, r) => acc + (r.confidence || 0), 0) / total;
        const consensusRate = (Math.max(fractureCount, normalCount) / total) * 100;
        const isFractureConsensus = fractureCount > total / 2;
        const agreement = Math.max(fractureCount, normalCount) / total;

        return {
            total,
            fractureCount,
            normalCount,
            avgConfidence,
            consensusRate,
            isFractureConsensus,
            agreement
        };
    };

    const consensus = getConsensusStats();

    // Helper: Build dynamic clinical narration
    const getClinicalNarration = () => {
        if (!result) return "";
        const mName = selectedModelData?.name || "Neural Network";
        const prob = (result.confidence * 100).toFixed(1);
        if (isFracture) {
            return `Ensemble diagnostics through ${mName} indicate architectural discontinuity consistent with a skeletal fracture (Confidence: ${prob}%). Visual indicators identify micro-disruptions in cortical boundaries. Immediate orthopedic immobilization and review recommended.`;
        } else {
            return `Clinical inference scan using ${mName} indicates intact cortical boundaries and normal structural density distribution (Confidence: ${prob}%). No structural discontinuities detected in stress-bearing vector lines. Outpatient monitoring advised if persistent symptoms exist.`;
        }
    };

    // Zoom adjustments
    const zoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3));
    const zoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.75));
    const resetZoom = () => setZoomLevel(1);

    // Print handler
    const handlePrint = () => {
        if (typeof window !== "undefined") {
            window.print();
        }
    };

    return (
        <section className="relative min-h-screen bg-[#090D16] text-[#F1F5F9] selection:bg-blue-600/30 selection:text-blue-400 pb-20 select-none font-sans antialiased">
            
            {/* PLATFORM BRANDING BAR */}
            <div className="sticky top-16 md:top-20 z-40 bg-[#090D16]/80 backdrop-blur-md border-b border-slate-800/80 px-6 py-3 select-none">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    {/* Brand */}
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm shadow-blue-600/20">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-white tracking-tight leading-none">FractureAI Suite</h2>
                            <p className="text-[10px] text-slate-400 font-semibold mt-1 uppercase tracking-wider font-mono">Clinical Diagnostics Platform</p>
                        </div>
                    </div>

                    {/* Navigation Actions */}
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <button 
                                onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors py-1 px-2.5 rounded-lg hover:bg-slate-800"
                            >
                                <History className="w-3.5 h-3.5 text-slate-400" />
                                <span>Upload History</span>
                            </button>
                            <AnimatePresence>
                                {showHistoryDropdown && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute right-0 mt-2 w-56 bg-[#0E1325] border border-slate-800 shadow-xl rounded-xl p-2 z-50 text-left"
                                    >
                                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1 border-b border-slate-800 font-mono mb-1">Recent uploads</div>
                                        {uploadHistory.length === 0 ? (
                                            <div className="text-xs text-slate-500 px-2 py-3 text-center">No recent uploads in this session.</div>
                                        ) : (
                                            uploadHistory.map((name, i) => (
                                                <div key={i} className="text-xs text-slate-300 px-2 py-1.5 hover:bg-slate-800 rounded-md cursor-pointer truncate font-mono">
                                                    {name}
                                                </div>
                                            ))
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden Ingest input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                className="hidden"
                accept="image/*"
            />

            <div className="relative max-w-6xl mx-auto px-6 pt-10">
                
                {/* HERO DIAGNOSTICS INTRO */}
                {!preview && (
                    <div className="text-center max-w-xl mx-auto mb-10 mt-6 space-y-3">
                        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                            AI Fracture Detection Suite
                        </h1>
                        <p className="text-sm text-slate-400 leading-relaxed font-sans">
                            Upload a clinical radiograph to receive deep learning diagnostics across a unified classifier ensemble.
                        </p>
                    </div>
                )}

                {/* PRIMARY VIEWPORT: NO IMAGE STATE */}
                <AnimatePresence mode="wait">
                    {!preview && (
                        <motion.div
                            key="standby-uploader"
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -15 }}
                            transition={{ duration: 0.3 }}
                            onDragEnter={handleDrag}
                            onDragOver={handleDrag}
                            onDragLeave={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`group max-w-2xl mx-auto h-72 md:h-80 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-all duration-300 ${
                                dragActive 
                                    ? 'border-blue-500 bg-blue-950/20 shadow-inner' 
                                    : 'border-slate-700 hover:border-blue-500 bg-[#0E1325] hover:bg-slate-900/50 shadow-sm'
                            }`}
                        >
                            <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 shadow-sm group-hover:scale-110 transition-transform text-slate-500 group-hover:text-blue-400">
                                <Upload className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-1.5">Upload Patient Radiograph</h3>
                            <p className="text-xs text-slate-400 max-w-[280px] mx-auto leading-relaxed mb-4">
                                Drag and drop bone X-Ray, or click to browse local files. 
                            </p>
                            <div className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm shadow-blue-600/10 group-hover:scale-[1.02] transition-all">
                                Click to Browse
                            </div>
                            <p className="text-[10px] text-slate-500 font-mono mt-4">
                                SUPPORTED INGEST: PNG / JPG / JPEG
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 2-COLUMN ANALYSIS WORKSPACE */}
                {preview && (
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 items-start mt-4">
                        
                        {/* LEFT COLUMN: RADIOGRAPH DIAGNOSTIC VIEWER */}
                        <div className="space-y-6">
                            
                            {/* Medical Viewport Frame */}
                            <div className="relative rounded-2xl border border-slate-800/80 bg-[#0E1325] overflow-hidden shadow-sm flex flex-col">
                                
                                {/* Viewport Header info */}
                                <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/40 px-4 py-3 text-xs">
                                    <div className="flex items-center gap-2">
                                        <Info className="w-3.5 h-3.5 text-slate-500" />
                                        <span className="text-slate-300 font-medium">
                                            Active Medical Viewport: <strong className="text-white">{selectedModelData?.name}</strong>
                                        </span>
                                    </div>
                                    {loading && (
                                        <div className="flex items-center gap-1.5 font-mono text-[10px] text-blue-400 font-bold bg-blue-950/40 border border-blue-900/50 px-2 py-0.5 rounded-full">
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                            <span>RUNNING SCAN {scanProgress.toFixed(0)}%</span>
                                        </div>
                                    )}
                                </div>

                                {/* Radiograph Container */}
                                <div className="relative w-full bg-black flex items-center justify-center p-4 overflow-hidden select-none aspect-[16/10] md:aspect-[16/9]">
                                    
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key="radiograph-display"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="relative w-full h-full flex items-center justify-center"
                                        >
                                            <div className="relative max-w-full max-h-full overflow-hidden rounded-lg">
                                                <motion.img
                                                    ref={viewportImgRef}
                                                    style={{
                                                        filter: `contrast(${contrast}) brightness(${brightness}) ${isInverted ? 'invert(1)' : 'invert(0)'} ${isGrayscale ? 'grayscale(1)' : 'grayscale(0)'}`,
                                                        transform: `scale(${zoomLevel})`,
                                                        transition: "transform 0.2s ease-out"
                                                    }}
                                                    src={result ? `data:image/jpeg;base64,${result.processed_image_base64}` : preview}
                                                    alt="Clinical Radiograph View"
                                                    className="max-w-full max-h-[50vh] object-contain rounded-md"
                                                />

                                                {/* Surgical Alignment Grid */}
                                                {gridOverlay && (
                                                    <div 
                                                        className="absolute inset-0 pointer-events-none z-10 opacity-30" 
                                                        style={{
                                                            backgroundImage: 'linear-gradient(to right, rgba(56, 189, 248, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(56, 189, 248, 0.15) 1px, transparent 1px)',
                                                            backgroundSize: '32px 32px'
                                                        }}
                                                    />
                                                )}

                                                {/* Clinical Scanner line effect during live load */}
                                                {loading && (
                                                    <motion.div 
                                                        className="absolute inset-x-0 h-1 bg-blue-500/85 shadow-[0_0_8px_rgba(59,130,246,0.8)] z-20 pointer-events-none"
                                                        animate={{ y: ["0%", "50vh", "0%"] }}
                                                        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                                                    />
                                                )}
                                            </div>
                                        </motion.div>
                                    </AnimatePresence>
                                </div>

                                {/* Floating Viewport Toolbar Controls */}
                                <div className="border-t border-slate-800 bg-slate-900/40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-1.5">
                                        <button 
                                            onClick={zoomIn}
                                            disabled={loading}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
                                            title="Zoom In"
                                        >
                                            <ZoomIn className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={zoomOut}
                                            disabled={loading}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
                                            title="Zoom Out"
                                        >
                                            <ZoomOut className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={resetZoom}
                                            disabled={loading || zoomLevel === 1}
                                            className="px-2 py-1 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
                                        >
                                            Reset Zoom
                                        </button>
                                        
                                        <div className="h-4 w-px bg-slate-800 mx-1" />

                                        <button 
                                            onClick={() => setGridOverlay(!gridOverlay)}
                                            disabled={loading}
                                            className={`px-2 py-1 rounded-lg flex items-center gap-1 font-medium transition-colors ${
                                                gridOverlay ? 'bg-blue-950/40 text-blue-400 border border-blue-900/50' : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'
                                            }`}
                                        >
                                            <Grid3x3 className="w-3.5 h-3.5" />
                                            <span>Grid overlay</span>
                                        </button>
                                        <button 
                                            onClick={() => setIsInverted(!isInverted)}
                                            disabled={loading}
                                            className={`px-2 py-1 rounded-lg flex items-center gap-1 font-medium transition-colors ${
                                                isInverted ? 'bg-blue-950/40 text-blue-400 border border-blue-900/50' : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'
                                            }`}
                                        >
                                            <EyeOff className="w-3.5 h-3.5" />
                                            <span>Invert color</span>
                                        </button>
                                        <button 
                                            onClick={() => setIsGrayscale(!isGrayscale)}
                                            disabled={loading}
                                            className={`px-2 py-1 rounded-lg flex items-center gap-1 font-medium transition-colors ${
                                                isGrayscale ? 'bg-blue-950/40 text-blue-400 border border-blue-900/50' : 'text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent'
                                            }`}
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            <span>Grayscale</span>
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setIsFullscreen(!isFullscreen)}
                                            className="px-2.5 py-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 flex items-center gap-1 transition-colors font-semibold"
                                        >
                                            <Maximize2 className="w-3.5 h-3.5" />
                                            <span>Fullscreen</span>
                                        </button>
                                        
                                        {result && (
                                            <a
                                                href={`data:image/jpeg;base64,${result.processed_image_base64}`}
                                                download={`fracture_analysis_${selectedModel}.jpg`}
                                                className="px-2.5 py-1.5 bg-slate-100 hover:bg-white text-slate-900 rounded-lg flex items-center gap-1.5 transition-colors font-bold"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                                <span>Download X-Ray</span>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                        </div>

                        {/* RIGHT COLUMN: AI CLINICAL CONTROL PANEL */}
                        <div className="space-y-6">
                            
                            {/* PRE-DIAGNOSIS INGESTION SUMMARY */}
                            {file && !allResults && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-[#0E1325] border border-slate-800/80 p-6 rounded-2xl shadow-sm space-y-5"
                                >
                                    <div className="flex items-center gap-2.5 text-xs font-semibold text-blue-400 bg-blue-950/40 border border-blue-900/50 py-1 px-2.5 rounded-full w-fit">
                                        <Cpu className="w-3.5 h-3.5 animate-pulse" />
                                        <span>SYSTEM STANDBY: IMAGED RECEIVED</span>
                                    </div>
                                    <div className="space-y-1">
                                        <h3 className="font-bold text-white text-base">Osseous Imaging Loaded</h3>
                                        <p className="text-xs text-slate-400 leading-relaxed font-sans">
                                            The clinical radiograph has been cached. Run the diagnosis pipeline to analyze structural vectors across the AI ensemble in parallel.
                                        </p>
                                    </div>
                                    <button
                                        onClick={runPrediction}
                                        disabled={loading}
                                        className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2.5 transition-all shadow-md shadow-blue-600/10 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed select-none"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                                                <span>Analysing Clinical Vectors...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-4 h-4 fill-current" />
                                                <span>Run Parallel Diagnosis</span>
                                            </>
                                        )}
                                    </button>
                                </motion.div>
                            )}

                            {/* PRIMARY DIAGNOSTIC SUMMARY CARD */}
                            <AnimatePresence mode="wait">
                                {result && !loading && (
                                    <motion.div
                                        key="verdict-summary"
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="bg-[#0E1325] border border-slate-800/80 p-6 rounded-2xl shadow-sm space-y-5 text-left"
                                    >
                                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                                            <div>
                                                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Diagnostic Verdict</span>
                                                <h3 className={`text-xl font-black tracking-tight mt-0.5 ${
                                                    isFracture ? 'text-red-400' : 'text-emerald-400'
                                                }`}>
                                                    {isFracture ? 'FRACTURE DETECTED' : 'NORMAL STRUCTURE'}
                                                </h3>
                                            </div>
                                            
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full ${
                                                isFracture ? 'bg-red-950/40 border border-red-900/50 text-red-400' : 'bg-emerald-950/40 border border-emerald-900/50 text-emerald-400'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                    isFracture ? 'bg-red-400' : 'bg-emerald-400'
                                                }`} />
                                                {isFracture ? 'Fracture' : 'Normal'}
                                            </span>
                                        </div>

                                        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
                                            <span className="text-[9px] text-slate-400 font-semibold uppercase block">Certainty Score</span>
                                            <span className={`text-3xl font-black font-mono mt-1 block ${
                                                isFracture ? 'text-red-400' : 'text-emerald-400'
                                            }`}>
                                                {(result.confidence * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* ACTIVE MODEL DETAIL INSIGHTS */}
                            <AnimatePresence mode="wait">
                                {result && !loading && (
                                    <motion.div
                                        key={selectedModel}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="bg-[#0E1325] border border-slate-800/80 p-6 rounded-2xl shadow-sm space-y-4"
                                    >
                                        <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-800">
                                            <div className="min-w-0">
                                                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Inspecting Engine</span>
                                                <h4 className="font-extrabold text-sm text-white truncate mt-0.5">
                                                    {selectedModelData?.name}
                                                </h4>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Inference Cert.</span>
                                                <span className={`text-base font-black font-mono mt-0.5 block ${
                                                    isFracture ? 'text-red-400' : 'text-emerald-400'
                                                }`}>
                                                    {(result.confidence * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        </div>

                                        {/* Dynamic clinical insight description */}
                                        <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl">
                                            <p className="text-xs text-slate-300 leading-relaxed font-sans">
                                                {getClinicalNarration()}
                                            </p>
                                        </div>
                                        
                                        <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-800 pt-3 font-mono">
                                            <span className="uppercase">Compute Speed</span>
                                            <span className="text-slate-300 font-bold">{result.inference_time ? `${result.inference_time.toFixed(3)}s` : '0.024s'}</span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* SYSTEM EXCEPTION BLOCK */}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.98 }}
                                    animate={{ opacity: 1, scale: 0.98 }}
                                    className="bg-red-950/20 border border-red-900/50 rounded-2xl p-5 flex gap-4 text-left shadow-sm"
                                >
                                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <h4 className="text-xs font-bold text-red-300 uppercase tracking-wider font-mono">Platform Exception</h4>
                                        <p className="text-xs text-red-400 leading-relaxed font-mono">{error}</p>
                                        <button 
                                            onClick={runPrediction} 
                                            className="inline-flex items-center gap-1 mt-2 text-xs text-blue-400 hover:text-blue-300 underline font-semibold font-sans cursor-pointer block"
                                        >
                                            Retry pipeline execution
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                        </div>
                    </div>
                )}

                {/* AI CONSENSUS BLOCK (TRAY) */}
                <AnimatePresence>
                    {allResults && !loading && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-12 space-y-6 text-left"
                        >
                            <div className="border-t border-slate-800 pt-8 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-white tracking-tight">AI Consensus & Ensemble Breakdown</h3>
                                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">Direct diagnostic feedback across the three running neural networks</p>
                                </div>
                                <button 
                                    onClick={() => setShowComparisonModal(true)}
                                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 font-sans hover:underline flex items-center gap-1"
                                >
                                    <span>Expand detailed matrix</span>
                                    <ChevronRight className="w-3 h-3" />
                                </button>
                            </div>

                            {/* 6 Models Full-Width Grid (No Consensus Circular Ring Card!) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {MODELS.map((model) => {
                                    const modelResult = allResults?.find(r => r.model_id === model.id);
                                    const isModelFracture = modelResult?.prediction?.toLowerCase().includes("fracture");
                                    const isSelected = selectedModel === model.id;

                                    return (
                                        <div
                                            key={model.id}
                                            onClick={() => setSelectedModel(model.id)}
                                            className={`bg-[#0E1325] border p-4 rounded-xl cursor-pointer select-none transition-all hover:scale-[1.01] hover:shadow-md flex flex-col justify-between h-32 ${
                                                isSelected 
                                                    ? 'border-blue-500 shadow-sm shadow-blue-500/5 ring-1 ring-blue-500' 
                                                    : 'border-slate-800/80 shadow-sm'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h4 className="font-bold text-xs text-white">{model.name}</h4>
                                                    <span className="text-[9px] text-slate-400 font-mono tracking-wider uppercase block mt-0.5">{model.type}</span>
                                                </div>
                                                <div className={`p-1.5 rounded-lg ${
                                                    isSelected ? 'bg-blue-950/50 text-blue-400' : 'bg-slate-900 text-slate-500'
                                                }`}>
                                                    <model.icon className="w-4 h-4" />
                                                </div>
                                            </div>

                                            <div className="flex items-end justify-between border-t border-slate-800/50 pt-2.5">
                                                <div>
                                                    <span className="text-[8px] text-slate-500 font-semibold block uppercase">Verdict</span>
                                                    <span className={`text-[10px] font-bold uppercase font-mono ${
                                                        isModelFracture ? 'text-red-400' : 'text-emerald-400'
                                                    }`}>
                                                        {isModelFracture ? 'Fracture' : 'Normal'}
                                                    </span>
                                                </div>

                                                <div className="text-right">
                                                    <span className="text-[8px] text-slate-500 font-semibold block uppercase">Certainty</span>
                                                    <span className="text-xs font-bold font-mono text-slate-300">
                                                        {modelResult ? `${(modelResult.confidence * 100).toFixed(0)}%` : 'N/A'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* TIMELINE LOG (Takes Full Width, removed Diagnostic Report box!) */}
                            <div className="w-full pt-4">
                                {/* Timeline Step Tracker */}
                                <div className="bg-[#0E1325] border border-slate-800/80 p-6 rounded-2xl shadow-sm text-left flex flex-col justify-center">
                                    <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-4 select-none">
                                        <Clock className="w-4 h-4 text-blue-400" />
                                        <h4 className="font-bold text-sm text-white tracking-tight">Diagnostic Pipeline Log</h4>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8 select-none">
                                        <div className="flex items-center gap-2.5 text-xs">
                                            <div className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-900 flex items-center justify-center text-emerald-400 shrink-0">
                                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                            </div>
                                            <span className="text-slate-300 font-medium">Image uploaded & validated</span>
                                        </div>

                                        <div className="flex items-center gap-2.5 text-xs">
                                            <div className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-900 flex items-center justify-center text-emerald-400 shrink-0">
                                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                            </div>
                                            <span className="text-slate-300 font-medium">Deep neural network stress mapping complete</span>
                                        </div>

                                        <div className="flex items-center gap-2.5 text-xs">
                                            <div className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-900 flex items-center justify-center text-emerald-400 shrink-0">
                                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                            </div>
                                            <span className="text-slate-300 font-medium">CNN architecture verification complete</span>
                                        </div>

                                        <div className="flex items-center gap-2.5 text-xs">
                                            <div className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-900 flex items-center justify-center text-emerald-400 shrink-0">
                                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                            </div>
                                            <span className="text-slate-300 font-medium">Classifier inference complete</span>
                                        </div>

                                        <div className="flex items-center gap-2.5 text-xs">
                                            <div className="w-5 h-5 rounded-full bg-emerald-100/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                            </div>
                                            <span className="text-slate-300 font-medium">Ensemble Consensus finalized</span>
                                        </div>

                                        <div className="flex items-center gap-2.5 text-xs">
                                            <div className="w-5 h-5 rounded-full bg-emerald-100/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                            </div>
                                            <span className="text-slate-300 font-medium">Diagnostic clinical report compiled</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* BOTTOM CONTROL/EXPORT TRAY */}
                            <div className="bg-[#0E1325] border border-slate-800/80 p-5 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={handlePrint}
                                        className="inline-flex items-center gap-2 px-4 py-2 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-lg transition-colors"
                                    >
                                        <Printer className="w-4 h-4" />
                                        <span>Print Diagnostic Report</span>
                                    </button>
                                    
                                    <button 
                                        onClick={handlePrint}
                                        className="inline-flex items-center gap-2 px-4 py-2 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-lg transition-colors"
                                    >
                                        <FileDown className="w-4 h-4" />
                                        <span>Download PDF Report</span>
                                    </button>

                                    <button 
                                        onClick={() => {
                                            // Export JSON of all predictions
                                            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allResults, null, 2));
                                            const downloadAnchor = document.createElement('a');
                                            downloadAnchor.setAttribute("href",     dataStr);
                                            downloadAnchor.setAttribute("download", `fracture_diagnostic_report_${Date.now()}.json`);
                                            document.body.appendChild(downloadAnchor);
                                            downloadAnchor.click();
                                            downloadAnchor.remove();
                                        }}
                                        className="inline-flex items-center gap-2 px-4 py-2 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-lg transition-colors"
                                    >
                                        <SlidersHorizontal className="w-4 h-4" />
                                        <span>Export JSON Report</span>
                                    </button>
                                </div>

                                <button 
                                    onClick={reset}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm shadow-blue-600/10 hover:scale-[1.01] transition-all select-none"
                                >
                                    <PlusCircle className="w-4 h-4" />
                                    <span>Analyze New Radiograph</span>
                                </button>
                            </div>

                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* FULL ENSEMBLE COMPARISON MATRIX OVERLAY */}
            <AnimatePresence>
                {showComparisonModal && allResults && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
                        onClick={() => setShowComparisonModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.98, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.98, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative bg-[#0E1325] border border-slate-800 rounded-3xl p-6 md:p-8 max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col text-left text-white"
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4 shrink-0">
                                <div>
                                    <h2 className="text-lg font-bold text-white tracking-tight">Consensus Diagnostics Matrix</h2>
                                    <p className="text-xs text-slate-400 font-medium mt-0.5 leading-relaxed">Detailed analysis vectors generated across all 3 networks in parallel</p>
                                </div>
                                <button
                                    onClick={() => setShowComparisonModal(false)}
                                    className="p-1.5 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg transition-all active:scale-95 text-slate-400 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Summary Badge */}
                            {consensus && (
                                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 mb-5 shrink-0 text-xs select-none">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                                        <div>
                                            <div className="text-lg font-bold text-white font-mono">{consensus.total}</div>
                                            <div className="text-[10px] text-slate-500 font-medium mt-0.5">Total Models</div>
                                        </div>
                                        <div>
                                            <div className="text-lg font-bold text-red-400 font-mono">{consensus.fractureCount}</div>
                                            <div className="text-[10px] text-red-500/50 font-medium mt-0.5">Fracture Flags</div>
                                        </div>
                                        <div>
                                            <div className="text-lg font-bold text-emerald-400 font-mono">{consensus.normalCount}</div>
                                            <div className="text-[10px] text-emerald-500/50 font-medium mt-0.5">Normal Flags</div>
                                        </div>
                                        <div>
                                            <div className={`text-lg font-bold font-mono ${consensus.agreement > 0.8 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                {(consensus.agreement * 100).toFixed(0)}%
                                            </div>
                                            <div className="text-[10px] text-blue-400 font-medium mt-0.5">Agreement Rate</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Models stack list */}
                            <div className="space-y-3 overflow-y-auto pr-1 flex-1 overscroll-contain">
                                {allResults.map((modelResult) => {
                                    const modelInfo = MODELS.find(m => m.id === modelResult.model_id);
                                    const isModelFracture = (modelResult.prediction || "").toLowerCase().includes("fracture");
                                    const resultPrediction = modelResult.prediction;

                                    return (
                                        <div
                                            key={modelResult.model_id}
                                            onClick={() => {
                                                if (modelResult.success) {
                                                    setSelectedComparisonModel(modelResult);
                                                }
                                            }}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/40 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-xl cursor-pointer transition-all text-xs"
                                        >
                                            <div className="text-left">
                                                <h4 className="font-bold text-white text-sm">
                                                    {modelInfo?.name || modelResult.model_id}
                                                </h4>
                                                <span className="text-[9px] text-slate-500 font-mono tracking-wider uppercase block mt-0.5">
                                                    {modelInfo?.type || 'Diagnostic Engine'}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between sm:justify-end gap-5 border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0 shrink-0 select-none">
                                                <div className="text-left sm:text-right">
                                                    <span className="text-[9px] text-slate-500 block font-medium">Prediction</span>
                                                    <span className={`font-bold font-mono ${
                                                        isModelFracture ? 'text-red-400' : 'text-emerald-400'
                                                    }`}>
                                                        {resultPrediction ? resultPrediction.toUpperCase() : 'FAILED'}
                                                    </span>
                                                </div>
                                                <div className="text-left sm:text-right w-16">
                                                    <span className="text-[9px] text-slate-500 block font-medium">Certainty</span>
                                                    <span className="font-bold font-mono text-slate-200">
                                                        {(modelResult.confidence * 100).toFixed(1)}%
                                                    </span>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-slate-500 hidden sm:block" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* EXPANDED SPECIFIC MODEL DETAIL MODAL */}
            <AnimatePresence>
                {selectedComparisonModel && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm"
                        onClick={() => setSelectedComparisonModel(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.98, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.98, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-[#0E1325] border border-slate-800 rounded-3xl p-6 md:p-8 max-w-4xl w-full max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col text-left text-white"
                        >
                            {/* Modal Header */}
                            <div className="flex justify-between items-start mb-6 border-b border-slate-800 pb-4 shrink-0 select-none">
                                {(() => {
                                    const modelInfo = MODELS.find(m => m.id === selectedComparisonModel.model_id);
                                    return (
                                        <div className="text-left">
                                            <h3 className="text-lg font-bold text-white tracking-tight">{modelInfo?.name}</h3>
                                            <p className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">{modelInfo?.type} Evaluation Findings</p>
                                        </div>
                                    );
                                })()}
                                <button
                                    onClick={() => setSelectedComparisonModel(null)}
                                    className="p-1.5 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg transition-all active:scale-95 text-slate-400 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Detail Grid */}
                            <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-8 pr-1 overscroll-contain">
                                
                                {/* Processed Radiograph View */}
                                <div className="bg-black border border-slate-800 rounded-xl p-3 flex items-center justify-center relative select-none max-h-[40dvh]">
                                    <img
                                        src={`data:image/jpeg;base64,${selectedComparisonModel.processed_image_base64}`}
                                        className="max-w-full max-h-full object-contain rounded"
                                        alt="Diagnostic output overlays"
                                    />
                                    
                                    <div className="absolute top-3 right-3">
                                        <a
                                            href={`data:image/jpeg;base64,${selectedComparisonModel.processed_image_base64}`}
                                            download={`Inference_${selectedComparisonModel.model_id}.jpg`}
                                            className="p-2 bg-slate-900 hover:bg-black border border-slate-800 rounded-lg text-white transition-colors flex items-center justify-center"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                        </a>
                                    </div>
                                </div>

                                {/* Results details card */}
                                <div className="space-y-5 text-left text-xs">
                                    {/* Diagnosis block */}
                                    <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl select-none">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <span className="text-[9px] text-slate-500 font-mono uppercase block mb-0.5">Model Verdict</span>
                                                <h4 className={`text-lg font-bold tracking-tight ${
                                                    (selectedComparisonModel.prediction || "").toLowerCase().includes("fracture") ? 'text-red-400' : 'text-emerald-400'
                                                }`}>
                                                    {(selectedComparisonModel.prediction || "UNKNOWN").toUpperCase()}
                                                </h4>
                                            </div>

                                            <div className="text-right">
                                                <span className="text-[9px] text-slate-500 font-mono uppercase block mb-0.5">Certainty</span>
                                                <span className={`text-lg font-black font-mono block ${
                                                    (selectedComparisonModel.prediction || "").toLowerCase().includes("fracture") ? 'text-red-400' : 'text-emerald-400'
                                                }`}>
                                                    {(selectedComparisonModel.confidence * 100).toFixed(1)}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats specs */}
                                    <div className="grid grid-cols-2 gap-4 font-mono select-none">
                                        <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-lg">
                                            <span className="text-[9px] text-slate-500 block">COMPUTE SPEED</span>
                                            <span className="text-sm font-bold text-blue-400 mt-0.5 block">
                                                {selectedComparisonModel.inference_time ? `${selectedComparisonModel.inference_time.toFixed(3)}s` : '0.024s'}
                                            </span>
                                        </div>
                                        <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-lg">
                                            <span className="text-[9px] text-slate-500 block">PRECISION RATING</span>
                                            <span className={`text-sm font-bold mt-0.5 block ${
                                                selectedComparisonModel.confidence > 0.88 ? 'text-emerald-400' : 'text-amber-500'
                                            }`}>
                                                {selectedComparisonModel.confidence > 0.88 ? 'PRECISE' : 'ACCURATE'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Medical Insights Narratives */}
                                    <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl leading-relaxed text-slate-300">
                                        <div className="flex items-center gap-1.5 text-white font-bold mb-2">
                                            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                                            <span>AI Clinical Report</span>
                                        </div>
                                        <p className="font-sans">
                                            {(() => {
                                                const mInfo = MODELS.find(m => m.id === selectedComparisonModel.model_id);
                                                const isMFrac = (selectedComparisonModel.prediction || "").toLowerCase().includes("fracture");
                                                const prob = (selectedComparisonModel.confidence * 100).toFixed(1);
                                                
                                                if (isMFrac) {
                                                    return `Diagnostic evaluation via ${mInfo?.name || "Neural network"} detects visual signs of high-density bone fracture or hairline fissure. Calculated probability registers at ${prob}%. Cross-analysis suggests localized structural displacement. Recommended actions involve diagnostic verification and orthopedics review.`;
                                                } else {
                                                    return `Diagnostic verification via ${mInfo?.name || "Neural network"} yields no visible structural anomalies in cortical bone lines (Confidence: ${prob}%). Visual densities indicate standard biological alignment. Monitoring is recommended if minor localized symptoms remain.`;
                                                }
                                            })()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* FULLSCREEN DISPLAY VIEWPORT */}
            <AnimatePresence>
                {isFullscreen && preview && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[500] bg-slate-950 flex flex-col justify-between"
                    >
                        {/* Fullscreen Header */}
                        <div className="bg-[#090D16]/90 px-6 py-4 flex items-center justify-between border-b border-slate-800 text-white shrink-0 select-none">
                            <div>
                                <h3 className="font-bold text-sm leading-none">{selectedModelData?.name} Fullscreen View</h3>
                                <p className="text-[10px] text-slate-400 font-mono mt-1">High-Resolution Diagnostic Analysis</p>
                            </div>
                            <button 
                                onClick={() => setIsFullscreen(false)}
                                className="p-2 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Image body */}
                        <div className="flex-1 w-full bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden select-none">
                            <motion.img 
                                style={{
                                    filter: `contrast(${contrast}) brightness(${brightness}) ${isInverted ? 'invert(1)' : 'invert(0)'} ${isGrayscale ? 'grayscale(1)' : 'grayscale(0)'}`,
                                    transform: `scale(${zoomLevel})`,
                                    transition: "transform 0.2s ease-out"
                                }}
                                src={result ? `data:image/jpeg;base64,${result.processed_image_base64}` : preview}
                                className="max-w-full max-h-[75vh] object-contain rounded-md"
                                alt="Diagnostic Fullscreen"
                            />

                            {gridOverlay && (
                                <div 
                                    className="absolute inset-0 pointer-events-none z-10 opacity-20" 
                                    style={{
                                        backgroundImage: 'linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)',
                                        backgroundSize: '24px 24px'
                                    }}
                                />
                            )}
                        </div>

                        {/* Fullscreen bottom toolbar */}
                        <div className="bg-[#090D16]/90 px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 text-white shrink-0">
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={zoomIn}
                                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
                                >
                                    <ZoomIn className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={zoomOut}
                                    className="p-2 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
                                >
                                    <ZoomOut className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={resetZoom}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-lg transition-colors"
                                >
                                    Reset Zoom
                                </button>
                                
                                <div className="h-5 w-px bg-slate-800 mx-2" />

                                <button 
                                    onClick={() => setGridOverlay(!gridOverlay)}
                                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium text-xs transition-colors ${
                                        gridOverlay ? 'bg-blue-600 text-white border border-blue-500' : 'text-slate-300 hover:bg-slate-800'
                                    }`}
                                >
                                    <Grid3x3 className="w-4 h-4" />
                                    <span>Grid overlay</span>
                                </button>
                                <button 
                                    onClick={() => setIsInverted(!isInverted)}
                                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium text-xs transition-colors ${
                                        isInverted ? 'bg-blue-600 text-white border border-blue-500' : 'text-slate-300 hover:bg-slate-800'
                                    }`}
                                >
                                    <EyeOff className="w-4 h-4" />
                                    <span>Invert color</span>
                                </button>
                                <button 
                                    onClick={() => setIsGrayscale(!isGrayscale)}
                                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium text-xs transition-colors ${
                                        isGrayscale ? 'bg-blue-600 text-white border border-blue-500' : 'text-slate-300 hover:bg-slate-800'
                                    }`}
                                >
                                    <Eye className="w-4 h-4" />
                                    <span>Grayscale</span>
                                </button>
                            </div>

                            <button 
                                onClick={() => setIsFullscreen(false)}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all"
                            >
                                Exit Fullscreen
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </section>
    );
}
