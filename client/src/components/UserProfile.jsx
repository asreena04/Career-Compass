import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_AVATAR = 'https://i.ibb.co/L89B6Pz/default-avatar.png';
const AVATAR_BUCKET = 'avatars';

// Configuration for what fields are shown and which are read-only
const ROLE_SCHEMAS = {
    'Student': {
        table: 'student_profiles',
        fields: ['full_name', 'matric_number', 'programme', 'school', 'year_of_study', 'advisor_name'],
        permanent: ['matric_number', 'year_of_study', 'advisor_name']
    },
    'Academic Advisor': {
        table: 'academic_advisor_profiles',
        fields: ['full_name', 'room_number', 'position', 'department'],
        permanent: []
    },
    'Company': {
        table: 'company_profiles',
        fields: ['company_name', 'website', 'company_category', 'contact_link', 'hr_contact_name'],
        permanent: ['company_category']
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
                let query = supabase.from(schema.table).select('*').eq('id', authUser.id);

                // Fetch joined advisor name if user is a student
                if (role === 'Student') {
                    query = supabase
                        .from('student_profiles')
                        .select(`*, academic_advisor_profiles(full_name)`)
                        .eq('id', authUser.id);
                }

                const { data: detailData, error: detErr } = await query.single();
                if (detErr && detErr.code !== 'PGRST116') throw detErr;

                if (detailData) {
                    details = { ...detailData };
                    // Map the joined data to advisor_name field
                    if (role === 'Student' && detailData.academic_advisor_profiles) {
                        details.advisor_name = detailData.academic_advisor_profiles.full_name;
                    }
                }
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
                // Safeguard: Remove any permanent/joined fields from payload
                const payload = { ...newDetails };
                schema.permanent.forEach(key => delete payload[key]);
                delete payload.academic_advisor_profiles;

                const { error: detErr } = await supabase
                    .from(schema.table)
                    .upsert({ id: profile.id, ...payload });
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
        profile,
        status,
        updateProfile,
        updateAvatar,
        logout: () => supabase.auth.signOut().then(() => navigate('/sign-in'))
    };
};

// --- Sub-Component: ProfileField ---
const ProfileField = ({ label, name, value, isEditing, onChange, disabled, isPermanent }) => (
    <div className={`bg-gray-800 p-4 rounded-xl border transition-all ${isPermanent ? 'border-gray-700 opacity-70' : 'border-gray-700 hover:border-indigo-500/50'}`}>
        <div className="flex justify-between items-center mb-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
            {isPermanent && <span className="text-[9px] px-2 py-0.5 rounded bg-gray-900 text-indigo-400 font-bold border border-indigo-500/30">Fixed</span>}
        </div>
        {isEditing && !isPermanent ? (
            <input
                type="text"
                name={name}
                value={value || ''}
                onChange={onChange}
                disabled={disabled}
                className="w-full text-lg border-b border-indigo-500 bg-transparent text-white focus:outline-none py-1 transition-colors"
            />
        ) : (
            <p className="text-lg font-semibold text-white break-all py-1">{value || 'Not Set'}</p>
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
        if (name === 'username') setEditState(p => ({ ...p, username: value }));
        else setEditState(p => ({ ...p, details: { ...p.details, [name]: value } }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (await updateProfile(editState.username, editState.details)) setIsEditing(false);
    };

    if (status.loading) return (
        <div className="flex flex-col justify-center items-center min-h-screen bg-gray-950 text-white">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="animate-pulse">Loading Profile...</p>
        </div>
    );

    const currentSchema = ROLE_SCHEMAS[profile.role] || { fields: [], permanent: [] };

    return (
        <div className="max-w-4xl mx-auto my-10 bg-gray-900 p-8 rounded-2xl shadow-2xl border border-gray-800 text-white font-sans">
            {/* Header / Avatar */}
            <div className="text-center mb-10">
                <div className="relative w-36 h-36 mx-auto group">
                    <img src={profile.avatar_url} className="w-full h-full rounded-full object-cover border-4 border-indigo-600 shadow-2xl" alt="Avatar" />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current.click()}
                        className="absolute bottom-1 right-1 bg-indigo-600 p-3 rounded-full hover:bg-indigo-500 transition-colors shadow-lg"
                        title="Change Avatar"
                    >
                        <i className={`bx ${status.updating ? 'bx-loader-alt bx-spin' : 'bx-camera'} text-xl text-white`}></i>
                    </button>
                    <input type="file" hidden ref={fileInputRef} onChange={(e) => updateAvatar(e.target.files[0])} accept="image/*" />
                </div>
                <h1 className="text-4xl font-black mt-6 tracking-tight">
                    {profile.role.toUpperCase()} <span className="text-indigo-500">PROFILE</span>
                </h1>
                <p className="text-gray-500 mt-2 font-mono text-sm">{profile.email}</p>
            </div>

            {/* Feedback Messages */}
            {status.error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl mb-6 text-center">{status.error}</div>}
            {status.message && <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-4 rounded-xl mb-6 text-center">{status.message}</div>}

            {/* Main Form */}
            <form onSubmit={handleSave} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <ProfileField
                        label="Account Username"
                        name="username"
                        value={isEditing ? editState.username : profile.username}
                        isEditing={isEditing}
                        onChange={handleInputChange}
                    />

                    <ProfileField
                        label="Email Address"
                        value={profile.email}
                        isEditing={false}
                        isPermanent={true}
                    />

                    {currentSchema.fields.map(key => (
                        <ProfileField
                            key={key}
                            label={formatLabel(key)}
                            name={key}
                            value={isEditing ? (editState.details?.[key] || '') : (profile.details?.[key] || '')}
                            isEditing={isEditing}
                            isPermanent={currentSchema.permanent.includes(key)}
                            onChange={handleInputChange}
                            disabled={status.updating}
                        />
                    ))}
                </div>

                {/* Footer Actions */}
                <div className="flex flex-col gap-4 pt-8 border-t border-gray-800">
                    {isEditing ? (
                        <div className="flex gap-4">
                            <button
                                type="submit"
                                disabled={status.updating}
                                className="flex-1 bg-indigo-600 py-4 rounded-xl font-bold hover:bg-indigo-500 disabled:opacity-50 transition-all transform active:scale-[0.98]"
                            >
                                {status.updating ? 'Saving Changes...' : 'Save Profile'}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setEditState({ username: profile.username, details: profile.details }); setIsEditing(false); }}
                                className="px-8 bg-gray-800 py-4 rounded-xl font-bold hover:bg-gray-700 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            className="w-full bg-indigo-600/10 text-indigo-400 py-4 rounded-xl font-bold border border-indigo-500/30 hover:bg-indigo-600 hover:text-white transition-all"
                        >
                            Edit Profile Details
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={logout}
                        className="w-full bg-red-500/5 text-red-500 py-4 rounded-xl font-bold border border-red-500/10 hover:bg-red-600 hover:text-white transition-all mt-2"
                    >
                        Log Out of Account
                    </button>
                </div>
            </form>
        </div>
    );
};

export default UserProfile;