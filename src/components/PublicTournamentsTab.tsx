import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Trophy, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PublicTournament {
  id: string;
  name: string;
  game: string;
  players: number;
  maxPlayers: number;
  entryFee: number;
  prizePool: number;
  startDate: string;
  organizer: string;
  status: string;
}

export const PublicTournamentsTab = () => {
  const [tournaments, setTournaments] = useState<PublicTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchPublicTournaments();
  }, []);

  const fetchPublicTournaments = async () => {
    try {
      setLoading(true);
      
      // Buscar torneios públicos do Supabase
      const { data: publicTournaments, error } = await supabase
        .from("tournaments" as any)
        .select(`
          id,
          title,
          game,
          max_participants,
          prize_pool,
          entry_fee,
          status,
          starts_at,
          owner_id,
          participants (id)
        `)
        .eq("public", true)
        .order("starts_at", { ascending: true });

      if (error) throw error;

      // Buscar informações dos proprietários dos torneios
      const tournamentsWithOwners = await Promise.all(
        (publicTournaments || []).map(async (tournament: any) => {
          const { data: ownerData } = await supabase
            .from("profiles" as any)
            .select("full_name")
            .eq("id", tournament.owner_id)
            .single();

          return {
            id: tournament.id,
            name: tournament.title,
            game: tournament.game,
            players: tournament.participants?.length || 0,
            maxPlayers: tournament.max_participants,
            entryFee: tournament.entry_fee || 0,
            prizePool: tournament.prize_pool || 0,
            startDate: tournament.starts_at,
            organizer: ownerData?.full_name || "Organizador Desconhecido",
            status: tournament.status,
          };
        })
      );

      setTournaments(tournamentsWithOwners);
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

  const handleJoinTournament = async (tournamentId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para participar de um torneio.",
          variant: "destructive",
        });
        return;
      }

      // Adicionar o usuário como participante do torneio
      const { error } = await supabase
        .from("participants" as any)
        .insert({
          tournament_id: tournamentId,
          user_id: user.id,
          status: "pending",
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Você se inscreveu no torneio com sucesso!",
      });

      // Recarregar a lista de torneios
      fetchPublicTournaments();
    } catch (error) {
      console.error("Erro ao participar do torneio:", error);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Campeonatos Públicos</h2>
          <p className="text-muted-foreground">Participe de torneios abertos à comunidade</p>
        </div>
      </div>

      <div className="grid gap-4">
        {tournaments.length > 0 ? (
          tournaments.map((tournament) => (
            <Card key={tournament.id} className="glass-card hover:shadow-lg transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-1">{tournament.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      {tournament.game} • Organizado por {tournament.organizer}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    {tournament.status === "active" ? "Em Andamento" : "Aguardando"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Participantes</p>
                      <p className="font-semibold">
                        {tournament.players}/{tournament.maxPlayers}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Premiação</p>
                      <p className="font-semibold text-primary">R$ {tournament.prizePool}</p>
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

