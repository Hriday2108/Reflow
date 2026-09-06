'use client';

import { motion } from 'framer-motion';

interface ReflowLoaderProps {
  label?: string;
  text?: string;
}

export default function ReflowLoader({ label, text = 'REFLOW' }: ReflowLoaderProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#f5f0e8] select-none overflow-hidden">
      {/* Soft atmospheric gradient behind glass letters */}
      <div className="absolute w-[460px] h-[460px] rounded-full bg-gradient-to-tr from-[#b5651d]/15 via-[#e07b39]/10 to-[#1a1a2e]/5 blur-[120px] pointer-events-none" />

      {/* 3D Glass Stage */}
      <div className="reflow-loader-scene">
        <div className="reflow-loader-stage">
          <h1 className="reflow-loader-base">{text}</h1>
          <h1 className="reflow-loader-shine" aria-hidden="true">
            {text}
          </h1>
        </div>
      </div>

      {label && (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="mt-8 text-xs font-medium tracking-widest uppercase text-[#1a1a2e]/70 font-mono"
        >
          {label}
        </motion.p>
      )}
    </div>
  );
}
