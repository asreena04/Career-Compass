import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabaseClient";

const API_URL = import.meta.env.VITE_API_URL;

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

const Field = ({ label, children }) => (
  <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
    <p className="text-sm text-gray-400 mb-1">{label}</p>
    {children}
  </div>
);

export default function AdminUserEditorModal({
  open,
  baseUser,
  details,
  loading,
  onClose,
  onSaved,
}) {
  const profile = details?.profile || null;
  const roleProfile = details?.roleProfile || null;

  const role = profile?.role || baseUser?.role;

  // Base profile editable (non-auth)
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Role-specific editable fields
  const [rp, setRp] = useState({});

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setUsername(profile?.username || "");
    setAvatarUrl(profile?.avatar_url || "");
    setRp(roleProfile || {});
  }, [open, profile?.username, profile?.avatar_url, roleProfile]);

  const title = useMemo(() => {
    const email = profile?.email || baseUser?.email || "";
    return email ? `Edit User — ${email}` : "Edit User";
  }, [profile?.email, baseUser?.email]);

  if (!open) return null;

  async function saveBaseProfile() {
    const token = await getToken();
    const res = await fetch(`${API_URL}/admin/users/${profile.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        username,
        avatar_url: avatarUrl,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || "Failed to update base profile");
    return json;
  }

  async function saveRoleProfile() {
    const token = await getToken();

    if (role === "Student") {
      const res = await fetch(`${API_URL}/admin/students/${profile.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: rp.full_name ?? null,
          matric_number: rp.matric_number ?? null,
          programme: rp.programme ?? null,
          school: rp.school ?? null,
          year_of_study: rp.year_of_study ?? null,
          advisor_id: rp.advisor_id ?? null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to update student profile");
      return json;
    }

    if (role === "Academic Advisor") {
      const res = await fetch(`${API_URL}/admin/advisors/${profile.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: rp.full_name ?? null,
          room_number: rp.room_number ?? null,
          position: rp.position ?? null,
          department: rp.department ?? null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to update advisor profile");
      return json;
    }

    if (role === "Company") {
      const res = await fetch(`${API_URL}/admin/companies/${profile.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          company_name: rp.company_name ?? null,
          website: rp.website ?? null,
          company_category: rp.company_category ?? null,
          contact_link: rp.contact_link ?? null,
          hr_contact_name: rp.hr_contact_name ?? null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to update company profile");
      return json;
    }

    // Admin role has no roleProfile tables here
    return null;
  }

  async function handleSave() {
    if (!profile?.id) return;

    setSaving(true);
    try {
      await saveBaseProfile();
      if (role === "Student" || role === "Academic Advisor" || role === "Company") {
        await saveRoleProfile();
      }
      onSaved?.();
    } catch (e) {
      console.error(e);
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 p-8 rounded-2xl max-w-4xl w-full shadow-2xl border border-cyan-700/40 overflow-y-auto max-h-[90vh]">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h3 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400">
              {title}
            </h3>
            <p className="text-gray-400 mt-1">
              Role: <span className="text-cyan-300 font-semibold">{role}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition"
            disabled={saving}
          >
            Close
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-cyan-400 animate-pulse">
            Loading user details...
          </div>
        ) : !profile ? (
          <div className="p-10 text-center text-red-400">
            Failed to load profile.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Base Profile */}
            <div>
              <p className="text-lg font-bold text-white mb-3">Base Profile</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Email (read-only)">
                  <div className="text-white">{profile.email || "-"}</div>
                </Field>

                <Field label="User ID (read-only)">
                  <div className="text-gray-300 font-mono text-xs break-all">
                    {profile.id}
                  </div>
                </Field>

                <Field label="Username">
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
                    placeholder="username"
                  />
                </Field>

                <Field label="Avatar URL">
                  <input
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
                    placeholder="https://..."
                  />
                </Field>
              </div>
            </div>

            {/* Role Profile */}
            {(role === "Student" || role === "Academic Advisor" || role === "Company") && (
              <div>
                <p className="text-lg font-bold text-white mb-3">
                  {role} Profile
                </p>

                {role === "Student" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Full name">
                      <input
                        value={rp.full_name || ""}
                        onChange={(e) => setRp((x) => ({ ...x, full_name: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
                      />
                    </Field>

                    <Field label="Matric number">
                      <input
                        value={rp.matric_number || ""}
                        onChange={(e) => setRp((x) => ({ ...x, matric_number: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
                      />
                    </Field>

                    <Field label="Programme">
                      <input
                        value={rp.programme || ""}
                        onChange={(e) => setRp((x) => ({ ...x, programme: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
                      />
                    </Field>

                    <Field label="School">
                      <input
                        value={rp.school || ""}
                        onChange={(e) => setRp((x) => ({ ...x, school: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
                      />
                    </Field>

                    <Field label="Year of study (number)">
                      <input
                        type="number"
                        value={rp.year_of_study ?? ""}
                        onChange={(e) =>
                          setRp((x) => ({
                            ...x,
                            year_of_study: e.target.value === "" ? null : Number(e.target.value),
                          }))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
                      />
                    </Field>

                    <Field label="Advisor ID (uuid)">
                      <input
                        value={rp.advisor_id || ""}
                        onChange={(e) => setRp((x) => ({ ...x, advisor_id: e.target.value || null }))}
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
                        placeholder="uuid (optional)"
                      />
                    </Field>
                  </div>
                )}

                {role === "Academic Advisor" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Full name">
                      <input
                        value={rp.full_name || ""}
                        onChange={(e) => setRp((x) => ({ ...x, full_name: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
                      />
                    </Field>

                    <Field label="Room number">
                      <input
                        value={rp.room_number || ""}
                        onChange={(e) => setRp((x) => ({ ...x, room_number: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
                      />
                    </Field>

                    <Field label="Position">
                      <input
                        value={rp.position || ""}
                        onChange={(e) => setRp((x) => ({ ...x, position: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
                      />
                    </Field>

                    <Field label="Department">
                      <input
                        value={rp.department || ""}
                        onChange={(e) => setRp((x) => ({ ...x, department: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
                      />
                    </Field>
                  </div>
                )}

                {role === "Company" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Company name">
                      <input
                        value={rp.company_name || ""}
                        onChange={(e) => setRp((x) => ({ ...x, company_name: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
                      />
                    </Field>

                    <Field label="Website">
                      <input
                        value={rp.website || ""}
                        onChange={(e) => setRp((x) => ({ ...x, website: e.target.value }))}
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
                      />
                    </Field>

                    <Field label="Company category">
                      <input
                        value={rp.company_category || ""}
                        onChange={(e) =>
                          setRp((x) => ({ ...x, company_category: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
                      />
                    </Field>

                    <Field label="Contact link">
                      <input
                        value={rp.contact_link || ""}
                        onChange={(e) =>
                          setRp((x) => ({ ...x, contact_link: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
                      />
                    </Field>

                    <Field label="HR contact name">
                      <input
                        value={rp.hr_contact_name || ""}
                        onChange={(e) =>
                          setRp((x) => ({ ...x, hr_contact_name: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
                      />
                    </Field>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition"
                disabled={saving}
              >
                Cancel
              </button>

              <button
                onClick={handleSave}
                className="px-6 py-2 rounded-lg font-bold transition shadow-md
                           bg-gradient-to-r from-teal-500 to-cyan-500 text-gray-900
                           hover:from-teal-400 hover:to-cyan-400 disabled:opacity-60"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
