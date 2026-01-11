import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useRole } from "../hooks/useRole";
import 'boxicons/css/boxicons.min.css';
import StudentNotification from "./StudentNotification";
import AdvisorNotification from "./AdvisorNotification";

const DEFAULT_AVATAR = 'https://i.ibb.co/L89B6Pz/default-avatar.png';

const Header = () => {
  const { user, role, username, avatar_url, loading, year_of_study } = useRole();
  const navigate = useNavigate();
  const profileRef = useRef(null);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const NAV_CONFIG = {
    "Company": [
      { to: "/company-home-page", label: "Dashboard" },
      { to: "/post-competition", label: "Post New\nCompetition" },
      { to: "/edit-delete-competition", label: "Edit / Delete\nCompetition" },
      { to: "/post-job", label: "Post New\nJob" },
      { to: "/edit-delete-job", label: "Edit / Delete\nJob" },
    ],
    "Student": [
      { to: "/student/dashboard", label: "Dashboard" },
      { to: "/student/roadmap", label: "Roadmap" },
      { to: "/student/submissions", label: "My Submissions" },
      { to: "/student/appointments", label: "Booking Appointment"},
      { to: "/student/my-appointments", label: "My Appointments" },
      { to: "/cv", label: "CV\nGenerator" },
      { to: "/student-view-competition", label: "Competition" },
      { to: "/student-view-job", label: "Job" },
    ],
    "Academic Advisor": [
      { to: "/advisorHomePage", label: "Dashboard" },
      { to: "/student-management", label: "Student\nManagement" },
      { to: "/advisor/appointments", label: "Appointment\nManagement" },
      { to: "/proof-verification", label: "Proof\nVerification" },
    ],
  };

  // Logic to filter links based on role and student year
  const links = useMemo(() => {
    if (!role || loading) return [];

    let baseLinks = [...(NAV_CONFIG[role] || [])];

    if (role === "Student") {
      return baseLinks.filter(link => {
        if (link.to === "/student-view-job") {
          // parseInt ensures we compare numbers (e.g. 4 === 4) even if DB returns text "4"
          const currentYear = parseInt(year_of_study, 10);
          return currentYear === 4;
        }
        return true;
      });
    }

    return baseLinks;
  }, [role, year_of_study, loading]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isLoggedIn = !!user;
  const avatarSrc = avatar_url || DEFAULT_AVATAR;

  const toggleMobileMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    setIsProfileMenuOpen(false);
  };

  const handleLinkClick = () => {
    setIsMenuOpen(false);
    setIsProfileMenuOpen(false);
  };

  const handleSignOut = async () => {
    setIsProfileMenuOpen(false);
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Sign Out Error:", error);
    else navigate("/sign-in");
  };

  const ProfileMenuPopup = () => (
    <div className="absolute right-0 mt-3 w-72 bg-gray-900 rounded-xl shadow-2xl border border-gray-800 overflow-hidden animate-in fade-in zoom-in duration-200">
      <div className="flex items-center p-4 border-b border-gray-800 space-x-3 bg-gray-800/50">
        <img src={avatarSrc} alt="Profile" className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500" />
        <div className="overflow-hidden">
          <p className="text-white font-bold truncate">{username}</p>
          <p className="text-xs text-gray-400 truncate">{user?.email}</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex items-center text-sm text-gray-300">
          <i className='bx bx-shield-quarter text-lg mr-2 text-indigo-400'></i>
          <span className="font-medium text-gray-400 mr-2">Role:</span>
          <span className="text-indigo-300">{role || "User"}</span>
        </div>

        {role === "Student" && (
          <div className="flex items-center text-sm text-gray-300">
            <i className='bx bx-book-bookmark text-lg mr-2 text-indigo-400'></i>
            <span className="font-medium text-gray-400 mr-2">Year:</span>
            <span className="text-indigo-300">{year_of_study || "N/A"}</span>
          </div>
        )}

        <Link
          to="/view-user-profile"
          onClick={handleLinkClick}
          className="w-full text-center block py-2 text-sm font-medium text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition duration-150 border border-indigo-500/20"
        >
          View Full Profile
        </Link>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center py-2 text-sm font-bold rounded-lg text-white bg-red-600 hover:bg-red-700 transition duration-150 shadow-lg shadow-red-900/20"
        >
          <i className='bx bx-log-out text-lg mr-2'></i>Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <header className="flex justify-between items-center py-4 px-4 lg:px-20 bg-black text-white shadow-md relative z-50 border-b border-gray-900">
      <Link to={isLoggedIn ? "/home" : "/"} className="text-2xl md:text-3xl lg:text-4xl font-light tracking-tighter hover:text-gray-400 transition-colors duration-200">
        Career Compass
      </Link>

      <nav className="hidden md:flex items-center gap-8 lg:gap-12">
        {!loading && links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            onClick={handleLinkClick}
            className="text-sm lg:text-base text-center text-gray-300 hover:text-white transition-all whitespace-pre-line leading-tight hover:scale-105"
          >
            {link.label}
          </Link>
        ))}

        {role === "Student" && <StudentNotification />}
        {role === "Academic Advisor" && <AdvisorNotification />}

        <div className="relative" ref={profileRef}>
          {isLoggedIn ? (
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="focus:outline-none p-0.5 rounded-full border-2 border-transparent hover:border-indigo-500 transition-all duration-200"
            >
              <img src={avatarSrc} alt="User Profile" className="w-10 h-10 rounded-full object-cover cursor-pointer" />
            </button>
          ) : (
            !loading && (
              <Link to="/sign-in" className="bg-indigo-600 text-white py-2 px-6 rounded-full font-medium hover:bg-indigo-700">
                Sign In
              </Link>
            )
          )}
          {isProfileMenuOpen && <ProfileMenuPopup />}
        </div>
      </nav>

      {/* Mobile Trigger */}
      <button onClick={toggleMobileMenu} className='md:hidden text-3xl p-2 text-white z-50 focus:outline-none'>
        <i className={`bx ${isMenuOpen ? 'bx-x' : 'bx-menu'}`}></i>
      </button>

      {/* Mobile Drawer */}
      <div className={`fixed inset-0 top-[72px] bg-black/95 backdrop-blur-md md:hidden z-40 transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <nav className='flex flex-col gap-8 items-center pt-12 px-6'>
          {links.map((link) => (
            <Link key={link.to} onClick={handleLinkClick} className="text-xl font-light tracking-widest text-gray-300 hover:text-indigo-400" to={link.to}>
              {link.label.replace("\n", " ")}
            </Link>
          ))}
          {role === "Student" && <StudentNotification />}
          <hr className="w-full border-gray-800" />
          {isLoggedIn ? (
            <button onClick={handleSignOut} className="w-full py-4 bg-red-600 text-white font-bold rounded-xl">Sign Out</button>
          ) : (
            <Link onClick={handleLinkClick} className="w-full py-4 bg-indigo-600 text-white text-center font-bold rounded-xl" to="/sign-in">Sign In</Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;