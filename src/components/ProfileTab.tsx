import React, { useState, useEffect, useMemo } from "react";
// Importações de componentes
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Edit2, Save, Camera, DollarSign, Gamepad2, PieChart, Lock, Calendar, RefreshCw, Loader2 } from "lucide-react"; 
import { Badge } from "@/components/ui/badge";

// 💡 IMPORTAÇÕES DINÂMICAS
import { profileService, ProfileType, ProfileWithAchievements } from "@/services/profileService";
import { achievementService, AchievementType } from "@/services/achievementService"; 

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

// DiceBear Avatar Styles
const avatarStyles = [
  "adventurer", "adventurer-neutral", "avataaars", "avataaars-neutral", "big-ears", "big-ears-neutral", "big-smile", "bottts", "bottts-neutral", "croodles", "croodles-neutral", "fun-emoji", "icons", "identicon", "lorelei", "lorelei-neutral", "micah", "miniavs", "notionists", "notionists-neutral", "open-peeps", "personas", "pixel-art", "pixel-art-neutral",
];

// ----------------------------------------------------
// NOVAS TIPAGENS DE DADOS DO BANCO (Substituem os mocks)
// ----------------------------------------------------

interface AggregatedStats {
    totalWins: number;
    winRate: number;
    totalPrize: number;
    bestGame: string;
}

interface RealMatch {
    game: string;
    opponent: string; // display_name do oponente
    result: 'win' | 'loss' | 'draw';
    date: string;
}

interface GamePerformance {
    game: string;
    wins: number;
    losses: number;
    winRate: number;
    balance: number;
}

interface CombinedAchievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    unlocked: boolean;
    date: string | null;
}

interface UserAchievementData {
    unlocked_at: string | null;
    achievement: { id: string; name: string; description: string; icon: string; }; 
}

// ----------------------------------------------------
// 💡 FUNÇÕES DE FETCH SIMULADAS (SUBSTITUA PELO SEU profileService REAL)
// ----------------------------------------------------

// Substitua esta função pela chamada real que calcula os KPIs no backend
const fetchAggregatedStats = async (userId: string): Promise<AggregatedStats> => {
    // 💡 LÓGICA REAL: Chamar o profileService.getAggregatedStats(userId)
    await new Promise(resolve => setTimeout(resolve, 800)); // Simula latência
    return {
        totalWins: 235, 
        winRate: 72, 
        totalPrize: 3120, 
        bestGame: "Valorant",
    };
};

// Substitua esta função pela chamada real que busca as últimas partidas
const fetchRecentMatches = async (userId: string): Promise<RealMatch[]> => {
    // 💡 LÓGICA REAL: Chamar o profileService.getRecentMatches(userId)
    await new Promise(resolve => setTimeout(resolve, 600)); // Simula latência
    return [
        { game: "Valorant", opponent: "PhantomKiller", result: "win", date: "Há 4 horas" }, 
        { game: "EA FC 25", opponent: "CR7Fanatic", result: "loss", date: "Hoje" },
        { game: "CS2", opponent: "HeadshotPro", result: "win", date: "Ontem" },
        { game: "Valorant", opponent: "SwiftBlade", result: "win", date: "2 dias atrás" },
    ];
};

// Substitua esta função pela chamada real que busca o desempenho por jogo
const fetchGamePerformance = async (userId: string): Promise<GamePerformance[]> => {
    // 💡 LÓGICA REAL: Chamar o profileService.getGamePerformance(userId)
    await new Promise(resolve => setTimeout(resolve, 700)); // Simula latência
    return [
        { game: "Valorant", wins: 75, losses: 25, winRate: 75, balance: 1100 },
        { game: "CS2", wins: 60, losses: 30, winRate: 67, balance: 950 },
        { game: "League of Legends", wins: 55, losses: 35, winRate: 61, balance: 650 },
        { game: "EA FC 25", wins: 45, losses: 20, winRate: 69, balance: 420 },
    ];
};


// ----------------------------------------------------
// 1. INTERFACE DE PROPS
// ----------------------------------------------------
interface ProfileTabProps {
  profile: ProfileWithAchievements; 
  setProfile: React.Dispatch<React.SetStateAction<ProfileWithAchievements | null>>;
}

// ----------------------------------------------------
// 2. DECLARAÇÃO DO COMPONENTE
// ----------------------------------------------------
export const ProfileTab: React.FC<ProfileTabProps> = ({ profile, setProfile }) => {
  const [editedProfile, setEditedProfile] = useState<ProfileType>(profile);
  const [saving, setSaving] = useState(false);
  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [selectedAvatarStyle, setSelectedAvatarStyle] = useState("avataaars");
  const [avatarSeed, setAvatarSeed] = useState(profile.display_name || profile.full_name || "");
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  // ESTADOS PARA DADOS REAIS DO BANCO
  const [stats, setStats] = useState<AggregatedStats | null>(null);
  const [recentMatches, setRecentMatches] = useState<RealMatch[]>([]);
  const [gameStats, setGameStats] = useState<GamePerformance[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // ESTADOS PARA CONQUISTAS DINÂMICAS
  const [allAchievements, setAllAchievements] = useState<AchievementType[]>([]);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(true);

  useEffect(() => {
    setEditedProfile(profile);
    setAvatarSeed(profile.display_name || profile.full_name || "");
  }, [profile]);

    // EFEITO PARA BUSCAR TODAS AS ESTATÍSTICAS E PARTIDAS
    useEffect(() => {
        const fetchData = async () => {
            setIsLoadingStats(true);
            
            try {
                const [fetchedStats, fetchedMatches, fetchedGameStats] = await Promise.all([
                    fetchAggregatedStats(profile.id), // Chame a função que consulta o banco
                    fetchRecentMatches(profile.id), // Chame a função que consulta o banco
                    fetchGamePerformance(profile.id) // Chame a função que consulta o banco
                ]);

                setStats(fetchedStats);
                setRecentMatches(fetchedMatches);
                setGameStats(fetchedGameStats);
            } catch (error) {
                console.error("Erro ao buscar dados do perfil:", error);
                setStats(null);
                setRecentMatches([]);
                setGameStats([]);
            } finally {
                setIsLoadingStats(false);
            }
        };

        if (profile.id) {
            fetchData();
        }
    }, [profile.id]); 

    // EFEITO PARA BUSCAR TODAS AS CONQUISTAS DO BANCO (MANTIDO)
    useEffect(() => {
        const fetchAllAchievements = async () => {
            try {
                const data = await achievementService.fetchAll();
                setAllAchievements(data);
            } catch (error) {
                console.error("Erro ao buscar todas as conquistas:", error);
                setAllAchievements([]); 
            } finally {
                setIsLoadingAchievements(false);
            }
        };

        fetchAllAchievements();
    }, []);

    // LÓGICA DE COMBINAÇÃO DE CONQUISTAS (MANTIDO)
    const combinedAchievements: CombinedAchievement[] = useMemo(() => {
        if (!profile || !allAchievements.length) return [];

        const unlockedMap = new Map<string, UserAchievementData>();
        // Correção de tipagem, garantindo que o tipo 'ua' é tratado corretamente.
        (profile.user_achievements || []).forEach((ua: any) => { 
            unlockedMap.set(ua.achievement.id, ua);
        });

        return allAchievements.map(achievement => {
            const unlockedData = unlockedMap.get(achievement.id);
            const isUnlocked = !!unlockedData;

            return {
                id: achievement.id,
                name: achievement.name,
                description: achievement.description,
                icon: achievement.icon,
                unlocked: isUnlocked,
                date: isUnlocked && unlockedData?.unlocked_at 
                    ? new Date(unlockedData.unlocked_at).toLocaleDateString('pt-BR') 
                    : null,
            };
        });
    }, [profile, allAchievements]);

  // ----------------------------------------------------
  // FUNÇÕES DE HANDLE (MANTIDAS INTACTAS)
  // ----------------------------------------------------
  const handleSave = async () => {
    setSaving(true);
    try {
      const dataToUpdate: Partial<ProfileType> = {
        display_name: editedProfile.display_name,
        avatar_url: editedProfile.avatar_url,
      };

      const updated = await profileService.updateProfile(dataToUpdate);
      setProfile(updated); 

      toast({
        title: "Perfil atualizado!",
        description: "Suas alterações foram salvas com sucesso.",
      });

    } catch (err: any) {
      console.error("Erro ao salvar perfil:", err);
      toast({
        title: "Erro ao salvar",
        description: err.message || "Ocorreu um erro desconhecido.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => { setEditedProfile(prev => ({ ...prev, display_name: e.target.value })); };
  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => { setEditedProfile(prev => ({ ...prev, full_name: e.target.value })); }; 
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => { setEditedProfile(prev => ({ ...prev, email: e.target.value })); };
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => { setEditedProfile(prev => ({ ...prev, cpf: e.target.value })); };
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => { setEditedProfile(prev => ({ ...prev, phone: e.target.value })); };
  const formatDate = (dateString: string) => { const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' }; return new Date(dateString).toLocaleDateString('pt-BR', options); };
  const generateAvatarUrl = (style: string, seed: string) => { return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`; };
  const handleAvatarSelect = (style: string) => { setSelectedAvatarStyle(style); };
  const handleAvatarSave = () => {
    const newAvatarUrl = generateAvatarUrl(selectedAvatarStyle, avatarSeed);
    setEditedProfile(prev => ({ ...prev, avatar_url: newAvatarUrl }));
    setAvatarDialogOpen(false);
    toast({ title: "Avatar selecionado!", description: "Não esqueça de clicar em 'Salvar Alterações' para confirmar.", });
  };
  const randomizeAvatar = () => { setAvatarSeed(Math.random().toString(36).substring(7)); };
  
  // Componente de Loading para as Estatísticas
  const StatsLoadingPlaceholder: React.FC = () => (
    <div className="flex justify-center items-center h-48 bg-background/50 rounded-lg">
      <Loader2 className="animate-spin h-8 w-8 text-primary" />
    </div>
  );
  
  // ----------------------------------------------------
  // 3. JSX (O corpo do componente COMPLETO) - COM DADOS DINÂMICOS
  // ----------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Cabeçalho do Perfil */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <Dialog open={avatarDialogOpen} onOpenChange={setAvatarDialogOpen}>
              {/* O DialogTrigger DEVE envolver um ÚNICO elemento, que já é o seu <Button> */}
              <DialogTrigger asChild>
                <Button variant="ghost" className="relative group p-0 h-auto w-32 rounded-full hover:bg-transparent">
                  <Avatar className="w-32 h-32">
                    <AvatarImage src={editedProfile.avatar_url || ''} />
                    <AvatarFallback className="text-4xl">
                      {editedProfile.display_name 
                        ? editedProfile.display_name.substring(0, 2).toUpperCase() 
                        : (profile.full_name || "").substring(0, 2).toUpperCase()} {/* Tratamento de string vazia */}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </Button>
              </DialogTrigger>
              
              {/* O DialogContent também deve ter um ÚNICO filho se não usar asChild */}
              <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <div className="dialog-content-wrapper"> {/* Envolvido em um DIV de segurança */}
                  <DialogHeader>
                    <DialogTitle>Escolher Avatar</DialogTitle>
                    <DialogDescription>
                      Selecione um estilo de avatar e personalize-o.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <Label htmlFor="avatar-seed">Personalizar Avatar</Label>
                        <Input
                          id="avatar-seed"
                          value={avatarSeed}
                          onChange={(e) => setAvatarSeed(e.target.value)}
                          placeholder="Digite um texto para personalizar"
                        />
                      </div>
                      <Button onClick={randomizeAvatar} variant="outline" className="mt-6">
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Aleatório
                      </Button>
                    </div>

                    <div className="flex justify-center p-4 bg-muted rounded-lg">
                      <Avatar className="w-32 h-32">
                        <AvatarImage src={generateAvatarUrl(selectedAvatarStyle, avatarSeed)} />
                        <AvatarFallback>Preview</AvatarFallback>
                      </Avatar>
                    </div>

                    <div>
                      <Label>Estilos de Avatar</Label>
                      <div className="grid grid-cols-4 md:grid-cols-6 gap-4 mt-2">
                        {avatarStyles.map((style) => (
                          <div
                            key={style}
                            className={`cursor-pointer border-2 rounded-lg p-2 hover:border-primary transition-colors ${
                              selectedAvatarStyle === style ? 'border-primary' : 'border-border'
                            }`}
                            onClick={() => handleAvatarSelect(style)}
                          >
                            <Avatar className="w-full aspect-square">
                              <AvatarImage src={generateAvatarUrl(style, avatarSeed)} />
                              <AvatarFallback>{style.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <p className="text-xs text-center mt-1 truncate">{style}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button onClick={handleAvatarSave} className="w-full">
                      Selecionar Avatar
                    </Button>
                </div>
                </div>
              </DialogContent>
            </Dialog>

            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-3xl font-bold">{profile.display_name || profile.full_name}</h2>
                <p className="text-muted-foreground">@{profile.full_name.toLowerCase().replace(/\s/g, ".")}</p>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Membro desde {formatDate(profile.created_at)}</span>
              </div>

              <Button className="mt-4" onClick={() => setActiveTab("edit")}>
                <Edit2 className="w-4 h-4 mr-2" />
                Editar Perfil
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sistema de Abas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="achievements">Conquistas</TabsTrigger>
          <TabsTrigger value="statistics">Estatísticas</TabsTrigger>
          <TabsTrigger value="edit">Editar Perfil</TabsTrigger>
        </TabsList>

        {/* Aba 1: Visão Geral - ÚNICO DIV FILHO - OK */}
        <TabsContent value="overview" className="space-y-6">
          <div className="space-y-6"> 
            {/* KPIs */}
            <div>
              <h3 className="text-xl font-bold mb-4">Indicadores Principais</h3>
                {/* REVISÃO DA LÓGICA CONDICIONAL AQUI PARA GARANTIR RETORNO ÚNICO */}
                {isLoadingStats || !stats ? (
                  <StatsLoadingPlaceholder />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="glass-card">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Trophy className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{stats.totalWins}</p>
                            <p className="text-sm text-muted-foreground">Vitórias Totais</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="glass-card">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                            <PieChart className="w-6 h-6 text-success" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">{stats.winRate}%</p>
                            <p className="text-sm text-muted-foreground">Taxa de Vitória</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="glass-card">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                            <DollarSign className="w-6 h-6 text-warning" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold">R$ {stats.totalPrize.toFixed(2)}</p>
                            <p className="text-sm text-muted-foreground">Total em Prêmios</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="glass-card">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                            <Gamepad2 className="w-6 h-6 text-secondary" />
                          </div>
                          <div>
                            <p className="text-xl font-bold">{stats.bestGame}</p>
                            <p className="text-sm text-muted-foreground">Melhor Jogo</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
            </div> 

            {/* Conquistas em Destaque */}
            <div>
              <h3 className="text-xl font-bold mb-4">Últimas Conquistas</h3>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {combinedAchievements.filter(a => a.unlocked).slice(0, 4).map((achievement) => (
                  <Card key={achievement.id} className="glass-card min-w-[150px] cursor-pointer hover:scale-105 transition-transform">
                    <CardContent className="pt-6 text-center">
                      <div className="text-5xl mb-2">{achievement.icon}</div>
                      <p className="font-bold">{achievement.name}</p>
                      <p className="text-xs text-muted-foreground">{achievement.date}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div> 

            {/* Atividade Recente */}
            <div>
              <h3 className="text-xl font-bold mb-4">Histórico Recente</h3>
                {isLoadingStats ? <StatsLoadingPlaceholder /> : (
                <Card className="glass-card">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {recentMatches.map((match, index) => (
                        <div key={index} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                          <div className="flex items-center gap-3">
                            <Gamepad2 className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{match.game}</p>
                              <p className="text-sm text-muted-foreground">vs {match.opponent}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={match.result === 'win' ? 'bg-success/20 text-success hover:bg-success/30' : 'bg-destructive/20 text-destructive hover:bg-destructive/30'}>
                              {match.result === 'win' ? 'Vitória' : match.result === 'loss' ? 'Derrota' : 'Empate'}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{match.date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                )}
            </div> 
          </div>
        </TabsContent>

        {/* Aba 2: Conquistas - ÚNICO DIV FILHO - OK */}
        <TabsContent value="achievements" className="space-y-6">
          <div className="space-y-6"> 
            <div>
              <h3 className="text-xl font-bold mb-4">Sala de Troféus</h3>
                {/* EXIBIÇÃO DE LOADING */}
                {isLoadingAchievements ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="animate-spin h-6 w-6 text-blue-500" />
                        <p className="ml-2 text-gray-600">Carregando Sala de Troféus...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {/* MAPEIA O DADO COMBINADO */}
                        {combinedAchievements.length === 0 ? (
                            <p className="col-span-4 text-center text-gray-500 mt-4">
                                {allAchievements.length === 0 ? "Nenhuma conquista cadastrada no sistema." : "Conquistas do usuário não encontradas."}
                            </p>
                        ) : (
                            combinedAchievements.map((achievement) => (
                                <Card 
                                    key={achievement.id} 
                                    className={`glass-card text-center ${!achievement.unlocked ? 'opacity-50' : ''}`}
                                >
                                    <CardContent className="pt-6">
                                        <div className={`text-6xl mb-3 ${!achievement.unlocked ? 'grayscale' : ''}`}>
                                            {achievement.unlocked ? achievement.icon : <Lock className="w-16 h-16 mx-auto text-muted-foreground" />}
                                        </div>
                                        <p className="font-bold mb-1">{achievement.name}</p>
                                        {achievement.unlocked ? (
                                            <p className="text-sm text-muted-foreground">{achievement.date}</p>
                                        ) : (
                                            <p className="text-xs text-muted-foreground mt-2">{achievement.description}</p>
                                        )}
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                )}
            </div>
          </div>
        </TabsContent>

        {/* Aba 3: Estatísticas - ÚNICO DIV FILHO - OK */}
        <TabsContent value="statistics" className="space-y-6">
          <div className="space-y-6"> 
            <div>
              <h3 className="text-xl font-bold mb-4">Desempenho por Jogo</h3>
                {isLoadingStats ? <StatsLoadingPlaceholder /> : (
                <div className="space-y-4">
                  {gameStats.map((stat, index) => (
                    <Card key={index} className="glass-card">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Gamepad2 className="w-5 h-5 text-muted-foreground" />
                            <p className="font-medium">{stat.game}</p>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <Badge variant="secondary">
                              {stat.winRate}% Win Rate
                            </Badge>
                            <span className={`font-bold ${stat.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                              {stat.balance > 0 ? '+' : ''}{stat.balance.toFixed(2)} R$
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                          <div>
                            <p className="text-xl font-bold text-success">{stat.wins}</p>
                            <p className="text-xs text-muted-foreground">Vitórias</p>
                          </div>
                          <div>
                            <p className="text-xl font-bold text-destructive">{stat.losses}</p>
                            <p className="text-xs text-muted-foreground">Derrotas</p>
                          </div>
                          <div>
                            <p className="text-xl font-bold">{stat.wins + stat.losses}</p>
                            <p className="text-xs text-muted-foreground">Total</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                )}
            </div>
          </div>
        </TabsContent>

        {/* Aba 4: Editar Perfil - ÚNICO DIV FILHO - OK */}
        <TabsContent value="edit" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Configurações de Perfil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display_name">Nome de Exibição</Label>
                <Input
                  id="display_name"
                  value={editedProfile.display_name || ''}
                  onChange={handleDisplayNameChange}
                  placeholder="Seu nome de exibição"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo</Label>
                <Input
                  id="full_name"
                  value={editedProfile.full_name || ''}
                  onChange={handleFullNameChange}
                  placeholder="Seu nome completo"
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editedProfile.email || ''}
                  onChange={handleEmailChange}
                  placeholder="Seu email"
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={editedProfile.cpf || ''}
                  onChange={handleCpfChange}
                  placeholder="Seu CPF"
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={editedProfile.phone || ''}
                  onChange={handlePhoneChange}
                  placeholder="Seu telefone"
                  disabled
                />
              </div>

              <Button onClick={handleSave} className="w-full" disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};