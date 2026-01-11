import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

const INITIAL_LIMIT = 3;

const DetailModal = ({ detailPost, onClose }) => {
    if (!detailPost) return null;

    const { competition_title, description, competition_date, start_time, end_time, venue, price_participate, registration_link, image_url } = detailPost;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-85 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-gray-900 p-8 rounded-xl max-w-4xl w-full shadow-2xl border border-yellow-700 transition-all overflow-y-auto max-h-[90vh]">
                <h3 className="text-3xl font-bold text-yellow-400 mb-6 border-b border-gray-700 pb-3">
                    🔍 See Details for {competition_title}
                </h3>

                {image_url && (
                    <img
                        src={image_url}
                        alt={`Banner for ${competition_title}`}
                        className="w-full h-auto object-cover rounded-lg mb-6 border border-gray-700"
                    />
                )}

                <div className="space-y-6 text-gray-300">
                    <div>
                        <p className="text-xl font-semibold text-white mb-2">📄 Description :</p>
                        <p className="whitespace-pre-wrap leading-relaxed bg-gray-800 p-4 rounded-lg border border-gray-700">{description}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <DetailItem icon="🗓️" label="Date :" value={competition_date} />
                        <DetailItem icon="⏰" label="Time :" value={`${start_time} - ${end_time}`} />
                        <DetailItem icon="📍" label="Venue :" value={venue} />
                        <DetailItem icon="🎟️" label="Price :" value={price_participate} />
                    </div>

                    {registration_link && (
                        <div className="pt-4">
                            <p className="text-xl font-semibold text-white mb-2">🔗 Registration :</p>
                            <a
                                href={registration_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block w-full text-center px-6 py-3 bg-yellow-600 text-gray-900 font-bold rounded-lg hover:bg-yellow-700 transition shadow-md truncate"
                            >
                                Register Here
                            </a>
                        </div>
                    )}
                </div>

                <div className="flex justify-end mt-8 pt-4 border-t border-gray-800">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

const DetailItem = ({ icon, label, value }) => (
    <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
        <p className="text-sm text-gray-400">{icon} {label}</p>
        <p className="text-white font-medium break-words">{value}</p>
    </div>
);

const SeeC = () => {
    const [competitions, setCompetitions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [displayLimit, setDisplayLimit] = useState(INITIAL_LIMIT);
    const [selectedPost, setSelectedPost] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchCompetitions = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('competition_posts')
            .select('*')
            .order('competition_date', { ascending: true });

        if (error) {
            console.error('Error fetching competitions:', error);
            alert('Failed to load competition data.');
        } else {
            const today = new Date().toISOString().split('T')[0];
            const upcoming = data.filter(post => post.competition_date >= today);
            setCompetitions(upcoming);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchCompetitions();
    }, [fetchCompetitions]);

    // ✅ CORRECTED SEARCH LOGIC:
    // 1. Filter the competitions based on searchTerm
    const filteredCompetitions = competitions.filter(post =>
        post.competition_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.venue.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 2. Slice from the FILTERED results, not the original array
    const competitionsToShow = filteredCompetitions.slice(0, displayLimit);
    const isShowingAll = displayLimit >= filteredCompetitions.length;

    const handleShowMore = () => setDisplayLimit(prevLimit => prevLimit + 5);
    const handleShowLess = () => setDisplayLimit(INITIAL_LIMIT);

    if (loading && competitions.length === 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <p className="text-xl text-yellow-500 animate-pulse">⏳ Looking for upcoming competitions...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-8 bg-black text-white">
            <div className="max-w-6xl mx-auto">

                {/* SEARCH BAR */}
                <div className="mb-10 max-w-md mx-auto">
                    <div className="relative group">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                            <span className="text-gray-400 group-focus-within:text-yellow-500 transition-colors">🔍</span>
                        </span>
                        <input
                            type="text"
                            placeholder="Search by title or venue..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setDisplayLimit(INITIAL_LIMIT); // Reset limit on search
                            }}
                            className="w-full pl-10 pr-10 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-yellow-600 outline-none transition text-white"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {/* GRID DISPLAY */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {competitionsToShow.map((post) => (
                        <div key={post.id} className="bg-gray-800 rounded-xl flex flex-col justify-between border border-gray-700 hover:border-yellow-500 transition shadow-lg overflow-hidden">
                            <div
                                className="h-40 bg-cover bg-center"
                                style={{
                                    backgroundImage: `url(${post.image_url || `https://via.placeholder.com/400x250/1e293b/facc15?text=${post.competition_title.replace(/\s/g, '+')}`})`,
                                    backgroundColor: '#1f2937'
                                }}
                            />

                            <div className="p-5 flex flex-col flex-grow">
                                <p className="text-xl font-bold text-yellow-300 mb-2 truncate">
                                    {post.competition_title}
                                </p>

                                <div className="text-sm text-gray-400 space-y-1 mb-4 flex-grow">
                                    <p>🗓️ Date: <span className="text-white font-medium">{post.competition_date}</span></p>
                                    <p>⏰ Time: <span className="text-white font-medium">{post.start_time} - {post.end_time}</span></p>
                                    <p>📍 Venue: <span className="text-white font-medium">{post.venue}</span></p>
                                    <p>💸 Price: <span className="text-white font-medium">{post.price_participate || 'Free'}</span></p>
                                </div>

                                <button
                                    onClick={() => setSelectedPost(post)}
                                    className="w-full px-5 py-2 bg-yellow-600 text-gray-900 font-bold rounded-lg hover:bg-yellow-700 transition shadow-md"
                                >
                                    👀 See Details
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* NO RESULTS STATE */}
                {filteredCompetitions.length === 0 && !loading && (
                    <div className="text-center p-20 bg-gray-800 rounded-xl mt-10 border border-gray-700">
                        <p className="text-2xl text-gray-500 italic">
                            No matches found for "{searchTerm}". 🔍
                        </p>
                    </div>
                )}

                {/* SHOW MORE / SHOW LESS */}
                {filteredCompetitions.length > INITIAL_LIMIT && (
                    <div className="text-center mt-8">
                        {isShowingAll ? (
                            <button onClick={handleShowLess} className="px-8 py-3 bg-gray-700 text-white font-bold rounded-full hover:bg-gray-600 transition shadow-lg">
                                ⬆️ Show Less
                            </button>
                        ) : (
                            <button onClick={handleShowMore} className="px-8 py-3 bg-yellow-600 text-gray-900 font-bold rounded-full hover:bg-yellow-700 transition shadow-lg">
                                ⬇️ Show More ({filteredCompetitions.length - displayLimit} remaining)
                            </button>
                        )}
                    </div>
                )}
            </div>

            <DetailModal detailPost={selectedPost} onClose={() => setSelectedPost(null)} />
        </div>
    );
};

export default SeeC;