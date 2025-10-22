import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, DollarSign, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Tournament {
  id: string;
  title: string;
  game: string;
  entryFee: number;
  prizePool: number;
  players: number;
  maxPlayers: number;
  startDate: string;
  organizer: string;
}

export const PublicTournamentsTab = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPublicTournaments = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("tournaments")
          .select(`
            id, title, game, entry_fee, prize_pool, max_participants, starts_at,
            profiles!owner_id (full_name),
            participants (count)
          `)
          .eq("public", true)
          .order("starts_at", { ascending: true });

        if (error) throw error;

        const formattedTournaments: Tournament[] = (data || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          game: t.game,
          entryFee: t.entry_fee,
          prizePool: t.prize_pool,
          players: t.participants[0]?.count || 0,
          maxPlayers: t.max_participants,
          startDate: t.starts_at,
          organizer: t.profiles?.full_name || "Desconhecido",
        }));

        setTournaments(formattedTournaments);
      } catch (error) {
        console.error("Erro ao buscar torneios públicos:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os torneios públicos.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPublicTournaments();
  }, [toast]);

  const handleJoinTournament = async (tournamentId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para se inscrever em um torneio.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.from("participants").insert({
        tournament_id: tournamentId,
        user_id: user.id,
        status: "active", // Join directly
      });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Você se inscreveu no torneio.",
      });

      // Refresh tournament list to update player count
      // (or you can update the state locally for better UX)
      setTournaments(prev => prev.map(t => 
        t.id === tournamentId ? { ...t, players: t.players + 1 } : t
      ));

    } catch (error) {
      console.error("Erro ao se inscrever no torneio:", error);
      toast({
        title: "Erro",
        description: "Não foi possível se inscrever no torneio.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando torneios públicos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Campeonatos Públicos</h2>
        <p className="text-muted-foreground">Participe de torneios abertos à comunidade</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tournaments.length > 0 ? (
          tournaments.map((tournament) => (
            <Card key={tournament.id} className="glass-card hover:shadow-xl transition-all">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{tournament.title}</CardTitle>
                    <CardDescription>{tournament.game} • Organizado por {tournament.organizer}</CardDescription>
                  </div>
                  <Badge variant="secondary">Aguardando</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Participantes</p>
                      <p className="font-semibold">{tournament.players}/{tournament.maxPlayers}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Premiação</p>
                      <p className="font-semibold text-success">R$ {tournament.prizePool}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Taxa de Entrada</p>
                    <p className="font-semibold text-primary">R$ {tournament.entryFee}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Início</p>
                      <p className="font-semibold">{new Date(tournament.startDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
                <Button 
                  className="w-full gradient-primary"
                  onClick={() => handleJoinTournament(tournament.id)}
                  disabled={tournament.players >= tournament.maxPlayers}
                >
                  {tournament.players >= tournament.maxPlayers ? "Torneio Cheio" : "Participar do Torneio"}
                </Button>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="glass-card p-8 text-center">
            <p className="text-muted-foreground">
              Nenhum torneio público disponível no momento.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};
