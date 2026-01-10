import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export function useRole() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [username, setUsername] = useState("Guest");
  const [avatar_url, setAvatarUrl] = useState(null);
  const [year_of_study, setYearOfStudy] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!mounted) return;
      setUser(authUser || null);

      if (!authUser) {
        setRole(null);
        setYearOfStudy(null);
        setLoading(false);
        return;
      }

      // Explicitly join student_profiles using the 'id' foreign key
      const { data: profile, error } = await supabase
        .from("profiles")
        .select(`
          role,
          username,
          avatar_url,
          student_profiles!id (
            year_of_study
          )
        `)
        .eq("id", authUser.id)
        .single();

      if (!mounted) return;

      if (error) {
        console.error("Profile fetch error:", error.message);
        setRole(null);
      } else {
        setRole(profile?.role || null);
        setUsername(profile?.username || authUser.email?.split("@")[0] || "User");
        setAvatarUrl(profile?.avatar_url || null);

        // Ensure year is extracted correctly from the joined object
        const yearValue = profile?.student_profiles?.[0]?.year_of_study || profile?.student_profiles?.year_of_study;
        setYearOfStudy(yearValue || null);
      }

      setLoading(false);
    }

    load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  return { loading, user, role, username, avatar_url, year_of_study };
}