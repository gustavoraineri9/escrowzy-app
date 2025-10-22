import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserSearchResult {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export const AddFriendDialog = ({ onFriendAdded }: { onFriendAdded: () => void }) => {
  const [searchUsername, setSearchUsername] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchUsername.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Erro", description: "Você precisa estar logado para buscar usuários.", variant: "destructive" });
        setIsSearching(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .ilike("full_name", `%${searchUsername}%`)
        .neq("id", user.id);

      if (error) throw error;

      const { data: existingFriendships, error: friendshipError } = await supabase
        .from("friends")
        .select("user_id, friend_id, status")
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);
      
      if (friendshipError) throw friendshipError;

      const filteredResults = data.filter(profile => {
        return !existingFriendships.some(fs => 
          (fs.user_id === user.id && fs.friend_id === profile.id) ||
          (fs.user_id === profile.id && fs.friend_id === user.id)
        );
      });

      setSearchResults(filteredResults);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      toast({ title: "Erro", description: "Não foi possível buscar usuários. Tente novamente.", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendFriendRequest = async (friendId: string) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Erro", description: "Você precisa estar logado para enviar solicitações.", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }

      const { error } = await supabase.from("friends").insert({
        user_id: user.id,
        friend_id: friendId,
        status: "pending",
      });

      if (error) throw error;

      toast({ title: "Sucesso", description: "Solicitação de amizade enviada!" });
      onFriendAdded();
      setSearchResults(prev => prev.filter(result => result.id !== friendId));
    } catch (error) {
      console.error("Erro ao enviar solicitação de amizade:", error);
      toast({ title: "Erro", description: "Não foi possível enviar a solicitação de amizade. Tente novamente.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="gradient-primary">
          <UserPlus className="w-4 h-4 mr-2" />
          Adicionar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] glass-card">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Amigo</DialogTitle>
          <DialogDescription>Busque por usuários pelo nome completo e envie solicitações de amizade.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Nome completo do usuário..."
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isSearching || !searchUsername.trim()}>
              {isSearching ? "Buscando..." : <Search className="w-4 h-4" />}
            </Button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {searchResults.length > 0 ? (
              searchResults.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-2 rounded-md bg-muted/20">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.full_name}`} />
                      <AvatarFallback>{user.full_name.substring(0, 2 ).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{user.full_name}</span>
                  </div>
                  <Button size="sm" onClick={() => handleSendFriendRequest(user.id)} disabled={isSubmitting}>
                    {isSubmitting ? "Enviando..." : <UserPlus className="w-4 h-4" />}
                  </Button>
                </div>
              ))
            ) : (
              !isSearching && searchUsername.trim() && (
                <p className="text-center text-muted-foreground">Nenhum usuário encontrado.</p>
              )
            )}
            {!searchUsername.trim() && !isSearching && (
              <p className="text-center text-muted-foreground">Digite um nome para buscar usuários.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
