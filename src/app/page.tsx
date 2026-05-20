"use client";

import { useState, useRef, useEffect } from "react";
import { UploadCloud, FileVideo, Activity, Brain, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import axios from "axios";
import Link from "next/link";

export default function Dashboard() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [videos, setVideos] = useState([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchVideos();
    const interval = setInterval(fetchVideos, 10000); // poll every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchVideos = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/v1/videos");
      setVideos(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async (file: File) => {
    if (!file.name.endsWith(".mp4") && !file.name.endsWith(".npz")) {
      alert("Only .mp4 or .npz files are supported.");
      return;
    }
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post("http://localhost:8000/api/v1/videos/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      fetchVideos();
    } catch (error) {
      console.error(error);
      alert("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-12">
      <section className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Upload Creative for <span className="gradient-text">Neural Analysis</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Feed your video into the TRIBEv2 brain simulation model to predict how intensely a human brain will engage with your content.
        </p>
      </section>

      {/* Upload Zone */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={`glass-panel p-12 text-center cursor-pointer transition-colors duration-300 ${
          isDragging ? "border-indigo-500 bg-indigo-500/10" : ""
        } ${isUploading ? "opacity-50 pointer-events-none" : ""}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          accept=".mp4,.npz"
          className="hidden"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleUpload(e.target.files[0]);
            }
          }}
        />
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 rounded-full bg-white/5 border border-white/10">
            {isUploading ? (
              <Activity className="w-12 h-12 text-indigo-400 animate-pulse" />
            ) : (
              <UploadCloud className="w-12 h-12 text-indigo-400" />
            )}
          </div>
          <div>
            <h3 className="text-xl font-semibold">
              {isUploading ? "Uploading & Queuing..." : "Drag & Drop Video or .npz"}
            </h3>
            <p className="text-sm text-gray-400 mt-2">
              Supports .mp4 videos or pre-computed .npz files.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Video List */}
      <section>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Brain className="w-6 h-6 text-pink-500" />
          Recent Analyses
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((vid: any) => (
            <Link href={`/report/${vid.id}`} key={vid.id}>
              <motion.div
                whileHover={{ y: -5 }}
                className="glass-panel p-6 space-y-4 hover:border-indigo-500/50 transition-all group cursor-pointer h-full flex flex-col justify-between"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <FileVideo className="w-8 h-8 text-gray-400 shrink-0" />
                    <h3 className="font-medium truncate" title={vid.original_name}>
                      {vid.original_name}
                    </h3>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Status</span>
                    <span className={`font-medium ${
                      vid.status === 'COMPLETED' ? 'text-emerald-400' :
                      vid.status === 'FAILED' ? 'text-red-400' : 'text-amber-400 animate-pulse'
                    }`}>
                      {vid.status}
                    </span>
                  </div>
                  
                  {vid.scores?.overall_score !== undefined && vid.scores?.overall_score !== null && vid.status === 'COMPLETED' && (
                    <div className="pt-4 border-t border-white/10">
                      <div className="flex justify-between items-end">
                        <span className="text-sm text-gray-400">Neural Score</span>
                        <span className="text-2xl font-bold text-white">
                          {vid.scores.overall_score.toFixed(0)}
                          <span className="text-sm text-gray-500">/100</span>
                        </span>
                      </div>
                      <div className="w-full bg-white/10 h-2 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-indigo-500 to-pink-500 h-full rounded-full"
                          style={{ width: `${Math.min(100, Math.max(0, vid.scores.overall_score))}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-indigo-400 text-sm flex items-center gap-1">
                    View Report <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </motion.div>
            </Link>
          ))}
          {videos.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500 glass-panel">
              No videos analyzed yet. Upload one above to get started.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
