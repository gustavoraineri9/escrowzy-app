import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, UserPlus, MessageCircle, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddFriendDialog } from "./AddFriendDialog";

// Interface para tipagem dos dados dos amigos
interface Friend {
  id: string;
  username: string;
  avatar?: string;
  yourWins: number;
  theirWins: number;
  balance: number;
  online: boolean;
  winStreak: number;
}

export const FriendsTab = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchFriends = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setFriends([]);
        setLoading(false);
        return;
      }

      const currentUserId = user.id;

      // ESTE É O BLOCO CRÍTICO ONDE O ERRO OCORRIA
      // Se as Chaves Estrangeiras (FKs) estiverem corretas no Supabase (friends -> profiles),
      // esta query irá funcionar.
      const { data: friendships, error } = await supabase
        .from("friends")
        .select(`
          id,
          user_id,
          friend_id,
          status,
          profiles_user:profiles!user_id(id, full_name, avatar_url),
          profiles_friend:profiles!friend_id(id, full_name, avatar_url)
        `)
        .eq("status", "accepted")
        .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`);

      if (error) throw error;

      // Formatação dos dados mockados
      const formattedFriends: Friend[] = (friendships || []).map((fs: any) => {
        // Determina qual perfil é o amigo (o que não é o usuário atual)
        const friendProfile = fs.user_id === currentUserId ? fs.profiles_friend : fs.profiles_user;

        // Dados mockados para exibição (vitórias, saldo, etc.)
        const mockYourWins = Math.floor(Math.random() * 10) + 1;
        const mockTheirWins = Math.floor(Math.random() * 10) + 1;
        const mockBalance = (Math.random() * 200 - 100);
        const mockOnline = Math.random() > 0.5;
        const mockWinStreak = Math.floor(Math.random() * 5);

        return {
          id: friendProfile.id,
          username: friendProfile.full_name || "Usuário Desconhecido",
          // Tenta usar a URL do avatar, se não tiver, usa um gerador de avatar (dicebear)
          avatar: friendProfile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friendProfile.full_name}`,
          yourWins: mockYourWins,
          theirWins: mockTheirWins,
          balance: mockBalance,
          online: mockOnline,
          winStreak: mockWinStreak,
        };
      } );

      setFriends(formattedFriends);
    } catch (error) {
      console.error("Erro ao buscar amigos:", error);
      // O erro do Supabase 'PGRST200' será capturado aqui
      toast({
        title: "Erro",
        description: "Não foi possível carregar sua lista de amigos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  // Funções de formatação e estilo
  const getBalanceColor = (balance: number) => {
    if (balance > 0) return "text-success";
    if (balance < 0) return "text-destructive";
    return "text-muted-foreground";
  };

  const formatBalance = (balance: number) => {
    const sign = balance >= 0 ? "+" : "-";
    return `${sign} R$ ${Math.abs(balance).toFixed(2)}`;
  };

  const filteredFriends = friends.filter((friend) =>
    friend.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Carregando amigos...</p>
      </div>
    );
  }

  // Componente de Renderização
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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {/* Assumindo que AddFriendDialog está definido e usa fetchFriends */}
        <AddFriendDialog onFriendAdded={fetchFriends} /> 
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFriends.length > 0 ? (
          filteredFriends.map((friend) => {
            const totalGames = friend.yourWins + friend.theirWins;
            const winPercentage = totalGames > 0 ? (friend.yourWins / totalGames) * 100 : 50;
            
            return (
              <Card 
                key={friend.id} 
                className="glass-card hover:shadow-xl transition-all cursor-pointer animate-fade-in hover-scale"
                onClick={() => navigate(`/friend/${friend.id}`)}
              >
                <CardContent className="pt-6 pb-6 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <Avatar className="w-14 h-14 border-2 border-primary/20">
                      <AvatarImage src={undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">VC</AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-full bg-success flex items-center justify-center shadow-lg">
                          <span className="text-white text-xl font-bold">{friend.yourWins}</span>
                        </div>
                        {friend.winStreak >= 2 && (
                          <div className="absolute -top-1 -right-1 bg-warning rounded-full px-1.5 py-0.5 flex items-center gap-0.5 shadow-md">
                            <Flame className="w-3 h-3 text-warning-foreground" />
                            <span className="text-xs font-bold text-warning-foreground">{friend.winStreak}</span>
                          </div>
                        )}
                      </div>
                      <div className="w-14 h-14 rounded-full bg-destructive flex items-center justify-center shadow-lg">
                        <span className="text-white text-xl font-bold">{friend.theirWins}</span>
                      </div>
                    </div>
                    <div className="relative">
                      <Avatar className="w-14 h-14 border-2 border-border">
                        <AvatarImage src={friend.avatar} />
                        <AvatarFallback className="bg-muted font-bold">{friend.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      {friend.online && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-success rounded-full border-2 border-background" />
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="font-bold text-lg">{friend.username}</h3>
                      {friend.online && (
                        <Badge className="bg-success/10 text-success border-success/20 text-xs" variant="outline">Online</Badge>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="relative h-3 w-full overflow-hidden rounded-full bg-destructive/20">
                      <div 
                        className="h-full bg-success transition-all duration-500 ease-out"
                        style={{ width: `${winPercentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{winPercentage.toFixed(0)}% Você</span>
                      <span>{(100 - winPercentage).toFixed(0)}% Ele</span>
                    </div>
                  </div>
                  <div className={`flex justify-center`}>
                    <div className={`px-4 py-2 rounded-full ${
                      friend.balance > 0 
                        ? "bg-success/20 border border-success/30" 
                        : friend.balance < 0 
                        ? "bg-destructive/20 border border-destructive/30"
                        : "bg-muted border border-border"
                    }`}>
                      <span className={`font-bold text-sm ${getBalanceColor(friend.balance)}`}>Saldo: {formatBalance(friend.balance)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" size="sm" className="flex-1">
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Chat
                    </Button>
                    <Button size="sm" className="flex-1 gradient-primary transition-all duration-300 hover:scale-105 hover:shadow-lg">
                      Desafiar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card className="glass-card p-8 text-center">
            <UserPlus className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Nenhum amigo encontrado</h3>
            <p className="text-muted-foreground">Adicione amigos para ver suas conexões aqui.</p>
          </Card>
        )}
      </div>
    </div>
  );
};