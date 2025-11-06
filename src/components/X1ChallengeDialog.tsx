import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { x1ChallengeService } from "../services/x1challangeService.ts"; 

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "../pages/Auth.tsx"; 
import { buscarAmigos, Amigo } from "@/services/friendService";
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
import { Search, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface X1ChallengeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const mockFriends: Amigo[] = []; // Removendo o mock de amigos, será preenchido pelo useEffect

const games = ["FIFA 24", "CS2", "League of Legends", "Valorant", "Fortnite"];

// TODO: Implementar a busca real pelo ID do usuário desafiado
const mockChallengedUserId = "a1b2c3d4-e5f6-7890-1234-567890abcdef";

export const X1ChallengeDialog = ({ open, onOpenChange }: X1ChallengeDialogProps) => {
  const { user } = useAuth(); // Obtém o usuário logado
  const { toast } = useToast();
  const [selectedFriend, setSelectedFriend] = useState<string>("");
  const [searchId, setSearchId] = useState("");
  const [selectedGame, setSelectedGame] = useState("");
  const [betAmount, setBetAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [friends, setFriends] = useState<Amigo[]>([]);
  const [isFriendsLoading, setIsFriendsLoading] = useState(true);

  useEffect(() => {
    if (open && user?.id) {
      const fetchFriends = async () => {
        setIsFriendsLoading(true);
        try {
          // O friendService.ts que você forneceu tem a função buscarAmigos
          const fetchedFriends = await buscarAmigos(user.id);
          setFriends(fetchedFriends);
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

  const handleChallenge = async () => {
    if (!user?.id) {
      toast({
        title: "Erro de Autenticação",
        description: "Usuário não logado. Por favor, faça login novamente.",
        variant: "destructive",
      });
      return;
    }

    const challengedId = selectedFriend || mockChallengedUserId; // Usar selectedFriend ou o ID mockado da busca
    const amount = parseFloat(betAmount);

    if (!challengedId || !selectedGame || isNaN(amount) || amount <= 0) {
      toast({
        title: "Dados Inválidos",
        description: "Por favor, preencha todos os campos corretamente.",
        variant: "destructive",
      });
      return;
    }

    const challengeData: CreateX1ChallengeData = {
      challenger_id: user.id,
      challenged_id: challengedId,
      game: selectedGame,
      bet_amount: amount,
    };

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
        description: "Não foi possível enviar o desafio. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Desafio X1</DialogTitle>
          <DialogDescription>
            Desafie um amigo para uma partida individual
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="friends">
              <Users className="w-4 h-4 mr-2" />
              Amigos
            </TabsTrigger>
            <TabsTrigger value="search">
              <Search className="w-4 h-4 mr-2" />
              Buscar ID
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="space-y-4">
            <div className="space-y-2">
              <Label>Selecione um Amigo</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
              {isFriendsLoading ? (
                <p className="text-center text-sm text-muted-foreground">Carregando amigos...</p>
              ) : friends.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">Você não tem amigos aceitos para desafiar.</p>
              ) : (
                friends.map((friend) => (
                  <div
                    key={friend.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedFriend === friend.id
                        ? "border-primary bg-primary/10"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => setSelectedFriend(friend.id)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={friend.perfis?.url_avatar || undefined} alt={friend.perfis?.display_name || "Amigo"} />
                      <AvatarFallback>{friend.perfis?.display_name?.split(" ").map(n => n[0]).join("") || "A"}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{friend.perfis?.display_name || friend.perfis?.full_name || "Amigo Desconhecido"}</span>
                  </div>
                ))
              )}
            </div>
            </div>
          </TabsContent>

          <TabsContent value="search" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search-id">ID do Jogador</Label>
              <Input
                id="search-id"
                placeholder="Digite o ID do jogador"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-4">
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
            disabled={isLoading || (!selectedFriend && !searchId) || !selectedGame || !betAmount}
            className="flex-1 gradient-primary"
          >
            {isLoading ? "Enviando..." : "Enviar Desafio"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
