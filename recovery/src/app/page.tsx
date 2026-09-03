'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Plane,
  Shield,
  Zap,
  BarChart3,
  ArrowRight,
  Sparkles,
  Globe,
  RefreshCw,
} from 'lucide-react';

const features = [
  {
    icon: Globe,
    title: 'Dependency Graph',
    description:
      'See your entire trip as an interconnected graph. Every flight, train, hotel, and activity linked to show exactly how one delay cascades.',
    color: 'text-indigo',
    bg: 'bg-indigo/10',
  },
  {
    icon: Zap,
    title: 'Instant Impact Analysis',
    description:
      'The moment a disruption hits, see every downstream booking at risk — with plain-language explanations of why each is affected.',
    color: 'text-disrupted',
    bg: 'bg-disrupted/10',
  },
  {
    icon: Shield,
    title: 'Smart Recovery Options',
    description:
      'Get 3 curated recovery plans ranked by cost, time, and convenience. Compare side-by-side with interactive charts.',
    color: 'text-confirmed',
    bg: 'bg-confirmed/10',
  },
  {
    icon: BarChart3,
    title: 'Proactive Risk Radar',
    description:
      'Spot tight connections and non-refundable risks before they become problems. Stay ahead of potential disruptions.',
    color: 'text-at-risk',
    bg: 'bg-at-risk/10',
  },
  {
    icon: RefreshCw,
    title: 'Live Itinerary Updates',
    description:
      'Select a recovery option and watch your itinerary update in real-time. Powered by live database subscriptions.',
    color: 'text-rebooked',
    bg: 'bg-rebooked/10',
  },
  {
    icon: Sparkles,
    title: 'Compound Disruptions',
    description:
      'Handle multiple simultaneous disruptions gracefully. Stack and resolve cascading failures across your entire trip.',
    color: 'text-indigo-light',
    bg: 'bg-indigo/10',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Plane className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">Reflow</span>
          </div>
          <Link href="/dashboard">
            <Button size="sm" className="gap-1.5 text-xs">
              Launch Demo
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-[400px] h-[400px] bg-disrupted/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-card/50 backdrop-blur-sm mb-6">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">
                Intelligent Travel Recovery Engine
              </span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6"
          >
            One disruption.
            <br />
            <span className="bg-gradient-to-r from-primary via-indigo-light to-rebooked bg-clip-text text-transparent">
              Zero panic.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Your trip is a chain of connected bookings. When one breaks, Reflow instantly
            maps the cascade, analyzes the impact, and generates smart recovery plans
            — so you can fix everything with one click.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex items-center justify-center gap-4"
          >
            <Link href="/dashboard">
              <Button size="lg" className="gap-2 text-sm px-8 h-12 shadow-lg shadow-primary/20">
                <Plane className="w-4 h-4" />
                Launch Demo
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>

          {/* Status indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex items-center justify-center gap-6 mt-12 text-xs text-muted-foreground"
          >
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-confirmed" />
              Confirmed
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-at-risk" />
              At Risk
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-disrupted" />
              Disrupted
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-rebooked" />
              Rebooked
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Features Grid ───────────────────────────────── */}
      <section className="py-20 px-6 border-t border-border/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              How it works
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              From disruption detection to itinerary recovery — all in real-time.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.08 }}
                >
                  <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 h-full hover:border-primary/30 hover:bg-card/80 transition-all duration-300 group">
                    <div
                      className={`w-10 h-10 rounded-xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                    >
                      <Icon className={`w-5 h-5 ${feature.color}`} />
                    </div>
                    <h3 className="text-base font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Demo Flow ───────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-border/30 bg-card/30">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Demo Flow
            </h2>
            <p className="text-muted-foreground">
              See Reflow in action with a realistic 4-day Italy trip.
            </p>
          </motion.div>

          <div className="space-y-4">
            {[
              { step: '1', text: 'View your 4-day multi-city Italy trip with 12 interconnected bookings' },
              { step: '2', text: 'Trigger a flight delay on Day 1 — watch the ripple hit transfers and hotel check-in' },
              { step: '3', text: 'Read the impact analysis explaining exactly what\'s at risk and why' },
              { step: '4', text: 'Compare 3 recovery options side-by-side with cost, time, and convenience metrics' },
              { step: '5', text: 'Select an option and watch the itinerary update live via real-time sync' },
              { step: '6', text: 'Bonus: Trigger a second disruption to test compound recovery handling' },
            ].map((item, idx) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08, duration: 0.4 }}
                className="flex items-start gap-4"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                  {item.step}
                </div>
                <p className="text-sm text-foreground/80 pt-1.5 leading-relaxed">
                  {item.text}
                </p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-12 text-center"
          >
            <Link href="/dashboard">
              <Button size="lg" className="gap-2 text-sm px-8 h-12">
                <Plane className="w-4 h-4" />
                Try It Now
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
