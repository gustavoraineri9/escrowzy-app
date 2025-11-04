import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Trophy, Target, TrendingUp } from "lucide-react";
import { useState } from "react";

interface Participant {
  id: string;
  tournament_id: string;
  user_id: string;
  joined_at: string;
  status: "pending" | "paid" | "forfeit";
  profiles: {
    id: string;
    email: string;
    full_name: string;
    display_name: string;
    avatar_url?: string;
  } | null;
}

interface ParticipantStatsTabProps {
  participants: Participant[];
}

export function ParticipantStatsTab({ participants }: ParticipantStatsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredParticipants = participants.filter(
    (participant) =>
      participant.profiles?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      participant.profiles?.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h3 className="text-xl font-semibold mb-1">Estatísticas dos Jogadores</h3>
          <p className="text-sm text-muted-foreground">
            Visualize o desempenho de cada participante
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar jogador por nome ou gamertag..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4">
        {filteredParticipants.length > 0 ? (
          filteredParticipants.map((participant) => (
            <Card key={participant.id} className="glass-card">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <img
                    src={participant.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${participant.profiles?.display_name || participant.user_id}`}
                    alt={participant.profiles?.full_name || participant.profiles?.display_name || "Participante"}
                    className="w-16 h-16 rounded-full"
                  />
                  <div className="flex-1">
                    <CardTitle className="text-lg">{participant.profiles?.full_name || participant.profiles?.display_name || "Nome Indisponível"}</CardTitle>
                    <CardDescription>@{participant.profiles?.display_name || "N/A"}</CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Inscrito em</p>
                    <p className="text-sm font-medium">
                      {new Date(participant.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Vitórias</p>
                      <p className="text-lg font-bold text-success">0</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <Target className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Derrotas</p>
                      <p className="text-lg font-bold">0</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Empates</p>
                      <p className="text-lg font-bold">0</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Gols Marcados</p>
                    <p className="text-lg font-bold text-primary">0</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Gols Sofridos</p>
                    <p className="text-lg font-bold">0</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">Nenhum participante cadastrado</p>
            <p className="text-sm text-muted-foreground mt-2">
              {participants.length === 0 
                ? "Envie convites para adicionar participantes ao campeonato"
                : "Nenhum participante encontrado com os critérios de busca"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
