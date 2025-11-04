import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { BottomNav } from "@/components/BottomNav";
import { ProfileTab } from "@/components/ProfileTab";
import { X1ChallengeDialog } from "@/components/X1ChallengeDialog";
import { supabase } from "@/integrations/supabase/client";
import { ProfileWithAchievements } from "@/services/profileService";

const Profile = () => {
    const navigate = useNavigate();
    const [x1ChallengeOpen, setX1ChallengeOpen] = useState(false);
    const [profile, setProfile] = useState<ProfileWithAchievements | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    navigate('/login');
                    return;
                }

                const { data, error } = await supabase
                    .from('profiles')
                    .select(`
                        *,
                        user_achievements:user_achievements (
                            earned_at,
                            achievement:achievement_id ( id, name, description, icon )
                        )
                    `)
                    .eq('id', user.id)
                    .maybeSingle();

                if (error) {
                    throw error;
                }
                
                setProfile(data as ProfileWithAchievements);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [navigate]);

    const handleCreateTournament = () => {
        navigate("/create-tournament");
    };

    const handleOpenX1Challenge = () => {
        setX1ChallengeOpen(true);
    };

    if (loading) {
        return <div className="min-h-screen bg-background flex items-center justify-center">Carregando perfil...</div>;
    }

    if (error) {
        return <div className="min-h-screen bg-background flex items-center justify-center text-red-500">Erro ao carregar perfil: {error}</div>;
    }

    if (!profile) {
        return <div className="min-h-screen bg-background flex items-center justify-center">Nenhum perfil encontrado.</div>;
    }

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
                <ProfileTab 
                    profile={profile}
                    setProfile={setProfile}
                />
            </main>
            <BottomNav 
                onCreateTournament={handleCreateTournament}
                onOpenX1Challenge={handleOpenX1Challenge}
            />
            <X1ChallengeDialog 
                open={x1ChallengeOpen} 
                onOpenChange={setX1ChallengeOpen}
            />
        </div>
    );
};

export default Profile;