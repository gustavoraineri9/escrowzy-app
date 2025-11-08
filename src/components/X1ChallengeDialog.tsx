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
import { useToast } from "@/hooks/use-toast";
import { createX1Challenge } from "@/services/x1ChallengeService";

interface X1ChallengeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
import { supabase } from "@/integrations/supabase/client";
import { buscarUsuarios, buscarAmigos } from "@/services/friendService";

type FriendItem = { id: string; name: string; avatar?: string | null };


const games = ["FIFA 24", "CS2", "League of Legends", "Valorant", "Fortnite"];

export const X1ChallengeDialog = ({ open, onOpenChange }: X1ChallengeDialogProps) => {
  const [selectedFriend, setSelectedFriend] = useState<string>("");
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [searchName, setSearchName] = useState("");
  const [searchResults, setSearchResults] = useState<FriendItem[]>([]);
  const [selectedGame, setSelectedGame] = useState("");
  const [betAmount, setBetAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Carrega a lista de amigos quando o diálogo é aberto
    const loadFriends = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const dados = await buscarAmigos(user.id);
        const mapped: FriendItem[] = dados.map((f: any) => ({
          id: f.perfis?.id ?? f.id_amigo ?? f.id,
          name: f.perfis?.nome_exibicao ?? f.perfis?.nome_completo ?? "Usuário",
          avatar: f.perfis?.url_avatar ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(f.perfis?.nome_completo ?? f.perfis?.nome_exibicao ?? f.id)}`,
        }));
        setFriends(mapped);
      } catch (err) {
        console.error("Erro ao carregar amigos:", err);
      }
    };

    if (open) {
      loadFriends();
      setSearchResults([]);
      setSearchName("");
      setSelectedFriend("");
    }
  }, [open]);

  const handleSearchByName = async () => {
    if (!searchName.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const results = await buscarUsuarios(searchName.trim(), user.id);
      const mapped: FriendItem[] = (results || []).map((r: any) => ({
        id: r.id,
        name: r.display_name ?? r.full_name ?? r.displayName ?? r.fullName ?? "Usuário",
        avatar: r.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(r.display_name ?? r.full_name ?? r.id)}`,
      }));

      setSearchResults(mapped);
    } catch (err) {
      console.error("Erro ao buscar usuário por nome:", err);
      setSearchResults([]);
    }
  };

  const handleChallenge = async () => {
    // selectedFriend deve conter o id do usuário alvo
    if (!selectedFriend) return;
    if (!selectedGame || !betAmount) return;

    try {
      setIsSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Erro", description: "Você precisa estar logado para criar um desafio.", variant: "destructive" });
        return;
      }

      const bet = Number(betAmount);
      if (Number.isNaN(bet) || bet <= 0) {
        toast({ title: "Atenção", description: "Informe um valor de aposta válido.", variant: "destructive" });
        return;
      }

      await createX1Challenge(user.id, selectedFriend, selectedGame, bet);

      toast({ title: "Sucesso", description: "Desafio enviado com sucesso!" });
      onOpenChange(false);
    } catch (err) {
      console.error("Erro ao criar desafio:", err);

      // Tenta extrair mensagem detalhada enviada pelo service (throw new Error(JSON.stringify(...)))
      let message = "Não foi possível criar o desafio. Tente novamente.";
      try {
        if (err instanceof Error) {
          const parsed = JSON.parse(err.message);
          if (parsed && parsed.message) {
            message = parsed.message + (parsed.details ? ` — ${parsed.details}` : "");
          }
        } else if (typeof err === "string") {
          const parsed = JSON.parse(err);
          message = parsed.message || message;
        } else if ((err as any)?.message) {
          message = (err as any).message;
        }
      } catch (parseErr) {
        // fallback: mantém mensagem genérica
      }

      toast({ title: "Erro", description: message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
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
              Buscar por nome
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="space-y-4">
            <div className="space-y-2">
              <Label>Selecione um Amigo</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {friends.map((friend) => (
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
                      <AvatarImage src={friend.avatar || undefined} alt={friend.name} />
                      <AvatarFallback>{friend.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{friend.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="search" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search-name">Nome do Jogador</Label>
              <div className="flex gap-2">
                <Input
                  id="search-name"
                  placeholder="Digite o nome do jogador"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchByName()}
                />
                <Button onClick={handleSearchByName}>Buscar</Button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pt-2">
                {searchResults.map((r) => (
                  <div
                    key={r.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedFriend === r.id ? "border-primary bg-primary/10" : "hover:bg-muted"
                    }`}
                    onClick={() => setSelectedFriend(r.id)}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={r.avatar || undefined} alt={r.name} />
                      <AvatarFallback>{r.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{r.name}</span>
                  </div>
                ))}
                {!searchResults.length && searchName.trim() && (
                  <p className="text-center text-muted-foreground">Nenhum usuário encontrado.</p>
                )}
              </div>
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
            disabled={isSubmitting || ((!selectedFriend && !searchName) || !selectedGame || !betAmount)}
            className="flex-1 gradient-primary"
          >
            Enviar Desafio
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
