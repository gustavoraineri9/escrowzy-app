import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { logAuditEvent } from "@/services/auditService";

interface CancelTournamentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentId: string;
  tournamentName: string;
  onConfirm: () => void;
}

export function CancelTournamentDialog({
  open,
  onOpenChange,
  tournamentId,
  tournamentName,
  onConfirm,
}: CancelTournamentDialogProps) {
  const { toast } = useToast();

  const handleConfirm = async () => {
    try {
      // Registrar evento de auditoria
      await logAuditEvent(
        "cancel_tournament",
        "tournament",
        tournamentId,
        { tournament_name: tournamentName }
      );
      
      onConfirm();
      toast({
        title: "Campeonato cancelado",
        description: "O campeonato foi cancelado e os participantes serão notificados.",
        variant: "destructive",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao cancelar campeonato:", error);
      toast({
        title: "Erro",
        description: "Não foi possível cancelar o campeonato.",
        variant: "destructive",
      });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Tem certeza que deseja cancelar?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação não pode ser desfeita. O campeonato "{tournamentName}" será cancelado
            permanentemente e todos os participantes serão reembolsados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Voltar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Sim, cancelar campeonato
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
