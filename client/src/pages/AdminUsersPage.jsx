import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import AdminUsersTable from "../components/admin/AdminUsersTable";
import AdminUserEditorModal from "../components/admin/AdminUsersEditorModal";

// Add this temporarily at the top of AdminUsersPage.jsx
const API_URL = import.meta.env.VITE_API_URL;

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("All");
  const [selectedUser, setSelectedUser] = useState(null); // base row
  const [details, setDetails] = useState(null); // {profile, roleProfile}
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return users
      .filter((u) => (role === "All" ? true : u.role === role))
      .filter((u) => {
        if (!term) return true;
        return (
          (u.email || "").toLowerCase().includes(term) ||
          (u.username || "").toLowerCase().includes(term) ||
          (u.role || "").toLowerCase().includes(term) ||
          (u.id || "").toLowerCase().includes(term)
        );
      });
  }, [users, q, role]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Missing login session");

      const res = await fetch(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load users");
      setUsers(json || []);
    } catch (e) {
      console.error(e);
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function openEditor(userRow) {
    setSelectedUser(userRow);
    setDetails(null);
    setDetailsLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/admin/users/${userRow.id}/details`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load user details");
      setDetails(json);
    } catch (e) {
      console.error(e);
      alert(e.message);
    } finally {
      setDetailsLoading(false);
    }
  }

  function closeEditor() {
    setSelectedUser(null);
    setDetails(null);
  }

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400">
                Admin — Users
              </h2>
              <p className="text-gray-400">
                View and update user profiles (Student / Advisor / Company). Auth fields are not edited.
              </p>
            </div>

            <div className="flex gap-3 flex-wrap">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by email / username / role / id..."
                className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white w-72"
              />

              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white"
              >
                <option>All</option>
                <option>Student</option>
                <option>Academic Advisor</option>
                <option>Company</option>
                <option>Admin</option>
              </select>

              <button
                onClick={() => setRefreshKey((x) => x + 1)}
                className="px-4 py-2 rounded-lg font-bold bg-gradient-to-r from-teal-500 to-cyan-500 text-gray-900 hover:from-teal-400 hover:to-cyan-400"
                disabled={loading}
              >
                Refresh
              </button>
            </div>
          </div>

          <AdminUsersTable
            loading={loading}
            users={filtered}
            onEdit={openEditor}
          />
        </div>
      </div>

      <AdminUserEditorModal
        open={!!selectedUser}
        baseUser={selectedUser}
        details={details}
        loading={detailsLoading}
        onClose={closeEditor}
        onSaved={() => {
          closeEditor();
          setRefreshKey((x) => x + 1);
        }}
      />
    </div>
  );
}
