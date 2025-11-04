import { supabase } from "@/integrations/supabase/client";

export async function logAuditEvent(
  action: string,
  resourceType: string,
  resourceId: string,
  details?: Record<string, any>
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.warn("Tentativa de log de auditoria sem usuário autenticado");
    return;
  }

  const { error } = await supabase.from("audit_logs").insert({
    user_id: user.id,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Erro ao registrar log de auditoria:", error);
  }
}
