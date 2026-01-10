import 'boxicons/css/boxicons.min.css';
import { Link, useNavigate } from "react-router-dom";
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// Set image to default when no image insert by user.
const DEFAULT_AVATAR = 'https://i.ibb.co/L89B6Pz/default-avatar.png';

const CompanyHeader = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false); // Menu open or close.
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false); // Menu profile open or close.

    const [userProfile, setUserProfile] = useState({ // Default user profile variable value.
        username: 'Guest User',
        email: 'Loading...',
        role: 'Loading...',
        avatar_url: DEFAULT_AVATAR,
        id: null
    });

    useEffect(() => {
        // Fetch data for user currently log in using supabase authentication.
        const fetchUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) { // If user currently log in.
                const { data: profileData } = await supabase // Fetch user profile data from 'profiles' table.
                    .from('profiles')
                    .select('role, avatar_url, username')
                    .eq('id', user.id)
                    .single();

                setUserProfile({ // Set user profile data.
                    username: profileData?.username || user.email.split('@')[0], // If user has set username, use it. Otherwise, use email prefix.
                    email: user.email,
                    role: profileData?.role || 'Role N/A',
                    avatar_url: profileData?.avatar_url || DEFAULT_AVATAR,
                    id: user.id
                });
            }
            else {
                setUserProfile(prev => ({ ...prev, username: 'Guest', email: '', role: '', id: null })); // Default user profile if no user currently log in.
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange( // Auth state change between login and logout.
            (event, session) => {
                if (session) {
                    fetchUserData(); // Fetch user profile data when auth state change after login.
                }
                else {
                    setUserProfile({ username: 'Guest', email: 'Not Logged In', role: '', avatar_url: DEFAULT_AVATAR, id: null }); // Default user profile if no user currently log in.
                }
            }
        );

        fetchUserData(); // Fetch data for user currently log in using supabase authentication.
        return () => { subscription.unsubscribe(); };

    }, [navigate]);

    const toggleMobileMenu = () => { setIsMenuOpen(prev => !prev); setIsProfileMenuOpen(false); } // Close menu profile. Open menu.
    const toggleProfileMenu = () => { setIsProfileMenuOpen(prev => !prev); setIsMenuOpen(false); }; // Close menu. Open menu profile.
    const handleLinkClick = () => { setIsMenuOpen(false); setIsProfileMenuOpen(false); } // Click link cause menu & profile menu to close.

    const handleSignOut = async () => {
        setIsProfileMenuOpen(false); // Close profile menu.
        const { error } = await supabase.auth.signOut(); // Wait for supabase authentication to sign out.
        if (error) {
            console.error("Sign Out Error:", error); // Cannot sign out.
        }
        else {
            navigate('/company-home-page'); // Successfully sign out & go to sign in page.
        }
    };

    const avatarSrc = userProfile.avatar_url || DEFAULT_AVATAR; // Current avatar or default avatar.
    const isLoggedIn = userProfile.id !== null; // Have id means successfully sign in.

    // Profile menu popup after click on profile picture on header.
    const ProfileMenuPopup = () => (
        <div className="absolute right-0 mt-2 w-72 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden"> {/* Popup container */}

            <div className="flex items-center p-4 border-b border-gray-700 space-x-3"> {/* Image, Username, Email align same part */}
                <img src={avatarSrc} alt="Profile" className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500"/> {/* Display user profile image */}
                <div>
                    <p className="text-white font-semibold truncate">{userProfile.username}</p> {/* Display userProfile.username */}
                    <p className="text-sm text-gray-400 truncate">{userProfile.email}</p> {/* Display userProfile.email */}
                </div>
            </div>

            <div className="p-4 space-y-2"> {/* Role & Link of 'view full profile' & Log out button aligned same part */}
                 <div className="flex items-center text-sm text-gray-300">
                    <i className='bx bx-user-circle text-lg mr-2 text-indigo-400'></i> {/* Icon for role */}
                    <span className="font-medium text-white mr-1">Role:</span> {/* Role: */}
                    {userProfile.role} {/* Role value based on role that user sign up as */}
                </div>
                <Link to="/view-user-profile" onClick={handleLinkClick} className="w-full text-center block py-2 text-sm text-indigo-400 hover:text-indigo-300 transition duration-150 border-t border-gray-700 pt-4">
                    View Full Profile
                </Link> {/* Link to go to another page to view full user profile */}
                <button onClick={handleSignOut} className="w-full flex items-center justify-center py-2 text-sm font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 transition duration-150">
                    <i className='bx bx-log-out text-lg mr-2'></i>Sign Out
                </button> {/* Sign out button */}
            </div>

        </div>
    );

    return (
        <header className="flex justify-between items-center py-4 px-4 lg:px-20 bg-black text-white shadow-md relative z-50">
            <Link to="/company-home-page" className="text-3xl md:text-4xl lg:text-5xl font-light m-0 hover:text-gray-400 transition-colors duration-200">Career Compass</Link> {/* Left Navigation Link */}

            <nav className="hidden md:flex items-center gap-12 text-gray-300"> {/* Right Navigation Link */}
                <Link to="/post-competition" className="text-base text-center tracking-wider transition-colors hover:text-gray-400 z-50">Post New<br></br>Competition</Link>
                <Link to="/edit-delete-competition" className="text-base text-center tracking-wider transition-colors hover:text-gray-400 z-50">Edit / Delete<br></br>Competition</Link>
                <Link to="/post-job" className="text-base text-center tracking-wider transition-colors hover:text-gray-400 z-50">Post New<br></br>Job</Link>
                <Link to="/edit-delete-job" className="text-base text-center tracking-wider transition-colors hover:text-gray-400 z-50">Edit / Delete<br></br>Job</Link>

                {/* Profile Picture */}
                <div className="relative">
                    {isLoggedIn
                    ?
                        (<>
                            {/* Already sign in & see user profile picture button */}
                            <button onClick={toggleProfileMenu} className="focus:outline-none p-1 rounded-full border-2 border-transparent hover:border-indigo-500 transition duration-150">
                                <img src={avatarSrc} alt="User Profile" className="w-10 h-10 rounded-full object-cover cursor-pointer"/>
                            </button>
                            {isProfileMenuOpen && <ProfileMenuPopup />} {/* Click on user profile picture button & see profile menu popup */}
                        </>)
                    :
                        (<Link to="/sign-in" className="bg-indigo-600 text-white py-2 px-6 rounded-full border-none font-medium transition-all duration-300 hover:bg-indigo-700 cursor-pointer">
                            Sign In
                        </Link>) // If not log in yet, show sign in button.
                    }
                </div>
            </nav>

            <button onClick={toggleMobileMenu} className='md:hidden text-3xl p-2 text-white z-50'> {/* Icon to open or close menu? X : ||| */}
                <i className={`bx ${isMenuOpen ? 'bx-x' : 'bx-menu'}`}></i>
            </button>

            <div className={`fixed top-[72px] bottom-0 right-0 left-0 p-5 md:hidden z-40 bg-black backdrop-blur-sm text-white transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}` }>
                <nav className='flex flex-col gap-8 items-center pt-10'> {/* Menu content */}
                    <Link onClick={handleLinkClick} className="text-xl tracking-wider hover:text-gray-400 transition-colors" to="/post-competition">Post New Competition</Link>
                    <Link onClick={handleLinkClick} className="text-xl tracking-wider hover:text-gray-400 transition-colors" to="/edit-delete-competition">Edit / Delete Competition</Link>
                    <Link onClick={handleLinkClick} className="text-xl tracking-wider hover:text-gray-400 transition-colors" to="/post-job">Post New Job</Link>
                    <Link onClick={handleLinkClick} className="text-xl tracking-wider hover:text-gray-400 transition-colors" to="/edit-delete-job">Edit / Delete Job</Link>

                    {isLoggedIn &&
                        (<button onClick={handleSignOut} className="mt-8 w-2/3 py-3 bg-red-600 text-white text-center font-bold rounded-full hover:bg-red-700 transition duration-300">
                            Sign Out
                        </button>) // If user log in, show sign out button.
                    }
                    {!isLoggedIn &&
                        (<Link onClick={handleLinkClick} className="mt-8 w-2/3 py-3 bg-indigo-600 text-white text-center font-bold rounded-full hover:bg-indigo-700 transition duration-300" to="/sign-in">
                            Sign In
                        </Link>) // If user not log in yet, show sign in button.
                    }
                </nav>
            </div>
        </header>
    );

}
export default CompanyHeader;