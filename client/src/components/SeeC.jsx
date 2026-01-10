import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";

const INITIAL_LIMIT = 3;

const DetailItem = ({ icon, label, value }) => (
  <div className="bg-gray-800 p-3 rounded-lg border border-gray-700">
    <p className="text-sm text-gray-400">
      {icon} {label}
    </p>
    <p className="text-white font-medium break-words">{value}</p>
  </div>
);

const DetailModal = ({ detailPost, onClose }) => {
  if (!detailPost) return null;

  const {
    competition_title,
    description,
    competition_date,
    start_time,
    end_time,
    venue,
    price_participate,
    registration_link,
    image_url,
  } = detailPost;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 p-8 rounded-2xl max-w-4xl w-full shadow-2xl border border-cyan-700/40 overflow-y-auto max-h-[90vh]">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400 mb-6 border-b border-gray-800 pb-3">
            {competition_title}
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition"
          >
            Close
          </button>
        </div>

        {image_url && (
          <img
            src={image_url}
            alt={`Banner for ${competition_title}`}
            className="w-full h-72 object-cover rounded-xl mb-6 border border-gray-800"
          />
        )}

        <div className="space-y-6 text-gray-300">
          <div>
            <p className="text-xl font-semibold text-white mb-2">Description :</p>
            <p className="whitespace-pre-wrap leading-relaxed bg-gray-800 p-4 rounded-xl border border-gray-700">
              {description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <DetailItem icon="🗓️" label="Date :" value={competition_date} />
            <DetailItem icon="⏰" label="Time :" value={`${start_time} - ${end_time}`} />
            <DetailItem icon="📍" label="Venue :" value={venue} />
            <DetailItem icon="🎟️" label="Price :" value={price_participate || "Free"} />
          </div>

          {registration_link && (
            <div className="pt-4">
              <p className="text-xl font-semibold text-white mb-2">🔗 Registration :</p>
              <a
                href={registration_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block w-full text-center px-6 py-3 rounded-lg font-bold transition shadow-md
                           bg-gradient-to-r from-teal-500 to-cyan-500 text-gray-900
                           hover:from-teal-400 hover:to-cyan-400"
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
            className="px-6 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const SeeC = () => {
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [displayLimit, setDisplayLimit] = useState(INITIAL_LIMIT);
  const [selectedPost, setSelectedPost] = useState(null);

  const competitionsToShow = competitions.slice(0, displayLimit);
  const isShowingAll = displayLimit >= competitions.length;

  const fetchCompetitions = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("competition_posts")
      .select("*")
      .order("competition_date", { ascending: true });

    if (error) {
      console.error("Error fetching competitions:", error);
      alert("Failed to load competition data.");
      setLoading(false);
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const upcoming = (data || []).filter((post) => post.competition_date >= today);
    setCompetitions(upcoming);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCompetitions();
  }, [fetchCompetitions]);

const handleShowMore = () =>
  setDisplayLimit((prev) => Math.min(prev + 3, competitions.length));
  const handleShowLess = () => setDisplayLimit(INITIAL_LIMIT);

  // Loading state (teal/cyan themed)
  if (loading && competitions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <p className="text-xl text-cyan-400 animate-pulse">
          Looking for upcoming competitions...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans">
        
      {/* Body */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-gray-900 rounded-2xl p-8 border border-gray-800 shadow-2xl">
          <div className="mb-8">
            <h2 className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400 mb-2">
              Upcoming Events
            </h2>
            <p className="text-gray-400">
              Click “See Details” to view full description and registration link.
            </p>
          </div>

          {/* Empty state */}
          {competitions.length === 0 && !loading ? (
            <div className="text-center p-16 bg-gray-800/40 rounded-2xl border border-gray-700">
              <p className="text-2xl text-gray-500 italic">
                No upcoming competitions found at the moment. Check back soon!
              </p>
            </div>
          ) : (
            <>
              {/* Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {competitionsToShow.map((post) => (
                  <div
                    key={post.id}
                    className="bg-gray-900 rounded-2xl flex flex-col justify-between border border-gray-700
                               hover:border-cyan-500 transition shadow-lg overflow-hidden"
                  >
                    {/* Banner */}
                    <div
                      className="h-40 bg-cover bg-center"
                      style={{
                        backgroundImage: `url(${
                          post.image_url ||
                          `https://via.placeholder.com/400x250/0f172a/22d3ee?text=${post.competition_title.replace(
                            /\s/g,
                            "+"
                          )}`
                        })`,
                        backgroundColor: post.image_url ? "transparent" : "#111827",
                      }}
                    />

                    <div className="p-5 flex flex-col flex-grow">
                      <p className="text-xl font-black text-cyan-300 mb-2 truncate">
                        {post.competition_title}
                      </p>

                      <div className="text-sm text-gray-400 space-y-1 mb-4 flex-grow">
                        <p>
                          🗓️ Date:{" "}
                          <span className="text-white font-medium">{post.competition_date}</span>
                        </p>
                        <p>
                          ⏰ Time:{" "}
                          <span className="text-white font-medium">
                            {post.start_time} - {post.end_time}
                          </span>
                        </p>
                        <p>
                          📍 Venue:{" "}
                          <span className="text-white font-medium">{post.venue}</span>
                        </p>
                        <p>
                          💸 Price:{" "}
                          <span className="text-white font-medium">
                            {post.price_participate || "Free"}
                          </span>
                        </p>
                      </div>

                      <button
                        onClick={() => setSelectedPost(post)}
                        className="w-full px-5 py-2 rounded-lg font-bold transition shadow-md
                                   bg-gradient-to-r from-teal-500 to-cyan-500 text-gray-900
                                   hover:from-teal-400 hover:to-cyan-400"
                      >
                        See Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Show more/less */}
              {competitions.length > INITIAL_LIMIT && (
                <div className="text-center mt-10">
                  {isShowingAll ? (
                    <button
                      onClick={handleShowLess}
                      className="px-8 py-3 bg-gray-700 text-white font-bold rounded-full hover:bg-gray-600 transition shadow-lg"
                      disabled={loading}
                    >
                      Show Less
                    </button>
                  ) : (
                    <button
                      onClick={handleShowMore}
                      className="px-8 py-3 rounded-full font-bold transition shadow-lg
                                 bg-gradient-to-r from-teal-500 to-cyan-500 text-gray-900
                                 hover:from-teal-400 hover:to-cyan-400"
                      disabled={loading}
                    >
                      Show More ({Math.max(competitions.length - displayLimit, 0)} remaining)
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          <p className="mt-8 text-sm text-gray-500 italic">
            Tip: Register early! Some competitions close registration once slots are full.
          </p>
        </div>
      </div>

      <DetailModal detailPost={selectedPost} onClose={() => setSelectedPost(null)} />
    </div>
  );
};

export default SeeC;
