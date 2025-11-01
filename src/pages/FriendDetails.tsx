import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Trophy, TrendingUp, Gamepad2, Flame, Calendar, DollarSign, Award, Snowflake, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { getHeadToHeadStats, HeadToHeadStats } from "@/services/friendService";

type Profile = {
  id: string;
  display_name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
};

// Keep small placeholders for sections that need richer backend data
const placeholderGameStats: any[] = [];
const placeholderMatchHistory: any[] = [];

export default function FriendDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [friendProfile, setFriendProfile] = useState<Profile | null>(null);
  const [headToHead, setHeadToHead] = useState<HeadToHeadStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setError("Usuário não autenticado");
          setLoading(false);
          return;
        }

        // busca perfil do usuário atual
        const { data: currentProf } = await supabase
          .from("profiles")
          .select("id, display_name, full_name, avatar_url")
          .eq("auth_uid", user.id)
          .maybeSingle();

        setCurrentProfile(currentProf || null);

        // busca perfil do amigo pelo id de rota (assume que `id` é o id do profile)
        if (!id) {
          setError("ID do amigo não informado");
          setLoading(false);
          return;
        }

        const { data: friendProf, error: friendError } = await supabase
          .from("profiles")
          .select("id, display_name, full_name, avatar_url")
          .eq("id", id)
          .maybeSingle();

        if (friendError) throw friendError;
        setFriendProfile(friendProf || null);

        // busca estatísticas head-to-head via service
        const stats = await getHeadToHeadStats(user.id, id);
        setHeadToHead(stats);
      } catch (err: any) {
        console.error("Erro ao carregar FriendDetails:", err);
        setError(err?.message || "Erro ao carregar dados");
      } finally {
        setLoading(false);
      }
    };

    load();
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

  if (loading) return <div className="text-center py-8">Carregando...</div>;
  if (error) return <div className="text-center py-8 text-destructive">{error}</div>;

  // map headToHead to the view shape used by the UI (fall back to zeros/placeholders)
  const yourWins = headToHead ? headToHead.wins_a : 0;
  const theirWins = headToHead ? headToHead.wins_b : 0;
  const totalBalance = headToHead ? headToHead.balance_a : 0;
  const biggestPrize = 0; // placeholder (requires more detailed backend data)
  const dominantGame = "-";
  const currentStreak = { type: headToHead && headToHead.win_streak_a > 0 ? "wins" : "losses", count: headToHead ? Math.abs(headToHead.win_streak_a) : 0 };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Amigos
        </Button>

        <Card className="glass-card mb-8">
          <CardContent className="pt-8 pb-8">
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <div className="flex flex-col items-center gap-2">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={currentProfile?.avatar_url} />
                  <AvatarFallback className="text-2xl">{currentProfile?.display_name?.substring(0,2).toUpperCase() || 'VC'}</AvatarFallback>
                </Avatar>
                <p className="font-semibold text-lg">{currentProfile?.display_name || currentProfile?.full_name || 'Você'}</p>
              </div>

              <div className="text-center px-8">
                <div className="text-4xl font-bold mb-2">
                  <span className="text-primary">{yourWins}</span>
                  <span className="text-muted-foreground mx-4">×</span>
                  <span className="text-muted-foreground">{theirWins}</span>
                </div>
                <p className="text-sm text-muted-foreground">Vitórias</p>
              </div>

              <div className="flex flex-col items-center gap-2">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={friendProfile?.avatar_url} />
                  <AvatarFallback className="text-2xl">{friendProfile?.display_name?.substring(0,2).toUpperCase() || (friendProfile?.full_name || '??').substring(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <p className="font-semibold text-lg">{friendProfile?.display_name || friendProfile?.full_name || 'Amigo'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-lg bg-success/10">
                  <Flame className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Sequência Atual</p>
                  <p className="text-lg font-bold">{currentStreak.count} {currentStreak.type === 'wins' ? 'Vitórias' : 'Derrotas'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card mb-8">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold mb-6">Desempenho por Jogo</h2>
            <Accordion type="single" collapsible className="space-y-4">
              {placeholderGameStats.length === 0 ? (
                <div className="text-muted-foreground">Dados por jogo ainda não disponíveis.</div>
              ) : (
                placeholderGameStats.map((stat) => (
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
                            <Progress value={stat.yourPercentage} className="h-3" />
                          </div>
                          <span className="text-sm font-medium min-w-[50px] text-right">
                            {stat.yourPercentage.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4 pb-6">
                      <div className="text-muted-foreground">Estatísticas detalhadas em breve.</div>
                    </AccordionContent>
                  </AccordionItem>
                ))
              )}
            </Accordion>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <h2 className="text-2xl font-bold mb-6">Histórico de Confrontos</h2>
            <div className="space-y-3">
              {placeholderMatchHistory.length === 0 ? (
                <div className="text-muted-foreground">Histórico ainda não disponível.</div>
              ) : (
                placeholderMatchHistory.map((match) => (
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
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    
  );
}
