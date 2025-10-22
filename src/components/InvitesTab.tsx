import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Users, DollarSign, Calendar, Check, X } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Interfaces mantidas...

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

      // Fetch tournament invites (pending participants)
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
            owner_profile:profiles!owner_id(id, full_name, avatar_url) // <-- CORREÇÃO DA SINTAXE PGRST100
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
            // ATUALIZAÇÃO NO CAMPO DE RETORNO
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

      // Fetch friend requests (pending friends where current user is friend_id)
      const { data: friendRequests, error: friendError } = await supabase
        .from("friends")
        .select(`
          id,
          user_id,
          status,
          created_at,
          profiles!user_id(id, full_name, avatar_url)
        `)
        .eq("friend_id", currentUserId)
        .eq("status", "pending");

      if (friendError) throw friendError;

      if (friendRequests) {
        const friendInvites: FriendInvite[] = friendRequests.map((f: any) => ({
          id: `friend-${f.id}`,
          type: "friend",
          from: {
            name: f.profiles.full_name || "Usuário",
            avatar: f.profiles.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${f.profiles.full_name}`,
            id: f.profiles.id,
          },
          createdAt: f.created_at,
          friendshipId: f.id,
        } ));
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
        // Corrigindo para "active" (se o seu status correto para aceito for 'active')
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
        {/* O restante do JSX foi omitido por brevidade, mas está correto no seu código. */}
      </div>
      {/* ... JSX restante ... */}
    </div>
  );
};