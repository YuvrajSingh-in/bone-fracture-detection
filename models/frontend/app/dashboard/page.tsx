"use client";

import { useState, useRef } from "react";
import { Upload, FileImage, CheckCircle, AlertTriangle, Loader2, RefreshCcw, Brain, ChevronRight } from "lucide-react";
import Link from "next/link";

type Model = {
    id: string;
    name: string;
    type: string;
    description: string;
};

type PredictionResult = {
    model_id: string;
    prediction: string;
    confidence: number;
    processed_image_base64?: string | null;
};

const MODELS: Model[] = [
    { id: "bone_fracture_cnn", name: "EfficientNetB3", type: "Classification", description: "EfficientNetB3 transfer-learning classifier: Fracture vs Normal." },
    { id: "bone_fracture_mobilenet", name: "MobileNetV2", type: "Classification", description: "Lightweight model optimised for faster edge inference." },
    { id: "cnn_advance", name: "DenseNet121", type: "Classification", description: "DenseNet121-based high-accuracy fracture classifier." },
];

export default function Dashboard() {
    const [selectedModel, setSelectedModel] = useState<string>(MODELS[0].id);
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [result, setResult] = useState<PredictionResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
            setResult(null);
            setError(null);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const selectedFile = e.dataTransfer.files[0];
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
            setResult(null);
            setError(null);
        }
    };

    const handleSubmit = async () => {
        if (!file || !selectedModel) return;

        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append("file", file);
        formData.append("model_id", selectedModel);

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const response = await fetch(`${API_URL}/predict`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Prediction failed");
            }

            const data = (await response.json()) as PredictionResult;
            setResult(data);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    const reset = () => {
        setFile(null);
        setPreview(null);
        setResult(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className="min-h-screen bg-background flex">
            {/* Sidebar (Simple) */}
            <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col">
                <div className="p-6 border-b border-border">
                    <h1 className="font-bold text-xl flex items-center gap-2">
                        <Brain className="text-primary" /> FractureAI
                    </h1>
                </div>
                <div className="p-4 space-y-2">
                    <div className="p-3 bg-primary/10 text-primary rounded-lg font-medium text-sm flex items-center gap-2">
                        <FileImage className="w-4 h-4" /> Analyse
                    </div>
                    <Link href="/" className="p-3 text-gray-500 hover:bg-accent hover:text-foreground rounded-lg font-medium text-sm flex items-center gap-2 transition-colors">
                        <ChevronRight className="w-4 h-4" /> Back to Home
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                <header className="mb-8">
                    <h2 className="text-2xl font-bold">New Analysis</h2>
                    <p className="text-gray-500">Select a model and upload an X-ray image for diagnosis.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Model Selection & Upload */}
                    <div className="lg:col-span-1 space-y-6">

                        {/* Model Selection */}
                        <section className="space-y-4">
                            <h3 className="font-semibold text-lg">1. Select Model</h3>
                            <div className="grid gap-3">
                                {MODELS.map((model) => (
                                    <div
                                        key={model.id}
                                        onClick={() => setSelectedModel(model.id)}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedModel === model.id
                                            ? "border-primary bg-primary/5 shadow-md ring-1 ring-primary"
                                            : "border-border bg-card hover:border-primary/50"
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-medium">{model.name}</span>
                                            {selectedModel === model.id && <CheckCircle className="w-4 h-4 text-primary" />}
                                        </div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                                                {model.type}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500">{model.description}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Upload & Results */}
                    <div className="lg:col-span-2 space-y-6">
                        <h3 className="font-semibold text-lg">2. Upload & Result</h3>

                        {/* Upload Area */}
                        {!result && (
                            <div
                                className={`border-2 border-dashed rounded-2xl h-80 flex flex-col items-center justify-center text-center p-8 transition-colors ${preview ? "border-primary/50 bg-primary/5" : "border-gray-300 hover:border-primary hover:bg-gray-50"
                                    }`}
                                onDragOver={handleDragOver}
                                onDrop={handleDrop}
                            >
                                {preview ? (
                                    <div className="relative w-full h-full flex flex-col items-center justify-center">
                                        <img src={preview} alt="Preview" className="max-h-56 rounded-lg shadow-sm object-contain" />
                                        <div className="mt-4 flex gap-3">
                                            <button
                                                onClick={reset}
                                                className="btn btn-outline text-sm py-1 px-3"
                                            >
                                                Remove
                                            </button>
                                            <button
                                                onClick={handleSubmit}
                                                disabled={loading}
                                                className="btn btn-primary text-sm py-1 px-3 flex items-center gap-2"
                                            >
                                                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Run Prediction"}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 bg-blue-100 text-primary rounded-full flex items-center justify-center mb-4">
                                            <Upload className="w-8 h-8" />
                                        </div>
                                        <h4 className="text-lg font-medium mb-2">Click or Drag X-Ray Image</h4>
                                        <p className="text-sm text-gray-500 max-w-sm mb-6">
                                            Supports JPG, PNG, DICOM (converted). Optimized for bone fracture detection.
                                        </p>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="btn btn-primary"
                                        >
                                            Select Image
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Loading State */}
                        {loading && !result && preview && (
                            <div className="p-8 text-center">
                                <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
                                <p className="text-gray-500">Running inference with {MODELS.find(m => m.id === selectedModel)?.name}...</p>
                            </div>
                        )}

                        {/* Error State */}
                        {error && (
                            <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200 flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5" />
                                {error}
                            </div>
                        )}

                        {/* Results View */}
                        {result && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="grid md:grid-cols-2 gap-6">
                                    {/* Result Image */}
                                    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                                        <h4 className="font-medium mb-3 text-sm text-gray-500">Processed Image</h4>
                                        <div className="aspect-square bg-black rounded-lg overflow-hidden relative flex items-center justify-center">
                                            {result.processed_image_base64 ? (
                                                <img src={`data:image/jpeg;base64,${result.processed_image_base64}`} className="max-w-full max-h-full" alt="Result" />
                                            ) : (
                                                <img src={preview!} className="max-w-full max-h-full opacity-80" alt="Original" />
                                            )}
                                            {/* Overlay simulation if no processed image returned yet */}
                                        </div>
                                    </div>

                                    {/* Result Details */}
                                    <div className="space-y-6">
                                        <div className="p-6 bg-card border border-border rounded-xl shadow-sm h-full">
                                            <h4 className="font-medium mb-6 text-sm text-gray-500 border-b pb-2">Analysis Report</h4>

                                            <div className="space-y-6">
                                                <div>
                                                    <p className="text-sm text-gray-500 mb-1">Prediction</p>
                                                    <p className="text-3xl font-bold flex items-center gap-3">
                                                        {result.prediction}
                                                        {(result.prediction || "").toLowerCase().includes("fracture") ? (
                                                            <AlertTriangle className="text-red-500 w-8 h-8" />
                                                        ) : (
                                                            <CheckCircle className="text-green-500 w-8 h-8" />
                                                        )}
                                                    </p>
                                                </div>

                                                <div>
                                                    <div className="flex justify-between items-end mb-2">
                                                        <p className="text-sm text-gray-500">Confidence Score</p>
                                                        <span className="text-xl font-bold">{(result.confidence * 100).toFixed(1)}%</span>
                                                    </div>
                                                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-1000 ${result.confidence > 0.8 ? 'bg-green-500' : 'bg-yellow-500'}`}
                                                            style={{ width: `${result.confidence * 100}%` }}
                                                        ></div>
                                                    </div>
                                                </div>

                                                <div className="pt-4 border-t border-dashed">
                                                    <p className="text-sm text-gray-500 mb-2">Model Used</p>
                                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 font-medium text-sm">
                                                        <Brain className="w-3 h-3" />
                                                        {MODELS.find(m => m.id === selectedModel)?.name}
                                                    </div>
                                                </div>

                                            </div>

                                            <div className="mt-8">
                                                <button onClick={reset} className="w-full btn btn-outline flex justify-center items-center gap-2">
                                                    <RefreshCcw className="w-4 h-4" /> Analyze Another Image
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
