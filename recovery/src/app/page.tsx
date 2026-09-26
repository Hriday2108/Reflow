'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';
import StrokeText from '@/components/StrokeText';
import { useAuth } from '@/context/auth-context';
import {
  Plane,
  Train,
  Hotel,
  Car,
  Ticket,
  ArrowRight,
  Zap,
  Shield,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  BarChart3,
  Globe,
  Sparkles,
  FileText,
  Upload,
  Check,
  X,
  FileUp,
  Download,
} from 'lucide-react';

const JOURNEY_NODES = [
  { icon: Plane,  label: 'Flight',   status: 'confirmed', color: '#10b981' },
  { icon: Car,    label: 'Transfer', status: 'confirmed', color: '#10b981' },
  { icon: Train,  label: 'Train',    status: 'at-risk',   color: '#f59e0b' },
  { icon: Hotel,  label: 'Hotel',    status: 'at-risk',   color: '#f59e0b' },
  { icon: Ticket, label: 'Activity', status: 'confirmed', color: '#10b981' },
];

const FEATURES = [
  {
    icon: Globe,
    title: 'Detect',
    description: 'Real-time disruption detection across flights, trains, hotels, transfers, and activities.',
    color: '#60a5fa',
    glow: 'rgba(96,165,250,0.2)',
  },
  {
    icon: BarChart3,
    title: 'Understand',
    description: 'Analyze direct and downstream impact — see exactly which bookings are at risk and why.',
    color: '#a78bfa',
    glow: 'rgba(167,139,250,0.2)',
  },
  {
    icon: Sparkles,
    title: 'Recover',
    description: 'Generate multiple intelligent recovery plans ranked by cost, time, and convenience.',
    color: '#34d399',
    glow: 'rgba(52,211,153,0.2)',
  },
  {
    icon: RefreshCw,
    title: 'Rebook',
    description: 'Seamlessly update your itinerary with one click — all bookings sync automatically.',
    color: '#fb923c',
    glow: 'rgba(251,146,60,0.2)',
  },
];

const STEPS = [
  { num: '01', title: 'Detect', desc: 'Monitor your trip for real-time disruptions across all booking types.' },
  { num: '02', title: 'Analyze', desc: 'Map the ripple effect — identify every downstream booking at risk.' },
  { num: '03', title: 'Recommend', desc: 'Generate ranked recovery plans comparing cost, time, and convenience.' },
  { num: '04', title: 'Recover', desc: 'Apply the best plan with one click — your itinerary updates instantly.' },
];

const STATS = [
  { value: '12', label: 'Booking Types Supported' },
  { value: '4s', label: 'Avg Recovery Time' },
  { value: '3+', label: 'Recovery Plans Generated' },
  { value: '100%', label: 'Itinerary Preserved' },
];

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, openAuth, logout } = useAuth();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<'pdf' | 'text'>('pdf');
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: string; rawFile?: File } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [itineraryText, setItineraryText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    const sizeInKb = (file.size / 1024).toFixed(1) + ' KB';
    setSelectedFile({ name: file.name, size: sizeInKb, rawFile: file });
  };

  const handleUseIndianSamplePdf = () => {
    setSelectedFile({
      name: 'Air_India_Delhi_Mumbai_Goa_E-Ticket.pdf',
      size: '312.8 KB',
    });
  };
  const handleUseIndianSamplePnr = () => {
    setItineraryText(
      JSON.stringify(
        {
          pnr: 'AI-84920',
          traveler: 'Rahul Sharma',
          trip: 'Delhi - Mumbai - Goa Multi-City',
          bookings: [
            { type: 'FLIGHT', ref: 'AI 805', from: 'DEL (Indira Gandhi Int)', to: 'BOM (Chhatrapati Shivaji)', date: '2025-05-12' },
            { type: 'TRAIN', ref: 'Vande Bharat 22229', from: 'Mumbai CSMT', to: 'Madgaon Goa', date: '2025-05-13' },
            { type: 'HOTEL', ref: 'HTL-TAJ-GOA', name: 'Taj Exotica Resort & Spa Goa', nights: 3 },
            { type: 'TRANSFER', ref: 'TRF-GOA-CAB', route: 'Madgaon Junction to Benaulim Beach' },
          ],
        },
        null,
        2
      )
    );
  };

  const handleUseInternationalSamplePdf = () => {
    setSelectedFile({
      name: 'ITA_Airways_Rome_Naples_Confirmed_Tickets.pdf',
      size: '248.4 KB',
    });
  };

  const handleUseInternationalSamplePnr = () => {
    setItineraryText(
      JSON.stringify(
        {
          pnr: 'AZ-78921',
          traveler: 'Alex Morgan',
          trip: 'Rome & Amalfi Coast Disruption Test',
          bookings: [
            { type: 'FLIGHT', ref: 'AZ 110', from: 'FCO', to: 'NAP', date: '2025-05-12' },
            { type: 'TRAIN', ref: 'FR 9615', from: 'Roma Termini', to: 'Napoli Centrale' },
            { type: 'HOTEL', ref: 'HTL-8821', name: 'Grand Hotel Vesuvio', nights: 3 },
            { type: 'TRANSFER', ref: 'TRF-3301', route: 'Napoli to Positano' },
          ],
        },
        null,
        2
      )
    );
  };

  const handleAnalyze = async () => {
    if (!selectedFile && !itineraryText.trim()) return;
    setIsAnalyzing(true);
    setAnalysisStep(0);
    setAnalysisProgress(20);

    try {
      const formData = new FormData();
      if (uploadMode === 'pdf') {
        if (selectedFile?.rawFile) {
          formData.append('file', selectedFile.rawFile);
        } else if (selectedFile?.name) {
          try {
            const fileRes = await fetch(`/${selectedFile.name}`);
            if (fileRes.ok) {
              const blob = await fileRes.blob();
              formData.append('file', blob, selectedFile.name);
            }
          } catch (fetchErr) {
            console.warn('Preset file fetch fallback:', fetchErr);
          }
        }
      } else if (uploadMode === 'text') {
        formData.append('text', itineraryText);
      }

      setAnalysisStep(1);
      setAnalysisProgress(50);

      const res = await fetch('/api/parse-itinerary', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || `Server returned status ${res.status}`);
      }

      setAnalysisStep(2);
      setAnalysisProgress(92);
      
      setAnalysisProgress(100);
      
      // Navigate to the newly generated trip
      if (data?.tripId) {
        router.push(`/dashboard?tripId=${data.tripId}`);
      }
    } catch (error: any) {
      console.error("Error analyzing itinerary:", error);
      alert(error?.message || "Failed to analyze itinerary.");
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col text-foreground paper-bg">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 wandor-nav">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(181,101,29,0.12)', border: '1px solid rgba(181,101,29,0.25)' }}>
              <Plane className="w-4 h-4" style={{ color: '#8b3e17' }} />
            </div>
            <span className="text-lg font-bold tracking-widest" style={{ color: '#1a1a2e', fontFamily: 'var(--font-heading), Georgia, serif' }}>reflow</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm" style={{ color: 'oklch(0.45 0.025 70)' }}>
            <a href="#features" className="hover:text-foreground transition-colors uppercase tracking-widest text-xs font-semibold">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors uppercase tracking-widest text-xs font-semibold">How It Works</a>
            <a href="#demo" className="hover:text-foreground transition-colors uppercase tracking-widest text-xs font-semibold">Demo</a>
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-2 text-xs font-semibold text-foreground normal-case tracking-normal">
                  {user?.avatar && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={user.avatar} alt="" className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                  )}
                  {user?.name || user?.email}
                </span>
                <button
                  onClick={logout}
                  className="uppercase tracking-widest text-xs font-semibold hover:text-foreground transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={() => openAuth()}
                className="btn-wandor-secondary text-xs uppercase tracking-widest font-semibold px-4 py-2"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-36 pb-24 px-6 overflow-hidden">
        {/* Looping video background */}
        <video
          className="hero-video-bg"
          autoPlay
          muted
          loop
          playsInline
          poster="/hero-poster.jpg"
        >
          <source src="/hero-background.mp4" type="video/mp4" />
        </video>
        <div className="hero-video-overlay" />
        {/* Subtle dot grid, kept for texture over the video */}
        <div className="absolute inset-0 z-[1] pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(181,101,29,0.10) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="wandor-badge mb-8 mx-auto w-fit"
          >
            <Sparkles className="w-3.5 h-3.5" style={{ color: '#b5651d' }} />
            <span>✈ Intelligent Travel Recovery Engine</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08] mb-6 flex flex-col items-center"
            style={{ color: '#1a1a2e' }}
          >
            <span className="w-full max-w-[550px] sm:max-w-[700px] md:max-w-[900px] flex justify-center -my-2 md:-my-4">
              <StrokeText 
                text="When your journey is" 
                strokeColor="#1a1a2e" 
                fillColor="#1a1a2e" 
                fontSize={76}
                strokeWidth={2}
              />
            </span>
            <span className="w-full max-w-[300px] sm:max-w-[400px] md:max-w-[500px] flex justify-center -my-2 md:-my-4">
              <StrokeText 
                text="disrupted," 
                strokeColor="#b5651d" 
                fillColor="#b5651d" 
                fontSize={76}
                strokeWidth={2}
              />
            </span>
            <span className="w-full max-w-[650px] sm:max-w-[800px] md:max-w-[1000px] flex justify-center -my-2 md:-my-4">
              <StrokeText 
                text="your plans shouldn't be." 
                strokeColor="#1a1a2e" 
                fillColor="#1a1a2e" 
                fontSize={76}
                strokeWidth={2}
              />
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed text-gray-800 font-medium drop-shadow-sm"
          >
            Reflow detects disruptions, understands their ripple effects across your entire itinerary,
            and creates the best recovery options for your trip — instantly.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex items-center justify-center gap-4"
          >
            <button
              onClick={() => {
                if (isAuthenticated) {
                  setIsUploadModalOpen(true);
                } else {
                  // Require sign-in first; resume the upload flow on success.
                  openAuth(() => setIsUploadModalOpen(true));
                }
              }}
              className="btn-wandor-primary"
            >
              <Zap className="w-4 h-4" />
              Start Recovery
              <ArrowRight className="w-4 h-4" />
            </button>
            <Link href="/dashboard">
              <button className="btn-wandor-secondary">
                Explore Demo
              </button>
            </Link>
          </motion.div>

          {/* Status legend */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex items-center justify-center gap-6 mt-12 text-xs font-bold text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] tracking-wide"
          >
            {[
              { color: '#2d6a4f', label: 'Confirmed' },
              { color: '#c77b21', label: 'At Risk' },
              { color: '#c0392b', label: 'Disrupted' },
              { color: '#1a3c5e', label: 'Rebooked' },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                {s.label}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Connected journey visualizer */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="max-w-4xl mx-auto mt-16 relative z-10"
        >
          <div className="rounded-2xl p-6" style={{ background: 'rgba(255,252,245,0.85)', border: '1px solid rgba(181,101,29,0.15)', boxShadow: '0 4px 32px rgba(100,50,10,0.08)' }}>
            <p className="text-xs text-center mb-6 uppercase tracking-widest font-semibold" style={{ color: '#8b3e17' }}>
              Connected Itinerary — Your Journey
            </p>
            <div className="flex items-center justify-center gap-0">
              {JOURNEY_NODES.map((node, idx) => {
                const Icon = node.icon;
                const isLast = idx === JOURNEY_NODES.length - 1;
                return (
                  <div key={node.label} className="flex items-center">
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.6 + idx * 0.1, duration: 0.4 }}
                      className="flex flex-col items-center gap-2"
                    >
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center border"
                        style={{
                          backgroundColor: node.color + '15',
                          borderColor: node.color + '40',
                          boxShadow: `0 0 16px ${node.color}20`,
                        }}
                      >
                        <Icon className="w-6 h-6" style={{ color: node.color }} />
                      </div>
                      <span
                        className="text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: node.color }}
                      >
                        {node.label}
                      </span>
                      <span
                        className="text-[9px] font-medium uppercase tracking-wider opacity-70"
                        style={{ color: node.color }}
                      >
                        {node.status === 'confirmed' ? '✓ OK' : '⚠ Risk'}
                      </span>
                    </motion.div>
                    {!isLast && (
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: 0.65 + idx * 0.1, duration: 0.3 }}
                        className="flex items-center mx-2 md:mx-3"
                        style={{ originX: 0 }}
                      >
                        <div className="h-px w-8 md:w-12 bg-gradient-to-r from-border/80 to-border/20" />
                        <ArrowRight className="w-3 h-3 text-muted-foreground -ml-0.5 flex-shrink-0" />
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-6" style={{ borderTop: '1px solid rgba(181,101,29,0.15)' }}>
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#b5651d' }}>Capabilities</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight mb-4" style={{ color: '#1a1a2e' }}>
              Everything you need to recover
            </h2>
            <p className="max-w-lg mx-auto" style={{ color: 'oklch(0.50 0.025 70)' }}>
              From disruption detection to seamless itinerary recovery — all in seconds.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f, idx) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.08 }}
                  whileHover={{ y: -6, transition: { duration: 0.2 } }}
                  className="ref-card p-6 group cursor-default"
                  style={{ borderRadius: 16 }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                    style={{ backgroundColor: 'rgba(181,101,29,0.08)', border: '1px solid rgba(181,101,29,0.18)' }}
                  >
                    <Icon className="w-6 h-6" style={{ color: '#8b3e17' }} />
                  </div>
                  <h3 className="font-heading text-lg font-bold mb-2" style={{ color: '#1a1a2e' }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'oklch(0.50 0.025 70)' }}>{f.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-14 px-6" style={{ borderTop: '1px solid rgba(181,101,29,0.15)', background: 'rgba(181,101,29,0.03)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((s, idx) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className="ref-card p-5 text-center group hover:scale-[1.02] transition-transform"
              >
                <div className="font-heading text-4xl font-black gradient-text-terra mb-1.5">{s.value}</div>
                <div className="text-xs font-medium" style={{ color: 'oklch(0.50 0.025 70)' }}>{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-24 px-6" style={{ borderTop: '1px solid rgba(181,101,29,0.15)' }}>
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#b5651d' }}>Process</p>
            <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight mb-4" style={{ color: '#1a1a2e' }}>
              How Reflow Works
            </h2>
            <p className="max-w-lg mx-auto" style={{ color: 'oklch(0.50 0.025 70)' }}>
              Four steps from disruption to full recovery. No manual replanning required.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {STEPS.map((step, idx) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="relative"
              >
                <div className="ref-card p-6 h-full" style={{ borderRadius: 16 }}>
                  <div
                    className="font-heading text-5xl font-black mb-4 leading-none"
                    style={{ background: 'linear-gradient(135deg, rgba(181,101,29,0.55) 0%, rgba(139,62,23,0.35) 100%)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
                  >
                    {step.num}
                  </div>
                  <h3 className="font-heading text-base font-bold mb-2" style={{ color: '#1a1a2e' }}>{step.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'oklch(0.50 0.025 70)' }}>{step.desc}</p>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 z-10">
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Demo section ── */}
      <section id="demo" className="py-24 px-6" style={{ borderTop: '1px solid rgba(181,101,29,0.15)', background: 'rgba(181,101,29,0.03)' }}>
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl p-10 text-center"
            style={{ background: 'rgba(255,252,245,0.9)', border: '1px solid rgba(181,101,29,0.20)', boxShadow: '0 8px 40px rgba(100,50,10,0.08)' }}
          >
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(181,101,29,0.10)', border: '1px solid rgba(181,101,29,0.25)' }}>
              <Shield className="w-8 h-8" style={{ color: '#8b3e17' }} />
            </div>
            <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight mb-4" style={{ color: '#1a1a2e' }}>
              See Reflow in Action
            </h2>
            <p className="max-w-lg mx-auto mb-8 leading-relaxed" style={{ color: 'oklch(0.50 0.025 70)' }}>
              Experience a realistic 4-day Italy trip with 12 interconnected bookings.
              Trigger a flight delay — watch the ripple effect cascade, analyze the impact,
              compare recovery options, and apply the best plan.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 text-left">
              {[
                { icon: AlertTriangle, text: 'Trigger flight delays, cancellations, weather events', color: '#c0392b' },
                { icon: BarChart3,    text: 'See downstream impact across all connected bookings', color: '#c77b21' },
                { icon: CheckCircle2, text: 'Compare and apply the best recovery plan instantly',  color: '#2d6a4f' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.text} className="flex items-start gap-3 rounded-xl p-4" style={{ background: 'rgba(181,101,29,0.05)', border: '1px solid rgba(181,101,29,0.12)' }}>
                    <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: item.color }} />
                    <span className="text-sm" style={{ color: 'oklch(0.45 0.025 70)' }}>{item.text}</span>
                  </div>
                );
              })}
            </div>

            <Link href="/dashboard">
              <button className="btn-wandor-primary">
                <Plane className="w-4 h-4" />
                Launch Demo
                <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-6" style={{ borderTop: '1px solid rgba(181,101,29,0.15)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'rgba(181,101,29,0.12)', border: '1px solid rgba(181,101,29,0.22)' }}>
              <Plane className="w-3 h-3" style={{ color: '#8b3e17' }} />
            </div>
            <span className="font-heading text-sm font-bold tracking-widest" style={{ color: '#1a1a2e' }}>reflow</span>
          </div>
          <p className="text-xs" style={{ color: 'oklch(0.55 0.025 70)' }}>Travel Disruption Recovery Engine</p>
        </div>
      </footer>
      {/* ── Upload Modal ── */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(245,240,232,0.88)', backdropFilter: 'blur(8px)' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-xl rounded-2xl overflow-hidden flex flex-col"
              style={{ background: 'rgba(255,252,245,0.97)', border: '1px solid rgba(181,101,29,0.20)', boxShadow: '0 20px 60px rgba(100,50,10,0.15)' }}
            >
              {/* Modal Header */}
              <div className="p-6 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(181,101,29,0.12)' }}>
                <div>
                  <h3 className="font-heading font-bold text-lg flex items-center gap-2" style={{ color: '#1a1a2e' }}>
                    <Plane className="w-5 h-5" style={{ color: '#8b3e17' }} />
                    Import Your Travel Itinerary
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'oklch(0.55 0.025 70)' }}>
                    Upload an e-ticket PDF, booking confirmation, or PNR reference
                  </p>
                </div>
                <button
                  onClick={() => !isAnalyzing && setIsUploadModalOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                  style={{ color: 'oklch(0.55 0.025 70)' }}
                  disabled={isAnalyzing}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Mode Tabs */}
              {!isAnalyzing && (
                <div className="px-6 pt-4">
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl" style={{ background: 'rgba(181,101,29,0.06)', border: '1px solid rgba(181,101,29,0.12)' }}>
                    <button
                      onClick={() => setUploadMode('pdf')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                        uploadMode === 'pdf'
                          ? ''
                          : ''
                      }`}
                      style={uploadMode === 'pdf'
                        ? { background: '#1a1a2e', color: '#f5f0e8', boxShadow: '0 2px 8px rgba(26,26,46,0.2)' }
                        : { color: 'oklch(0.50 0.025 70)' }
                      }
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Upload PDF / E-Ticket
                    </button>
                    <button
                      onClick={() => setUploadMode('text')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all`}
                      style={uploadMode === 'text'
                        ? { background: '#1a1a2e', color: '#f5f0e8', boxShadow: '0 2px 8px rgba(26,26,46,0.2)' }
                        : { color: 'oklch(0.50 0.025 70)' }
                      }
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Paste PNR / JSON
                    </button>
                  </div>
                </div>
              )}

              {/* Modal Body */}
              <div className="p-6">
                {isAnalyzing ? (
                  /* ── Multi-Step AI Analysis Animation ── */
                  <div className="py-6 space-y-6">
                    <div className="text-center space-y-2">
                      <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/40 flex items-center justify-center mx-auto glow-blue">
                        <RefreshCw className="w-7 h-7 text-primary animate-spin" />
                      </div>
                      <h4 className="font-semibold text-base text-foreground">
                        {analysisProgress < 40
                          ? 'Reading & parsing travel document...'
                          : analysisProgress < 80
                          ? 'Extracting bookings with AI OCR...'
                          : 'Building dependency graph & detecting risks...'}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {selectedFile ? selectedFile.name : 'Booking Reference AZ-78921'}
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Analysis progress</span>
                        <span className="font-semibold text-primary">{analysisProgress}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-background/80 border border-border/40 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 via-primary to-emerald-400 transition-all duration-300 ease-out"
                          style={{ width: `${analysisProgress}%` }}
                        />
                      </div>
                    </div>

                    {/* Analysis Steps Checklist */}
                    <div className="space-y-2.5 pt-2">
                      {[
                        { step: 0, label: 'Read and decrypt document structure' },
                        { step: 1, label: 'Extract flights, hotels, trains, and layover buffers' },
                        { step: 2, label: 'Map dependency tree & calculate disruption exposure' },
                      ].map((item) => {
                        const isDone = analysisStep > item.step || analysisProgress >= 95;
                        const isCurrent = analysisStep === item.step && analysisProgress < 95;
                        return (
                          <div
                            key={item.step}
                            className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs transition-colors ${
                              isDone
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : isCurrent
                                ? 'bg-primary/10 border-primary/30 text-primary'
                                : 'bg-background/40 border-border/30 text-muted-foreground'
                            }`}
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            ) : isCurrent ? (
                              <RefreshCw className="w-4 h-4 text-primary animate-spin shrink-0" />
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-border/60 shrink-0" />
                            )}
                            <span>{item.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : uploadMode === 'pdf' ? (
                  /* ── PDF / E-Ticket Upload Tab ── */
                  <div className="space-y-4">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                    />

                    {!selectedFile ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) handleFileSelect(file);
                        }}
                        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                          isDragging
                            ? 'border-primary bg-primary/10 scale-[1.01]'
                            : 'border-border/60 hover:border-primary/60 hover:bg-accent/20 bg-background/40'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center text-primary glow-blue">
                          <FileUp className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            Click to browse or drag & drop your PDF
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Airline e-tickets, Booking.com confirmations, Train passes (PDF up to 15MB)
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* File Selected Card */
                      <div className="p-4 rounded-2xl bg-background/60 border border-border/50 flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {selectedFile.name}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                              <span>{selectedFile.size}</span>
                              <span>•</span>
                              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                <Check className="w-3 h-3" /> Ready for AI parsing
                              </span>
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedFile(null)}
                          className="w-7 h-7 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 flex items-center justify-center transition-colors ml-2 shrink-0"
                          title="Remove file"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Quick Demo Preset Buttons */}
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-primary" /> Test with sample ticket presets:
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleUseIndianSamplePdf}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-medium flex items-center gap-1.5 transition-all"
                        >
                          <span>🇮🇳</span>
                          <span>Air India: Delhi → Mumbai → Goa.pdf</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleUseInternationalSamplePdf}
                          className="text-xs px-2.5 py-1.5 rounded-lg glass hover:bg-accent/40 text-muted-foreground hover:text-foreground border border-border/50 font-medium flex items-center gap-1.5 transition-all"
                        >
                          <span>🌍</span>
                          <span>Rome → Naples Ticket.pdf</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── Paste PNR / JSON Tab ── */
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Enter your booking reference (PNR) or paste your confirmation email/JSON:
                    </p>
                    <textarea
                      className="w-full h-36 bg-background/50 border border-border/50 rounded-xl p-3.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none transition-all placeholder:text-muted-foreground/50"
                      placeholder='PNR: AI-84920&#10;Flight: AI 805 (DEL -> BOM)&#10;Connecting: Vande Bharat 22229 (Mumbai -> Goa)'
                      value={itineraryText}
                      onChange={(e) => setItineraryText(e.target.value)}
                    />
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-primary" /> Auto-fill sample itinerary:
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleUseIndianSamplePnr}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-medium flex items-center gap-1.5 transition-all"
                        >
                          <span>🇮🇳</span>
                          <span>Indian Itinerary (AI-84920)</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleUseInternationalSamplePnr}
                          className="text-xs px-2.5 py-1.5 rounded-lg glass hover:bg-accent/40 text-muted-foreground hover:text-foreground border border-border/50 font-medium flex items-center gap-1.5 transition-all"
                        >
                          <span>🌍</span>
                          <span>Europe Itinerary (AZ-78921)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              {!isAnalyzing && (
                <div className="p-6 flex items-center justify-between" style={{ borderTop: '1px solid rgba(181,101,29,0.12)' }}>
                  <button
                    onClick={() => setIsUploadModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold transition-colors"
                    style={{ color: 'oklch(0.55 0.025 70)' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAnalyze}
                    disabled={uploadMode === 'pdf' ? !selectedFile : !itineraryText.trim()}
                    className="btn-wandor-primary text-xs disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Zap className="w-4 h-4" />
                    Start Risk Analysis
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
