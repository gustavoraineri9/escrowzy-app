import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Check, X } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TournamentInvite {
  id: string;
  type: "tournament";
  from: { name: string; avatar: string; id: string };
  tournament: {
    id: string;
    name: string;
    game: string;
    entryFee: number;
    prizePool: number;
    players: number;
    maxPlayers: number;
    startDate: string;
  };
  createdAt: string;
  participantId: string; // ID na tabela participants
}

interface FriendInvite {
  id: string;
  type: "friend";
  from: { name: string; avatar: string; id: string };
  createdAt: string;
  friendshipId: string; // ID na tabela friends
}

type Invite = TournamentInvite | FriendInvite;

// Tipagem para o perfil, conforme o seu schema de profiles
interface ProfileData {
    auth_uid: string;
    id: string; // O ID do perfil
    full_name: string;
    avatar_url: string | null;
}

export const InvitesTab = () => {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchInvites = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setInvites([]);
        setLoading(false);
        return;
      }

      const currentUserId = user.id;
      let fetchedInvites: Invite[] = [];

      // =================================================================
      // 1. Fetch tournament invites (pending participants)
      // =================================================================
      const { data: participantInvites, error: participantError } = await supabase
        .from("participants")
        .select(`
          id,
          tournament_id,
          status,
          joined_at,
          tournaments!inner(
            id, 
            title, 
            game, 
            entry_fee, 
            prize_pool, 
            max_participants, 
            starts_at, 
            owner_id, 
            owner_profile:profiles!owner_id(id, full_name, avatar_url)
          )
        `)
        .eq("user_id", currentUserId)
        .eq("status", "pending");

      if (participantError) throw participantError;

      if (participantInvites) {
        const tournamentInvites: TournamentInvite[] = participantInvites.map((p: any) => ({
          id: `tour-${p.id}`,
          type: "tournament",
          from: {
            name: p.tournaments.owner_profile.full_name || "Organizador",
            avatar: p.tournaments.owner_profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.tournaments.owner_profile.full_name}`,
            id: p.tournaments.owner_profile.id,
          },
          tournament: {
            id: p.tournaments.id,
            name: p.tournaments.title,
            game: p.tournaments.game,
            entryFee: p.tournaments.entry_fee,
            prizePool: p.tournaments.prize_pool,
            players: 0, // Placeholder
            maxPlayers: p.tournaments.max_participants,
            startDate: p.tournaments.starts_at,
          },
          createdAt: p.joined_at,
          participantId: p.id,
        } ));
        fetchedInvites.push(...tournamentInvites);
      }

      // =================================================================
      // 2. Fetch friend requests (pending friends) - SOLUÇÃO EM DUAS ETAPAS
      // =================================================================
      
      // Passo A: Buscar apenas os IDs dos remetentes (CORRIGIDO: Removido o comentário problemático)
      const { data: friendRequests, error: friendError } = await supabase
        .from("friends")
        .select(`
          id,
          user_id, 
          status,
          created_at
        `)
        .eq("friend_id", currentUserId)
        .eq("status", "pending");

      if (friendError) throw friendError;

      if (friendRequests && friendRequests.length > 0) {
        const senderIds = friendRequests.map((f: any) => f.user_id);

        // Passo B: Buscar os perfis dos remetentes usando 'auth_uid'
        const { data: senderProfiles, error: profileError } = await supabase
            .from("profiles")
            .select("auth_uid, full_name, avatar_url, id")
            .in("auth_uid", senderIds); // Filtra na sua coluna de referência 'auth_uid'

        if (profileError) throw profileError;

        // Passo C: Mapear os perfis para fácil acesso (auth_uid -> profile)
        const profileMap = new Map<string, ProfileData>();
        if (senderProfiles) {
             senderProfiles.forEach((p: any) => {
                 profileMap.set(p.auth_uid, p as ProfileData);
             });
        }
        
        // Passo D: Juntar as informações e criar os convites
        const friendInvites: FriendInvite[] = friendRequests.map((f: any) => {
          const profile = profileMap.get(f.user_id); 
          
          return {
            id: `friend-${f.id}`,
            type: "friend",
            from: {
              name: profile?.full_name || "Usuário",
              avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.full_name || f.id}`,
              id: profile?.id || f.user_id, // Usando o ID do perfil ou o user_id como fallback
            },
            createdAt: f.created_at,
            friendshipId: f.id,
          };
        } );
        fetchedInvites.push(...friendInvites);
      }

      fetchedInvites.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setInvites(fetchedInvites);

    } catch (error) {
      console.error("Erro ao carregar convites:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os convites.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const handleAccept = async (invite: Invite) => {
    try {
      if (invite.type === "tournament") {
        const { error } = await supabase
          .from("participants")
          .update({ status: "active" }) 
          .eq("id", invite.participantId);
        if (error) throw error;
      } else if (invite.type === "friend") {
        const { error } = await supabase
          .from("friends")
          .update({ status: "accepted" })
          .eq("id", invite.friendshipId);
        if (error) throw error;
      }
      toast({ title: "Sucesso", description: "Convite aceito!" });
      fetchInvites();
    } catch (error) {
      console.error("Erro ao aceitar convite:", error);
      toast({ title: "Erro", description: "Não foi possível aceitar o convite.", variant: "destructive" });
    }
  };

  const handleDecline = async (invite: Invite) => {
    try {
      if (invite.type === "tournament") {
        const { error } = await supabase
          .from("participants")
          .delete()
          .eq("id", invite.participantId);
        if (error) throw error;
      } else if (invite.type === "friend") {
        const { error } = await supabase
          .from("friends")
          .delete()
          .eq("id", invite.friendshipId);
        if (error) throw error;
      }
      toast({ title: "Sucesso", description: "Convite recusado." });
      fetchInvites();
    } catch (error) {
      console.error("Erro ao recusar convite:", error);
      toast({ title: "Erro", description: "Não foi possível recusar o convite.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando convites...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Convites</h2>
        <p className="text-muted-foreground">Você tem {invites.length} convites pendentes</p>
      </div>
      <div className="space-y-4">
        {invites.length > 0 ? (
          invites.map((invite) => (
            <Card key={invite.id} className="glass-card">
              {invite.type === "tournament" ? (
                // Tournament Invite Card
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={invite.from.avatar} />
                      <AvatarFallback>{invite.from.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-semibold">{invite.from.name}</span> te convidou para o torneio <span className="font-semibold">{invite.tournament.name}</span>.
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm bg-muted/50 p-3 rounded-md">
                        <div>
                          <p className="text-xs text-muted-foreground">Jogo</p>
                          <p className="font-medium">{invite.tournament.game}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Entrada</p>
                          <p className="font-medium">R$ {invite.tournament.entryFee}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Prêmio</p>
                          <p className="font-medium">R$ {invite.tournament.prizePool}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Início</p>
                          <p className="font-medium">{new Date(invite.tournament.startDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center gap-2 mt-4 sm:mt-0">
                      <Button size="sm" className="w-full sm:w-auto bg-success/20 text-success hover:bg-success/30" onClick={() => handleAccept(invite)}><Check className="w-4 h-4" /></Button>
                      <Button size="sm" className="w-full sm:w-auto bg-destructive/20 text-destructive hover:bg-destructive/30" onClick={() => handleDecline(invite)}><X className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              ) : (
                // Friend Invite Card
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={invite.from.avatar} />
                        <AvatarFallback>{invite.from.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm">
                          <span className="font-semibold">{invite.from.name}</span> te enviou uma solicitação de amizade.
                        </p>
                        <p className="text-xs text-muted-foreground">{new Date(invite.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" className="bg-success/20 text-success hover:bg-success/30" onClick={() => handleAccept(invite)}><Check className="w-4 h-4" /></Button>
                      <Button size="sm" className="bg-destructive/20 text-destructive hover:bg-destructive/30" onClick={() => handleDecline(invite)}><X className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              )}
              
            </Card>
          ))
        ) : (
          <Card className="glass-card p-8 text-center">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhum convite pendente</h3>
            <p className="text-muted-foreground">Quando você receber convites, eles aparecerão aqui.</p>
          </Card>

        )}
      </div>
    </div>
  );
};