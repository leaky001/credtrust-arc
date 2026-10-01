"use client";

import Link from "next/link";
import {
  ArrowRight,
  Shield,
  TrendingUp,
  Wallet,
  Zap,
  Globe,
  Lock,
  BarChart3,
  ChevronDown,
  CheckCircle,
  Star,
  Users,
} from "lucide-react";
import {
  motion,
  useInView,
  useScroll,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { ConnectPrompt } from "@/components/home/ConnectPrompt";

// ──────────────────────────────────────────────────────────────────────────────
// ANIMATION VARIANTS
// ──────────────────────────────────────────────────────────────────────────────
const easeCustom = [0.22, 1, 0.36, 1] as const;

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: easeCustom } },
};

const fadeInScale = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: easeCustom } },
};

// ──────────────────────────────────────────────────────────────────────────────
// TRUSTMESH MOTION GRAPHIC
// ──────────────────────────────────────────────────────────────────────────────

function TrustMesh() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 2000);
    return () => clearInterval(id);
  }, []);

  const nodes = [
    { id: "center", cx: 200, cy: 200, r: 28, primary: true },
    { id: "n1", cx: 200, cy: 80, r: 16, primary: false },
    { id: "n2", cx: 310, cy: 145, r: 14, primary: false },
    { id: "n3", cx: 320, cy: 260, r: 18, primary: false },
    { id: "n4", cx: 200, cy: 325, r: 14, primary: false },
    { id: "n5", cx: 85, cy: 260, r: 16, primary: false },
    { id: "n6", cx: 78, cy: 145, r: 12, primary: false },
    { id: "n7", cx: 350, cy: 80, r: 10, primary: false },
    { id: "n8", cx: 50, cy: 200, r: 10, primary: false },
    { id: "n9", cx: 350, cy: 330, r: 10, primary: false },
  ];

  const edges = [
    ["center", "n1"], ["center", "n2"], ["center", "n3"],
    ["center", "n4"], ["center", "n5"], ["center", "n6"],
    ["n1", "n2"], ["n2", "n3"], ["n3", "n4"],
    ["n4", "n5"], ["n5", "n6"], ["n6", "n1"],
    ["n2", "n7"], ["n5", "n8"], ["n3", "n9"],
  ];

  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const pulseEdges = [
    ["center", "n2"],
    ["center", "n5"],
    ["n1", "n2"],
    ["n3", "n4"],
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: easeCustom, delay: 0.2 }}
      className="relative w-full max-w-[420px] mx-auto select-none"
    >
      <svg viewBox="0 0 400 400" className="w-full h-full relative z-10" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="nodeGrad" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#1FA774" />
            <stop offset="100%" stopColor="#123C3A" />
          </radialGradient>
          <radialGradient id="nodeGradAccent" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#7DE2B1" />
            <stop offset="100%" stopColor="#1FA774" />
          </radialGradient>
          <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1FA774" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#7DE2B1" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Edge connections */}
        {edges.map(([a, b]) => {
          const na = nodeMap[a]; const nb = nodeMap[b];
          return (
            <line
              key={`${a}-${b}`}
              x1={na.cx} y1={na.cy}
              x2={nb.cx} y2={nb.cy}
              stroke="url(#edgeGrad)"
              strokeWidth="1"
              opacity="0.35"
            />
          );
        })}

        {/* Animated pulse along edges */}
        {pulseEdges.map(([a, b], i) => {
          const na = nodeMap[a]; const nb = nodeMap[b];
          return (
            <motion.circle
              key={`pulse-${i}-${tick}`}
              r="3"
              fill="#7DE2B1"
              cx={na.cx} cy={na.cy} opacity={0.9}
              initial={{ cx: na.cx, cy: na.cy, opacity: 0.9 }}
              animate={{ cx: nb.cx, cy: nb.cy, opacity: 0 }}
              transition={{ duration: 1.2, delay: i * 0.35, ease: "easeIn" }}
            />
          );
        })}

        {/* Satellite nodes */}
        {nodes.filter((n) => !n.primary).map((node, i) => (
          <motion.g key={node.id}>
            <motion.circle
              cx={node.cx} cy={node.cy} r={node.r + 6}
              initial={{ r: node.r + 6 }}
              fill="#1FA774"
              opacity={0.06}
              animate={{ r: [node.r + 6, node.r + 10, node.r + 6] }}
              transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
            />
            <circle
              cx={node.cx} cy={node.cy} r={node.r}
              fill="#0B1F26"
              stroke="#1FA774"
              strokeWidth="1.2"
              strokeOpacity="0.5"
            />
            <motion.circle
              cx={node.cx} cy={node.cy} r={node.r * 0.45}
              fill="#7DE2B1"
              opacity={0.5}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2 + i * 0.4, repeat: Infinity, delay: i * 0.25 }}
            />
          </motion.g>
        ))}

        {/* Central node — trust shield */}
        <motion.g>
          {/* Outer ring */}
          <motion.circle
            cx={200} cy={200} r={40}
            initial={{ r: 40 }}
            fill="#1FA774"
            opacity={0.08}
            animate={{ r: [40, 48, 40] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Middle ring */}
          <circle cx={200} cy={200} r={34} fill="#0B1F26" stroke="#1FA774" strokeWidth="1.5" strokeOpacity="0.8" />
          {/* Core */}
          <circle cx={200} cy={200} r={28} fill="url(#nodeGrad)" opacity={0.95} />
          {/* Shield icon */}
          <path
            d="M200 186 C200 186 190 190 190 198 L190 204 C190 209 195 214 200 216 C205 214 210 209 210 204 L210 198 C210 190 200 186 200 186Z"
            fill="white"
            opacity={0.95}
          />
        </motion.g>

        {/* Score badge floating near center */}
        <motion.g
          animate={{ y: [-3, 3, -3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <rect x="135" y="240" width="84" height="28" rx="14" fill="#0B1F26" stroke="#7DE2B1" strokeWidth="1" strokeOpacity="0.8" />
          <text x="177" y="253" textAnchor="middle" dominantBaseline="middle" fill="#7DE2B1" fontSize="9" fontWeight="700" fontFamily="Inter, system-ui, sans-serif" letterSpacing="0.5">
            SCORE: 847
          </text>
          <circle cx="147" cy="254" r="5" fill="#1FA774" opacity={0.9} />
        </motion.g>
      </svg>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// SECTION REVEAL
// ──────────────────────────────────────────────────────────────────────────────
function RevealSection({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      variants={itemVariants}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// CARD HOVER EFFECT
// ──────────────────────────────────────────────────────────────────────────────
function GlowCard({
  children,
  className = "",
  glowColor = "primary",
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: "primary" | "accent";
}) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.25, ease: easeCustom }}
      className={`relative group overflow-hidden rounded-2xl glass-card p-6 transition-shadow duration-300
        hover:shadow-glow-${glowColor} ${className}`}
    >
      {/* Subtle inner glare */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 50% 0%, hsl(var(--${glowColor === "primary" ? "primary" : "accent"}) / 0.08) 0%, transparent 70%)`,
        }}
      />
      {children}
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// STAT COUNTER
// ──────────────────────────────────────────────────────────────────────────────
function StatCard({ value, label, icon: Icon }: { value: string; label: string; icon: React.ElementType }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: easeCustom }}
      className="flex flex-col items-center gap-2 text-center"
    >
      <div className="flex size-10 items-center justify-center rounded-xl bg-primary-500/10 dark:bg-primary-400/10">
        <Icon className="size-5 text-primary-500 dark:text-primary-400" strokeWidth={1.5} />
      </div>
      <div className="text-h2 font-bold tracking-tight text-gray-900 dark:text-white">{value}</div>
      <div className="text-small text-gray-500 dark:text-gray-400">{label}</div>
    </motion.div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ──────────────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Global ambient background */}
      <div className="fixed inset-0 -z-10 bg-background" />
      <div
        className="fixed inset-0 -z-10 opacity-40 dark:opacity-60"
        style={{
          background: `radial-gradient(ellipse 70% 40% at 50% -5%, rgba(31, 167, 116, 0.08), transparent),
                       radial-gradient(ellipse 50% 30% at 85% 75%, rgba(18, 60, 58, 0.06), transparent)`,
        }}
      />

      {/* ── HERO ── */}
      <section
        ref={heroRef}
        className="relative flex min-h-[100svh] items-center overflow-hidden px-4 pt-20 pb-8 sm:px-6 lg:px-8"
      >
        {/* Background grid */}
        <div
          className="absolute inset-0 -z-10 opacity-[0.02] dark:opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)`,
            backgroundSize: "64px 64px",
          }}
        />

        <motion.div style={{ opacity: heroOpacity, y: heroY }} className="mx-auto w-full max-w-container-xl">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16 xl:gap-24">

            {/* LEFT — content */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="flex flex-col items-start"
            >
              {/* Badge */}
              <motion.div variants={itemVariants}>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary-500/25 dark:border-primary-400/20 bg-primary-500/8 dark:bg-primary-400/10 px-4 py-1.5 text-caption font-semibold uppercase tracking-widest text-primary-600 dark:text-primary-400 mb-6">
                  <Zap className="size-3" strokeWidth={2.5} />
                  Built on Arc Mainnet
                </div>
              </motion.div>

              {/* Headline */}
              <motion.h1
                variants={itemVariants}
                className="text-[2.6rem] font-extrabold leading-[1.1] tracking-tight text-brand-text dark:text-white sm:text-[3.5rem] xl:text-[4.25rem]"
              >
                Your Reputation.{" "}
                <span
                  className="inline-block bg-clip-text text-transparent"
                  style={{
                    backgroundImage: "linear-gradient(135deg, #1FA774 0%, #7DE2B1 100%)",
                  }}
                >
                  Your Credit.
                </span>{" "}
                <br className="hidden sm:block" />
                On-Chain Forever.
              </motion.h1>

              {/* Sub-copy */}
              <motion.p
                variants={itemVariants}
                className="mt-6 max-w-lg text-body-lg leading-relaxed text-gray-600 dark:text-gray-400"
              >
                CredTrust Arc transforms your on-chain transaction history into a portable, trust-based credit profile — letting you borrow and lend globally without borders or collateral walls.
              </motion.p>

              {/* CTAs */}
              <motion.div variants={itemVariants} className="mt-10 flex flex-wrap items-center gap-3.5">
                <Link href="/loans/create">
                  <Button
                    size="lg"
                    className="group h-12 gap-2 rounded-full bg-[#1FA774] hover:bg-[#18885e] text-white px-7 text-[15px] font-semibold shadow-md shadow-emerald-600/20 transition-all duration-200 hover:scale-[1.01]"
                  >
                    Request a Loan
                    <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-1" strokeWidth={2.5} />
                  </Button>
                </Link>
                <Link href="/loans">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="h-12 rounded-full border border-border/70 px-7 text-[15px] font-semibold text-brand-text hover:bg-surface-secondary dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
                  >
                    Browse Market
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button
                    variant="ghost"
                    size="lg"
                    className="h-12 rounded-full px-5 text-[15px] font-semibold text-brand-muted hover:text-brand-text dark:text-gray-300 dark:hover:text-white"
                  >
                    Open App &rarr;
                  </Button>
                </Link>
              </motion.div>

              {/* Social proof */}
              <motion.div
                variants={itemVariants}
                className="mt-10 flex flex-wrap items-center gap-6 border-t border-border/40 pt-8"
              >
                {[
                  { label: "Verified Loans", value: "2,400+" },
                  { label: "Avg. Credit Score", value: "740" },
                  { label: "Protocol TVL", value: "$1.2M" },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="text-h4 font-extrabold tracking-tight text-gray-900 dark:text-white">{s.value}</div>
                    <div className="text-caption text-gray-500 dark:text-gray-500">{s.label}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* RIGHT — Motion Graphic */}
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.9, ease: easeCustom, delay: 0.2 }}
              className="flex items-center justify-center"
            >
              <TrustMesh />
            </motion.div>
          </div>

          {/* Scroll hint */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.8 }}
            className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 lg:flex"
          >
            <span className="text-caption text-gray-400 dark:text-gray-600 tracking-widest uppercase">Scroll</span>
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <ChevronDown className="size-4 text-gray-400 dark:text-gray-600" />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── SOCIAL PROOF BAR ── */}
      <section className="section-border-top border-b border-border/40 bg-surface/50 dark:bg-surface/30 py-8">
        <div className="mx-auto max-w-container-xl px-4 sm:px-6 lg:px-8">
          <RevealSection>
            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-16">
              {[
                { icon: Users, value: "12,000+", label: "Active Users" },
                { icon: Globe, value: "40+", label: "Countries" },
                { icon: Shield, value: "100%", label: "On-Chain Trust" },
                { icon: BarChart3, value: "$0", label: "Collateral Needed" },
              ].map((s) => (
                <StatCard key={s.label} value={s.value} label={s.label} icon={s.icon} />
              ))}
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ── PROBLEM / SOLUTION ── */}
      <section className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-container-xl px-4 sm:px-6 lg:px-8">
          <RevealSection>
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <div className="mb-4 inline-block rounded-full border border-border px-4 py-1.5 text-caption font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                The Problem
              </div>
              <h2 className="text-h1 font-extrabold tracking-tight text-gray-900 dark:text-white">
                Traditional credit is{" "}
                <span className="text-[#DC2626] dark:text-[#F87171]">
                  broken.
                </span>
              </h2>
              <p className="mt-4 text-body-lg text-gray-500 dark:text-gray-400">
                Billions globally are locked out of credit by geography, lack of collateral, or opaque scoring systems they can never improve.
              </p>
            </div>
          </RevealSection>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              {
                icon: Globe,
                title: "Geographical Barriers",
                desc: "Credit is tied to local borders, leaving billions in underbanked regions without access.",
                color: "primary",
              },
              {
                icon: Lock,
                title: "Collateral Walls",
                desc: "Requiring 150%+ collateral defeats the purpose of borrowing entirely.",
                color: "accent",
              },
              {
                icon: BarChart3,
                title: "Opaque Scoring",
                desc: "Centralised bureaus use algorithms users can't see, verify, or meaningfully improve.",
                color: "primary",
              },
            ].map((item, i) => (
              <RevealSection key={item.title} delay={i * 0.1}>
                <GlowCard glowColor={item.color as "primary" | "accent"}>
                  <div className={`mb-4 flex size-11 items-center justify-center rounded-xl bg-${item.color}-500/10 dark:bg-${item.color}-400/10`}>
                    <item.icon className={`size-5 text-${item.color}-600 dark:text-${item.color}-400`} strokeWidth={1.5} />
                  </div>
                  <h3 className="mb-2 font-bold text-gray-900 dark:text-white">{item.title}</h3>
                  <p className="text-small leading-relaxed text-gray-500 dark:text-gray-400">{item.desc}</p>
                </GlowCard>
              </RevealSection>
            ))}
          </div>

          {/* Solution Block */}
          <RevealSection delay={0.1}>
            <div className="mt-12 overflow-hidden rounded-3xl relative">
              <div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(135deg, #0B1F26 0%, #123C3A 100%)",
                }}
              />
              <div className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: "radial-gradient(circle at 70% 50%, white 0%, transparent 60%)",
                }}
              />
              <div className="relative z-10 grid grid-cols-1 gap-8 p-8 sm:p-12 lg:grid-cols-2 lg:items-center lg:gap-16">
                <div>
                  <div className="mb-4 inline-block rounded-full border border-white/20 px-4 py-1.5 text-caption font-semibold uppercase tracking-widest text-white/80">
                    The Solution
                  </div>
                  <h3 className="text-h2 font-extrabold text-white">The CredTrust Arc Protocol</h3>
                  <p className="mt-4 text-body leading-relaxed text-white/80">
                    By leveraging Arc Mainnet settlement, we turn repayment history into a portable, on-chain reputation asset you own forever.
                  </p>
                </div>
                <ul className="space-y-4">
                  {[
                    "Global Access: Borrow from anywhere, lend to anywhere.",
                    "Reputation over Assets: Your history is your collateral.",
                    "Immutable Records: Good repayment history is etched on-chain.",
                    "Trustless Execution: Smart contracts, zero middlemen.",
                  ].map((point) => (
                    <li key={point} className="flex items-start gap-3">
                      <CheckCircle className="mt-0.5 size-5 shrink-0 text-white/80" strokeWidth={2} />
                      <span className="text-small font-medium text-white/90">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="section-border-top py-24 sm:py-32">
        <div className="mx-auto max-w-container-xl px-4 sm:px-6 lg:px-8">
          <RevealSection>
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <div className="mb-4 inline-block rounded-full border border-border px-4 py-1.5 text-caption font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                Features
              </div>
              <h2 className="text-h1 font-extrabold tracking-tight text-gray-900 dark:text-white">
                Built for the{" "}
                <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, #1FA774, #7DE2B1)" }}>
                  next billion
                </span>
              </h2>
            </div>
          </RevealSection>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Globe,
                title: "Portable Reputation",
                desc: "Your credit profile travels with you across chains, wallets, and borders.",
                glowColor: "primary" as const,
              },
              {
                icon: Shield,
                title: "No Heavy Collateral",
                desc: "Replace asset lock-ups with on-chain trust and repayment history.",
                glowColor: "accent" as const,
              },
              {
                icon: BarChart3,
                title: "Transparent Risk",
                desc: "Trust scores are fully auditable — no black-box algorithms.",
                glowColor: "primary" as const,
              },
              {
                icon: Zap,
                title: "Instant Settlement",
                desc: "Smart contracts execute funds the moment conditions are met.",
                glowColor: "accent" as const,
              },
            ].map((f, i) => (
              <RevealSection key={f.title} delay={i * 0.08}>
                <GlowCard glowColor={f.glowColor} className="h-full">
                  <div className={`mb-5 flex size-12 items-center justify-center rounded-2xl ${f.glowColor === "primary" ? "bg-primary-500/10 dark:bg-primary-400/10" : "bg-accent-500/10 dark:bg-accent-400/10"}`}>
                    <f.icon className={`size-6 ${f.glowColor === "primary" ? "text-primary-600 dark:text-primary-400" : "text-accent-600 dark:text-accent-400"}`} strokeWidth={1.5} />
                  </div>
                  <h3 className="mb-2 text-h4 font-bold text-gray-900 dark:text-white">{f.title}</h3>
                  <p className="text-small leading-relaxed text-gray-500 dark:text-gray-400">{f.desc}</p>
                </GlowCard>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="section-border-top py-24 sm:py-32 bg-surface/30 dark:bg-surface/20">
        <div className="mx-auto max-w-container-xl px-4 sm:px-6 lg:px-8">
          <RevealSection>
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <div className="mb-4 inline-block rounded-full border border-border px-4 py-1.5 text-caption font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                How It Works
              </div>
              <h2 className="text-h1 font-extrabold tracking-tight text-gray-900 dark:text-white">
                Simple as <span className="bg-clip-text text-transparent" style={{ backgroundImage: "linear-gradient(135deg, #1FA774, #7DE2B1)" }}>1, 2, 3</span>
              </h2>
            </div>
          </RevealSection>

          <div className="relative grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Connectors */}
            <div className="absolute inset-x-0 top-10 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" />

            {[
                  { step: "01", icon: Wallet, title: "Connect Wallet", desc: "Link your EVM wallet to establish your on-chain identity on Arc Mainnet." },
              { step: "02", icon: TrendingUp, title: "Build Reputation", desc: "Borrow, repay, and grow your credit score organically through real on-chain behaviour." },
              { step: "03", icon: Zap, title: "Access Capital", desc: "Unlock loans globally backed by your reputation — not your real-world assets." },
            ].map((step, i) => (
              <RevealSection key={step.step} delay={i * 0.12}>
                <div className="relative flex flex-col items-center gap-4 text-center p-8 glass-card rounded-2xl">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full border border-border bg-surface px-3 py-0.5 text-caption font-bold tabular-nums text-gray-400">
                    {step.step}
                  </div>
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-primary-500/10 dark:bg-primary-400/10 mt-4">
                    <step.icon className="size-7 text-primary-500 dark:text-primary-400" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-h4 font-bold text-gray-900 dark:text-white">{step.title}</h3>
                  <p className="text-small leading-relaxed text-gray-500 dark:text-gray-400">{step.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS / REVIEWS ── */}
      <section className="section-border-top py-24 sm:py-32">
        <div className="mx-auto max-w-container-xl px-4 sm:px-6 lg:px-8">
          <RevealSection>
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <div className="mb-4 inline-block rounded-full border border-border px-4 py-1.5 text-caption font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                Community
              </div>
              <h2 className="text-h1 font-extrabold tracking-tight text-gray-900 dark:text-white">
                Trusted by real users
              </h2>
            </div>
          </RevealSection>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "Amara O.", role: "DeFi Entrepreneur, Lagos", quote: "CredTrust Arc gave me access to capital that no traditional bank in my country would offer. My on-chain score speaks for itself.", rating: 5 },
              { name: "David T.", role: "Independent Lender, Berlin", quote: "The reputation system is incredibly transparent. I can lend with confidence — all the data is right there on the blockchain.", rating: 5 },
              { name: "Sofia R.", role: "Freelance Developer, São Paulo", quote: "I repaid my first loan in 30 days and my credit score jumped significantly. Real incentives for responsible behaviour.", rating: 5 },
            ].map((t, i) => (
              <RevealSection key={t.name} delay={i * 0.1}>
                <GlowCard className="h-full flex flex-col gap-4">
                  <div className="flex gap-1">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="size-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="flex-1 text-small leading-relaxed text-gray-600 dark:text-gray-300 italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-3 border-t border-border/40 pt-4">
                    <div className="flex size-9 items-center justify-center rounded-full bg-primary-500/15 text-caption font-bold text-primary-600 dark:text-primary-400">
                      {t.name[0]}
                    </div>
                    <div>
                      <div className="text-small font-semibold text-gray-900 dark:text-white">{t.name}</div>
                      <div className="text-caption text-gray-400">{t.role}</div>
                    </div>
                  </div>
                </GlowCard>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="section-border-top bg-surface/30 dark:bg-surface/20 py-24 sm:py-32">
        <div className="mx-auto max-w-container-md px-4 sm:px-6 lg:px-8">
          <RevealSection>
            <div className="mb-16 text-center">
              <div className="mb-4 inline-block rounded-full border border-border px-4 py-1.5 text-caption font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                FAQ
              </div>
              <h2 className="text-h1 font-extrabold tracking-tight text-gray-900 dark:text-white">Have questions?</h2>
            </div>
          </RevealSection>
          <div className="space-y-4">
            {[
              { q: "Is collateral required to borrow?", a: "No. CredTrust Arc uses your on-chain repayment history and reputation score as the basis for lending — no physical collateral required." },
                  { q: "How is my credit score calculated?", a: "Your score is computed from your wallet's repayment history, loan volume, timeliness, and overall on-chain activity recorded on Arc Mainnet." },
              { q: "Can I lose my credit score?", a: "Yes — defaulting on a loan will negatively impact your reputation score. This creates strong incentives to repay, making the system trustworthy for lenders." },
                  { q: "What network does CredTrust Arc run on?", a: "CredTrust Arc runs on Arc Mainnet, with USDC used for loan settlement." },
              { q: "Are smart contracts audited?", a: "All CredTrust Arc smart contracts are open-source and undergo independent security audits. You can review them directly on-chain." },
            ].map((faq, i) => (
              <FAQItem key={i} question={faq.q} answer={faq.a} delay={i * 0.06} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="section-border-top py-24 sm:py-32">
        <div className="mx-auto max-w-container-xl px-4 sm:px-6 lg:px-8">
          <RevealSection>
            <div className="relative overflow-hidden rounded-3xl px-8 py-16 text-center sm:px-16 sm:py-20">
              {/* Gradient background */}
              <div
                className="absolute inset-0 -z-0"
                style={{
                  background: "linear-gradient(135deg, #0B1F26 0%, #123C3A 100%)",
                }}
              />
              {/* Decorative accent highlight */}
              <div className="absolute top-0 -right-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 -left-20 h-48 w-48 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
              <div className="relative z-10">
                <h2 className="text-h1 font-extrabold text-white">
                  Start building your<br className="hidden sm:block" /> financial reputation today.
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-body text-white/80">
                  Join thousands of users who are accessing global capital through the power of on-chain trust.
                </p>
                <div className="mt-10 flex flex-wrap justify-center gap-4">
                  <Link href="/loans/create">
                    <Button
                      size="lg"
                      className="h-12 rounded-full bg-[#1FA774] hover:bg-[#18885e] px-8 text-[15px] font-bold text-white shadow-md shadow-emerald-600/20 hover:scale-[1.01] transition-all duration-200"
                    >
                      Request a Loan
                      <ArrowRight className="ml-2 size-4" strokeWidth={2.5} />
                    </Button>
                  </Link>
                  <Link href="/loans">
                    <Button
                      size="lg"
                      variant="secondary"
                      className="h-12 rounded-full border border-white/20 bg-white/10 px-8 text-[15px] font-semibold text-white hover:bg-white/15"
                    >
                      Browse Lending Market
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="section-border-top bg-surface/50 dark:bg-surface/30">
        <div className="mx-auto max-w-container-xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <div className="text-h4 font-extrabold tracking-tight text-gray-900 dark:text-white">CredTrust Arc</div>
              <p className="mt-2 text-small leading-relaxed text-gray-500 dark:text-gray-400">
                On-chain credit for the borderless economy.
              </p>
            </div>
            <div>
              <h4 className="mb-4 text-caption font-bold uppercase tracking-widest text-gray-400">Protocol</h4>
              <ul className="space-y-2">
                {[
                  { name: "Browse Marketplace", href: "/loans" },
                  { name: "Request a Loan", href: "/loans/create" },
                  { name: "Lend & Earn", href: "/earn" },
                  { name: "Reputation Score", href: "/reputation" },
                ].map((l) => (
                  <li key={l.name}>
                    <Link href={l.href} className="text-small text-brand-muted hover:text-brand-text dark:text-gray-400 dark:hover:text-white transition-colors">
                      {l.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-caption font-bold uppercase tracking-widest text-gray-400">Company</h4>
              <ul className="space-y-2">
                {["About", "Blog", "Security", "Careers"].map((l) => (
                  <li key={l}><a href="#" className="text-small text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">{l}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-4 text-caption font-bold uppercase tracking-widest text-gray-400">Legal</h4>
              <ul className="space-y-2">
                {["Privacy Policy", "Terms of Service", "Cookie Policy"].map((l) => (
                  <li key={l}><a href="#" className="text-small text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">{l}</a></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border/40 pt-8 sm:flex-row">
            <p className="text-caption text-gray-400">© {new Date().getFullYear()} CredTrust Arc. All rights reserved.</p>
                <p className="text-caption text-gray-400">Built on <span className="font-semibold text-primary-500 dark:text-primary-400">Arc Mainnet</span></p>
          </div>
        </div>
      </footer>

      <ConnectPrompt />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// FAQ ACCORDION ITEM
// ──────────────────────────────────────────────────────────────────────────────
function FAQItem({ question, answer, delay }: { question: string; answer: string; delay: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: easeCustom }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 rounded-2xl glass-card p-5 text-left transition-all duration-200 hover:shadow-glow-primary"
      >
        <span className="font-semibold text-gray-900 dark:text-white">{question}</span>
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ArrowRight className="size-4 shrink-0 text-gray-400" style={{ transform: open ? "rotate(45deg)" : "none" }} />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: easeCustom }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 pt-2 text-small leading-relaxed text-gray-500 dark:text-gray-400">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
