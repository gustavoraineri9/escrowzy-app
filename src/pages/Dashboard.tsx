import { Navbar } from "@/components/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Globe, Mail, Bell, User, LogOut, UserPlus } from "lucide-react";
import { MyTournamentsTab } from "@/components/MyTournamentsTab";
import { PublicTournamentsTab } from "@/components/PublicTournamentsTab";
import { InvitesTab } from "@/components/InvitesTab";
import { FriendsTab } from "@/components/FriendsTab";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { BottomNav } from "@/components/BottomNav";
import { X1ChallengeDialog } from "@/components/X1ChallengeDialog";
import { useAuth } from "@/../../backend/src/context/AuthContext";
import { getProfile } from "@/services/profileService";

interface UserProfile {
  id: string;
  display_name: string;
  avatar_url?: string;
  email: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [invitesCount] = useState(0);
  const [x1ChallengeOpen, setX1ChallengeOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        const profile = await getProfile(user.id);
        if (profile) {
          setUserProfile({
            id: profile.id,
            display_name: profile.display_name || profile.full_name || "Usuário",
            avatar_url: profile.avatar_url,
            email: profile.email,
          });
        }
      } catch (err) {
        console.error("Erro ao buscar perfil do usuário:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  const handleLogout = async () => {
    try {
      // TODO: Implement logout logic with Supabase
      navigate("/");
    } catch (err) {
      console.error("Erro ao fazer logout:", err);
    }
  };

  const handleCreateTournament = () => {
    navigate("/create-tournament");
  };

  const handleOpenX1Challenge = () => {
    setX1ChallengeOpen(true);
  };

  const isAuthenticated = !!user;

  if (loading && isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div>Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar isAuthenticated={isAuthenticated} />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex items-center justify-between mb-8 animate-slide-up">
          <div>
            <h1 className="text-4xl font-bold mb-2">Campeonatos</h1>
            <p className="text-muted-foreground">Gerencie seus torneios e participe de novos campeonatos</p>
          </div>

          {isAuthenticated && userProfile && (
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="relative">
                    <Bell className="w-5 h-5" />
                    {invitesCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                        {invitesCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="flex items-center justify-between p-2">
                    <h4 className="font-semibold">Convites & Solicitações</h4>
                    <Badge variant="secondary">{invitesCount}</Badge>
                  </div>
                  <DropdownMenuSeparator />
                  <div className="max-h-96 overflow-y-auto">
                    {invitesCount === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        Nenhum convite no momento
                      </div>
                    ) : (
                      <div>Convites aqui</div>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 h-auto py-2 px-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={userProfile.avatar_url} alt={userProfile.display_name} />
                      <AvatarFallback>{userProfile.display_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline font-medium">{userProfile.display_name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center cursor-pointer">
                      <User className="w-4 h-4 mr-2" />
                      Exibir Perfil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {isAuthenticated ? (
          <Tabs defaultValue="my-tournaments" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="my-tournaments" className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                <span className="hidden sm:inline">Meus Campeonatos</span>
              </TabsTrigger>
              <TabsTrigger value="public" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span className="hidden sm:inline">Públicos</span>
              </TabsTrigger>
              <TabsTrigger value="invites" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                <span className="hidden sm:inline">Convites</span>
                {invitesCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {invitesCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="friends" className="flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Amigos</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-tournaments">
              <MyTournamentsTab />
            </TabsContent>

            <TabsContent value="public">
              <PublicTournamentsTab />
            </TabsContent>

            <TabsContent value="invites">
              <InvitesTab />
            </TabsContent>

            <TabsContent value="friends">
              <FriendsTab />
            </TabsContent>
          </Tabs>
        ) : (
          <PublicTournamentsTab />
        )}
      </main>

      {isAuthenticated && (
        <>
          <BottomNav 
            onCreateTournament={handleCreateTournament}
            onOpenX1Challenge={handleOpenX1Challenge}
          />
          <X1ChallengeDialog 
            open={x1ChallengeOpen}
            onOpenChange={setX1ChallengeOpen}
          />
        </>
      )}
    </div>
  );
};

export default Dashboard;
