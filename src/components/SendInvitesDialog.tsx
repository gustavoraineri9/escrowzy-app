import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Mail, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sendTournamentInvites } from "@/services/inviteService";
import { buscarAmigos } from "@/services/friendService";

interface SendInvitesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: string;
  tournamentName: string;
}

interface User {
  id: string;
  display_name: string;
  full_name: string;
  avatar_url?: string;
}

export function SendInvitesDialog({
  open,
  onOpenChange,
  tournamentId,
  tournamentName,
}: SendInvitesDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searching, setSearching] = useState(false); // NOVO estado para busca
  const [searchQuery, setSearchQuery] = useState("");
  const [friends, setFriends] = useState<User[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    if (open) {
      loadFriends();
    } else {
      // Reset state when dialog closes
      setSelectedUsers(new Set());
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUserId(user.id);
      // Buscar amigos usando o serviço que já trata ambos os lados da relação
      const amigos = await buscarAmigos(user.id);

      if (!amigos || amigos.length === 0) {
        setFriends([]);
        toast({
          title: "Sem amigos",
          description: "Você ainda não tem amigos adicionados.",
        });
        return;
      }

      const friendsList: User[] = amigos.map((a) => ({
        id: a.perfis?.id ?? a.id_amigo ?? a.id,
        display_name: a.perfis?.nome_exibicao ?? "",
        full_name: a.perfis?.nome_completo ?? "",
        avatar_url: a.perfis?.url_avatar ?? undefined,
      }));

      setFriends(friendsList);
    } catch (error) {
      console.error("Erro ao carregar amigos:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de amigos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!currentUserId) return;
    
    setSearching(true); // INÍCIO: Ativa o estado de busca
    
    try {
      // Buscar por player_id (display_name)
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, full_name, avatar_url")
        .ilike("display_name", `%${searchQuery}%`)
        .neq("id", currentUserId)
        .limit(10);

      if (error) {
        console.error("Erro ao buscar usuários:", error);
        toast({
          title: "Erro",
          description: "Erro ao buscar jogadores.",
          variant: "destructive",
        });
        return;
      }

      const results: User[] = (data || []).map(user => ({
        id: user.id,
        display_name: user.display_name || "",
        full_name: user.full_name || "",
        avatar_url: user.avatar_url,
      }));

      setSearchResults(results);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
    } finally {
      setSearching(false); // FIM: Desativa o estado de busca
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const handleSendInvites = async () => {
    if (selectedUsers.size === 0) {
      toast({
        title: "Nenhum usuário selecionado",
        description: "Selecione pelo menos um usuário para enviar convites.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      await sendTournamentInvites(
        tournamentId,
        currentUserId,
        Array.from(selectedUsers)
      );

      toast({
        title: "Convites enviados!",
        description: `${selectedUsers.size} convite(s) enviado(s) com sucesso.`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao enviar convites:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar os convites. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const displayedUsers = searchQuery.length >= 2 ? searchResults : friends;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Enviar Convites</DialogTitle>
          <DialogDescription>
            Convide amigos ou busque jogadores por nome do usuario para participar de "{tournamentName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            {/* Ícone de Loader2 exibido durante a busca */}
            {searching ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            )}
            <Input
              placeholder="Buscar por player_id..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              disabled={loading} // Desabilita enquanto carrega a lista inicial
            />
          </div>

          {/* User List */}
          <ScrollArea className="h-[400px] rounded-md border p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : displayedUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery.length >= 2
                  ? "Nenhum jogador encontrado com esse nome"
                  : "Sem amigos encontrados. Use a busca para encontrar jogadores."}
              </div>
            ) : (
              <div className="space-y-2">
                {displayedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => toggleUserSelection(user.id)}
                  >
                    <Checkbox
                      checked={selectedUsers.has(user.id)}
                      onCheckedChange={() => toggleUserSelection(user.id)}
                    />
                    <img
                      src={
                        user.avatar_url ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.display_name}`
                      }
                      alt={user.full_name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div className="flex-1">
                      <p className="font-semibold">{user.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        @{user.display_name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Selected Count */}
          {selectedUsers.size > 0 && (
            <div className="text-sm text-muted-foreground">
              {selectedUsers.size} usuário(s) selecionado(s)
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSendInvites}
            disabled={sending || selectedUsers.size === 0}
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Enviar Convites ({selectedUsers.size})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}