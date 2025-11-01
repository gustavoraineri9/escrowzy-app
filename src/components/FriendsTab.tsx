import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Search, UserPlus, MessageCircle, Flame } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { 
  buscarAmigos, 
  buscarUsuarios, 
  enviarSolicitacaoAmizade, 
  buscarEstatisticasConfrontoDireto, 
  Amigo, 
  EstatisticasConfrontoDireto 
} from "@/services/friendService";

interface AmigoExibicao extends Amigo {
  estatisticas: EstatisticasConfrontoDireto | null;
  online: boolean; // Mock de status online (ainda precisa de real-time)
}

export const FriendsTab = () => {
  const { user } = useAuth();
  const [termoBusca, setTermoBusca] = useState("");
  const [amigos, setAmigos] = useState<AmigoExibicao[]>([]);
  const [resultadosBusca, setResultadosBusca] = useState<any[]>([]);
  const [carregandoAmigos, setCarregandoAmigos] = useState(true);
  const [carregandoBusca, setCarregandoBusca] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const buscarDadosAmigos = async () => {
      if (!user) return;
      setCarregandoAmigos(true);
      try {
        const amigosBuscados = await buscarAmigos(user.id);
        const idsAmigos = amigosBuscados.map(a => a.id_amigo);
        
        // Busca as estatísticas de confrontos para todos os amigos em paralelo
        const promessasEstatisticas = idsAmigos.map(idAmigo => buscarEstatisticasConfrontoDireto(user.id, idAmigo));
        const todasEstatisticas = await Promise.all(promessasEstatisticas);

        const mapaEstatisticas = new Map<string, EstatisticasConfrontoDireto | null>();
        todasEstatisticas.forEach((estatisticas, indice) => {
          mapaEstatisticas.set(idsAmigos[indice], estatisticas);
        });

        const amigosComEstatisticas: AmigoExibicao[] = amigosBuscados.map(a => ({
          ...a,
          estatisticas: mapaEstatisticas.get(a.id_amigo) || null,
          online: Math.random() > 0.5, // Mock de status online
        }));
        
        setAmigos(amigosComEstatisticas);
      } catch (err) {
        console.error("Erro ao buscar amigos:", err);
        setErro("Erro ao carregar amigos.");
      } finally {
        setCarregandoAmigos(false);
      }
    };

    buscarDadosAmigos();
  }, [user]);

  const lidarComBusca = async () => {
    if (!termoBusca || !user) {
      setResultadosBusca([]);
      return;
    }
    setCarregandoBusca(true);
    try {
      const resultados = await buscarUsuarios(termoBusca, user.id);
      setResultadosBusca(resultados);
    } catch (err) {
      console.error("Erro ao buscar usuários:", err);
      setErro("Erro ao buscar usuários.");
    } finally {
      setCarregandoBusca(false);
    }
  };

  const lidarComEnvioSolicitacao = async (idDestinatario: string) => {
    if (!user) return;
    try {
      await enviarSolicitacaoAmizade(user.id, idDestinatario);
      alert("Solicitação de amizade enviada!");
      setResultadosBusca([]); // Limpa resultados após envio
      setTermoBusca("");
    } catch (err) {
      console.error("Erro ao enviar solicitação:", err);
      alert("Erro ao enviar solicitação de amizade.");
    }
  };

  const obterCorSaldo = (saldo: number) => {
    if (saldo > 0) return "text-success";
    if (saldo < 0) return "text-destructive";
    return "text-muted-foreground";
  };

  const formatarSaldo = (saldo: number) => {
    if (saldo > 0) return `+ R$ ${saldo.toFixed(2)}`;
    if (saldo < 0) return `- R$ ${Math.abs(saldo).toFixed(2)}`;
    return `R$ ${saldo.toFixed(2)}`;
  };

  if (carregandoAmigos) {
    return <div className="text-center py-8">Carregando amigos...</div>;
  }

  if (erro) {
    return <div className="text-center py-8 text-destructive">{erro}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Amigos</h2>
        <p className="text-muted-foreground">Gerencie suas conexões e histórico de partidas</p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por nome de usuário..."
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button className="gradient-primary" onClick={lidarComBusca}>
          <UserPlus className="w-4 h-4 mr-2" />
          Adicionar
        </Button>
      </div>

      {resultadosBusca.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold">Resultados da Busca</h3>
          {carregandoBusca ? (
            <div className="text-center">Buscando...</div>
          ) : (
            <div className="grid gap-2">
              {resultadosBusca.map((resultado) => (
                <Card key={resultado.id} className="glass-card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={resultado.avatar_url} />
                      <AvatarFallback>{resultado.display_name?.substring(0, 2).toUpperCase() || resultado.full_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{resultado.display_name || resultado.full_name}</span>
                  </div>
                  <Button size="sm" onClick={() => lidarComEnvioSolicitacao(resultado.id)}>
                    Adicionar Amigo
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {amigos.length === 0 && !carregandoAmigos ? (
          <Card className="glass-card p-8 text-center col-span-full">
            <p className="text-muted-foreground">Você ainda não tem amigos. Adicione alguém!</p>
          </Card>
        ) : (
          amigos.map((amigo) => {
            const estatisticas = amigo.estatisticas;
            
            // Dados reais ou 0 se não houver estatísticas
            const suasVitorias = estatisticas?.vitorias_a || 0;
            const vitoriasDele = estatisticas?.vitorias_b || 0;
            const saldo = estatisticas?.saldo_a || 0;
            const sequenciaVitorias = estatisticas?.sequencia_vitorias_a || 0;
            
            const totalJogos = suasVitorias + vitoriasDele;
            const porcentagemVitoria = totalJogos > 0 ? (suasVitorias / totalJogos) * 100 : 50;
            
            return (
              <Card 
                key={amigo.id} 
                className="glass-card hover:shadow-xl transition-all cursor-pointer animate-fade-in hover-scale"
                onClick={() => navigate(`/friend/${amigo.id_amigo}`)}
              >
                <CardContent className="pt-6 pb-6 space-y-4">
                  {/* Seção Superior: Placar do Confronto */}
                  <div className="flex items-center justify-between gap-3">
                    {/* Avatar do Usuário */}
                    <Avatar className="w-14 h-14 border-2 border-primary/20">
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {user?.user_metadata?.display_name?.substring(0, 2).toUpperCase() || user?.user_metadata?.full_name?.substring(0, 2).toUpperCase() || "VC"}
                      </AvatarFallback>
                    </Avatar>

                    {/* Círculos de Vitórias e Derrotas */}
                    <div className="flex items-center gap-2">
                      {totalJogos > 0 ? (
                        <>
                          <div className="relative">
                            <div className="w-14 h-14 rounded-full bg-success flex items-center justify-center shadow-lg">
                              <span className="text-white text-xl font-bold">{suasVitorias}</span>
                            </div>
                            {sequenciaVitorias >= 2 && (
                              <div className="absolute -top-1 -right-1 bg-warning rounded-full px-1.5 py-0.5 flex items-center gap-0.5 shadow-md">
                                <Flame className="w-3 h-3 text-warning-foreground" />
                                <span className="text-xs font-bold text-warning-foreground">{sequenciaVitorias}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="w-14 h-14 rounded-full bg-destructive flex items-center justify-center shadow-lg">
                            <span className="text-white text-xl font-bold">{vitoriasDele}</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-muted-foreground text-sm">Sem confrontos</div>
                      )}
                    </div>

                    {/* Avatar do Amigo */}
                    <div className="relative">
                      <Avatar className="w-14 h-14 border-2 border-border">
                        <AvatarImage src={amigo.perfis?.url_avatar} />
                        <AvatarFallback className="bg-muted font-bold">
                          {amigo.perfis?.nome_exibicao?.substring(0, 2).toUpperCase() || amigo.perfis?.nome_completo?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {amigo.online && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-success rounded-full border-2 border-background" />
                      )}
                    </div>
                  </div>

                  {/* Seção Central: Identificação e Status */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="font-bold text-lg">{amigo.perfis?.nome_exibicao || amigo.perfis?.nome_completo}</h3>
                      {amigo.online && (
                        <Badge className="bg-success/10 text-success border-success/20 text-xs" variant="outline">
                          Online
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Seção Intermediária: Medidor de Domínio */}
                  {totalJogos > 0 && (
                    <div className="space-y-2">
                      <div className="relative h-3 w-full overflow-hidden rounded-full bg-destructive/20">
                        <div 
                          className="h-full bg-success transition-all duration-500 ease-out"
                          style={{ width: `${porcentagemVitoria}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{porcentagemVitoria.toFixed(0)}% Você</span>
                        <span>{(100 - porcentagemVitoria).toFixed(0)}% Ele</span>
                      </div>
                    </div>
                  )}
                  

                  {/* Seção Inferior: Financeiro */}
                  <div className="flex justify-center">
                    <div className={`px-4 py-2 rounded-full ${
                      saldo > 0 
                        ? 'bg-success/20 border border-success/30' 
                        : saldo < 0 
                        ? 'bg-destructive/20 border border-destructive/30'
                        : 'bg-muted border border-border'
                    }`}>
                      <span className={`font-bold text-sm ${obterCorSaldo(saldo)}`}>
                        Saldo: {formatarSaldo(saldo)}
                      </span>
                    </div>
                  </div>

                  {/* Seção de Ações: Botões */}
                  <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="flex-1"
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Chat
                    </Button>
                    <Button 
                      size="sm"
                      className="flex-1 gradient-primary transition-all duration-300 hover:scale-105 hover:shadow-lg"
                    >
                      Desafiar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
