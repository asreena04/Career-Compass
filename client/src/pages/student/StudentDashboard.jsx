// /pages/StudentDashboard.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { FiUser, FiTarget, FiAlertCircle, FiClock, FiCheckCircle } from "react-icons/fi";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function StudentDashboard() {
  const [me, setMe] = useState(null);
  const [target, setTarget] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErr("");

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        setErr("No session. Please sign in.");
        setLoading(false);
        return;
      }

      try {
        const [meRes, targetRes, sumRes] = await Promise.all([
          fetch(`${API_BASE}/student/me`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/student/target`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/student/progress/summary`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const meData = await meRes.json();
        const targetData = await targetRes.json();
        const sumData = await sumRes.json();

        if (!meRes.ok) throw new Error(meData.error || "Failed to load profile");
        if (!targetRes.ok) throw new Error(targetData.error || "Failed to load target");
        if (!sumRes.ok) throw new Error(sumData.error || "Failed to load progress summary");

        setMe(meData);
        setTarget(targetData);
        setSummary(sumData);
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  const counts = summary?.counts || {};
  const missing = counts["Missing"] || 0;
  const pending = counts["Pending"] || 0;
  const completed = counts["Completed"] || 0;

  // Loading UI
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white font-sans">
        <header className="w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-800 shadow-2xl">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400">
              Student Dashboard
            </h1>
            <p className="text-gray-400 text-lg mt-2">Track your progress and career target</p>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-gray-900 rounded-2xl p-12 border border-gray-800 text-center shadow-2xl">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-400 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error UI
  if (err) {
    return (
      <div className="min-h-screen bg-black text-white font-sans">
        <header className="w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-800 shadow-2xl">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400">
              Student Dashboard
            </h1>
            <p className="text-gray-400 text-lg mt-2">Track your progress and career target</p>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-gray-900 rounded-2xl p-10 border border-gray-800 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-900/30 rounded-lg border border-red-700/50">
                <FiAlertCircle size={24} className="text-red-400" />
              </div>
              <div>
                <p className="text-xl font-bold text-white mb-1">Something went wrong</p>
                <p className="text-red-400">Error: {err}</p>
                <p className="text-gray-500 text-sm mt-2">
                  Please try refreshing the page or signing in again.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Header */}
      <header className="w-full bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-800 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-5xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400">
            Student Dashboard
          </h1>
          <p className="text-gray-400 text-lg mt-2">Track your progress and career target</p>
        </div>
      </header>

      {/* Body */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-2xl">
          {/* Section Title */}
          <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h2 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400 mb-2">
                Overview
              </h2>
              <p className="text-gray-400">
                Your profile details, career target, and progress summary
              </p>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {/* LEFT COLUMN */}
            <div className="lg:col-span-2 flex flex-col gap-4 h-full">

              {/* Profile Card */}
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-cyan-500/50 transition-all shadow-lg hover:shadow-cyan-500/10 flex-1">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-cyan-900/30 rounded-lg border border-cyan-700/50">
                    <FiUser size={24} className="text-cyan-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">
                      Profile
                    </p>
                    <p className="text-xl font-bold text-white truncate">
                      {me?.full_name || "—"}
                    </p>
                    
                    {/* Changed to a vertical stack (space-y-2) for line-by-line layout */}
                    <div className="mt-4 flex flex-col gap-y-2">
                      <p className="text-sm text-gray-300 flex items-center">
                        <span className="text-gray-500 w-20 shrink-0">Matric:</span>
                        <span className="font-medium">{me?.matric_number || "—"}</span>
                      </p>
                      
                      <p className="text-sm text-gray-300 flex items-center">
                        <span className="text-gray-500 w-20 shrink-0">Year:</span>
                        <span className="font-medium">{me?.year_of_study || "—"}</span>
                      </p>
                      
                      <p className="text-sm text-gray-300 flex items-center">
                        <span className="text-gray-500 w-20 shrink-0">Advisor:</span>
                        <span className="font-medium">{me?.advisor?.full_name || "—"}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Target Card */}
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-indigo-500/50 transition-all shadow-lg hover:shadow-indigo-500/10 flex-1">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-indigo-900/30 rounded-lg border border-indigo-700/50">
                    <FiTarget size={24} className="text-indigo-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">
                      Current Career Target
                    </p>

                    <p className="text-xl font-bold text-white truncate">
                      {target?.job_role?.job_role_name || "No target selected yet"}
                    </p>

                    <p className="text-gray-400 text-sm mt-2">
                      Set or update your target in the Roadmap page to generate the correct skill track.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (2 cards, same rhythm) */}
            <div className="flex flex-col gap-4 h-full">
              {/* Card 1: Progress */}
              {(() => {
                const total = missing + pending + completed;
                const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

                return (
                  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg hover:border-cyan-500/40 transition-all flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                          Progress
                        </p>
                        <p className="text-lg font-bold text-white">Overall Completion</p>
                      </div>

                      <div className="px-3 py-1 rounded-lg bg-gray-900/40 border border-gray-700 text-xs text-gray-300">
                        {pct}% done
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div
                        className="w-20 h-20 rounded-full border border-gray-700"
                        style={{
                          background: `conic-gradient(#22d3ee ${pct}%, rgba(255,255,255,0.06) ${pct}%)`,
                        }}
                      >
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
                            <p className="text-sm font-bold text-white">{pct}%</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1">
                        <p className="text-sm text-gray-300">
                          Submit proof to move items from{" "}
                          <span className="text-teal-300 font-semibold">Pending</span> to{" "}
                          <span className="text-cyan-300 font-semibold">Completed</span>.
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          Total tracked:{" "}
                          <span className="text-gray-300 font-semibold">{total}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Card 2: Breakdown (3 stats inside one card) */}
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 shadow-lg hover:border-gray-600 transition-all flex-1">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs font-bold uppercase text-gray-500 tracking-wider">
                      Breakdown
                    </p>
                    <p className="text-lg font-bold text-white">Status Summary</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Missing */}
                  <div className="bg-gray-900/40 rounded-xl p-4 border border-gray-700 hover:border-yellow-500/40 transition-all">
                    <p className="text-gray-500 text-xs font-bold uppercase">Missing</p>
                    <div className="mt-2 flex items-end justify-between">
                      <p className="text-3xl font-black text-white">{missing}</p>
                      <div className="p-2 bg-yellow-900/20 rounded-full border border-yellow-700/30">
                        <FiAlertCircle size={18} className="text-yellow-500" />
                      </div>
                    </div>
                  </div>

                  {/* Pending */}
                  <div className="bg-gray-900/40 rounded-xl p-4 border border-gray-700 hover:border-teal-500/40 transition-all">
                    <p className="text-gray-500 text-xs font-bold uppercase">Pending</p>
                    <div className="mt-2 flex items-end justify-between">
                      <p className="text-3xl font-black text-white">{pending}</p>
                      <div className="p-2 bg-teal-900/20 rounded-full border border-teal-700/30">
                        <FiClock size={18} className="text-teal-500" />
                      </div>
                    </div>
                  </div>

                  {/* Completed */}
                  <div className="bg-gray-900/40 rounded-xl p-4 border border-gray-700 hover:border-cyan-500/40 transition-all">
                    <p className="text-gray-500 text-xs font-bold uppercase">Completed</p>
                    <div className="mt-2 flex items-end justify-between">
                      <p className="text-3xl font-black text-white">{completed}</p>
                      <div className="p-2 bg-cyan-900/20 rounded-full border border-cyan-700/30">
                        <FiCheckCircle size={18} className="text-cyan-500" />
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  Tip: Start with <span className="text-gray-300 font-semibold">Missing</span> items to grow your roadmap faster.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
