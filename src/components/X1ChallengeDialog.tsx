// src/components/X1ChallengeDialog.tsx
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { x1ChallengeService } from "../services/x1ChallengeService";
// Note: CreateX1ChallengeData e Amigo precisam ser exportados de seus respectivos arquivos
import { CreateX1ChallengeData } from "../types/x1ChallengeTypes"; 
import { buscarAmigos, buscarUsuarios, Amigo } from "@/services/friendService";
import { useAuth } from "../pages/Auth"; 

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Users, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface X1ChallengeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Assumindo que o tipo retornado por buscarUsuarios é ProfileRow (ou algo similar)
interface SearchedUser {
    id: string;
    display_name: string | null;
    full_name: string | null;
    avatar_url: string | null;
}

const games = ["FIFA 24", "CS2", "League of Legends", "Valorant", "Fortnite"];

export const X1ChallengeDialog = ({ open, onOpenChange }: X1ChallengeDialogProps) => {
  const { user } = useAuth(); // Obtém o usuário logado (assumimos que user.id existe)
  const { toast } = useToast();
  
  // Estado para a aba "Amigos"
  const [selectedFriendId, setSelectedFriendId] = useState<string>(""); // ID do amigo da lista
  const [friends, setFriends] = useState<Amigo[]>([]);
  const [isFriendsLoading, setIsFriendsLoading] = useState(true);

  // Estado para a aba "Buscar ID/Usuário"
  const [activeTab, setActiveTab] = useState("friends"); // Controla a aba ativa
  const [searchQuery, setSearchQuery] = useState("");
  const [searchedUser, setSearchedUser] = useState<SearchedUser | null>(null);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [selectedSearchedUserId, setSelectedSearchedUserId] = useState<string>(""); // ID do usuário encontrado e selecionado

  // Estado Comum
  const [selectedGame, setSelectedGame] = useState("");
  const [betAmount, setBetAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Efeito para carregar amigos
  useEffect(() => {
    if (open && user?.id) {
      const fetchFriends = async () => {
        setIsFriendsLoading(true);
        try {
          const fetchedFriends = await buscarAmigos(user.id);
          // Filtra apenas amigos aceitos, se a query do serviço não fizer isso
          const acceptedFriends = fetchedFriends.filter(f => f.status === 'accepted'); 
          setFriends(acceptedFriends);
        } catch (error) {
          console.error("Erro ao buscar amigos:", error);
          toast({
            title: "Erro",
            description: "Não foi possível carregar a lista de amigos.",
            variant: "destructive",
          });
        } finally {
          setIsFriendsLoading(false);
        }
      };
      fetchFriends();
    }
  }, [open, user?.id, toast]);

  // Efeito e debounce para buscar usuário
  const handleSearch = useCallback(async (query: string) => {
    if (query.trim().length < 3 || !user?.id) {
      setSearchedUser(null);
      return;
    }

    setIsSearchLoading(true);
    try {
      // buscarUsuarios(consulta, idUsuarioAtual)
      const results = await buscarUsuarios(query.trim(), user.id); 
      
      // Assumindo que buscarUsuarios retorna um array de objetos Profile
      if (results && results.length > 0) {
        // Seleciona o primeiro resultado como o usuário encontrado
        setSearchedUser(results[0]); 
      } else {
        setSearchedUser(null);
      }
    } catch (error) {
      console.error("Erro na busca de usuários:", error);
      setSearchedUser(null);
    } finally {
      setIsSearchLoading(false);
    }
  }, [user?.id]);
  
  // Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      if (activeTab === 'search') {
        handleSearch(searchQuery);
      }
    }, 500); // Espera 500ms após a última tecla

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, handleSearch, activeTab]);

  // Limpa o estado de busca/seleção ao mudar de aba
  useEffect(() => {
    // Resetar a seleção de ID se a aba mudar
    setSelectedFriendId("");
    setSelectedSearchedUserId("");
  }, [activeTab]);

  // Lógica principal de Desafio
  const handleChallenge = async () => {
    if (!user?.id) {
      // ... (erro de autenticação)
      return;
    }

    // Determina o ID do desafiado baseado na aba ativa
    const challengedId = activeTab === 'friends' ? selectedFriendId : selectedSearchedUserId;
    const amount = parseFloat(betAmount);

    if (!challengedId || !selectedGame || isNaN(amount) || amount <= 0) {
      toast({
        title: "Dados Inválidos",
        description: "Por favor, selecione um jogador, jogo e um valor de aposta válido.",
        variant: "destructive",
      });
      return;
    }

    const challengeData: CreateX1ChallengeData = {
      challenger_id: user.id,
      challenged_id: challengedId,
      game: selectedGame,
      bet_amount: amount,
    } as CreateX1ChallengeData; // Faz o cast para garantir que TypeScript não reclame do tipo de bet_amount

    setIsLoading(true);
    try {
      await x1ChallengeService.createChallenge(challengeData);
      toast({
        title: "Desafio Enviado!",
        description: `Desafio de R$ ${amount.toFixed(2)} em ${selectedGame} enviado com sucesso.`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro ao Enviar Desafio",
        description: "Não foi possível enviar o desafio. Verifique sua conexão e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isChallengeDisabled = isLoading || !selectedGame || !betAmount || 
    (activeTab === 'friends' && !selectedFriendId) || 
    (activeTab === 'search' && !selectedSearchedUserId);
    
  // --- Renderização ---
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Desafio X1</DialogTitle>
          <DialogDescription>
            Desafie um amigo ou outro jogador para uma partida individual.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="friends" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="friends">
              <Users className="w-4 h-4 mr-2" />
              Amigos
            </TabsTrigger>
            <TabsTrigger value="search">
              <Search className="w-4 h-4 mr-2" />
              Buscar Nome
            </TabsTrigger>
          </TabsList>

          {/* ABA AMIGOS */}
          <TabsContent value="friends" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Selecione um Amigo</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {isFriendsLoading ? (
                  <p className="text-center text-sm text-muted-foreground flex items-center justify-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Carregando amigos...
                  </p>
                ) : friends.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground">Você não tem amigos aceitos para desafiar.</p>
                ) : (
                  friends.map((friend) => (
                    <div
                      key={friend.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedFriendId === friend.id_amigo // Use o ID do amigo aqui
                          ? "border-primary bg-primary/10"
                          : "hover:bg-muted"
                      }`}
                      // Use o id_amigo para o desafio, que é o ID do perfil a ser desafiado
                      onClick={() => setSelectedFriendId(friend.id_amigo)} 
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={friend.perfis?.url_avatar || undefined} alt={friend.perfis?.nome_exibicao || "Amigo"} />
                        <AvatarFallback>{friend.perfis?.nome_exibicao?.charAt(0) || "A"}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{friend.perfis?.nome_exibicao || friend.perfis?.nome_completo || "Amigo Desconhecido"}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* ABA BUSCAR NOME DE USUÁRIO */}
          <TabsContent value="search" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="search-query">Nome de Usuário</Label>
              <Input
                id="search-query"
                placeholder="Digite o nome de usuário (display name)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="min-h-[6rem] flex flex-col justify-center">
              {isSearchLoading ? (
                <p className="text-center text-sm text-muted-foreground flex items-center justify-center">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Buscando...
                </p>
              ) : searchedUser ? (
                <div
                    key={searchedUser.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedSearchedUserId === searchedUser.id
                        ? "border-primary bg-primary/10"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => setSelectedSearchedUserId(searchedUser.id)}
                >
                    <Avatar className="h-10 w-10">
                        <AvatarImage src={searchedUser.avatar_url || undefined} alt={searchedUser.display_name || "Usuário"} />
                        <AvatarFallback>{searchedUser.display_name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="font-medium">{searchedUser.display_name || searchedUser.full_name || "Usuário Desconhecido"}</span>
                        <span className="text-xs text-muted-foreground">ID: {searchedUser.id.substring(0, 8)}...</span>
                    </div>
                </div>
              ) : searchQuery.length > 2 ? (
                <p className="text-center text-sm text-muted-foreground">Nenhum usuário encontrado com "{searchQuery}".</p>
              ) : (
                <p className="text-center text-sm text-muted-foreground">Digite pelo menos 3 caracteres para buscar.</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        {/* Seção de Jogo e Aposta (Comum) */}
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="game">Jogo</Label>
            <Select value={selectedGame} onValueChange={setSelectedGame}>
              <SelectTrigger id="game">
                <SelectValue placeholder="Selecione o jogo" />
              </SelectTrigger>
              <SelectContent>
                {games.map((game) => (
                  <SelectItem key={game} value={game}>
                    {game}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bet-amount">Valor da Aposta (R$)</Label>
            <Input
              id="bet-amount"
              type="number"
              placeholder="0.00"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancelar
          </Button>
          <Button
            onClick={handleChallenge}
            disabled={isChallengeDisabled}
            className="flex-1 gradient-primary"
          >
            {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Enviar Desafio"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};