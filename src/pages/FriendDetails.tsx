import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Trophy, TrendingUp, Gamepad2, Flame, Calendar, ChevronDown, DollarSign, Award, Snowflake } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buscarEstatisticasConfrontoDireto, EstatisticasConfrontoDireto } from "@/services/friendService";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// Perfis e dados reais serão carregados do Supabase
type Profile = {
  id: string;
  display_name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
};

export default function FriendDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Estados de dados reais
  const [headStats, setHeadStats] = useState<EstatisticasConfrontoDireto | null>(null);
  const [loadingHeadStats, setLoadingHeadStats] = useState(false);
  const [friendProfile, setFriendProfile] = useState<Profile | null>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [friendGameStats, setFriendGameStats] = useState<any[]>([]);
  const [matchHistory, setMatchHistory] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoadingHeadStats(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Head-to-head
        const stats = await buscarEstatisticasConfrontoDireto(user.id, id);
        if (stats) setHeadStats(stats);

        // Perfis
        const { data: friendData } = await supabase
          .from('profiles')
          .select('id, display_name, full_name, avatar_url')
          .eq('id', id)
          .maybeSingle();

        const { data: currentData } = await supabase
          .from('profiles')
          .select('id, display_name, full_name, avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        if (friendData) setFriendProfile(friendData as Profile);
        if (currentData) setCurrentProfile(currentData as Profile);

        // TODO: buscar friendGameStats e matchHistory quando houver tabelas/endpoint
      } catch (err) {
        console.error("Erro ao buscar dados do FriendDetails:", err);
      } finally {
        setLoadingHeadStats(false);
      }
    };

    fetchData();
  }, [id]);

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return "text-success";
    if (balance < 0) return "text-destructive";
    return "text-muted-foreground";
  };

  const formatBalance = (balance: number) => {
    if (balance > 0) return `+ R$ ${balance.toFixed(2)}`;
    if (balance < 0) return `- R$ ${Math.abs(balance).toFixed(2)}`;
    return `R$ ${balance.toFixed(2)}`;
  };

  // Derived values (preferir dados reais quando disponíveis)
  const yourWins = headStats ? headStats.vitorias_a : 0;
  const theirWins = headStats ? headStats.vitorias_b : 0;
  const totalBalance = headStats ? headStats.saldo_a : 0;
  const currentStreak = headStats
    ? { type: headStats.sequencia_vitorias_a > 0 ? 'wins' : 'losses', count: Math.abs(headStats.sequencia_vitorias_a) }
    : { type: 'wins', count: 0 };
  const updatedAt = headStats ? headStats.atualizado_em : undefined;

  const currentDisplayName = currentProfile?.display_name || 'Você';
  const currentAvatar = currentProfile?.avatar_url;
  const friendDisplayName = friendProfile?.display_name || 'Amigo';
  const friendAvatar = friendProfile?.avatar_url;
  const biggestPrize = 0; // placeholder até existir dado real
  const dominantGame = '—';

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header Navigation */}
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Amigos
        </Button>

        {/* Header de Confronto */}
        <Card className="glass-card mb-8">
          <CardContent className="pt-8 pb-8">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <div className="flex flex-col items-center gap-2">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={currentAvatar} />
                  <AvatarFallback className="text-2xl">VC</AvatarFallback>
                </Avatar>
                <p className="font-semibold text-lg">{currentDisplayName}</p>
              </div>

              <div className="text-center px-8">
                <div className="text-4xl font-bold mb-2">
                  <span className="text-primary">{yourWins}</span>
                  <span className="text-muted-foreground mx-4">×</span>
                  <span className="text-muted-foreground">{theirWins}</span>
                </div>
                <p className="text-sm text-muted-foreground">Vitórias</p>
                {updatedAt && (
                  <p className="text-xs text-muted-foreground mt-1">Atualizado em: {new Date(updatedAt).toLocaleString('pt-BR')}</p>
                )}
              </div>

              <div className="flex flex-col items-center gap-2">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={friendAvatar} />
                  <AvatarFallback className="text-2xl">
                    {friendDisplayName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <p className="font-semibold text-lg">{friendDisplayName}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Painel de KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Saldo Total */}
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-lg bg-primary/10">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Saldo Total</p>
                  <p className={`text-2xl font-bold ${getBalanceColor(totalBalance)}`}>
                    {formatBalance(totalBalance)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Maior Prêmio */}
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-lg bg-warning/10">
                  <Trophy className="w-6 h-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Maior Prêmio</p>
                  <p className="text-2xl font-bold">R$ {biggestPrize.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Jogo Dominante */}
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-lg bg-info/10">
                  <Gamepad2 className="w-6 h-6 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Jogo Dominante</p>
                  <p className="text-lg font-bold">{dominantGame}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sequência Atual */}
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-lg bg-success/10">
                  <Flame className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Sequência Atual</p>
                  <p className="text-lg font-bold">
                    {currentStreak.count}{" "}
                    {currentStreak.type === "wins" ? "Vitórias" : "Derrotas"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Desempenho por Jogo */}
        <Card className="glass-card mb-8">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold mb-6">Desempenho por Jogo</h2>
            <Accordion type="single" collapsible className="space-y-4">
              {(friendGameStats.length ? friendGameStats : []).map((stat) => {
                const totalGames = stat.yourWins + stat.theirWins;
                const yourPercentage = (stat.yourWins / totalGames) * 100;
                
                return (
                  <AccordionItem key={stat.game} value={stat.game} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-4 flex-1">
                          <h3 className="font-semibold text-lg">{stat.game}</h3>
                          <span className="text-sm text-muted-foreground">
                            {stat.yourWins}V - {stat.theirWins}D
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 relative w-32">
                            <Progress value={yourPercentage} className="h-3" />
                          </div>
                          <span className="text-sm font-medium min-w-[50px] text-right">
                            {yourPercentage.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 pb-6">
                      {/* Grade de 4 Cards de Estatística */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {/* Card 1: Saldo no Jogo */}
                        <Card className="bg-muted/30">
                          <CardContent className="pt-4">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${stat.balance > 0 ? 'bg-success/10' : stat.balance < 0 ? 'bg-destructive/10' : 'bg-muted'}`}>
                                <DollarSign className={`w-5 h-5 ${stat.balance > 0 ? 'text-success' : stat.balance < 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Saldo em {stat.game}</p>
                                <p className={`text-xl font-bold ${getBalanceColor(stat.balance)}`}>
                                  {formatBalance(stat.balance)}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Card 2: Sequência no Jogo */}
                        <Card className="bg-muted/30">
                          <CardContent className="pt-4">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${stat.streak.type === 'wins' ? 'bg-success/10' : 'bg-destructive/10'}`}>
                                {stat.streak.type === 'wins' ? (
                                  <Flame className="w-5 h-5 text-success" />
                                ) : (
                                  <Snowflake className="w-5 h-5 text-destructive" />
                                )}
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Sequência Atual em {stat.game}</p>
                                <p className="text-xl font-bold">
                                  {stat.streak.count > 0 ? (
                                    <>
                                      {stat.streak.count}{" "}
                                      {stat.streak.type === 'wins' ? 'Vitórias' : 'Derrotas'}
                                    </>
                                  ) : (
                                    'Empate'
                                  )}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Card 3: Maior Prêmio no Jogo */}
                        <Card className="bg-muted/30">
                          <CardContent className="pt-4">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-warning/10">
                                <Award className="w-5 h-5 text-warning" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Maior Prêmio em {stat.game}</p>
                                <p className="text-xl font-bold">
                                  R$ {stat.biggestPrize.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Card 4: Últimas 5 Partidas */}
                        <Card className="bg-muted/30">
                          <CardContent className="pt-4">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-info/10">
                                <Trophy className="w-5 h-5 text-info" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Desempenho Recente</p>
                                <div className="flex gap-2 mt-2">
                                  {stat.lastFiveMatches.map((result, index) => (
                                    <div
                                      key={index}
                                      className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                        result === 'win' 
                                          ? 'bg-success' 
                                          : result === 'loss'
                                          ? 'bg-destructive'
                                          : 'bg-muted-foreground'
                                      }`}
                                      title={result === 'win' ? 'Vitória' : result === 'loss' ? 'Derrota' : 'Empate'}
                                    >
                                      <span className="text-white text-xs font-bold">
                                        {result === 'win' ? 'V' : result === 'loss' ? 'D' : 'E'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Estatísticas Avançadas (Placeholders) */}
                      <div className="border-t pt-4">
                        <h3 className="font-semibold text-sm mb-3 text-muted-foreground">Estatísticas Avançadas</h3>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <p>• Média de K/D: <span className="italic">Em breve</span></p>
                          <p>• Maior Goleada: <span className="italic">Em breve</span></p>
                          <p>• Taxa de Comeback: <span className="italic">Em breve</span></p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
              {friendGameStats.length === 0 && (
                <div className="p-6 text-sm text-muted-foreground">Sem estatísticas por jogo para este usuário.</div>
              )}
            </Accordion>
          </CardContent>
        </Card>

        {/* Histórico de Partidas */}
        <Card className="glass-card">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold mb-6">Histórico de Confrontos</h2>
            <div className="space-y-3">
              {matchHistory.length > 0 ? (
                matchHistory.map((match) => (
                <div
                  key={match.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {new Date(match.date).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <Gamepad2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{match.game}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold">
                      R$ {match.prize.toFixed(2)}
                    </span>
                    <Badge
                      variant={match.result === "win" ? "default" : "secondary"}
                      className={
                        match.result === "win"
                          ? "bg-success/10 text-success border-success/20"
                          : "bg-destructive/10 text-destructive border-destructive/20"
                      }
                    >
                      {match.result === "win" ? "Vitória" : "Derrota"}
                    </Badge>
                  </div>
                </div>
                ))
              ) : (
                <div className="p-6 text-sm text-muted-foreground">Sem histórico de confrontos registrado.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
