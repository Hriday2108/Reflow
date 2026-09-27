'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './cinema-scroll.css';

interface CinemaHeroProps {
  onOpenUpload?: () => void;
  onExploreDashboard?: () => void;
}

// Mathematical helpers
const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const smoothstep = (e0: number, e1: number, v: number) => {
  const x = clamp((v - e0) / (e1 - e0));
  return x * x * (3 - 2 * x);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const segmentInOut = (s: number, a: number, b: number, c: number, d: number) => {
  const enter = smoothstep(a, b, s);
  const exit = smoothstep(c, d, s);
  return { enter, exit, active: enter * (1 - exit) };
};

export default function CinemaHero({ onOpenUpload, onExploreDashboard }: CinemaHeroProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const section = sectionRef.current;
    if (!container || !section) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    let targetMouseX = 0;
    let targetMouseY = 0;
    let mouseX = 0;
    let mouseY = 0;
    let targetScroll = 0;
    let smoothScroll = 0;
    let initialized = false;
    let rafPending = false;
    let animationFrameId: number;

    // Cache metrics to completely eliminate layout thrashing
    let containerTop = 0;
    let maxScroll = 2200;

    const updateBounds = () => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      containerTop = rect.top + window.scrollY;
      maxScroll = Math.max(0, container.offsetHeight - window.innerHeight);
    };

    updateBounds();

    const getScrollDistance = () => {
      const scrollY = window.scrollY || window.pageYOffset || 0;
      return clamp(scrollY - containerTop, 0, maxScroll);
    };

    const update = () => {
      rafPending = false;
      targetScroll = getScrollDistance();

      if (!initialized || mediaQuery.matches) {
        smoothScroll = targetScroll;
        initialized = true;
      } else {
        smoothScroll = lerp(smoothScroll, targetScroll, 0.3);
      }
      if (Math.abs(smoothScroll - targetScroll) < 0.15) {
        smoothScroll = targetScroll;
      }

      mouseX = lerp(mouseX, targetMouseX, 0.2);
      mouseY = lerp(mouseY, targetMouseY, 0.2);

      // Act 1: Intro Exit
      const introExit = smoothstep(90, 600, smoothScroll);

      // Act 2: Bridge Disruption Metrics
      const frame2 = segmentInOut(smoothScroll, 500, 850, 1150, 1450);

      // Act 3: Final Stage (Autonomous Recovery Dashboard) - enters and locks permanently
      const frame3Enter = smoothstep(1350, 1850, smoothScroll);

      const progress = clamp(smoothScroll / 1900);
      const blurActive = clamp(frame2.active + frame3Enter);
      const frame2Opacity = frame2.active * (1 - frame3Enter);
      const splitDrift = Math.pow(frame2.enter, 1.5);
      const panel2Opacity = frame2.active * (1 - frame2.exit);
      const panel3Opacity = frame3Enter; // Stays permanently visible as the final stage!

      const backScale = 0.76 + progress * 0.2 + frame2.enter * 0.18 + frame3Enter * 0.16;
      const sharedHeroY = progress * -74;
      const sharedHeroScale = progress * 0.23;

      // Scoped CSS variable writes
      const s = container.style;
      const setV = (name: string, val: string) => {
        s.setProperty(name, val);
      };

      setV('--mx', mediaQuery.matches ? '0' : mouseX.toFixed(4));
      setV('--my', mediaQuery.matches ? '0' : mouseY.toFixed(4));
      setV('--back-opacity', `${1 - frame2.active * 0.06}`);
      setV('--back-x', `${mouseX * -12}px`);
      setV('--back-y', `${mouseY * -4}px`);
      setV('--back-scale', `${backScale}`);
      setV('--four-y', `${10 + progress * 10}vh`);
      setV('--four-scale', `${0.78 + progress * 0.16}`);
      setV('--bazaar-y', `${20 - progress * 8}vh`);
      setV('--shade-opacity', `${blurActive}`);
      setV('--shade-z', frame2.active > 0.02 ? '2' : '0');

      setV('--title-y', `${introExit * -210}px`);
      setV('--title-scale', `${1 - introExit * 0.08}`);
      setV('--title-opacity', `${1 - introExit}`);

      setV('--bridge-x', `calc(-50% + ${mouseX * 18}px)`);
      setV('--bridge-y', `${mouseY * 8 + sharedHeroY - frame2.exit * 760}px`);
      setV('--bridge-bottom', `${5 - frame2.enter * 13}vh`);
      setV('--bridge-width', `${67.2 + frame2.enter * 37.8}vw`);
      setV('--bridge-scale', `${1.02 + sharedHeroScale + frame2.exit * 0.46}`);

      setV('--split-left-x', `calc(-50% + ${-splitDrift * 46}vw + ${mouseX * 22}px)`);
      setV('--split-left-y', `${mouseY * 10 + sharedHeroY - splitDrift * 180}px`);
      setV('--split-left-scale', `${1 + sharedHeroScale + frame2.enter * 0.74}`);
      setV('--split-right-x', `calc(-50% + ${splitDrift * 46}vw + ${mouseX * 22}px)`);
      setV('--split-right-y', `${mouseY * 10 + sharedHeroY - splitDrift * 180}px`);
      setV('--split-right-scale', `${1 + sharedHeroScale + frame2.enter * 0.74}`);

      setV('--frame2-opacity', `${frame2Opacity}`);
      setV('--frame2-x', `calc(-50% + ${mouseX * 10}px)`);
      setV('--frame2-y', `calc(-50% + ${mouseY * 8 - frame2.exit * 150}px)`);
      setV('--frame2-scale', `${1.06 + frame2.enter * 0.08 + frame2.exit * 0.08}`);

      setV('--intro-copy-y', `${introExit * 90}px`);
      setV('--intro-copy-opacity', `${1 - introExit}`);
      setV('--panel2-opacity', `${panel2Opacity}`);
      setV('--panel2-y', `calc(-50% + ${-frame2.exit * 86 + (1 - frame2.enter) * 58}px)`);
      
      // Final stage panel: slides into center and stays permanently
      setV('--panel3-opacity', `${panel3Opacity}`);
      setV('--panel3-y', `calc(-50% + ${(1 - frame3Enter) * 58}px)`);

      if (
        Math.abs(smoothScroll - targetScroll) > 0.1 ||
        Math.abs(mouseX - targetMouseX) > 0.001 ||
        Math.abs(mouseY - targetMouseY) > 0.001
      ) {
        rafPending = true;
        animationFrameId = requestAnimationFrame(update);
      }
    };

    const requestTick = () => {
      if (!rafPending) {
        rafPending = true;
        animationFrameId = requestAnimationFrame(update);
      }
    };

    const handleScroll = () => {
      requestTick();
    };

    const handleResize = () => {
      updateBounds();
      requestTick();
    };

    const handlePointerMove = (e: PointerEvent) => {
      targetMouseX = e.clientX / window.innerWidth - 0.5;
      targetMouseY = e.clientY / window.innerHeight - 0.5;
      requestTick();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('wheel', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    // Initial trigger
    requestTick();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('wheel', handleScroll);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div ref={containerRef} className="cinema-scroll">
      <section ref={sectionRef} id="cinema" className="stage" aria-label="Reflow cinematic scroll story">
        <div className="world">
          {/* Sky / Horizon */}
          <img
            className="scene-img sky-img"
            alt=""
            src="https://raft-blast-61784561.figma.site/_assets/v11/16b5007d9c93971e26ffe4e0e3e37946f6bd538c.png"
          />

          {/* Primary Navigation */}
          <header className="site-header" aria-label="Primary navigation">
            <Link href="#cinema" className="site-logo">
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
              REFLOW
            </Link>

            <div className="header-actions">
              <button
                type="button"
                className="header-cta"
                onClick={onExploreDashboard || (() => router.push('/dashboard'))}
              >
                <span>Launch Simulation</span>
                <span aria-hidden="true">↗</span>
              </button>
              <div className="language-switcher" aria-label="System status">
                <span style={{ color: '#10b981', fontSize: 13 }}>● LIVE</span>
              </div>
            </div>
          </header>

          {/* Back Stack */}
          <div className="back-stack">
            <img
              className="scene-img back-img back-four"
              alt=""
              src="https://raft-blast-61784561.figma.site/_assets/v11/8a7f8af50e0ce92ec2e228e7b0b4112178c51cf1.png"
            />
            <img
              className="scene-img back-img back-bazaar"
              alt=""
              src="https://raft-blast-61784561.figma.site/_assets/v11/864afe00e41e2fa20a5aa546e15cb807e0f81384.png"
            />
          </div>

          {/* Hero Title */}
          <h1 className="hero-title">REFLOW</h1>

          {/* Splitframe Layers */}
          <img
            className="scene-img splitframe-img splitframe-left"
            alt=""
            src="https://raft-blast-61784561.figma.site/_assets/v11/7536d7b60a1fce482cf6edf3f0bffd3bad5d0f8a.png"
          />
          <img
            className="scene-img splitframe-img splitframe-right"
            alt=""
            src="https://raft-blast-61784561.figma.site/_assets/v11/392db6a6a6b98e868bd7f8d3f55bb719d51e5028.png"
          />

          {/* Foreground Bridge */}
          <img
            className="scene-img bridge-img"
            alt=""
            src="https://raft-blast-61784561.figma.site/_assets/v11/c6a6d8ef49bca43f708aa852692942c45ec950d4.png"
          />

          {/* Frame-Two River Close-up */}
          <img
            className="scene-img frame-two-img"
            alt=""
            src="https://raft-blast-61784561.figma.site/_assets/v11/ba75252bab2b1c510987b74837770f7bc8a6b2d4.png"
          />

          {/* Atmospheric Blue Gradient Shade */}
          <div className="shade" />

          {/* Act 1: Intro Copy */}
          <section className="intro-copy" aria-label="Reflow overview">
            <p>
              When a single flight, train, or transfer breaks, downstream bookings shatter.
              Reflow automates topological cascade recovery in real time.
            </p>
            <div className="hero-tags" aria-label="Reflow quick actions">
              <button
                type="button"
                className="primary-tag"
                onClick={onOpenUpload || (() => router.push('/dashboard'))}
              >
                Upload E-Ticket PDF
              </button>
            </div>
          </section>

          {/* Act 2: Bridge Story Panel (Disruption Metrics) */}
          <section className="story-panel story-panel-bridge" aria-label="Disruption recovery metrics">
            <h2>Cascades break journeys. Reflow heals them.</h2>
            <p>
              Real-time BFS graph propagation pinpoints downstream risks and protects non-refundable deposits before you even land.
            </p>
          </section>

          {/* Act 3: FINAL STAGE (Autonomous Recovery Dashboard) */}
          <section className="story-panel story-panel-bazaar" aria-label="Autonomous recovery engine">
            <h2>Autonomous recovery before you reach the airport.</h2>
            <p>
              Multimodal document ingestion extracts your full itinerary. If a connection is missed, alternative routes are ranked by cost, time, and convenience.
            </p>
            <button
              type="button"
              className="note-button"
              onClick={onExploreDashboard || (() => router.push('/dashboard'))}
            >
              <span aria-hidden="true">↗</span>
              <span>Open Recovery Dashboard</span>
            </button>
          </section>
        </div>
      </section>
    </div>
  );
}
