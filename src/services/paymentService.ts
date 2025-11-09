import apiClient from "@/pages/apiClient";

interface CreatePreferencePayload {
  amount: number;
  title: string;
  external_reference?: string | null;
  payer?: { email?: string };
}

export const createPreference = async (payload: CreatePreferencePayload) => {
  // Attach JWT from localStorage if present so backend authMiddleware can validate
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const { data } = await apiClient.post("/payments/create_preference", payload, { headers });
  return data;
};

export default { createPreference };
