import apiClient from "@/pages/apiClient";

interface CreatePreferencePayload {
  amount: number;
  title: string;
  external_reference?: string;
  payer?: { email?: string };
}

export const createPreference = async (payload: CreatePreferencePayload) => {
  const { data } = await apiClient.post("/payments/create_preference", payload);
  return data;
};

export default { createPreference };
