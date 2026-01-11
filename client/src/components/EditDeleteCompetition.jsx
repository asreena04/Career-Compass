import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { v4 as uuidv4 } from 'uuid';

// 1. Initial limit & Max file size
const INITIAL_LIMIT = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const today = new Date().toISOString().split("T")[0];

// 1.1 Reusable inputClasses for both input and textarea
const inputClasses = "w-full p-3 border border-gray-600 bg-gray-800 text-white rounded-lg focus:ring-yellow-500 focus:border-yellow-500 transition duration-150 placeholder-gray-400";

// 1.2 Reusable "input" field component
const FormInput = ({ label, type = 'text', id, name, value, onChange, required = false, disabled = false, placeholder, min }) => (
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
            min={min}
            className={inputClasses}
        />

    </div>
);

// 1.3 Reusable "textarea" field component
const FormTextarea = ({ label, id, name, value, onChange, required = false, placeholder, rows = 3 }) => (
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
            rows={rows}
            className={inputClasses}
        ></textarea>

    </div>
);

// 2. Helper function to map "database object keys" to "form state keys"
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

// 3. Main component
const EditDeleteCompetition = () => {

    // 3.1 State management
    const [competitions, setCompetitions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingPost, setEditingPost] = useState(null);
    const [editData, setEditData] = useState({});
    const [editImageFile, setEditImageFile] = useState(null);
    const [imageError, setImageError] = useState(null);
    const [displayLimit, setDisplayLimit] = useState(INITIAL_LIMIT);

    // 3.2 Store currently logged-in user's ID
    const [currentUserId, setCurrentUserId] = useState(null);

    // 3.3 How many post to display on screen?
    const competitionsToShow = competitions.slice(0, displayLimit);
    const isShowingAll = displayLimit >= competitions.length;

    // 3.4 Function to handle update new image file
    const handleImageChange = (e) => {

        // 3.4.1 Image file select by user
        const file = e.target.files[0];
        setImageError(null);

        // Error occur when trying to update image file

        // 3.4.2 No image file select by user
        if (!file) {
            setEditImageFile(null);
            return;
        }

        // 3.4.3 Not valid image file type
        if (!file.type.startsWith('image/')) {
            setImageError('Please select a valid image file (jpg, png, etc.).');
            setEditImageFile(null);
            return;
        }

        // 3.4.4 Image file size exceed limit
        if (file.size > MAX_FILE_SIZE) {
            setImageError(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB.`);
            setEditImageFile(null);
            return;
        }

        // 3.4.5 Can update image file now
        setEditImageFile(file);
    };

    // 3.5 Function to upload new image file into supabase 'competition_images' bucket
    const uploadNewImage = async (file) => {

        // 3.5.1 If no file select by user, set image to previous image, and show upload error message
        if (!file) return { newImageUrl: editData.currentImageUrl || null, uploadError: null };

        // 3.5.2 Make sure image file is valid
        const fileExtension = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExtension}`;
        const filePath = `competition_images/${fileName}`;

        // 3.5.3 Try to upload file into supabase 'competition_images' bucket
        const { error: uploadError } = await supabase.storage
            .from('competition_images')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        // 3.5.4 Upload error occur, cannot access new image file's in supabase, display upload error message
        if (uploadError) {
            console.error('❌ Supabase Image Upload Error:', uploadError);
            return { newImageUrl: null, uploadError };
        }

        // 3.5.5 Get filePath in supabase 'competition_images' bucket to upload image into supabase 'competition_images' bucket
        const { data: publicUrlData } = supabase.storage
            .from('competition_images')
            .getPublicUrl(filePath);
        return { newImageUrl: publicUrlData.publicUrl, uploadError: null };
    };

    // 3.6 Function to delete image file from supabase 'competition_images' bucket
    const deleteImageFromStorage = async (imageUrl) => {

        // 3.6.1 If cannot access image file in supabase 'competition_images' bucket means successfully delete image file from supabase 'competition_images' bucket
        if (!imageUrl) return { success: true, error: null };

        // 3.6.2 Use only imageUrl (no competition_images/) to find filePath in supabase 'competition_images' bucket to be deleted later
        const parts = imageUrl.split('competition_images/');
        if (parts.length < 2) {
             console.warn('Could not parse image URL for deletion:', imageUrl);
             return { success: false, error: { message: 'Invalid URL format for storage deletion.' } };
        }
        const filePath = `competition_images/${parts[1]}`;

        // 3.6.3 Try to delete image file from supabase 'competition_images' bucket
        const { error: deleteError } = await supabase.storage
            .from('competition_images')
            .remove([filePath]);

        // 3.6.4 Cannot delete image file from supabase 'competition_images' bucket, display deletion error message
        if (deleteError) {
            console.error('❌ Supabase Image Deletion Error:', deleteError);
            return { success: false, error: deleteError };
        }

        // 3.6.5 Successfully delete image file from supabase 'competition_images' bucket
        return { success: true, error: null };
    };

    // 3.7 Fetch all previously post's competition data from supabase 'competition_posts' table, filtered by currentUserId (user that currently log in)
    const fetchCompetitions = useCallback(async () => {

        // 3.7.1 Stop the action when currently log in user not the one who create the post
        if (!currentUserId) {
            setLoading(false);
            return;
        }
        setLoading(true);

        // 3.7.2 Only fetch all previously post's competition data create by the currently log in user from supabase 'competition_posts' table
        const { data, error } = await supabase
            .from('competition_posts')
            .select('*')
            .eq('user_id', currentUserId)
            .order('id', { ascending: false });

        // 3.7.3 Error occur when trying to fetch data from supabase, display error message & alert
        if (error) {
            console.error('Error fetching competitions:', error);
            alert('Failed to load competition data.');
        }

        // 3.7.4 Successfully fetch data from supabase
        else { setCompetitions(data); }
        setLoading(false);
    }, [currentUserId]); // Re-run when currentUserId change

    // 3.8 useEffect to get currently log in user's ID
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) { setCurrentUserId(session.user.id); }
            else { setLoading(false); }
        });
    }, []);

    // 3.9 useEffect to only fetch all previously post's competition data create by the currently log in user from supabase 'competition_posts' table
    useEffect(() => {
        if (currentUserId) {
            fetchCompetitions();
        }
    }, [fetchCompetitions, currentUserId]); // Re-run when fetchCompetitions and currentUserId is change

    // 3.10 Handle form's field content change when editing in the modal
    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // 3.11 Prepare modal for edit specific post. Modal purpose is to allow user to edit post's competition data
    const startEdit = (post) => {
        setEditingPost(post);
        setEditData(mapPostToEditData(post));
        setEditImageFile(null);
        setImageError(null);
    };

    // 3.12 Save change to supabase 'competition_posts' table & supabase 'competition_images' bucket
    const saveEdit = async (e) => {
        e.preventDefault();

        if (editData.startTime && editData.endTime) {
        if (editData.startTime >= editData.endTime) {
            alert("❌ Validation Error: End Time must be later than Start Time.");
            return;
        }
    }

        // 3.12.1 Save change fail
        if (!editData.id || imageError) return;

        // 3.12.2 Try upload new image file
        setLoading(true);
        let newImageUrl = editData.currentImageUrl;
        let uploadError = null;

        if (editImageFile) {
            const uploadResult = await uploadNewImage(editImageFile);
            newImageUrl = uploadResult.newImageUrl;
            uploadError = uploadResult.uploadError;

            // 3.12.2.1 Error occur when upload new image file, display upload error message
            if (uploadError) {
                setLoading(false);
                alert(`Image upload failed: ${uploadError.message}. Post not updated.`);
                return;
            }
        }

        // 3.12.3 Prepare data for database insertion, after change other field's content or upload new image file
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

        // 3.12.4 Update supabase 'competition_posts' table with latest content
        const { error: dbError } = await supabase
            .from('competition_posts')
            .update(updatePayload)
            .eq('id', editData.id);
        setLoading(false);

        // 3.12.5 Database error or successfully update database with latest content
        if (dbError) {
            alert(`Update Failed: ${dbError.message}`);
        }
        else {
            alert('Competition updated successfully! ✅');

            // 3.12.5.1 Delete old image from supabase storage if the new one was successfully uploaded
            if (editImageFile && editData.currentImageUrl && newImageUrl !== editData.currentImageUrl) {
                await deleteImageFromStorage(editData.currentImageUrl);
            }
            setEditingPost(null);

            // 3.12.5.2 Instead of re-fetching entire list, it update state directly
            const updatedPost = {
                ...editingPost,
                ...updatePayload,
                image_url: newImageUrl,
                user_id: currentUserId
            };
            setCompetitions(prevCompetitions =>
                prevCompetitions.map(c => c.id === editData.id ? updatedPost : c)
            );
        }
    };

    // 3.13 Delete competition post from supabase
    const handleDelete = async (postId, postTitle, imageUrl) => {

        // 3.13.1 Alert "Confirm Delete" competition post
        if (!window.confirm(`⚠️ CONFIRM DELETION:\nAre you sure you want to permanently delete: "${postTitle}"?`)) {
            return;
        }

        // 3.13.2 Delete image of that competition post from supabase storage bucket
        setLoading(true);
        if (imageUrl) {
            const { error: imageDeleteError } = await deleteImageFromStorage(imageUrl);

            // 3.13.3 Delete image error occur, display error message
            if (imageDeleteError) {
                console.error('Image deletion failed, proceeding with DB deletion:', imageDeleteError);
                alert(`Warning: Image deletion failed: ${imageDeleteError.message}. The post will be deleted from the database.`);
            }
        }

        // 3.13.3 Delete supabase 'competition_posts' record
        const { error: dbError } = await supabase
            .from('competition_posts')
            .delete()
            .eq('id', postId);

        // 3.13.4 Database deletion error or successfully delete competition post
        setLoading(false);
        if (dbError) { alert(`Deletion Failed: ${dbError.message}`); }
        else {
            alert('Competition deleted successfully! 🗑️');

            // 3.13.4.1 Instead of re-fetching entire list, it update state directly
            setCompetitions(prevCompetitions =>
                prevCompetitions.filter(c => c.id !== postId)
            );
        }

    };

    // 3.14 UI logic for handle show more or show less competition post
    const handleShowMore = () => setDisplayLimit(prevLimit => prevLimit + 3);
    const handleShowLess = () => setDisplayLimit(INITIAL_LIMIT);

    // 3.15 Loading before user ID is known
    if (loading && currentUserId === null) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <p className="text-xl text-yellow-500 animate-pulse">⏳ Authenticating user...</p>
            </div>
        );
    }

    // 3.16 Loading after user ID is known
    if (loading && competitions.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <p className="text-xl text-yellow-500 animate-pulse">⏳ Loading your competition posts...</p>
            </div>
        );
    }





    // 3.17 Main return
    return (
        <div className="min-h-screen p-8 bg-gray-750 text-white">

            {/* 3.17.1 Outside Edit Modal */}
            <div className="max-w-6xl mx-auto">

                {/* 3.17.1.1 Display all post card */}
                <div className="space-y-4">
                    {competitionsToShow.map((post) => (

                        // 3.17.1.1.1 Each post card
                        <div key={post.id} className="bg-gray-900 p-6 rounded-xl flex flex-col lg:flex-row justify-between items-start lg:items-center border border-gray-700 hover:border-yellow-500 transition shadow-lg">

                            {/* 3.17.1.1.1.1 Post's Image */}
                            {post.image_url && (
                                <img
                                    src={post.image_url}
                                    alt={`Banner for ${post.competition_title}`}
                                    className="w-full lg:w-32 h-20 object-cover rounded-lg mb-4 lg:mb-0 lg:mr-6 flex-shrink-0"
                                />
                            )}

                            {/* 3.17.1.1.1.2 Post's Title, Date, Time, Venue, Price & Registration Link */}
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

                            {/* 3.17.1.1.1.3 Edit & Delete Button */}
                            <div className="flex space-x-3 flex-shrink-0">
                                <button onClick={() => startEdit(post)} className="px-5 py-2 bg-yellow-600 text-gray-900 font-bold rounded-lg hover:bg-yellow-700 transition shadow-md">✏️ Edit</button>
                                <button onClick={() => handleDelete(post.id, post.competition_title, post.image_url)} disabled={loading} className="px-5 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition disabled:bg-gray-600 shadow-md">🗑️ Delete</button>
                            </div>

                        </div> // End each post card

                    ))}
                </div> {/* End display all post card */}

                {/* 3.17.1.2 Show more & show less button control */}
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

                {/* 3.17.1.3 No competition post yet message */}
                {competitions.length === 0 && !loading && (
                    <div className="text-center p-20 bg-gray-900 rounded-xl mt-10 border border-gray-800">
                        <p className="text-2xl text-gray-500 italic">No competitions found. Start creating one! 😔</p>
                    </div>
                )}

            </div>

            {/* 3.17.2 Inside Edit Modal */}
            {editingPost && (
                <div className="fixed inset-0 bg-black bg-opacity-85 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <form onSubmit={saveEdit} className="bg-gray-900 p-8 rounded-xl max-w-3xl w-full shadow-2xl border border-yellow-700 transition-all overflow-y-auto max-h-full">
                        {/* 3.17.2.1 Title */}
                        <h3 className="text-3xl font-bold text-yellow-400 mb-6 border-b border-gray-700 pb-3">✏️ Edit: {editingPost.competition_title}</h3>

                        <div className="space-y-6">

                            {/* 3.17.2.1.1 Image Section */}
                            <div className="space-y-4 p-4 border border-gray-700 rounded-lg">

                                {/* 3.17.2.1.1.1 Image Title */}
                                <h4 className="text-lg font-semibold text-yellow-500">Competition Image</h4>

                                {/* 3.17.2.1.1.2 Image Show */}
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

                                {/* 3.17.2.1.1.3 Update New Image Button */}
                                <label htmlFor="editImage" className="block text-sm font-semibold text-gray-300">Change/Upload New Image</label>
                                <input
                                    type="file"
                                    id="editImage"
                                    name="editImage"
                                    onChange={handleImageChange}
                                    accept="image/*"
                                    className="w-full file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-500 file:text-gray-900 hover:file:bg-yellow-600 p-3 border border-gray-600 bg-gray-800 text-white rounded-lg transition duration-150"
                                />

                                {/* 3.17.2.1.1.4 Error Message When Upload New Image Fail */}
                                {imageError && (<p className="text-sm text-red-400 mt-2">🚨 {imageError}</p>)}

                                {/* 3.17.2.1.1.5 Successfully Upload New Image Message */}
                                {editImageFile && !imageError && (<p className="text-sm text-yellow-400 mt-2">New file selected: {editImageFile.name}</p>)}
                            </div>

                            {/* 3.17.2.2 All competition post's input field reused the FormInput/FormTextarea component */}

                            {/* 3.17.2.2.1 Title & Date */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormInput label="Competition Title" id="edit-title" name="title" value={editData.title || ''} onChange={handleEditChange} required placeholder="e.g., Annual Coding Challenge 2025"/>
                                <FormInput label="Date of Competition" id="edit-date" name="dateCompetition" type="date" value={editData.dateCompetition || ''} onChange={handleEditChange} min={today} required />
                            </div>

                            {/* 3.17.2.2.2 Description */}
                            <FormTextarea label="Competition Description" id="edit-desc" name="description" value={editData.description || ''} onChange={handleEditChange} required placeholder="Detail the rules, prizes, and target audience for the competition." />

                            {/* 3.17.2.2.3 Start Time, End Time, Venue */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <FormInput label="Start Time" id="edit-start" name="startTime" type="time" value={editData.startTime || ''} onChange={handleEditChange} required />
                                <FormInput label="End Time" id="edit-end" name="endTime" type="time" value={editData.endTime || ''} onChange={handleEditChange} required />
                                <FormInput label="Venue" id="edit-venue" name="venue" value={editData.venue || ''} onChange={handleEditChange} required placeholder="e.g., Main Auditorium, Online" />
                                {editData.startTime && editData.endTime && editData.startTime >= editData.endTime && (
                                    <p className="col-span-full text-red-400 text-xs mt-1 italic">
                                    * Start time must be before end time.
                                    </p>
                                )}
                            </div>


                            {/* 3.17.2.2.4 Participation Fee & Registration Link */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormInput label="Participation Fee" id="edit-price" name="priceParticipate" value={editData.priceParticipate || ''} onChange={handleEditChange} required placeholder="e.g., $20, Free, RM50" />
                                <FormInput label="Registration Link" id="edit-link" name="registrationLink" type="url" value={editData.registrationLink || ''} onChange={handleEditChange} required placeholder="https://eventbrite.com/register-competition" />
                            </div>

                            {/* 3.17.2.2.5 Cancel & Save Changes Button */}
                            <div className="flex justify-end space-x-4 pt-4">
                                <button type="button" onClick={() => setEditingPost(null)} className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition">Cancel</button>
                                <button type="submit" disabled={loading || imageError} className="px-6 py-2 bg-yellow-600 text-gray-900 font-bold rounded-lg hover:bg-yellow-700 transition disabled:bg-gray-500 disabled:text-gray-300 flex items-center">
                                    {/* 3.17.2.2.5.1 Animation occur when save changes button was click */}
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