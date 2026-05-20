"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from "recharts";
import { ArrowLeft, Loader2, BrainCircuit } from "lucide-react";
import Link from "next/link";

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
        <Link href="/" className="text-indigo-400 hover:underline mt-4 inline-block">Return to Dashboard</Link>
      </div>
    );
  }

  const scores = data.scores;
  
  const radarData = [
    { subject: 'Visual', A: scores.visual, fullMark: 100 },
    { subject: 'Auditory', A: scores.auditory, fullMark: 100 },
    { subject: 'Emotional', A: scores.emotional, fullMark: 100 },
    { subject: 'Attention', A: scores.attention, fullMark: 100 },
    { subject: 'Language', A: scores.language, fullMark: 100 },
  ];

  // Convert timeseries dictionary to array of objects for Recharts
  const timeseriesLength = data.timeseries?.visual?.length || 0;
  const lineData = Array.from({ length: timeseriesLength }).map((_, i) => ({
    time: `${i}s`,
    Visual: (data.timeseries?.visual?.[i] || 0) * 100,
    Emotional: (data.timeseries?.emotional?.[i] || 0) * 100,
    Attention: (data.timeseries?.attention?.[i] ?? data.global_mean?.[i] ?? 0) * 100
  }));

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <Link href="/" className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{data.video.original_name}</h1>
          <p className="text-gray-400">Neural Engagement Report Card</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Overall Score Card */}
        <div className="glass-panel p-8 flex flex-col items-center justify-center text-center space-y-4">
          <BrainCircuit className="w-16 h-16 text-pink-500 mb-2" />
          <h2 className="text-xl font-medium text-gray-300">Overall Neural Score</h2>
          <div className="text-6xl font-extrabold gradient-text">
            {scores.overall?.toFixed(0)}<span className="text-2xl text-gray-500">/100</span>
          </div>
          <p className="text-sm text-gray-400 max-w-xs mt-4">
            Weighted combination of Visual, Emotional, Auditory, Attention, and Language processing.
          </p>
        </div>

        {/* Radar Chart */}
        <div className="glass-panel p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Dimension Breakdown</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Video" dataKey="A" stroke="#ec4899" fill="#ec4899" fillOpacity={0.4} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }}
                  itemStyle={{ color: '#ec4899' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Engagement Curve */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-semibold mb-6">Second-by-Second Engagement Curve</h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
              <XAxis dataKey="time" stroke="#6b7280" />
              <YAxis stroke="#6b7280" domain={['auto', 'auto']} hide />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.5rem' }}
              />
              <Line type="monotone" dataKey="Emotional" stroke="#ec4899" strokeWidth={3} dot={false} activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="Visual" stroke="#6366f1" strokeWidth={3} dot={false} />
              <Line type="monotone" dataKey="Attention" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-4 text-sm text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-pink-500"></div> Emotional
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-indigo-500"></div> Visual
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div> Attention / Global
          </div>
        </div>
      </div>
    </div>
  );
}
