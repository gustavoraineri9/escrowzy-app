import { useState } from "react";
import { createTournament } from "@/services/tournamentService";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Navbar } from "@/components/Navbar";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const CreateTournament = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    game: "",
    gameMode: "",
    tournamentType: "",
    rounds: "1",
    visibility: "private",
    crossPlay: false,
    maxPlayers: "4",
    entryFee: "",
    adjudicationMethod: "mutual_decision",
    description: "",
    startDate: new Date().toISOString().split('T')[0], // Pre-fill with today
    startTime: "", // Empty by default
    toleranceMinutes: "15", // Default 15 minutes
    disconnectAction: "end", // Default: encerrar jogo
    disconnectMaxRestarts: "1", // Default: 1 reinício
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar que ai_analysis não pode ser selecionado
    if (formData.adjudicationMethod === "ai_analysis") {
      toast({
        title: "Recurso indisponível",
        description: "Análise por IA ainda não está disponível.",
        variant: "destructive",
      });
      return;
    }
    
    // Combinar data e hora em startsAt
    let startsAt = formData.startDate;
    if (formData.startTime) {
      startsAt = `${formData.startDate}T${formData.startTime}`;
    } else {
      startsAt = `${formData.startDate}T00:00:00`;
    }
    
    // Validar que não seja mais de 24h no passado
    const startDateTime = new Date(startsAt);
    const now = new Date();
    const diffHours = (now.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
    
    if (diffHours > 24) {
      const confirmPast = window.confirm(
        "A data de início é mais de 24 horas no passado. Deseja continuar?"
      );
      if (!confirmPast) return;
    }
    
    toast({
      title: "Campeonato criado!",
      description: "Convite gerado. Compartilhe com os participantes.",
    });
    
    try {
      const tournamentData = {
        name: formData.name,
        game: formData.game,
        gameMode: formData.gameMode,
        tournamentType: formData.tournamentType,
        rounds: formData.rounds,
        visibility: formData.visibility,
        crossPlay: formData.crossPlay,
        maxPlayers: formData.maxPlayers,
        entryFee: formData.entryFee,
        adjudicationMethod: formData.adjudicationMethod,
        description: formData.description,
        startsAt,
        toleranceMinutes: formData.toleranceMinutes,
        disconnectAction: formData.disconnectAction,
        disconnectMaxRestarts: formData.disconnectAction === "restart_then_end" ? formData.disconnectMaxRestarts : null,
      };
      
      await createTournament(tournamentData);
      toast({
        title: "Campeonato criado com sucesso!",
        description: "Convite gerado. Compartilhe com os participantes.",
      });
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    } catch (error: any) {
      console.error("Erro ao criar torneio:", error);
      toast({
        title: "Erro ao criar campeonato",
        description: error.message || "Ocorreu um erro ao tentar criar o campeonato. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6 animate-fade-in"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <div className="max-w-2xl mx-auto animate-slide-up">
          <h1 className="text-4xl font-bold mb-2">Criar Campeonato</h1>
          <p className="text-muted-foreground mb-8">
            Configure seu torneio e convide os participantes
          </p>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Informações do Campeonato</CardTitle>
              <CardDescription>
                Preencha os detalhes para criar seu torneio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Campeonato</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Campeonato EA FC 25"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    placeholder="Breve descrição do campeonato"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Data de Início</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startTime">Hora de Início</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      placeholder="Opcional"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="game">Jogo</Label>
                  <Select
                    value={formData.game}
                    onValueChange={(value) => setFormData({ ...formData, game: value, gameMode: "" })}
                  >
                    <SelectTrigger id="game">
                      <SelectValue placeholder="Selecione o jogo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ea-fc">EA FC</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.game === "ea-fc" && (
                  <div className="space-y-2">
                    <Label htmlFor="gameMode">Modo</Label>
                    <Select
                      value={formData.gameMode}
                      onValueChange={(value) => setFormData({ ...formData, gameMode: value })}
                    >
                      <SelectTrigger id="gameMode">
                        <SelectValue placeholder="Selecione o modo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ultimate-team">Ultimate Team</SelectItem>
                        <SelectItem value="pro-clubs">Pro Clubs</SelectItem>
                        <SelectItem value="torneio-equipes">Torneio entre Equipes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="tournamentType">Tipo de Campeonato</Label>
                  <Select
                    value={formData.tournamentType}
                    onValueChange={(value) => setFormData({ ...formData, tournamentType: value })}
                  >
                    <SelectTrigger id="tournamentType">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="knockout">Mata-mata</SelectItem>
                      <SelectItem value="league">Pontos corridos</SelectItem>
                      <SelectItem value="groups-knockout">Grupos + Mata-mata</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="rounds">Número de Voltas</Label>
                    <Select
                      value={formData.rounds}
                      onValueChange={(value) => setFormData({ ...formData, rounds: value })}
                    >
                      <SelectTrigger id="rounds">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 volta</SelectItem>
                        <SelectItem value="2">2 voltas (Ida e volta)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="visibility">Visibilidade</Label>
                    <Select
                      value={formData.visibility}
                      onValueChange={(value) => setFormData({ ...formData, visibility: value })}
                    >
                      <SelectTrigger id="visibility">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Público</SelectItem>
                        <SelectItem value="private">Privado (link por convite)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="crossPlay"
                    checked={formData.crossPlay}
                    onCheckedChange={(checked) => setFormData({ ...formData, crossPlay: checked })}
                  />
                  <Label htmlFor="crossPlay" className="cursor-pointer">
                    Cross-play habilitado
                  </Label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="maxPlayers">Número de Jogadores</Label>
                      
                    </div>
                    <Select
                      value={formData.maxPlayers}
                      onValueChange={(value) => setFormData({ ...formData, maxPlayers: value })}
                    >
                      <SelectTrigger id="maxPlayers">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2 jogadores</SelectItem>
                        <SelectItem value="3">3 jogadores</SelectItem>
                        <SelectItem value="4">4 jogadores</SelectItem>
                        <SelectItem value="5">5 jogadores</SelectItem>
                        <SelectItem value="6">6 jogadores</SelectItem>
                        <SelectItem value="7">7 jogadores</SelectItem>
                        <SelectItem value="8">8 jogadores</SelectItem>
                        <SelectItem value="9">9 jogadores</SelectItem>
                        <SelectItem value="10">10 jogadores</SelectItem>
                        <SelectItem value="11">11 jogadores</SelectItem>
                        <SelectItem value="12">12 jogadores</SelectItem>
                        <SelectItem value="13">13 jogadores</SelectItem>
                        <SelectItem value="14">14 jogadores</SelectItem>
                        <SelectItem value="15">15 jogadores</SelectItem>
                        <SelectItem value="16">16 jogadores</SelectItem>
                        <SelectItem value="17">17 jogadores</SelectItem>
                        <SelectItem value="18">18 jogadores</SelectItem>
                        <SelectItem value="19">19 jogadores</SelectItem>
                        <SelectItem value="20">20 jogadores</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="entryFee">Valor por Jogador (R$)</Label>
                    <Input
                      id="entryFee"
                      type="number"
                      placeholder="50.00"
                      value={formData.entryFee}
                      onChange={(e) => setFormData({ ...formData, entryFee: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="toleranceMinutes">Tempo de tolerância</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Este tempo define quantos minutos os jogadores têm de tolerância após o horário marcado. Se um ou ambos não aparecerem dentro desse período, poderá ser registrado W.O. conforme as regras do torneio.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select
                    value={formData.toleranceMinutes}
                    onValueChange={(value) => setFormData({ ...formData, toleranceMinutes: value })}
                  >
                    <SelectTrigger id="toleranceMinutes">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sem tolerância</SelectItem>
                      <SelectItem value="5">5 minutos</SelectItem>
                      <SelectItem value="10">10 minutos</SelectItem>
                      <SelectItem value="15">15 minutos</SelectItem>
                      <SelectItem value="20">20 minutos</SelectItem>
                      <SelectItem value="30">30 minutos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adjudicationMethod">Método de Decisão</Label>
                  <Select
                    value={formData.adjudicationMethod}
                    onValueChange={(value) => setFormData({ ...formData, adjudicationMethod: value })}
                  >
                    <SelectTrigger id="adjudicationMethod">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mutual_decision">
                        Decisão Mútua
                      </SelectItem>
                      <SelectItem value="ai_analysis" disabled className="opacity-50 cursor-not-allowed">
                        <div className="flex flex-col">
                          <span>Análise por IA</span>
                          <span className="text-xs text-muted-foreground">Recurso indisponível no momento</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {formData.adjudicationMethod === "mutual_decision"
                      ? "Ambos os jogadores devem inserir resultados idênticos para confirmar o vencedor. Em caso de divergência, anexar evidências para que o suporte determine o vencedor."
                      : "Futuro: Análise por IA — recurso indisponível no momento."}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="disconnectAction">Política de Disconnect</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>Escolha o que deve acontecer se um jogador desconectar: encerrar ou reiniciar até X vezes, depois encerrar (Máximo de 3 reinícios).</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select
                    value={formData.disconnectAction}
                    onValueChange={(value) => setFormData({ ...formData, disconnectAction: value })}
                  >
                    <SelectTrigger id="disconnectAction">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="end">Encerrar jogo</SelectItem>
                      <SelectItem value="restart_then_end">Reiniciar e depois encerrar</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.disconnectAction === "restart_then_end" && (
                    <div className="space-y-2 mt-4">
                      <Label htmlFor="disconnectMaxRestarts">Número máximo de reinícios</Label>
                      <Select
                        value={formData.disconnectMaxRestarts}
                        onValueChange={(value) => setFormData({ ...formData, disconnectMaxRestarts: value })}
                      >
                        <SelectTrigger id="disconnectMaxRestarts">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 reinício</SelectItem>
                          <SelectItem value="2">2 reinícios</SelectItem>
                          <SelectItem value="3">3 reinícios</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {formData.disconnectAction === "end" && "Em caso de disconnect, a partida será finalizada imediatamente."}
                    {formData.disconnectAction === "restart_then_end" && `A partida pode ser reiniciada até ${formData.disconnectMaxRestarts} ${formData.disconnectMaxRestarts === "1" ? "vez" : "vezes"}, depois será encerrada.`}
                  </p>
                </div>

                <div className="pt-4 space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50 border border-border">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-muted-foreground">Premiação Total</span>
                      <span className="text-2xl font-bold text-primary">
                        R$ {(Number(formData.entryFee) * Number(formData.maxPlayers) * 0.95).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Taxa da plataforma: 5% (R$ {(Number(formData.entryFee) * Number(formData.maxPlayers) * 0.05).toFixed(2)})
                    </p>
                  </div>

                  <Button type="submit" size="lg" className="w-full gradient-primary">
                    Criar e Gerar Convite
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CreateTournament;