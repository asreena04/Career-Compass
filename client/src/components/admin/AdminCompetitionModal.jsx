import React, { useEffect, useState } from "react";
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

export default function AdminCompetitionModal({ open, onClose, editing, onSaved }) {
  const isEdit = !!editing?.id;

  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    competition_title: "",
    description: "",
    venue: "",
    price_participate: "",
    registration_link: "",
    image_url: "",
    competition_date: "",
    start_time: "",
    end_time: "",
  });

  useEffect(() => {
    if (!open) return;

    if (isEdit) {
      setForm({
        competition_title: editing.competition_title || "",
        description: editing.description || "",
        venue: editing.venue || "",
        price_participate: editing.price_participate || "",
        registration_link: editing.registration_link || "",
        image_url: editing.image_url || "",
        competition_date: editing.competition_date || "",
        start_time: editing.start_time || "",
        end_time: editing.end_time || "",
      });
    } else {
      setForm({
        competition_title: "",
        description: "",
        venue: "",
        price_participate: "",
        registration_link: "",
        image_url: "",
        competition_date: "",
        start_time: "",
        end_time: "",
      });
    }
  }, [open, isEdit, editing]);

  if (!open) return null;

  async function handleSubmit() {
    if (!form.competition_title || !form.description || !form.competition_date) {
      alert("competition_title, description, competition_date are required.");
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();

      if (isEdit) {
        const res = await fetch(`${API_URL}/admin/competitions/${editing.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to update competition");
      } else {
        const res = await fetch(`${API_URL}/admin/competitions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to create competition");
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
          <h3 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400">
            {isEdit ? "Edit Competition" : "New Competition"}
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition"
            disabled={saving}
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Title *">
            <input
              value={form.competition_title}
              onChange={(e) => setForm((x) => ({ ...x, competition_title: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
            />
          </Field>

          <Field label="Date * (YYYY-MM-DD)">
            <input
              type="date"
              value={form.competition_date}
              onChange={(e) => setForm((x) => ({ ...x, competition_date: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
            />
          </Field>

          <Field label="Start time">
            <input
              type="time"
              value={form.start_time}
              onChange={(e) => setForm((x) => ({ ...x, start_time: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
            />
          </Field>

          <Field label="End time">
            <input
              type="time"
              value={form.end_time}
              onChange={(e) => setForm((x) => ({ ...x, end_time: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
            />
          </Field>

          <Field label="Venue">
            <input
              value={form.venue}
              onChange={(e) => setForm((x) => ({ ...x, venue: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
            />
          </Field>

          <Field label="Price">
            <input
              value={form.price_participate}
              onChange={(e) =>
                setForm((x) => ({ ...x, price_participate: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
              placeholder="Free / RM20 ..."
            />
          </Field>

          <Field label="Registration link">
            <input
              value={form.registration_link}
              onChange={(e) =>
                setForm((x) => ({ ...x, registration_link: e.target.value }))
              }
              className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
              placeholder="https://..."
            />
          </Field>

          <Field label="Image URL">
            <input
              value={form.image_url}
              onChange={(e) => setForm((x) => ({ ...x, image_url: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white"
              placeholder="https://..."
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Description *">
              <textarea
                value={form.description}
                onChange={(e) => setForm((x) => ({ ...x, description: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white min-h-[140px]"
              />
            </Field>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-gray-800 mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition"
            disabled={saving}
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            className="px-6 py-2 rounded-lg font-bold transition shadow-md
                       bg-gradient-to-r from-teal-500 to-cyan-500 text-gray-900
                       hover:from-teal-400 hover:to-cyan-400 disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Saving..." : isEdit ? "Save Changes" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
