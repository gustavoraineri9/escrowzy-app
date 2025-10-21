import { useEffect, useState } from "react";
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
import { Search, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface X1ChallengeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FriendProfile {
  id: string;
  full_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

const games = ["FIFA 24", "CS2", "League of Legends", "Valorant", "Fortnite"];

export const X1ChallengeDialog = ({ open, onOpenChange }: X1ChallengeDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<string>("");
  const [searchPlayerId, setSearchPlayerId] = useState("");
  const [searchedPlayer, setSearchedPlayer] = useState<FriendProfile | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedGame, setSelectedGame] = useState("");
  const [betAmount, setBetAmount] = useState("");
  const [isSendingChallenge, setIsSendingChallenge] = useState(false);

  useEffect(() => {
    if (!user || !open) return;

    const fetchFriends = async () => {
      const { data, error } = await supabase
        .from("friends")
        .select("friend_id, profiles(id, full_name, display_name, avatar_url)")
        .eq("user_id", user.id)
        .eq("status", "accepted");

      if (error) {
        console.error("Erro ao buscar amigos:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar sua lista de amigos.",
          variant: "destructive",
        });
      } else if (data) {
        const friendProfiles: FriendProfile[] = data.map((f: any) => ({
          id: f.profiles.id,
          full_name: f.profiles.full_name,
          display_name: f.profiles.display_name,
          avatar_url: f.profiles.avatar_url,
        }));
        setFriends(friendProfiles);
      }
    };

    fetchFriends();
  }, [user, open, toast]);

  const handleSearchPlayer = async () => {
    if (!searchPlayerId) return;
    setSearchLoading(true);
    setSearchedPlayer(null);

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, display_name, avatar_url")
      .eq("id", searchPlayerId) // Assumindo que searchPlayerId é o UUID do perfil
      .single();

    if (error) {
      console.error("Erro ao buscar jogador:", error);
      toast({
        title: "Erro",
        description: "Jogador não encontrado ou erro na busca.",
        variant: "destructive",
      });
    } else if (data) {
      if (data.id === user?.id) {
        toast({
          title: "Erro",
          description: "Você não pode desafiar a si mesmo.",
          variant: "destructive",
        });
        setSearchedPlayer(null);
      } else {
        setSearchedPlayer(data);
      }
    }
    setSearchLoading(false);
  };

  const handleChallenge = async () => {
    if (!user || (!selectedFriendId && !searchedPlayer) || !selectedGame || !betAmount) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos e selecione um desafiado.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingChallenge(true);
    const challengedId = selectedFriendId || (searchedPlayer ? searchedPlayer.id : null);

    if (!challengedId) {
      toast({
        title: "Erro",
        description: "Não foi possível identificar o desafiado.",
        variant: "destructive",
      });
      setIsSendingChallenge(false);
      return;
    }

    const { error } = await supabase.from("x1_challenges").insert({
      challenger_id: user.id,
      challenged_id: challengedId,
      game: selectedGame,
      bet_amount: parseFloat(betAmount),
      status: "pending",
    });

    if (error) {
      console.error("Erro ao enviar desafio:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível enviar o desafio X1.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso!",
        description: "Desafio X1 enviado com sucesso.",
      });
      onOpenChange(false);
      // Resetar estados do formulário
      setSelectedFriendId("");
      setSearchPlayerId("");
      setSearchedPlayer(null);
      setSelectedGame("");
      setBetAmount("");
    }
    setIsSendingChallenge(false);
  };

  const getAvatarUrl = (profile: FriendProfile) => {
    return profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.display_name || profile.full_name || profile.id}`;
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
                {friends.length === 0 && <p className="text-muted-foreground">Você não tem amigos aceitos ainda.</p>}
                {friends.map((friend) => (
                  <div
                    key={friend.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedFriendId === friend.id
                        ? "border-primary bg-primary/10"
                        : "hover:bg-muted"
                    }`}
                    onClick={() => {
                      setSelectedFriendId(friend.id);
                      setSearchedPlayer(null); // Limpa o jogador buscado se um amigo for selecionado
                    }}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={getAvatarUrl(friend)} alt={friend.display_name || friend.full_name || "Amigo"} />
                      <AvatarFallback>{(friend.display_name || friend.full_name || "A").split(" ").map(n => n[0]).join("")}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{friend.display_name || friend.full_name}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="search" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search-player-id">ID do Jogador</Label>
              <div className="flex gap-2">
                <Input
                  id="search-player-id"
                  placeholder="Digite o ID do jogador (UUID)"
                  value={searchPlayerId}
                  onChange={(e) => setSearchPlayerId(e.target.value)}
                />
                <Button onClick={handleSearchPlayer} disabled={searchLoading}>
                  {searchLoading ? "Buscando..." : "Buscar"}
                </Button>
              </div>
              {searchedPlayer && (
                <div
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedFriendId === searchedPlayer.id
                      ? "border-primary bg-primary/10"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => {
                    setSelectedFriendId(searchedPlayer.id);
                    setSearchedPlayer(searchedPlayer); // Mantém o jogador buscado como selecionado
                  }}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={getAvatarUrl(searchedPlayer)} alt={searchedPlayer.display_name || searchedPlayer.full_name || "Jogador"} />
                    <AvatarFallback>{(searchedPlayer.display_name || searchedPlayer.full_name || "J").split(" ").map(n => n[0]).join("")}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{searchedPlayer.display_name || searchedPlayer.full_name}</span>
                </div>
              )}
              {!searchedPlayer && searchPlayerId && !searchLoading && <p className="text-muted-foreground">Nenhum jogador encontrado com este ID.</p>}
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
            disabled={(!selectedFriendId && !searchedPlayer) || !selectedGame || !betAmount || isSendingChallenge}
            className="flex-1 gradient-primary"
          >
            {isSendingChallenge ? "Enviando..." : "Enviar Desafio"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
