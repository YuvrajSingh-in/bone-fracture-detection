"use client";
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, XCircle, Terminal } from 'lucide-react';

export type SystemAlertProps = {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    onClose: () => void;
};

export default function SystemAlert({ message, type, onClose }: SystemAlertProps) {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 5000); // Auto dismiss after 5 seconds
        return () => clearTimeout(timer);
    }, [onClose]);

    const colors = {
        success: 'text-emerald-500 border-emerald-500/50 bg-emerald-500/10',
        error: 'text-red-500 border-red-500/50 bg-red-500/10',
        warning: 'text-yellow-500 border-yellow-500/50 bg-yellow-500/10',
        info: 'text-primary border-primary/50 bg-primary/10',
    };

    const icons = {
        success: <CheckCircle className="w-5 h-5" />,
        error: <XCircle className="w-5 h-5" />,
        warning: <AlertCircle className="w-5 h-5" />,
        info: <Terminal className="w-5 h-5" />,
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] min-w-[320px] max-w-[90vw] md:max-w-md p-4 rounded-lg border backdrop-blur-xl shadow-2xl flex items-start gap-4 ${colors[type]}`}
        >
            <div className="shrink-0 mt-0.5">
                {icons[type]}
            </div>
            <div className="flex-1">
                <h4 className="font-bold font-mono text-sm uppercase tracking-wider mb-1">
                    {type === 'error' ? 'SYSTEM FAILURE' : type === 'success' ? 'OPERATION SUCCESSFUL' : 'SYSTEM ALERT'}
                </h4>
                <p className="text-xs md:text-sm font-mono opacity-90 break-words">
                    {message}
                </p>
            </div>
            <button
                onClick={onClose}
                className="shrink-0 hover:bg-white/10 p-1 rounded transition-colors"
                aria-label="Close"
            >
                <XCircle className="w-4 h-4 opacity-50" />
            </button>

            {/* Scanline effect */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg opacity-20">
                <div className="w-full h-full bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px]" />
            </div>
        </motion.div>
    );
}
