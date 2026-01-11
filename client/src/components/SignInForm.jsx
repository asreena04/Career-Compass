import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';


const FormInput = ({ id, label, type, value, onChange, placeholder, autoComplete, accept, className = '', required = true }) => (
    <div>
        <label htmlFor={id} className="block text-sm font-medium text-gray-200 mb-1">{label}</label>
        <input
            id={id} name={id} type={type} autoComplete={autoComplete} required={required} value={type !== 'file' ? value : undefined} onChange={onChange} placeholder={placeholder} accept={accept}
            className={`w-full p-3 border border-gray-700 rounded-lg bg-gray-800 text-white placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ${className}`}
        />
    </div>
);

const RoleSelect = ({ id, label, value, onChange }) => {
    const roles = ["Student", "Academic Advisor", "Company"];
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-200 mb-1">{label}</label>
            <select
                id={id} name={id} required value={value} onChange={onChange}
                className="w-full p-3 border border-gray-700 rounded-lg bg-gray-800 text-white focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 appearance-none"
            >
                <option value="" disabled className="text-gray-500">Select your role</option>
                {roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                ))}
            </select>
        </div>
    );
};

const CategorySelect = ({ id, label, value, onChange }) => {
    const categories = [
        "Accounting, Auditing, Tax and Bookkeepers",
        "Advertising and Public Relations",
        "Electronics",
        "Education",
        "Manufacturing",
        "IT",
        "Financial industry",
        "Logistics industry",
        "Project Delivery and Technology"
    ];
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-200 mb-1">{label}</label>
            <select
                id={id} name={id} required value={value} onChange={onChange}
                className="w-full p-3 border border-gray-700 rounded-lg bg-gray-800 text-white focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 appearance-none"
            >
                <option value="" disabled className="text-gray-500">Select category</option>
                {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                ))}
            </select>
        </div>
    );
};

const AdvisorSelect = ({ id, label, value, onChange, advisors, loading }) => {
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-200 mb-1">{label}</label>
            <select
                id={id} name={id} value={value} onChange={onChange}
                className="w-full p-3 border border-gray-700 rounded-lg bg-gray-800 text-white focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 appearance-none"
                disabled={loading}
            >
                <option value="">Select your academic advisor</option>
                {loading ? (
                    <option value="" disabled>Loading advisors...</option>
                ) : advisors.length === 0 ? (
                    <option value="" disabled>No academic advisors available</option>
                ) : (
                    advisors.map(advisor => (
                        <option key={advisor.id} value={advisor.id}>
                            {advisor.full_name} {advisor.department ? `- ${advisor.department}` : ''}
                        </option>
                    ))
                )}
            </select>
        </div>
    );
};

const SignInForm = () => {
    const navigate = useNavigate();
    
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [advisors, setAdvisors] = useState([]);
    const [loadingAdvisors, setLoadingAdvisors] = useState(false);
    
    // Basic form data for all users
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        role: '',
    });
    
    // Specific data for Academic Advisors
    const [advisorData, setAdvisorData] = useState({
        full_name: '',
        room_number: '',
        position: '',
        department: ''
    });
    
    // Specific data for Students
    const [studentData, setStudentData] = useState({
        full_name: '',
        matric_number: '',
        programme: '',
        school: '',
        year_of_study: '',
        advisor_id: ''
    });
    
    // Specific data for Companies - CORRECTED FIELD NAMES
    const [companyData, setCompanyData] = useState({
        company_name: '',
        website: '',
        company_category: '', 
        contact_link: '',
        hr_contact_name: ''
    });
    
    const [profilePicture, setProfilePicture] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch all academic advisors from the database
    useEffect(() => {
        fetchAdvisors();
    }, []);

    const fetchAdvisors = async () => {
        setLoadingAdvisors(true);
        try {
            const { data, error } = await supabase
                .from('academic_advisor_profiles')
                .select('id, full_name, department, position')
                .order('full_name', { ascending: true });

            if (error) {
                console.error('Error fetching advisors:', error);
            } else {
                setAdvisors(data || []);
            }
        } catch (err) {
            console.error('Error:', err);
        }
        setLoadingAdvisors(false);
    };

    const handleChange = (e) => {
        const { name, value, type, files } = e.target;

        if (type === 'file') {
            setProfilePicture(files[0] || null);
        } else {
            setFormData(prevState => ({
                ...prevState,
                [name]: value
            }));
        }
    };

    const handleAdvisorChange = (e) => {
        const { name, value } = e.target;
        setAdvisorData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleStudentChange = (e) => {
        const { name, value } = e.target;
        setStudentData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCompanyChange = (e) => {
        const { name, value } = e.target;
        setCompanyData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle sign up submission
    const handleSignUpSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError(null);
        setIsLoading(true);

        const { email, password, confirmPassword, role } = formData;

        // Validate passwords match
        if (password !== confirmPassword) {
            setError("Error: Passwords do not match!");
            setIsLoading(false);
            return;
        }

        if (role === '') {
            setError("Error: Please select a role!");
            setIsLoading(false);
            return;
        }

        try {
            let avatar_url = null;
            
            // 1. UPLOAD PROFILE PICTURE TO STORAGE
            if (profilePicture) {
                const fileExt = profilePicture.name.split('.').pop();
                const fileName = `${uuidv4()}.${fileExt}`;
                const filePath = `${role.toLowerCase().replace(' ', '_')}_avatars/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, profilePicture, {
                        cacheControl: '3600',
                        upsert: false,
                    });

                if (uploadError) {
                    console.error("Image Upload Error:", uploadError.message);
                    setError(`Warning: Failed to upload picture: ${uploadError.message}.`);
                } else {
                    const { data: { publicUrl } } = supabase.storage
                        .from('avatars')
                        .getPublicUrl(filePath);
                    
                    avatar_url = publicUrl;
                }
            }

            // 2. Prepare metadata based on user role
            let metadata = { 
                role: role, 
                avatar_url: avatar_url 
            };

            if (role === 'Academic Advisor') {
                metadata = {
                    ...metadata,
                    ...advisorData
                };
            } else if (role === 'Student') {
                metadata = {
                    ...metadata,
                    ...studentData
                };
            } else if (role === 'Company') {
                metadata = {
                    ...metadata,
                    ...companyData
                };
            }

            console.log("Submitting with metadata:", metadata);

            // 3. SUPABASE SIGN UP CALL
            const { error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: { 
                    data: metadata
                } 
            });

            if (authError) {
                setError(authError.message);
                setIsLoading(false);
                return;
            }
            
            setMessage(`Success! Check your email to confirm your account for: ${email}. You can sign in after confirmation.`);
            
            // Reset form
            setFormData({ email: '', password: '', confirmPassword: '', role: '' });
            setAdvisorData({ full_name: '', room_number: '', position: '', department: '' });
            setStudentData({ full_name: '', matric_number: '', programme: '', school: '', year_of_study: '', advisor_id: '' });
            setCompanyData({ company_name: '', website: '', company_category: '', contact_link: '', hr_contact_name: '' });
            setProfilePicture(null);
            
        } catch (err) {
            console.error(err);
            setError("An unexpected error occurred during sign up.");
        }

        setIsLoading(false);
    };

    // Handle sign in
    const handleSignIn = async (e) => {
        e.preventDefault();
        setMessage('');
        setError(null);
        setIsLoading(true);

        const { email, password } = formData;

        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                setError(authError.message);
                setIsLoading(false);
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                setError("Login successful, but could not retrieve user session.");
                setIsLoading(false);
                return;
            }

            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single(); 

            if (profileError) {
                setError("Login successful, but could not retrieve user role. Did you confirm your email?");
                console.error("Profile fetch error:", profileError);
                setIsLoading(false);
                return;
            }

            const userRole = profile.role;
            
            switch (userRole) {
                case 'Student':
                    navigate('/home');
                    break;
                case 'Academic Advisor':
                    navigate('/AdvisorHomepage');
                    break;
                case 'Company':
                    navigate('/home');
                    break;
                case 'Admin':
                    navigate('/admin/users')
                    break;
                default:
                    setError("Sign in successful, but role is unrecognized.");
                    navigate('/home');
            }
        } catch (err) {
            console.error(err);
            setError("An unexpected error occurred during sign in.");
        }

        setFormData({ email: '', password: '', confirmPassword: '', role: '' });
        setIsLoading(false);
    };

    // Dynamic UI Variables
    const currentTitle = isSigningIn ? "Welcome Back! 🚀" : "Join Our Community! 🌟";
    const currentDescription = isSigningIn ? "Sign in to continue to your dashboard." : "Create your account to get started.";

    return (
        <div className="w-full max-w-2xl bg-gray-900 p-8 rounded-xl shadow-2xl border border-gray-700">
            <h1 className="text-4xl font-extrabold mb-2 text-white text-center">{currentTitle}</h1>
            <p className="mb-8 text-lg text-gray-300 text-center">{currentDescription}</p>

            {error && <p className="text-red-400 text-center mb-4 p-2 bg-red-900/50 rounded">{error}</p>}
            {message && <p className="text-green-400 text-center mb-4 p-2 bg-green-900/50 rounded">{message}</p>}

            {/* SIGN IN FORM */}
            {isSigningIn ? (
                <form onSubmit={handleSignIn} className="space-y-6">
                    <FormInput 
                        id="email" 
                        label="Email Address" 
                        type="email" 
                        value={formData.email} 
                        onChange={handleChange} 
                        placeholder="you@example.com" 
                        autoComplete="email" 
                    />
                    <FormInput 
                        id="password" 
                        label="Password" 
                        type="password" 
                        value={formData.password} 
                        onChange={handleChange} 
                        placeholder="••••••••" 
                        autoComplete="current-password" 
                    />

                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center">
                            <input 
                                id="remember-me" 
                                name="remember-me" 
                                type="checkbox" 
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-600 rounded bg-gray-800" 
                            />
                            <label htmlFor="remember-me" className="ml-2 text-gray-200">Remember me</label>
                        </div>
                        <a href="#" className="font-medium text-indigo-400 hover:text-indigo-300">Forgot your password?</a>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-lg font-semibold text-white transition duration-300 transform hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isLoading ? "Signing In..." : "Sign In"}
                    </button>
                </form>
            ) : (
                /* SIGN UP FORM */
                <form onSubmit={handleSignUpSubmit} className="space-y-6">
                    {/* Basic Information Section */}
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-white border-b border-gray-700 pb-2">Basic Information</h2>
                        <FormInput 
                            id="email" 
                            label="Email Address" 
                            type="email" 
                            value={formData.email} 
                            onChange={handleChange} 
                            placeholder="you@example.com" 
                            autoComplete="email" 
                        />
                        <RoleSelect 
                            id="role" 
                            label="Your Role" 
                            value={formData.role} 
                            onChange={handleChange} 
                        />
                        <FormInput 
                            id="profilePicture" 
                            label="Profile Picture" 
                            type="file" 
                            onChange={handleChange} 
                            accept="image/*"
                            required={false}
                            className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-500 file:text-white hover:file:bg-indigo-600 file:cursor-pointer"
                        />
                        <FormInput 
                            id="password" 
                            label="Password" 
                            type="password" 
                            value={formData.password} 
                            onChange={handleChange} 
                            placeholder="••••••••" 
                            autoComplete="new-password" 
                        />
                        <FormInput 
                            id="confirmPassword" 
                            label="Confirm Password" 
                            type="password" 
                            value={formData.confirmPassword} 
                            onChange={handleChange} 
                            placeholder="••••••••" 
                            autoComplete="new-password" 
                        />
                    </div>

                    {/* Academic Advisor Specific Section */}
                    {formData.role === 'Academic Advisor' && (
                        <div className="space-y-4 pt-4 border-t border-gray-700">
                            <h2 className="text-xl font-bold text-white border-b border-gray-700 pb-2">Academic Advisor Details</h2>
                            <FormInput 
                                id="full_name" 
                                label="Full Name" 
                                type="text" 
                                value={advisorData.full_name} 
                                onChange={handleAdvisorChange} 
                                placeholder="Dr. Jane Doe" 
                                autoComplete="name"
                            />
                            <FormInput 
                                id="room_number" 
                                label="Room Number" 
                                type="text" 
                                value={advisorData.room_number} 
                                onChange={handleAdvisorChange} 
                                placeholder="520" 
                                autoComplete="off"
                                required={false}
                            />
                            <FormInput 
                                id="position" 
                                label="Position" 
                                type="text" 
                                value={advisorData.position} 
                                onChange={handleAdvisorChange} 
                                placeholder="Senior Lecturer" 
                                autoComplete="organization-title"
                                required={false}
                            />
                            <FormInput 
                                id="department" 
                                label="Department" 
                                type="text" 
                                value={advisorData.department} 
                                onChange={handleAdvisorChange} 
                                placeholder="Computer Science" 
                                autoComplete="off"
                                required={false}
                            />
                        </div>
                    )}

                    {/* Student Specific Section */}
                    {formData.role === 'Student' && (
                        <div className="space-y-4 pt-4 border-t border-gray-700">
                            <h2 className="text-xl font-bold text-white border-b border-gray-700 pb-2">Student Details</h2>
                            <FormInput 
                                id="full_name" 
                                label="Full Name" 
                                type="text" 
                                value={studentData.full_name} 
                                onChange={handleStudentChange} 
                                placeholder="John Doe" 
                                autoComplete="name"
                            />
                            <FormInput 
                                id="matric_number" 
                                label="Matric Number" 
                                type="text" 
                                value={studentData.matric_number} 
                                onChange={handleStudentChange} 
                                placeholder="22301234" 
                                autoComplete="off"
                                required={false}
                            />
                            <FormInput 
                                id="programme" 
                                label="Programme" 
                                type="text" 
                                value={studentData.programme} 
                                onChange={handleStudentChange} 
                                placeholder="Software Engineering" 
                                autoComplete="off"
                                required={false}
                            />
                            <FormInput 
                                id="school" 
                                label="School" 
                                type="text" 
                                value={studentData.school} 
                                onChange={handleStudentChange} 
                                placeholder="Computer Science" 
                                autoComplete="off"
                                required={false}
                            />
                            <FormInput 
                                id="year_of_study" 
                                label="Year of Study" 
                                type="number" 
                                value={studentData.year_of_study} 
                                onChange={handleStudentChange} 
                                placeholder="1" 
                                autoComplete="off"
                                required={false}
                            />
                            <AdvisorSelect
                                id="advisor_id"
                                label="Select Your Academic Advisor"
                                value={studentData.advisor_id}
                                onChange={handleStudentChange}
                                advisors={advisors}
                                loading={loadingAdvisors}
                            />
                        </div>
                    )}

                    {/* Company Specific Section*/}
                    {formData.role === 'Company' && (
                        <div className="space-y-4 pt-4 border-t border-gray-700">
                            <h2 className="text-xl font-bold text-white border-b border-gray-700 pb-2">Company Details</h2>
                            <FormInput 
                                id="company_name" 
                                label="Company Name" 
                                type="text" 
                                value={companyData.company_name} 
                                onChange={handleCompanyChange} 
                                placeholder="Company Sdn Bhd" 
                                autoComplete="organization"
                            />
                            <FormInput 
                                id="website" 
                                label="Website (Optional)" 
                                type="url" 
                                value={companyData.website} 
                                onChange={handleCompanyChange} 
                                placeholder="https://example.com" 
                                autoComplete="url"
                                required={false}
                            />
                            <CategorySelect
                                id="company_category"
                                label="Company Category"
                                value={companyData.company_category}
                                onChange={handleCompanyChange}
                            />
                            <FormInput 
                                id="contact_link" 
                                label="Contact Link" 
                                type="url" 
                                value={companyData.contact_link} 
                                onChange={handleCompanyChange} 
                                placeholder="https://linkedin.com/company/..." 
                                autoComplete="url"
                                required={false}
                            />
                            <FormInput 
                                id="hr_contact_name" 
                                label="HR Contact Name (Optional)" 
                                type="text" 
                                value={companyData.hr_contact_name} 
                                onChange={handleCompanyChange} 
                                placeholder="Jane Smith" 
                                autoComplete="name"
                                required={false}
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-lg font-semibold text-white transition duration-300 transform hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 bg-green-600 hover:bg-green-700 focus:ring-green-500 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isLoading ? "Creating Account..." : "Create Account"}
                    </button>
                </form>
            )}
            
            {/* Mode toggle */}
            <p className="mt-8 text-center text-sm text-gray-400">
                {isSigningIn ? "Don't have an account? " : "Already have an account? "}
                <button 
                    type="button" 
                    onClick={() => {
                        setIsSigningIn(!isSigningIn);
                        setError(null);
                        setMessage('');
                        setProfilePicture(null);
                        setFormData({ email: '', password: '', confirmPassword: '', role: '' });
                        setAdvisorData({ full_name: '', room_number: '', position: '', department: '' });
                        setStudentData({ full_name: '', matric_number: '', programme: '', school: '', year_of_study: '', advisor_id: '' });
                        setCompanyData({ company_name: '', website: '', company_category: '', contact_link: '', hr_contact_name: '' });
                    }}
                    className="font-medium text-indigo-400 hover:text-indigo-300 focus:outline-none"
                >
                    {isSigningIn ? "Sign up now" : "Sign in here"}
                </button>
            </p>
        </div>
    );
}

export default SignInForm;