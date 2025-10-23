
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Users, DollarSign, Calendar, Check, X, Gamepad2, Landmark } from "lucide-react";
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
    auth_uid: string;
    id: string;
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
          created_at,
          tournaments!inner(id, title, game, entry_fee, prize_pool, max_participants, starts_at, owner_id)
        `)
        .eq("user_id", currentUserId)
        .eq("status", "pending");

      if (participantError) throw participantError;

      if (participantInvites && participantInvites.length > 0) {
        const ownerIds = participantInvites.map((p: any) => p.tournaments.owner_id);
        const { data: ownerProfiles, error: ownerProfileError } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, auth_uid, display_name")
          .in("id", ownerIds);

        if (ownerProfileError) throw ownerProfileError;

        const ownerProfileMap = new Map<string, ProfileData>();
        ownerProfiles?.forEach((p: any) => ownerProfileMap.set(p.id, p as ProfileData));

        for (const p of participantInvites) {
          const tournament = p.tournaments as any;
          const ownerProfile = ownerProfileMap.get(tournament.owner_id);

          if (tournament && ownerProfile) {
            // Fetch current participants count for each tournament
            const { count: currentParticipantsCount, error: countError } = await supabase
              .from("participants")
              .select("id", { count: 'exact' })
              .eq("tournament_id", tournament.id)
              .eq("status", "active"); // Only count active participants

            if (countError) console.error("Error fetching participant count:", countError);

            fetchedInvites.push({
              id: `tour-${p.id}`,
              type: "tournament",
              from: {
                name: ownerProfile.display_name || ownerProfile.full_name || "Organizador",
                avatar: ownerProfile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${ownerProfile.full_name}`,
                id: ownerProfile.id,
              },
              tournament: {
                id: tournament.id,
                name: tournament.title,
                game: tournament.game,
                entryFee: tournament.entry_fee,
                prizePool: tournament.prize_pool,
                players: currentParticipantsCount || 0,
                maxPlayers: tournament.max_participants,
                startDate: tournament.starts_at,
              },
              createdAt: p.created_at,
              participantId: p.id,
            });
          }
        }
      }

      // 2. Fetch friend requests
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

        const { data: senderProfiles, error: profileError } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url, auth_uid, display_name") 
            .in("id", senderIds);

        if (profileError) throw profileError;

        const profileMap = new Map<string, ProfileData>();
        senderProfiles?.forEach((p: any) => profileMap.set(p.id, p as ProfileData));
        
        const friendInvites: FriendInvite[] = friendRequests.map((f: any) => {
          const profile = profileMap.get(f.user_id); 
          
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
  }, [toast])  useEffect(() => {
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
        toast({ title: "Sucesso", description: `Você aceitou o convite para o torneio ${invite.tournament.name}.` });
      } else if (invite.type === "friend") {
        const { error } = await supabase
          .from("friends")
          .update({ status: "accepted" })
          .eq("id", invite.friendshipId);
        if (error) throw error;
        toast({ title: "Sucesso", description: `Você aceitou a solicitação de amizade de ${invite.from.name}.` });
      }
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
        toast({ title: "Sucesso", description: `Você recusou o convite para o torneio ${invite.tournament.name}.` });
      } else if (invite.type === "friend") {
        const { error } = await supabase
          .from("friends")
          .delete()
          .eq("id", invite.friendshipId);
        if (error) throw error;
        toast({ title: "Sucesso", description: `Você recusou a solicitação de amizade de ${invite.from.name}.` });
      }
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
                      <Gamepad2 className="w-4 h-4 text-muted-foreground" />
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

                  {/* Actions */}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => handleDecline(invite)}>
                      <X className="w-4 h-4 mr-2" /> Recusar
                    </Button>
                    <Button onClick={() => handleAccept(invite)}>
                      <Check className="w-4 h-4 mr-2" /> Aceitar
                    </Button>
                  </div>
                </CardContent>
              )}

              {invite.type === "friend" && (
                <CardContent className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => handleDecline(invite)}>
                    <X className="w-4 h-4 mr-2" /> Recusar
                  </Button>
                  <Button onClick={() => handleAccept(invite)}>
                    <Check className="w-4 h-4 mr-2" /> Aceitar
                  </Button>
                </CardContent>
              )}
            </Card>
          ))
        ) : (
          <p className="text-muted-foreground text-center py-8">Nenhum convite pendente no momento.</p>
        )}
      </div>
    </div>
  );
};

