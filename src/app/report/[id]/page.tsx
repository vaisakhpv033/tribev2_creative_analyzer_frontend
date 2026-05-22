"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";
import {
  ArrowLeft, Loader2, BrainCircuit, TrendingUp, Timer,
  Heart, Eye, Zap, Target, Flame, Info,
  ChevronUp, ChevronDown
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// ── Tier Configuration ────────────────────────────────────────────────────
const TIER_CONFIG: Record<string, { color: string; bg: string; border: string; glow: string }> = {
  "Strong High":  { color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/40", glow: "shadow-emerald-500/20" },
  "Likely High":  { color: "text-teal-400",    bg: "bg-teal-500/15",    border: "border-teal-500/40",    glow: "shadow-teal-500/20" },
  "Borderline":   { color: "text-amber-400",   bg: "bg-amber-500/15",   border: "border-amber-500/40",   glow: "shadow-amber-500/20" },
  "Likely Low":   { color: "text-orange-400",  bg: "bg-orange-500/15",  border: "border-orange-500/40",  glow: "shadow-orange-500/20" },
  "Strong Low":   { color: "text-red-400",     bg: "bg-red-500/15",     border: "border-red-500/40",     glow: "shadow-red-500/20" },
};

// ── Model Feature Definitions ─────────────────────────────────────────────
// Each feature includes an icon, human-readable label, explanation,
// and its Spearman correlation with CTR from the training analysis.
const MODEL_FEATURES = [
  {
    key: "orbital_mean",
    label: "Reward Center",
    icon: Flame,
    correlation: "+0.588",
    direction: "positive" as const,
    description: "Activation of the orbitofrontal cortex (G_orbital) — the brain's reward valuation center. Higher values mean the ad triggers stronger \"I want that\" feelings.",
  },
  {
    key: "longest_sustained_above_mean",
    label: "Sustained Engagement",
    icon: Timer,
    correlation: "+0.587",
    direction: "positive" as const,
    description: "Longest consecutive streak (in seconds) where brain activation stays above the video average. Measures how long the ad holds sustained attention without dipping.",
  },
  {
    key: "emotional_mean",
    label: "Emotional Response",
    icon: Heart,
    correlation: "+0.584",
    direction: "positive" as const,
    description: "Average activation across emotional brain regions (orbitofrontal, insula, anterior cingulate). Higher values = stronger emotional engagement with the content.",
  },
  {
    key: "attention_onset_second",
    label: "Attention Build-up",
    icon: Target,
    correlation: "+0.520",
    direction: "positive" as const,
    description: "The first second where brain activation crosses the engagement threshold. Later onset (higher value) can indicate a suspense/build-up narrative that keeps viewers watching.",
  },
  {
    key: "insula_short_mean",
    label: "Gut Feeling",
    icon: Zap,
    correlation: "+0.490",
    direction: "positive" as const,
    description: "Activation of the short insular gyrus — processes visceral, gut-level emotional responses. Higher values indicate the ad creates an instinctive, bodily reaction.",
  },
  {
    key: "visual_std",
    label: "Visual Rhythm",
    icon: Eye,
    correlation: "−0.508",
    direction: "negative" as const,
    description: "Standard deviation of visual cortex activation over time. Lower variability (more consistent visual stimulation) correlates with higher CTR. Wild visual fluctuation may distract from the message.",
  },
];

// ── Helper: Format feature value for display ──────────────────────────────
function formatFeatureValue(key: string, value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (key === "longest_sustained_above_mean") return `${value.toFixed(0)}s`;
  if (key === "attention_onset_second") return `${value.toFixed(0)}s`;
  return value.toFixed(4);
}

// ── Tooltip Component ─────────────────────────────────────────────────────
function FeatureTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-gray-500 hover:text-gray-300 transition-colors"
        aria-label="More info"
      >
        <Info className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 rounded-lg
                       bg-gray-900/95 backdrop-blur-lg border border-white/10 shadow-xl
                       text-xs text-gray-300 leading-relaxed pointer-events-none"
          >
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px
                          w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px]
                          border-l-transparent border-r-transparent border-t-gray-900/95" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Confidence Range Bar ──────────────────────────────────────────────────
function ConfidenceRangeBar({
  lower, predicted, upper
}: { lower: number; predicted: number; upper: number }) {
  // Scale to a visual range
  const minVal = Math.max(0, lower - 1);
  const maxVal = upper + 1;
  const range = maxVal - minVal;

  const lowerPct = ((lower - minVal) / range) * 100;
  const predictedPct = ((predicted - minVal) / range) * 100;
  const upperPct = ((upper - minVal) / range) * 100;

  return (
    <div className="mt-4 space-y-2">
      <div className="flex justify-between text-xs text-gray-500">
        <span>Conservative (P10)</span>
        <span>Predicted</span>
        <span>Optimistic (P90)</span>
      </div>
      <div className="relative h-3 bg-white/5 rounded-full overflow-hidden">
        {/* Range fill */}
        <div
          className="absolute h-full bg-gradient-to-r from-indigo-500/30 via-indigo-500/50 to-pink-500/30 rounded-full"
          style={{ left: `${lowerPct}%`, width: `${upperPct - lowerPct}%` }}
        />
        {/* Predicted marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-indigo-500 shadow-lg shadow-indigo-500/50"
          style={{ left: `${predictedPct}%`, transform: `translateX(-50%) translateY(-50%)` }}
        />
      </div>
      <div className="flex justify-between text-sm font-medium">
        <span className="text-gray-400">{lower.toFixed(2)}%</span>
        <span className="text-white font-bold">{predicted.toFixed(2)}%</span>
        <span className="text-gray-400">{upper.toFixed(2)}%</span>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════════════════════════════════════
// REPORT PAGE
// ══════════════════════════════════════════════════════════════════════════

export default function ReportPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchReport();
    }
  }, [id]);

  const fetchReport = async () => {
    try {
      const res = await axios.get(`http://localhost:8000/api/v1/videos/${id}/report`);
      setData(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-gray-400">Report not available</h2>
        <Link href="/" className="text-indigo-400 hover:underline mt-4 inline-block">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const scores = data.scores;
  const predictions = data.predictions;
  const modelFeatures = data.model_features;
  const tier = predictions?.tier || "Borderline";
  const tierStyle = TIER_CONFIG[tier] || TIER_CONFIG["Borderline"];

  const radarData = [
    { subject: "Visual", A: scores.visual, fullMark: 100 },
    { subject: "Auditory", A: scores.auditory, fullMark: 100 },
    { subject: "Emotional", A: scores.emotional, fullMark: 100 },
    { subject: "Attention", A: scores.attention, fullMark: 100 },
    { subject: "Language", A: scores.language, fullMark: 100 },
  ];

  // Convert timeseries for Recharts
  const timeseriesLength = data.timeseries?.visual?.length || 0;
  const lineData = Array.from({ length: timeseriesLength }).map((_, i) => ({
    time: `${i}s`,
    Visual: (data.timeseries?.visual?.[i] || 0) * 100,
    Emotional: (data.timeseries?.emotional?.[i] || 0) * 100,
    Attention: (data.timeseries?.attention?.[i] ?? data.global_mean?.[i] ?? 0) * 100,
  }));

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/" className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{data.video.original_name}</h1>
          <p className="text-gray-400">Neural Engagement Report</p>
        </div>
      </div>

      {/* ── SECTION 1: CTR Prediction Hero ──────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`glass-panel p-8 border ${tierStyle.border} shadow-lg ${tierStyle.glow}`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Predicted CTR */}
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <TrendingUp className={`w-10 h-10 ${tierStyle.color}`} />
            <p className="text-sm text-gray-400 uppercase tracking-wider font-medium">
              Predicted CTR
            </p>
            <div className="text-5xl font-extrabold text-white">
              {predictions?.predicted_ctr?.toFixed(2) ?? "—"}
              <span className="text-xl text-gray-500">%</span>
            </div>
          </div>

          {/* Tier Badge + Confidence */}
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <p className="text-sm text-gray-400 uppercase tracking-wider font-medium">
              Performance Tier
            </p>
            <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-lg font-bold
                           border ${tierStyle.bg} ${tierStyle.border} ${tierStyle.color}`}>
              {tier === "Strong High" || tier === "Likely High" ? (
                <ChevronUp className="w-5 h-5" />
              ) : tier === "Borderline" ? (
                <span className="w-5 h-5 rounded-full border-2 border-current" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
              {tier}
            </div>
            <p className="text-sm text-gray-500">
              {predictions?.predicted_class === "High"
                ? `${((predictions?.confidence ?? 0) * 100).toFixed(0)}% confidence of above-average CTR`
                : `${((1 - (predictions?.confidence ?? 0)) * 100).toFixed(0)}% confidence of below-average CTR`
              }
            </p>
          </div>

          {/* Neural Score (Overall) */}
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            <BrainCircuit className="w-10 h-10 text-pink-500" />
            <p className="text-sm text-gray-400 uppercase tracking-wider font-medium">
              Neural Score
            </p>
            <div className="text-5xl font-extrabold gradient-text">
              {scores.overall?.toFixed(0) ?? "—"}
              <span className="text-xl text-gray-500">/100</span>
            </div>
          </div>
        </div>

        {/* Confidence Range Bar */}
        {predictions?.ctr_lower_bound != null && predictions?.ctr_upper_bound != null && (
          <div className="mt-6 pt-6 border-t border-white/10 max-w-2xl mx-auto">
            <ConfidenceRangeBar
              lower={predictions.ctr_lower_bound}
              predicted={predictions.predicted_ctr}
              upper={predictions.ctr_upper_bound}
            />
          </div>
        )}
      </motion.div>

      {/* ── SECTION 2: Model Features (Brain Drivers) ──────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-bold">Brain Feature Drivers</h2>
          <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-full">
            6 features used by the CTR model
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODEL_FEATURES.map((feat) => {
            const Icon = feat.icon;
            const val = modelFeatures?.[feat.key];
            const isPositive = feat.direction === "positive";
            const corrColor = isPositive ? "text-emerald-400" : "text-red-400";

            return (
              <motion.div
                key={feat.key}
                whileHover={{ y: -2 }}
                className="glass-panel p-5 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/5">
                      <Icon className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{feat.label}</p>
                      <p className={`text-xs ${corrColor}`}>
                        ρ = {feat.correlation} with CTR
                      </p>
                    </div>
                  </div>
                  <FeatureTooltip text={feat.description} />
                </div>
                <div className="text-2xl font-bold text-white">
                  {formatFeatureValue(feat.key, val)}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ── SECTION 3: Radar Chart (Dimension Breakdown) ───────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="glass-panel p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Brain Dimension Breakdown</h3>
          <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-full">
            Dimension-level insights
          </span>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: "#9ca3af" }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar name="Video" dataKey="A" stroke="#ec4899" fill="#ec4899" fillOpacity={0.4} />
              <Tooltip
                contentStyle={{ backgroundColor: "#111827", borderColor: "#374151", color: "#fff" }}
                itemStyle={{ color: "#ec4899" }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ── SECTION 4: Engagement Curve ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="glass-panel p-6"
      >
        <h3 className="text-lg font-semibold mb-6">Second-by-Second Engagement Curve</h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={lineData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis dataKey="time" stroke="#6b7280" />
              <YAxis stroke="#6b7280" domain={["auto", "auto"]} hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111827",
                  borderColor: "#374151",
                  borderRadius: "0.5rem",
                }}
              />
              <Line type="monotone" dataKey="Emotional" stroke="#ec4899" strokeWidth={3} dot={false} activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="Visual" stroke="#6366f1" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="Attention" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-pink-500" /> Emotional
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-indigo-500" /> Visual
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" /> Attention / Global
          </div>
        </div>
      </motion.div>
    </div>
  );
}
