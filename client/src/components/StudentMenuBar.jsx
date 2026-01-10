import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { FiHome, FiCalendar, FiCheckSquare, FiLogOut, FiUser } from "react-icons/fi";

const StudentMenuBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/sign-in");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <aside className="lg:w-80">
        <div className="bg-gray-900 shadow-2xl rounded-2xl p-6 border border-gray-800 sticky top-6">
          <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-3">
            <div className="h-8 w-1 bg-gradient-to-b from-teal-400 to-indigo-400 rounded-full"></div>
            Navigation
          </h2>

          <nav className="space-y-2">
            <Link
              to="/student/dashboard"
              className={`flex items-center gap-4 py-3 px-4 rounded-xl border transition-all duration-200 group shadow-lg
                ${isActive("/student/dashboard")
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
              to="/student/appointments"
              className={`flex items-center gap-4 py-3 px-4 rounded-xl border transition-all duration-200 group shadow-lg
                ${isActive("/student/appointments")
                  ? "bg-gray-700 border-indigo-500/50"
                  : "bg-gray-800 border-gray-700 hover:border-indigo-500/50 hover:shadow-indigo-500/20"
                }`}
            >
              <div className="p-2 bg-indigo-900/30 rounded-lg border border-indigo-700/50">
                <FiCalendar size={20} className="text-indigo-400" />
              </div>
              <span className="text-sm font-medium text-gray-200">Book Appointment</span>
            </Link>

            <Link
              to="/student/my-appointments"
              className={`flex items-center gap-4 py-3 px-4 rounded-xl border transition-all duration-200 group shadow-lg
                ${isActive("/student/my-appointments")
                  ? "bg-gray-700 border-teal-500/50"
                  : "bg-gray-800 border-gray-700 hover:border-teal-500/50 hover:shadow-teal-500/20"
                }`}
            >
              <div className="p-2 bg-teal-900/30 rounded-lg border border-teal-700/50">
                <FiCheckSquare size={20} className="text-teal-400" />
              </div>
              <span className="text-sm font-medium text-gray-200">My Appointments</span>
            </Link>

            <Link
              to="/student/profile"
              className={`flex items-center gap-4 py-3 px-4 rounded-xl border transition-all duration-200 group shadow-lg
                ${isActive("/student/profile")
                  ? "bg-gray-700 border-purple-500/50"
                  : "bg-gray-800 border-gray-700 hover:border-purple-500/50 hover:shadow-purple-500/20"
                }`}
            >
              <div className="p-2 bg-purple-900/30 rounded-lg border border-purple-700/50">
                <FiUser size={20} className="text-purple-400" />
              </div>
              <span className="text-sm font-medium text-gray-200">My Profile</span>
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
    </div>
  );
};

export default StudentMenuBar;