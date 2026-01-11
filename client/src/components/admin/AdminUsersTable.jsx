import React from "react";

export default function AdminUsersTable({ loading, users, onEdit }) {
  if (loading) {
    return (
      <div className="p-10 text-center text-cyan-400 animate-pulse">
        Loading users...
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <div className="text-center p-16 bg-gray-800/40 rounded-2xl border border-gray-700">
        <p className="text-2xl text-gray-500 italic">No users found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-800">
      <table className="min-w-full text-left">
        <thead className="bg-gray-800 text-gray-300">
          <tr>
            <th className="p-4">Email</th>
            <th className="p-4">Role</th>
            <th className="p-4">Username</th>
            <th className="p-4">User ID</th>
            <th className="p-4 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="bg-gray-900">
          {users.map((u) => (
            <tr key={u.id} className="border-t border-gray-800">
              <td className="p-4 text-white">{u.email || "-"}</td>
              <td className="p-4 text-cyan-300 font-semibold">{u.role}</td>
              <td className="p-4 text-gray-200">{u.username || "-"}</td>
              <td className="p-4 text-gray-400 font-mono text-xs">{u.id}</td>
              <td className="p-4 text-right">
                <button
                  onClick={() => onEdit(u)}
                  className="px-4 py-2 rounded-lg font-bold bg-gradient-to-r from-teal-500 to-cyan-500 text-gray-900 hover:from-teal-400 hover:to-cyan-400"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
