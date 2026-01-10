import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { v4 as uuidv4 } from 'uuid';

const INITIAL_LIMIT = 3;
const inputClasses = "w-full p-3 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-yellow-500 focus:border-yellow-500 transition duration-150 placeholder-gray-400";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Reusable "input" field component
const FormInput = ({ label, id, name, type = 'text', value, onChange, placeholder, required = false, disabled = false }) => (
    <div className="space-y-2">

        <label htmlFor={id} className="block text-sm font-semibold text-gray-300">
            {label}{required && <span className="text-red-400">*</span>}
        </label>

        <input
            type={type}
            id={id}
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            disabled={disabled}
            placeholder={placeholder}
            className={inputClasses}
        />

    </div>
);

// Reusable "textarea" field component
const FormTextarea = ({ label, id, name, value, onChange, placeholder, rows = 3, required = false }) => (
    <div className="space-y-2">

        <label htmlFor={id} className="block text-sm font-semibold text-gray-300">
            {label}{required && <span className="text-red-400">*</span>}
        </label>

        <textarea
            id={id}
            name={name}
            value={value}
            onChange={onChange}
            required={required}
            placeholder={placeholder}
            className={inputClasses}
            rows={rows}
        ></textarea>
    </div>
);

// Helper function to map "database object keys" to "form state keys"
const mapPostToEditData = (post) => ({
    id: post.id,
    title: post.competition_title,
    description: post.description,
    dateCompetition: post.competition_date,
    startTime: post.start_time,
    endTime: post.end_time,
    venue: post.venue,
    priceParticipate: post.price_participate,
    registrationLink: post.registration_link,
    currentImageUrl: post.image_url || null,
});

// Main component
const EditDeleteCompetition = () => {

    // State management
    const [competitions, setCompetitions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingPost, setEditingPost] = useState(null);
    const [editData, setEditData] = useState({});
    const [editImageFile, setEditImageFile] = useState(null);
    const [imageError, setImageError] = useState(null);
    const [displayLimit, setDisplayLimit] = useState(INITIAL_LIMIT);

    // Store currently logged-in user's ID
    const [currentUserId, setCurrentUserId] = useState(null);

    // How many post to display on screen?
    const competitionsToShow = competitions.slice(0, displayLimit);
    const isShowingAll = displayLimit >= competitions.length;

    // Function to handle new file select for update
    const handleImageChange = (e) => {
        const file = e.target.files[0];
        setImageError(null);

        // Update image error
        if (!file) {
            setEditImageFile(null);
            return;
        }

        if (!file.type.startsWith('image/')) {
            setImageError('Please select a valid image file (jpg, png, etc.).');
            setEditImageFile(null);
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            setImageError(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
            setEditImageFile(null);
            return;
        }

        // Successfully update image
        setEditImageFile(file);
    };

    // Function to upload new image to supabase storage bucket
    const uploadNewImage = async (file) => {
        if (!file) return { newImageUrl: editData.currentImageUrl || null, uploadError: null };

        const fileExtension = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExtension}`;
        const filePath = `competition_images/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('competition_images')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error('❌ Supabase Image Upload Error:', uploadError);
            return { newImageUrl: null, uploadError };
        }

        // To know filePath in supabase to upload image into supabase
        const { data: publicUrlData } = supabase.storage
            .from('competition_images')
            .getPublicUrl(filePath);
        return { newImageUrl: publicUrlData.publicUrl, uploadError: null };
    };

    // Function to delete image from supabase storage bucket
    const deleteImageFromStorage = async (imageUrl) => {
        if (!imageUrl) return { success: true, error: null };

        const parts = imageUrl.split('competition_images/');
        if (parts.length < 2) {
             console.warn('Could not parse image URL for deletion:', imageUrl);
             return { success: false, error: { message: 'Invalid URL format for storage deletion.' } };
        }
        const filePath = `competition_images/${parts[1]}`;

        const { error: deleteError } = await supabase.storage
            .from('competition_images')
            .remove([filePath]);

        if (deleteError) {
            console.error('❌ Supabase Image Deletion Error:', deleteError);
            return { success: false, error: deleteError };
        }

        return { success: true, error: null };
    };

    // Fetch data from supabase, filtered by currentUserId
    const fetchCompetitions = useCallback(async () => {
        // Stop if current user not the one who create the post
        if (!currentUserId) {
            setLoading(false);
            return;
        }

        setLoading(true);

        const { data, error } = await supabase
            .from('competition_posts')
            .select('*')
            // Only fetch post created by current user
            .eq('user_id', currentUserId)
            .order('id', { ascending: false });

        if (error) {
            console.error('Error fetching competitions:', error);
            alert('Failed to load competition data.');
        }
        else { // Successfully fetch data from supabase
            setCompetitions(data);
        }
        setLoading(false);
    }, [currentUserId]); // Re-run when currentUserId changes

    // Get current user's ID
    useEffect(() => {
        // Get session to know current user's ID
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setCurrentUserId(session.user.id);
            } else {
                // No user currently log in
                setLoading(false);
            }
        });
    }, []);

    useEffect(() => {
        if (currentUserId) {
            fetchCompetitions();
        }
    }, [fetchCompetitions, currentUserId]);

    // Handle form input changes for modal
    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditData(prev => ({ ...prev, [name]: value }));
    };

    // Prepare modal for edit specific post
    const startEdit = (post) => {
        setEditingPost(post);
        setEditData(mapPostToEditData(post));
        setEditImageFile(null);
        setImageError(null);
    };

    // Save changes to supabase
    const saveEdit = async (e) => {
        e.preventDefault();
        if (!editData.id || imageError) return;

        setLoading(true);

        // Handle image update
        let newImageUrl = editData.currentImageUrl;
        let uploadError = null;

        if (editImageFile) {
            const uploadResult = await uploadNewImage(editImageFile);
            newImageUrl = uploadResult.newImageUrl;
            uploadError = uploadResult.uploadError;

            if (uploadError) {
                setLoading(false);
                alert(`Image upload failed: ${uploadError.message}. Post not updated.`);
                return;
            }
        }

        // Prepare database payload
        const updatePayload = {
            competition_title: editData.title,
            description: editData.description,
            competition_date: editData.dateCompetition,
            start_time: editData.startTime,
            end_time: editData.endTime,
            venue: editData.venue,
            price_participate: editData.priceParticipate,
            registration_link: editData.registrationLink,
            image_url: newImageUrl,
        };

        // Update database
        const { error: dbError } = await supabase
            .from('competition_posts')
            .update(updatePayload)
            .eq('id', editData.id);

        setLoading(false);

        if (dbError) {
            alert(`Update Failed: ${dbError.message}`);
        }
        else {
            alert('Competition updated successfully! ✅');

            // Clean up old image from storage if new one was successfully uploaded
            if (editImageFile && editData.currentImageUrl && newImageUrl !== editData.currentImageUrl) {
                 await deleteImageFromStorage(editData.currentImageUrl);
            }

            setEditingPost(null);

            // Update state directly instead of re-fetching entire list
            const updatedPost = {
                ...editingPost,
                ...updatePayload,
                image_url: newImageUrl,
                user_id: currentUserId // Keep user_id stable
            };

            setCompetitions(prevCompetitions =>
                prevCompetitions.map(c => c.id === editData.id ? updatedPost : c)
            );
        }
    };

    // Delete competition post from supabase
    const handleDelete = async (postId, postTitle, imageUrl) => {
        if (!window.confirm(`⚠️ CONFIRM DELETION:\nAre you sure you want to permanently delete: "${postTitle}"?`)) {
            return;
        }

        setLoading(true);

        // Delete image from supabase storage bucket
        if (imageUrl) {
            const { error: imageDeleteError } = await deleteImageFromStorage(imageUrl);
            if (imageDeleteError) {
                console.error('Image deletion failed, proceeding with DB deletion:', imageDeleteError);
                alert(`Warning: Image deletion failed: ${imageDeleteError.message}. The post will be deleted from the database.`);
            }
        }

        // Delete database record
        const { error: dbError } = await supabase
            .from('competition_posts')
            .delete()
            .eq('id', postId);

        setLoading(false);

        if (dbError) {
            alert(`Deletion Failed: ${dbError.message}`);
        }
        else {
            alert('Competition deleted successfully! 🗑️');

            // Update state directly instead of re-fetching entire list
            setCompetitions(prevCompetitions =>
                prevCompetitions.filter(c => c.id !== postId)
            );
        }
    };

    // UI logic for show more / show less post
    const handleShowMore = () => setDisplayLimit(prevLimit => prevLimit + 3);
    const handleShowLess = () => setDisplayLimit(INITIAL_LIMIT);

    // Initial loading screen
    if (loading && currentUserId === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <p className="text-xl text-yellow-500 animate-pulse">⏳ Authenticating user...</p>
            </div>
        );
    }

    // Loading after user ID is known
    if (loading && competitions.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <p className="text-xl text-yellow-500 animate-pulse">⏳ Loading your competition posts...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-8 bg-gray-750 text-white">
            <div className="max-w-6xl mx-auto">
                <h2 className="text-4xl font-extrabold text-yellow-400 text-center mb-10 border-b border-gray-700 pb-4">🏆 Manage Your Competition Posts</h2>

                {/* Display all post */}
                <div className="space-y-4">
                    {competitionsToShow.map((post) => (
                        <div key={post.id} className="bg-gray-900 p-6 rounded-xl flex flex-col lg:flex-row justify-between items-start lg:items-center border border-gray-700 hover:border-yellow-500 transition shadow-lg">

                            {/* Image */}
                            {post.image_url && (
                                <img
                                    src={post.image_url}
                                    alt={`Banner for ${post.competition_title}`}
                                    className="w-full lg:w-32 h-20 object-cover rounded-lg mb-4 lg:mb-0 lg:mr-6 flex-shrink-0"
                                />
                            )}

                            {/* Title & Date & Time & Venye & Price & Registration Link */}
                            <div className="flex-grow mb-4 lg:mb-0">
                                <p className="text-2xl font-bold text-yellow-300 mb-1">{post.competition_title}</p>
                                <div className="text-sm text-gray-400 space-y-1">
                                    <p>🗓️ Date: <span className="text-white font-medium">{post.competition_date}</span></p>
                                    <p>⏰ Time: <span className="text-white font-medium">{post.start_time} - {post.end_time}</span></p>
                                    <p>📍 Venue: <span className="text-white font-medium">{post.venue}</span></p>
                                    <p>🎟️ Price: <span className="text-white font-medium">{post.price_participate || 'Free'}</span></p>
                                    {post.registration_link && (
                                        <p>🔗 <a href={post.registration_link} target="_blank" rel="noopener noreferrer" className="text-yellow-500 hover:text-yellow-400 underline truncate">Registration Link</a></p>
                                    )}
                                </div>
                            </div>

                            {/* Edit & Delete Button */}
                            <div className="flex space-x-3 flex-shrink-0">
                                <button onClick={() => startEdit(post)} className="px-5 py-2 bg-yellow-600 text-gray-900 font-bold rounded-lg hover:bg-yellow-700 transition shadow-md">✏️ Edit</button>
                                <button onClick={() => handleDelete(post.id, post.competition_title, post.image_url)} disabled={loading} className="px-5 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition disabled:bg-gray-600 shadow-md">🗑️ Delete</button>
                            </div>

                        </div>
                    ))}
                </div>

                {/* Show more & show less button control */}
                {competitions.length > INITIAL_LIMIT && (
                    <div className="text-center mt-8">
                        {isShowingAll
                        ?
                            (<button onClick={handleShowLess} className="px-8 py-3 bg-gray-700 text-white font-bold rounded-full hover:bg-gray-600 transition shadow-lg" disabled={loading}>⬆️ Show Less</button>)
                        :
                            (<button onClick={handleShowMore} className="px-8 py-3 bg-yellow-600 text-gray-900 font-bold rounded-full hover:bg-yellow-700 transition shadow-lg" disabled={loading}>⬇️ Show More ({competitions.length - displayLimit} remaining)</button>)
                        }
                    </div>
                )}

                {/* No competition post yet message */}
                {competitions.length === 0 && !loading && (
                    <div className="text-center p-20 bg-gray-900 rounded-xl mt-10 border border-gray-800">
                        <p className="text-2xl text-gray-500 italic">No competitions found. Start creating one! 😔</p>
                    </div>
                )}
            </div>

            {/* Edit modal */}
            {editingPost && (
                <div className="fixed inset-0 bg-black bg-opacity-85 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <form onSubmit={saveEdit} className="bg-gray-900 p-8 rounded-xl max-w-3xl w-full shadow-2xl border border-yellow-700 transition-all overflow-y-auto max-h-full">
                        <h3 className="text-3xl font-bold text-yellow-400 mb-6 border-b border-gray-700 pb-3">✏️ Edit: {editingPost.competition_title}</h3>

                        <div className="space-y-6">

                            {/* Image section */}
                            <div className="space-y-4 p-4 border border-gray-700 rounded-lg">
                                <h4 className="text-lg font-semibold text-yellow-500">Competition Image</h4>

                                {/* Image preview */}
                                {editData.currentImageUrl && !editImageFile && (
                                    <div className="mb-4">
                                        <p className="text-sm text-gray-400 mb-2">Current Image:</p>
                                        <img
                                            src={editData.currentImageUrl}
                                            alt="Current Competition Banner"
                                            className="w-full h-40 object-cover rounded-lg border border-gray-600"
                                        />
                                    </div>
                                )}

                                {/* Update image */}
                                <label htmlFor="editImage" className="block text-sm font-semibold text-gray-300">Change/Upload New Image</label>
                                <input
                                    type="file"
                                    id="editImage"
                                    name="editImage"
                                    onChange={handleImageChange}
                                    accept="image/*"
                                    className="w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-500 file:text-gray-900 hover:file:bg-yellow-600 p-3 border border-gray-600 bg-gray-800 text-white rounded-lg transition duration-150"
                                />

                                {imageError && (
                                    <p className="text-sm text-red-400 mt-2">🚨 {imageError}</p>
                                )}
                                {editImageFile && !imageError && (
                                    <p className="text-sm text-yellow-400 mt-2">New file selected: {editImageFile.name}</p>
                                )}
                            </div>

                            {/* Input fields using reusable FormInput/FormTextarea components */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormInput label="Competition Title" id="edit-title" name="title" value={editData.title || ''} onChange={handleEditChange} required placeholder="e.g., Annual Coding Challenge 2025"/>
                                <FormInput label="Date of Competition" id="edit-date" name="dateCompetition" type="date" value={editData.dateCompetition || ''} onChange={handleEditChange} required />
                            </div>

                            <FormTextarea label="Competition Description" id="edit-desc" name="description" value={editData.description || ''} onChange={handleEditChange} required placeholder="Detail the rules, prizes, and target audience for the competition." />

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <FormInput label="Start Time" id="edit-start" name="startTime" type="time" value={editData.startTime || ''} onChange={handleEditChange} required />
                                <FormInput label="End Time" id="edit-end" name="endTime" type="time" value={editData.endTime || ''} onChange={handleEditChange} required />
                                <FormInput label="Venue" id="edit-venue" name="venue" value={editData.venue || ''} onChange={handleEditChange} required placeholder="e.g., Main Auditorium, Online" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormInput label="Participation Fee" id="edit-price" name="priceParticipate" value={editData.priceParticipate || ''} onChange={handleEditChange} required placeholder="e.g., $20, Free, RM50" />
                                <FormInput label="Registration Link" id="edit-link" name="registrationLink" type="url" value={editData.registrationLink || ''} onChange={handleEditChange} required placeholder="https://eventbrite.com/register-competition" />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-end space-x-4 pt-4">
                                <button type="button" onClick={() => setEditingPost(null)} className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition">Cancel</button>
                                <button type="submit" disabled={loading || imageError} className="px-6 py-2 bg-yellow-600 text-gray-900 font-bold rounded-lg hover:bg-yellow-700 transition disabled:bg-gray-500 disabled:text-gray-300 flex items-center">
                                    {loading
                                    ?
                                        (<>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Saving...
                                        </>)
                                    :
                                    '💾 Save Changes'
                                    }
                                </button>
                            </div>

                        </div>

                    </form>
                </div>
            )}

        </div>
    );

};
export default EditDeleteCompetition;