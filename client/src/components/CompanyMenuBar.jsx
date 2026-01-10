import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { FiUser, FiHome, FiCheckSquare, FiLogOut, FiCalendar, FiUpload, FiEdit } from "react-icons/fi";

const CompanyMenuBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/sign-in");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="lg:w-80">
      <div className="bg-gray-900 shadow-2xl rounded-2xl p-8 border border-gray-800 sticky top-6 min-h-[400px]">
        <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-3">
          <div className="h-8 w-1 bg-gradient-to-b from-teal-400 to-indigo-400 rounded-full"></div>
          Navigation
        </h2>

        <nav className="space-y-4">
          <Link
            to="/company-home-page"
            className={`flex items-center gap-4 py-3 px-4 rounded-xl border transition-all duration-200 group shadow-lg
              ${isActive("/company-home-page")
                ? "bg-gray-700 border-cyan-500/50"
                : "bg-gray-800 border-gray-700 hover:border-cyan-500/50 hover:shadow-cyan-500/20"
              }`}
          >
            <div className="p-2 bg-cyan-900/30 rounded-lg border border-cyan-700/50">
              <FiHome size={20} className="text-cyan-400" />
            </div>
            <span className="text-sm font-medium text-gray-200">Dashboard</span>
          </Link>

          <Link
            to="/post-competition"
            className={`flex items-center gap-4 py-3 px-4 rounded-xl border transition-all duration-200 group shadow-lg
              ${isActive("/post-competition")
                ? "bg-gray-700 border-indigo-500/50"
                : "bg-gray-800 border-gray-700 hover:border-indigo-500/50 hover:shadow-indigo-500/20"
              }`}
          >
            <div className="p-2 bg-indigo-900/30 rounded-lg border border-indigo-700/50">
              <FiUpload size={20} className="text-indigo-400" />
            </div>
            <span className="text-sm font-medium text-gray-200">Post Competition</span>
          </Link>

          <Link
            to="/edit-delete-competition"
            className={`flex items-center gap-4 py-3 px-4 rounded-xl border transition-all duration-200 group shadow-lg
              ${isActive("/edit-delete-competition")
                ? "bg-gray-700 border-indigo-500/50"
                : "bg-gray-800 border-gray-700 hover:border-indigo-500/50 hover:shadow-indigo-500/20"
              }`}
          >
            <div className="p-2 bg-purple-900/30 rounded-lg border border-indigo-700/50">
              <FiEdit size={20} className="text-purple-400" />
            </div>
            <span className="text-sm font-medium text-gray-200">Edit Delete Competition</span>
          </Link>

          <Link
            to="/post-job"
            className={`flex items-center gap-4 py-3 px-4 rounded-xl border transition-all duration-200 group shadow-lg
              ${isActive("/post-job")
                ? "bg-gray-700 border-indigo-500/50"
                : "bg-gray-800 border-gray-700 hover:border-indigo-500/50 hover:shadow-indigo-500/20"
              }`}
          >
            <div className="p-2 bg-green-900/30 rounded-lg border border-indigo-700/50">
              <FiUpload size={20} className="text-indigo-400" />
            </div>
            <span className="text-sm font-medium text-gray-200">Post Job</span>
          </Link>

          <Link
            to="/edit-delete-job"
            className={`flex items-center gap-4 py-3 px-4 rounded-xl border transition-all duration-200 group shadow-lg
              ${isActive("/edit-delete-job")
                ? "bg-gray-700 border-indigo-500/50"
                : "bg-gray-800 border-gray-700 hover:border-indigo-500/50 hover:shadow-indigo-500/20"
              }`}
          >
            <div className="p-2 bg-yellow-900/30 rounded-lg border border-indigo-700/50">
              <FiEdit size={20} className="text-purple-400" />
            </div>
            <span className="text-sm font-medium text-gray-200">Edit Delete Job</span>
          </Link>

          <div className="pt-4 mt-4 border-t border-gray-800">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-4 py-3 px-4 rounded-xl bg-gray-800 border border-gray-700 hover:border-red-500/50 transition-all duration-200 group shadow-lg hover:shadow-red-500/20"
            >
              <div className="p-2 bg-red-900/30 rounded-lg border border-red-700/50">
                <FiLogOut size={20} className="text-red-400" />
              </div>
              <span className="text-sm font-medium text-gray-200">Sign Out</span>
            </button>
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default CompanyMenuBar;