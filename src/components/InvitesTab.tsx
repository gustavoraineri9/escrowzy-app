import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Users, DollarSign, Calendar, Check, X, Gamepad2 } from "lucide-react"; 
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
  participantId: string;
}

interface FriendInvite {
  id: string;
  type: "friend";
  from: { name: string; avatar: string; id: string };
  createdAt: string;
  friendshipId: string;
}

type Invite = TournamentInvite | FriendInvite;

interface ProfileData {
    id: string; // Auth ID do Supabase
    full_name: string | null;
    display_name: string | null;
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

      // 1. Fetch tournament invites
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
            players: Math.floor(p.tournaments.max_participants * 0.5), 
            maxPlayers: p.tournaments.max_participants,
            startDate: p.tournaments.starts_at,
          },
          createdAt: p.joined_at,
          participantId: p.id,
        } ));
        fetchedInvites.push(...tournamentInvites);
      }

      // 2. Fetch friend requests (SOLUÇÃO EM DUAS ETAPAS CORRIGIDA)
      
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

        // Busca por profiles.id, que é o Auth ID
        const { data: senderProfiles, error: profileError } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url, display_name") 
            .in("id", senderIds); // Filtro pela coluna 'id'

        if (profileError) throw profileError;

        const profileMap = new Map<string, ProfileData>();
        if (senderProfiles) {
             senderProfiles.forEach((p: any) => {
                 // Mapeia o perfil usando o 'id' (Auth ID) como chave
                 profileMap.set(p.id, p as ProfileData); 
             });
        }
        
        const friendInvites: FriendInvite[] = friendRequests.map((f: any) => {
          // Busca o perfil usando o user_id do convite (que é o Auth ID)
          const profile = profileMap.get(f.user_id); 
          
          // Lógica de fallback
          const senderName = profile?.display_name || profile?.full_name || "Usuário";
          const senderAvatar = profile?.avatar_url || 
                               `https://api.dicebear.com/7.x/avataaars/svg?seed=${senderName}`;

          return {
            id: `friend-${f.id}`,
            type: "friend",
            from: {
              name: senderName,
              avatar: senderAvatar,
              id: profile?.id || f.user_id,
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
      // Lógica de aceitar permanece a mesma
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
      // Lógica de recusar permanece a mesma
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
            <Card key={invite.id} className="glass-card shadow-lg">
              {invite.type === "tournament" ? (
                // LAYOUT DO CONVITE DE TORNEIO (AJUSTADO)
                <CardContent className="p-0">
                    
                    {/* Linha 1: Remetente e Título do Convite */}
                    <div className="p-4 flex items-center gap-3 border-b border-gray-100/10">
                        <Avatar className="w-10 h-10">
                            <AvatarImage src={invite.from.avatar} />
                            <AvatarFallback>{invite.from.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-sm">
                            <p className="font-semibold text-foreground">{invite.from.name} convidou você para participar de <span className="text-primary font-bold">"{invite.tournament.name}"</span>.</p>
                        </div>
                        <Badge className="bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30">Campeonato</Badge>
                    </div>

                    {/* Linha 2: Detalhes do Torneio (Jogo, Participantes, Taxa, Início) */}
                    <div className="grid grid-cols-4 gap-4 p-4 text-sm border-b border-gray-100/10">
                        
                        {/* Jogo */}
                        <div className="flex items-center gap-2">
                            <Gamepad2 className="w-5 h-5 text-muted-foreground/80" />
                            <div>
                                <p className="text-xs text-muted-foreground">Jogo</p>
                                <p className="font-medium">{invite.tournament.game}</p>
                            </div>
                        </div>

                        {/* Participantes */}
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-muted-foreground/80" />
                            <div>
                                <p className="text-xs text-muted-foreground">Participantes</p>
                                <p className="font-medium">{invite.tournament.players}/{invite.tournament.maxPlayers}</p>
                            </div>
                        </div>

                        {/* Taxa */}
                        <div className="flex items-center gap-2">
                            <DollarSign className="w-5 h-5 text-muted-foreground/80" />
                            <div>
                                <p className="text-xs text-muted-foreground">Taxa</p>
                                <p className="font-medium text-emerald-500">R$ {invite.tournament.entryFee.toFixed(2)}</p>
                            </div>
                        </div>

                        {/* Início */}
                        <div className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-muted-foreground/80" />
                            <div>
                                <p className="text-xs text-muted-foreground">Início</p>
                                <p className="font-medium">{new Date(invite.tournament.startDate).toLocaleDateString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Linha 3: Premiação Total */}
                    <div className="p-4 flex items-center justify-between bg-muted/20 border-b border-gray-100/10">
                        <div className="flex items-center gap-2">
                             <Trophy className="w-5 h-5 text-yellow-500" />
                            <p className="text-sm font-semibold">Premiação Total</p>
                        </div>
                        <p className="text-lg font-bold text-emerald-500">R$ {invite.tournament.prizePool.toFixed(2)}</p>
                    </div>

                    {/* Linha 4: Botões de Ação */}
                    <div className="p-4 flex gap-4">
                        {/* Botão Aceitar com estilo gradiente */}
                        <Button 
                            className="flex-1 bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 shadow-lg shadow-teal-500/30 transition-all duration-300" 
                            onClick={() => handleAccept(invite)}
                        >
                            <Check className="w-4 h-4 mr-2" /> Aceitar Convite
                        </Button>
                        
                        {/* Botão Recusar */}
                        <Button 
                            variant="outline" 
                            className="flex-1 border-destructive/50 text-destructive hover:bg-destructive/10 transition-all duration-300"
                            onClick={() => handleDecline(invite)}
                        >
                            <X className="w-4 h-4 mr-2" /> Recusar
                        </Button>
                    </div>
                </CardContent>

              ) : (
                // LAYOUT DO CONVITE DE AMIZADE (AJUSTADO)
                <CardContent className="pt-6 pb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={invite.from.avatar} />
                        <AvatarFallback>{invite.from.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-lg font-semibold mb-1 flex items-center gap-2">
                           Solicitação de Amizade
                           <Badge className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 text-xs">Amizade</Badge>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">{invite.from.name}</span> quer ser seu amigo
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Botão Aceitar com estilo gradiente (mais compacto) */}
                      <Button 
                          className="w-24 bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 shadow-lg shadow-teal-500/30 transition-all duration-300" 
                          onClick={() => handleAccept(invite)}
                      >
                          Aceitar
                      </Button>
                      
                      {/* Botão Recusar (mais compacto) */}
                      <Button 
                          variant="outline" 
                          className="w-24 border-destructive/50 text-destructive hover:bg-destructive/10 transition-all duration-300"
                          onClick={() => handleDecline(invite)}
                      >
                          Recusar
                      </Button>
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