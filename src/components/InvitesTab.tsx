import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Users, DollarSign, Calendar, Check, X } from "lucide-react";
import { useState, useEffect } from "react";
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

export const InvitesTab = () => {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchInvites();
  }, []);

  const fetchInvites = async () => {
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

      // Fetch tournament invites (pending participants)
      const { data: participantInvites, error: participantError } = await supabase
        .from("participants" as any)
        .select(`
          id,
          tournament_id,
          status,
          created_at,
          tournaments (id, title, game, entry_fee, prize_pool, max_participants, starts_at, owner_id),
          profiles (id, full_name, avatar_url)
        `)
        .eq("user_id", currentUserId)
        .eq("status", "pending");

      if (participantError) throw participantError;

      for (const pInvite of participantInvites || []) {
        const tournament = pInvite.tournaments as any;
        const profile = pInvite.profiles as any;

        if (tournament && profile) {
          const { data: currentParticipants } = await supabase
            .from("participants" as any)
            .select("id")
            .eq("tournament_id", tournament.id);

          fetchedInvites.push({
            id: pInvite.id, // participant ID
            type: "tournament",
            from: {
              id: profile.id,
              name: profile.full_name || "Usuário Desconhecido",
              avatar: profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.full_name}`,
            },
            tournament: {
              id: tournament.id,
              name: tournament.title,
              game: tournament.game,
              entryFee: tournament.entry_fee,
              prizePool: tournament.prize_pool,
              players: currentParticipants?.length || 0,
              maxPlayers: tournament.max_participants,
              startDate: tournament.starts_at,
            },
            createdAt: pInvite.created_at,
            participantId: pInvite.id,
          });
        }
      }

      // Fetch friend requests (pending friends where current user is friend_id)
      const { data: friendRequests, error: friendError } = await supabase
        .from("friends" as any)
        .select(`
          id,
          user_id,
          status,
          created_at,
          profiles (id, full_name, avatar_url)
        `)
        .eq("friend_id", currentUserId)
        .eq("status", "pending");

      if (friendError) throw friendError;

      for (const fRequest of friendRequests || []) {
        const profile = fRequest.profiles as any;
        if (profile) {
          fetchedInvites.push({
            id: fRequest.id, // friendship ID
            type: "friend",
            from: {
              id: profile.id,
              name: profile.full_name || "Usuário Desconhecido",
              avatar: profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.full_name}`,
            },
            createdAt: fRequest.created_at,
            friendshipId: fRequest.id,
          });
        }
      }

      // Sort invites by creation date (newest first)
      fetchedInvites.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setInvites(fetchedInvites);
    } catch (error) {
      console.error("Erro ao buscar convites:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os convites.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (invite: Invite) => {
    try {
      if (invite.type === "tournament") {
        const { error } = await supabase
          .from("participants" as any)
          .update({ status: "accepted" })
          .eq("id", invite.participantId);

        if (error) throw error;
        toast({
          title: "Sucesso",
          description: `Você aceitou o convite para o torneio ${invite.tournament.name}.`,
        });
      } else if (invite.type === "friend") {
        const { error } = await supabase
          .from("friends" as any)
          .update({ status: "accepted" })
          .eq("id", invite.friendshipId);

        if (error) throw error;
        toast({
          title: "Sucesso",
          description: `Você aceitou a solicitação de amizade de ${invite.from.name}.`,
        });
      }
      fetchInvites(); // Recarregar convites
    } catch (error) {
      console.error("Erro ao aceitar convite:", error);
      toast({
        title: "Erro",
        description: "Não foi possível aceitar o convite.",
        variant: "destructive",
      });
    }
  };

  const handleDecline = async (invite: Invite) => {
    try {
      if (invite.type === "tournament") {
        const { error } = await supabase
          .from("participants" as any)
          .delete()
          .eq("id", invite.participantId);

        if (error) throw error;
        toast({
          title: "Sucesso",
          description: `Você recusou o convite para o torneio ${invite.tournament.name}.`,
        });
      } else if (invite.type === "friend") {
        const { error } = await supabase
          .from("friends" as any)
          .delete()
          .eq("id", invite.friendshipId);

        if (error) throw error;
        toast({
          title: "Sucesso",
          description: `Você recusou a solicitação de amizade de ${invite.from.name}.`,
        });
      }
      fetchInvites(); // Recarregar convites
    } catch (error) {
      console.error("Erro ao recusar convite:", error);
      toast({
        title: "Erro",
        description: "Não foi possível recusar o convite.",
        variant: "destructive",
      });
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
        <p className="text-muted-foreground">
          Você tem {invites.length} {invites.length === 1 ? "convite" : "convites"} pendentes
        </p>
      </div>

      <div className="grid gap-4">
        {invites.length > 0 ? (
          invites.map((invite) => (
            <Card key={invite.id} className="glass-card hover:shadow-lg transition-all">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={invite.from.avatar} alt={invite.from.name} />
                      <AvatarFallback>
                        {invite.from.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">
                        {invite.type === "tournament" ? "Convite para Campeonato" : "Solicitação de Amizade"}
                      </CardTitle>
                      <CardDescription>
                        {invite.from.name}{" "}
                        {invite.type === "tournament"
                          ? `convidou você para participar de "${(invite as TournamentInvite).tournament?.name}"`
                          : "quer ser seu amigo"}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    {invite.type === "tournament" ? "Campeonato" : "Amizade"}
                  </Badge>
                </div>
              </CardHeader>

              {invite.type === "tournament" && invite.tournament && (
                <CardContent className="space-y-4">
                  {/* Tournament Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Jogo</p>
                        <p className="text-sm font-semibold">{invite.tournament.game}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Participantes</p>
                        <p className="text-sm font-semibold">
                          {invite.tournament.players}/{invite.tournament.maxPlayers}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Taxa</p>
                        <p className="text-sm font-semibold text-primary">R$ {invite.tournament.entryFee}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Início</p>
                        <p className="text-sm font-semibold">
                          {new Date(invite.tournament.startDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Prize Pool Info */}
                  <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-primary" />
                      <span className="font-semibold">Premiação Total</span>
                    </div>
                    <span className="text-lg font-bold text-primary">R$ {invite.tournament.prizePool}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={() => handleAccept(invite)}
                      className="flex-1 gradient-primary"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Aceitar Convite
                    </Button>
                    <Button
                      onClick={() => handleDecline(invite)}
                      variant="outline"
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Recusar
                    </Button>
                  </div>
                </CardContent>
              )}

              {invite.type === "friend" && (
                <CardContent>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleAccept(invite)}
                      className="flex-1 gradient-primary"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Aceitar
                    </Button>
                    <Button
                      onClick={() => handleDecline(invite)}
                      variant="outline"
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-2" />
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
