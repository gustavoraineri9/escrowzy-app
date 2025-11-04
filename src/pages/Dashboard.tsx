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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invitesCount, setInvitesCount] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [x1ChallengeOpen, setX1ChallengeOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthAndLoadUserData();
  }, []);

  const checkAuthAndLoadUserData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      setIsAuthenticated(true);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Erro ao buscar perfil:", profileError);
      } else if (profile) {
        setUserProfile({
          id: profile.id,
          full_name: profile.full_name || "",
          email: profile.email || "",
          avatar_url: profile.avatar_url
        });
      }

      // Buscar contagem de convites
      await fetchInvitesCount(user.id);
    } catch (error) {
      console.error("Erro ao verificar autenticação:", error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvitesCount = async (userId: string) => {
    try {
      // Buscar convites de participação em torneios (status pending)
      const { data: participantInvites, error: participantError } = await supabase
        .from("participants" as any)
        .select("id")
        .eq("user_id", userId)
        .eq("status", "pending");

      if (participantError) throw participantError;

      // Buscar solicitações de amizade (status pending)
      const { data: friendRequests, error: friendError } = await supabase
        .from("friends" as any)
        .select("id")
        .eq("friend_id", userId)
        .eq("status", "pending");

      if (friendError) throw friendError;

      const totalInvites = (participantInvites?.length || 0) + (friendRequests?.length || 0);
      setInvitesCount(totalInvites);
    } catch (error) {
      console.error("Erro ao buscar contagem de convites:", error);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Você foi desconectado com sucesso.",
      });

      setIsAuthenticated(false);
      setUserProfile(null);
      setInvitesCount(0);
      
      // Redirecionar para a página de login
      navigate("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      toast({
        title: "Erro",
        description: "Não foi possível fazer logout.",
        variant: "destructive",
      });
    }
  };

  const handleCreateTournament = () => {
    navigate("/create-tournament");
  };

  const handleOpenX1Challenge = () => {
    setX1ChallengeOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const displayName = userProfile?.full_name || "Usuário";
  const displayEmail = userProfile?.email || "";
  const avatarUrl = userProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayName}`;
  const initials = displayName
    .split(" " )
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar isAuthenticated={isAuthenticated} />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Header with Profile and Notifications - Only when authenticated */}
        <div className="flex items-center justify-between mb-8 animate-slide-up">
          <div>
            <h1 className="text-4xl font-bold mb-2">Campeonatos</h1>
            <p className="text-muted-foreground">Gerencie seus torneios e participe de novos campeonatos</p>
          </div>

          {isAuthenticated && userProfile && (
            <div className="flex items-center gap-3">
              {/* Notifications */}
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
                      <div className="p-4 text-center text-muted-foreground text-sm">
                        Nenhum convite ou solicitação no momento.
                      </div>
                    ) : (
                      <>
                        <DropdownMenuItem className="flex flex-col items-start p-3 cursor-pointer">
                          <p className="font-medium">Convites de Torneios</p>
                          <p className="text-xs text-muted-foreground">Você tem convites pendentes</p>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="flex flex-col items-start p-3 cursor-pointer">
                          <p className="font-medium">Solicitações de Amizade</p>
                          <p className="text-xs text-muted-foreground">Você tem solicitações pendentes</p>
                        </DropdownMenuItem>
                      </>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Profile Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 h-auto py-2 px-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={avatarUrl} alt={displayName} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline font-medium">{displayName}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{displayName}</p>
                    <p className="text-xs text-muted-foreground">{displayEmail}</p>
                  </div>
                  <DropdownMenuSeparator />
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

        {/* Tabs Navigation - Only show when authenticated */}
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
