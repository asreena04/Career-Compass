import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_AVATAR = 'https://i.ibb.co/L89B6Pz/default-avatar.png';
const AVATAR_BUCKET = 'avatars';

const ROLE_SCHEMAS = {
    'Student': {
        table: 'student_profiles',
        fields: ['full_name', 'matric_number', 'programme', 'school', 'year_of_study', 'advisor_id'],
    },
    'Academic Advisor': {
        table: 'academic_advisor_profiles',
        fields: ['full_name', 'room_number', 'position', 'department'],
    },
    'Company': {
        table: 'company_profiles',
        fields: ['company_name', 'website', 'company_category', 'contact_link', 'hr_contact_name'],
    }
};

const formatLabel = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

const getStoragePath = (url) => {
    if (!url || url === DEFAULT_AVATAR) return null;
    const parts = url.split(`${AVATAR_BUCKET}/`);
    return parts.length > 1 ? parts[1] : null;
};

// --- Custom Logic Hook ---
const useProfileManager = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState({ id: null, email: '', role: '', username: '', avatar_url: DEFAULT_AVATAR, details: {} });
    const [status, setStatus] = useState({ loading: true, updating: false, error: null, message: null });

    const setFeedback = (error = null, message = null) => {
        setStatus(prev => ({ ...prev, error, message }));
        if (error || message) {
            setTimeout(() => setStatus(prev => ({ ...prev, error: null, message: null })), 5000);
        }
    };

    const fetchProfile = useCallback(async () => {
        setStatus(prev => ({ ...prev, loading: true }));
        try {
            const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser();
            if (authErr || !authUser) return navigate('/sign-in');

            const { data: core, error: coreErr } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (coreErr && coreErr.code !== 'PGRST116') throw coreErr;

            const role = core?.role || 'N/A';
            const schema = ROLE_SCHEMAS[role];
            let details = {};

            if (schema) {
                const { data: detailData, error: detErr } = await supabase
                    .from(schema.table)
                    .select('*')
                    .eq('id', authUser.id)
                    .single();
                
                if (detErr && detErr.code !== 'PGRST116') throw detErr;
                details = detailData || {};
            }

            setProfile({
                id: authUser.id,
                email: authUser.email,
                role,
                username: core?.username || authUser.email.split('@')[0],
                avatar_url: core?.avatar_url || DEFAULT_AVATAR,
                details
            });
        } catch (err) { 
            setFeedback(err.message); 
        } finally { 
            setStatus(prev => ({ ...prev, loading: false })); 
        }
    }, [navigate]);

    useEffect(() => { fetchProfile(); }, [fetchProfile]);

    const updateProfile = async (newUsername, newDetails) => {
        setStatus(prev => ({ ...prev, updating: true }));
        try { 
            const { error: coreErr } = await supabase
                .from('profiles')
                .update({ username: newUsername })
                .eq('id', profile.id);
            if (coreErr) throw coreErr;

            const schema = ROLE_SCHEMAS[profile.role];
            if (schema) {
                const { error: detErr } = await supabase
                    .from(schema.table)
                    .upsert({ id: profile.id, ...newDetails });
                if (detErr) throw detErr;
            }

            setProfile(prev => ({ ...prev, username: newUsername, details: newDetails }));
            setFeedback(null, "Profile updated successfully!");
            return true;
        } catch (err) { 
            setFeedback(err.message); 
            return false; 
        } finally { 
            setStatus(prev => ({ ...prev, updating: false })); 
        }
    };

    const updateAvatar = async (file) => {
        if (!file) return;
        setStatus(prev => ({ ...prev, updating: true }));
        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `${profile.role.toLowerCase() || 'general'}/${uuidv4()}.${fileExt}`;
            
            const { error: upErr } = await supabase.storage.from(AVATAR_BUCKET).upload(filePath, file);
            if (upErr) throw upErr;

            const { data: { publicUrl } } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);

            await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', profile.id);

            const oldPath = getStoragePath(profile.avatar_url);
            if (oldPath) await supabase.storage.from(AVATAR_BUCKET).remove([oldPath]);

            setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
            setFeedback(null, "Avatar updated!");
        } catch (err) { 
            setFeedback(err.message); 
        } finally { 
            setStatus(prev => ({ ...prev, updating: false })); 
        }
    };

    return { 
        profile, status, updateProfile, updateAvatar, 
        logout: () => supabase.auth.signOut().then(() => navigate('/sign-in')) 
    };
};

// --- Sub-Component: ProfileField ---
const ProfileField = ({ label, name, value, isEditing, onChange, disabled }) => (
    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 transition-all">
        <p className="text-sm font-medium text-gray-400 mb-1">{label}</p>
        {isEditing ? (
            <input
                type="text"
                name={name}
                value={value || ''}
                onChange={onChange}
                disabled={disabled}
                className="w-full text-lg border-b border-indigo-500 bg-transparent text-white focus:outline-none disabled:opacity-50"
            />
        ) : (
            <p className="text-lg font-semibold text-white break-all">{value || 'N/A'}</p>
        )}
    </div>
);

// --- Main Component ---
const UserProfile = () => {
    const { profile, status, updateProfile, updateAvatar, logout } = useProfileManager();
    const [editState, setEditState] = useState({ username: '', details: {} });
    const [isEditing, setIsEditing] = useState(false);
    const fileInputRef = useRef();

    useEffect(() => {
        setEditState({ username: profile.username, details: profile.details });
    }, [profile]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'username') {
            setEditState(p => ({ ...p, username: value }));
        } else {
            setEditState(p => ({ ...p, details: { ...p.details, [name]: value } }));
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (await updateProfile(editState.username, editState.details)) {
            setIsEditing(false);
        }
    };

    if (status.loading) {
        return <div className="flex justify-center items-center min-h-screen text-white animate-pulse">Loading Profile...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto my-10 bg-gray-900 p-8 rounded-2xl shadow-2xl border border-gray-700 text-white">
            
            {/* Avatar Section */}
            <div className="text-center mb-8">
                <div className="relative w-32 h-32 mx-auto">
                    <img 
                        src={profile.avatar_url} 
                        className="w-full h-full rounded-full object-cover border-4 border-indigo-500 shadow-xl" 
                        alt="Avatar" 
                    />
                    <button 
                        type="button"
                        disabled={status.updating}
                        onClick={() => fileInputRef.current.click()}
                        className="absolute bottom-0 right-0 bg-indigo-600 p-2 rounded-full hover:scale-110 transition-transform disabled:opacity-50"
                    >
                        {/* Note: Ensure boxicons CSS is linked in your index.html */}
                        <i className={`bx ${status.updating ? 'bx-loader-alt bx-spin' : 'bx-camera'} text-xl`}></i>
                    </button>
                    <input 
                        type="file" 
                        hidden 
                        ref={fileInputRef} 
                        onChange={(e) => updateAvatar(e.target.files[0])} 
                        accept="image/*" 
                    />
                </div>
                <h1 className="text-3xl font-bold mt-4">
                    {profile.role} <span className="text-indigo-400">Profile</span>
                </h1>
            </div>

            {/* Notifications */}
            {status.error && (
                <div className="bg-red-900/30 border border-red-500 text-red-400 p-3 rounded-lg mb-4 text-center">
                    {status.error}
                </div>
            )}
            {status.message && (
                <div className="bg-green-900/30 border border-green-500 text-green-400 p-3 rounded-lg mb-4 text-center">
                    {status.message}
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ProfileField 
                        label="Username" 
                        name="username" 
                        value={isEditing ? editState.username : profile.username} 
                        isEditing={isEditing} 
                        onChange={handleInputChange} 
                        disabled={status.updating} 
                    />
                    <ProfileField 
                        label="Email (Permanent)" 
                        value={profile.email} 
                        isEditing={false} 
                    />
                    
                    {ROLE_SCHEMAS[profile.role]?.fields.map(key => (
                        <ProfileField 
                            key={key} 
                            label={formatLabel(key)} 
                            name={key} 
                            value={isEditing ? (editState.details?.[key] || '') : (profile.details?.[key] || '')} 
                            isEditing={isEditing} 
                            onChange={handleInputChange} 
                            disabled={status.updating} 
                        />
                    ))}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 pt-6 border-t border-gray-800">
                    {isEditing ? (
                        <div className="flex gap-3">
                            <button 
                                type="submit" 
                                disabled={status.updating} 
                                className="flex-1 bg-indigo-600 py-3 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                            >
                                {status.updating ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button 
                                type="button" 
                                onClick={() => {
                                    setEditState({ username: profile.username, details: profile.details });
                                    setIsEditing(false);
                                }} 
                                className="px-6 bg-gray-700 py-3 rounded-lg hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button 
                            type="button" 
                            onClick={() => setIsEditing(true)} 
                            className="w-full bg-indigo-600 py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors"
                        >
                            Edit Profile
                        </button>
                    )}
                    
                    <button 
                        type="button" 
                        onClick={logout} 
                        className="w-full bg-red-600/10 text-red-500 py-3 rounded-lg font-bold border border-red-500/20 hover:bg-red-600 hover:text-white transition-all"
                    >
                        Log Out
                    </button>
                </div>
            </form>
        </div>
    );
};

export default UserProfile;