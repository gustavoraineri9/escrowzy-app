import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { Trophy, Users, Calendar, DollarSign } from "lucide-react";
// Usando caminho relativo para evitar erro de compilação, se necessário.
import { supabase } from "../integrations/supabase/client"; 
import { useToast } from "@/hooks/use-toast";

interface Tournament {
  id: string;
  name: string;
  game: string;
  players: number;
  maxPlayers: number;
  prizePool: number;
  entryFee: number;
  status: "pending" | "active" | "completed";
  createdAt: string;
  currentStage?: string;
  progress?: number;
  role: "owner" | "participant"; 
}

type FilterType = "all" | "active" | "completed";

export const MyTournamentsTab = () => {
  const [filter, setFilter] = useState<FilterType>("all");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMyTournaments = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setTournaments([]);
        return;
      }

      const userId = user.id;
      let allTournaments: Tournament[] = [];
      const tournamentIds = new Set<string>(); // Para rastrear IDs e evitar duplicatas
      
      // --- Função auxiliar para buscar metadados de participação (contagem de jogadores) ---
      const fetchParticipantCount = async (tournamentId: string) => {
          const { count, error } = await supabase
              .from("participants")
              .select("id", { count: 'exact', head: true })
              .eq("tournament_id", tournamentId)
              .eq("status", "active"); 
          
          if (error) console.error("Erro ao contar participantes:", error);
          return count || 0;
      };

      // --- 1. BUSCAR CAMPEONATOS CRIADOS (Owner) ---
      const { data: ownerTournaments, error: ownerError } = await supabase
        .from("tournaments" as any)
        .select(`
          id,
          title,
          game,
          max_participants,
          prize_pool,
          entry_fee,
          status,
          created_at,
          participants (id)
        `)
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });

      if (ownerError) throw ownerError;

      if (ownerTournaments) {
        const formattedOwnerTournaments: Tournament[] = ownerTournaments.map((tournament: any) => {
          tournamentIds.add(tournament.id);
          return {
            id: tournament.id,
            name: tournament.title,
            game: tournament.game,
            players: tournament.participants?.length || 0,
            maxPlayers: tournament.max_participants,
            prizePool: tournament.prize_pool || 0,
            entryFee: tournament.entry_fee || 0,
            status: tournament.status as "pending" | "active" | "completed",
            createdAt: tournament.created_at,
            role: "owner" as const, 
          };
        });
        allTournaments.push(...formattedOwnerTournaments);
      }
      
      // --- 2. BUSCAR CAMPEONATOS QUE ESTÁ PARTICIPANDO (Participant) ---
      // SELECT LIMPO: Sem comentários de linha dentro da string!
      const { data: participantRecords, error: participantError } = await supabase
        .from("participants")
        .select(`
          tournament_id,
          tournaments!inner(
            id,
            title,
            game,
            max_participants,
            prize_pool,
            entry_fee,
            status,
            created_at,
            owner_id 
          )
        `)
        .eq("user_id", userId)
        .eq("status", "active"); 

      if (participantError) throw participantError;

      if (participantRecords) {
        // Obter contagem de jogadores de forma assíncrona para todos os torneios inscritos
        const participantTournamentsData = await Promise.all(
            participantRecords
                .filter((record: any) => record.tournaments && !tournamentIds.has(record.tournaments.id))
                .map(async (record: any) => {
                    const tournament = record.tournaments;
                    const playerCount = await fetchParticipantCount(tournament.id); 
                    tournamentIds.add(tournament.id);
                    return {
                        id: tournament.id,
                        name: tournament.title,
                        game: tournament.game,
                        players: playerCount, 
                        maxPlayers: tournament.max_participants,
                        prizePool: tournament.prize_pool || 0,
                        entryFee: tournament.entry_fee || 0,
                        status: tournament.status as "pending" | "active" | "completed",
                        createdAt: tournament.created_at,
                        role: "participant" as const,
                    } as Tournament;
                })
        );
        allTournaments.push(...participantTournamentsData);
      }

      // Ordenar por data de criação (mais recente primeiro)
      allTournaments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setTournaments(allTournaments);

    } catch (error) {
      console.error("Erro ao buscar campeonatos:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar seus campeonatos. (Verifique a RLS!)",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchMyTournaments();
  }, [fetchMyTournaments]); 

  const getStatusBadge = (status: Tournament["status"]) => {
    const variants = {
      pending: { label: "Aguardando", className: "bg-warning/10 text-warning border-warning/20" },
      active: { label: "Em Andamento", className: "bg-success/10 text-success border-success/20" },
      completed: { label: "Finalizado", className: "bg-muted/10 text-muted-foreground border-muted/20" },
    };
    return <Badge className={variants[status].className}>{variants[status].label}</Badge>;
  };

  const filteredTournaments = tournaments.filter((tournament) => {
    if (filter === "all") return true;
    if (filter === "active") return tournament.status === "active";
    if (filter === "completed") return tournament.status === "completed";
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando campeonatos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <div className="flex items-center gap-4">
        <Select value={filter} onValueChange={(value) => setFilter(value as FilterType)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Em Andamento</SelectItem>
            <SelectItem value="completed">Finalizados</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {filteredTournaments.length} {filteredTournaments.length === 1 ? "campeonato" : "campeonatos"}
        </p>
      </div>

      {/* Tournaments List */}
      <div className="grid gap-4">
        {filteredTournaments.length > 0 ? (
            filteredTournaments.map((tournament) => (
              <Link key={tournament.id} to={`/tournament/${tournament.id}`}>
                <Card className="glass-card hover:shadow-lg transition-all cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-1">{tournament.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <Trophy className="w-4 h-4" />
                          {tournament.game}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        {getStatusBadge(tournament.status)}
                        <Badge variant="secondary" className="text-xs">
                            {tournament.role === 'owner' ? 'Seu Torneio (Criador)' : 'Inscrito'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Tournament Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Taxa de Entrada</p>
                          <p className="font-semibold text-primary">R$ {Number(tournament.entryFee).toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Premiação Total</p>
                          <p className="font-semibold text-primary">R$ {Number(tournament.prizePool).toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Criado em</p>
                          <p className="font-semibold">{new Date(tournament.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar for Active Tournaments */}
                    {tournament.status === "active" && tournament.currentStage && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progresso do Campeonato</span>
                          <span className="font-semibold">{tournament.currentStage}</span>
                        </div>
                        <Progress value={tournament.progress} className="h-2" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))
        ) : (
          <Card className="glass-card p-8 text-center">
            <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {tournaments.length === 0 
                ? "Você ainda não criou nem está inscrito em nenhum campeonato." 
                : "Nenhum campeonato encontrado com os filtros selecionados."}
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};