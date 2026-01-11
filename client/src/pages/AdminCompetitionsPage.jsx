import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import AdminCompetitionModal from "../components/admin/AdminCompetitionModal";

const API_URL = import.meta.env.VITE_API_URL;

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

export default function AdminCompetitionsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null); // competition row or null
  const [refreshKey, setRefreshKey] = useState(0);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((c) => {
      return (
        (c.competition_title || "").toLowerCase().includes(term) ||
        (c.description || "").toLowerCase().includes(term) ||
        (c.venue || "").toLowerCase().includes(term)
      );
    });
  }, [rows, q]);

  async function fetchCompetitions() {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/admin/competitions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load competitions");
      setRows(json || []);
    } catch (e) {
      console.error(e);
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this competition?")) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/admin/competitions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to delete");
      setRefreshKey((x) => x + 1);
    } catch (e) {
      console.error(e);
      alert(e.message);
    }
  }

  useEffect(() => {
    fetchCompetitions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400">
                Admin — Competitions
              </h2>
              <p className="text-gray-400">
                View, create, update, delete competitions.
              </p>
            </div>

            <div className="flex gap-3 flex-wrap">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search title / venue / description..."
                className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white w-72"
              />

              <button
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
                className="px-4 py-2 rounded-lg font-bold bg-gradient-to-r from-teal-500 to-cyan-500 text-gray-900 hover:from-teal-400 hover:to-cyan-400"
              >
                + New Competition
              </button>

              <button
                onClick={() => setRefreshKey((x) => x + 1)}
                className="px-4 py-2 rounded-lg font-bold bg-gray-800 border border-gray-700 hover:bg-gray-700"
                disabled={loading}
              >
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-cyan-400 animate-pulse">
              Loading competitions...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center p-16 bg-gray-800/40 rounded-2xl border border-gray-700">
              <p className="text-2xl text-gray-500 italic">No competitions found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filtered.map((post) => (
                <div
                  key={post.id}
                  className="bg-gray-900 rounded-2xl flex flex-col justify-between border border-gray-700
                             hover:border-cyan-500 transition shadow-lg overflow-hidden"
                >
                  <div
                    className="h-40 bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${
                        post.image_url ||
                        `https://via.placeholder.com/400x250/0f172a/22d3ee?text=${(post.competition_title || "Competition").replace(/\s/g, "+")}`
                      })`,
                      backgroundColor: post.image_url ? "transparent" : "#111827",
                    }}
                  />

                  <div className="p-5 flex flex-col flex-grow">
                    <p className="text-xl font-black text-cyan-300 mb-2 truncate">
                      {post.competition_title}
                    </p>

                    <div className="text-sm text-gray-400 space-y-1 mb-4 flex-grow">
                      <p>
                        🗓️ Date:{" "}
                        <span className="text-white font-medium">{post.competition_date}</span>
                      </p>
                      <p>
                        ⏰ Time:{" "}
                        <span className="text-white font-medium">
                          {post.start_time || "-"} - {post.end_time || "-"}
                        </span>
                      </p>
                      <p>
                        📍 Venue:{" "}
                        <span className="text-white font-medium">{post.venue || "-"}</span>
                      </p>
                      <p>
                        💸 Price:{" "}
                        <span className="text-white font-medium">
                          {post.price_participate || "Free"}
                        </span>
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditing(post);
                          setOpen(true);
                        }}
                        className="flex-1 px-4 py-2 rounded-lg font-bold bg-gradient-to-r from-teal-500 to-cyan-500 text-gray-900 hover:from-teal-400 hover:to-cyan-400"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="px-4 py-2 rounded-lg font-bold bg-gray-800 border border-gray-700 hover:bg-gray-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="mt-8 text-sm text-gray-500 italic">
            Tip: Admin list is ordered by created_at (latest first) from your API.
          </p>
        </div>
      </div>

      <AdminCompetitionModal
        open={open}
        onClose={() => setOpen(false)}
        editing={editing}
        onSaved={() => {
          setOpen(false);
          setEditing(null);
          setRefreshKey((x) => x + 1);
        }}
      />
    </div>
  );
}
