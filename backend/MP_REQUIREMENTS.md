# Requisitos e passos para completar a integração Mercado Pago

Este arquivo lista tudo que o backend precisa para funcionar corretamente com o Mercado Pago e o Supabase.

IMPORTANTE: nunca coloque chaves sensíveis no repositório público. Use o arquivo `.env` local (não comitado) ou variáveis de ambiente do seu provedor/CI.

1) Variáveis de ambiente (colocar em `backend/.env` ou no ambiente de produção)

- MERCADO_PAGO_ACCESS_TOKEN: access token da conta Mercado Pago (usualmente sandbox para testes).
- MP_SUCCESS_URL / MP_FAILURE_URL / MP_PENDING_URL: URLs de retorno onde o frontend trata o fluxo pós-pagamento.
- SUPABASE_URL: URL do projeto Supabase (ex: https://<seu-ref>.supabase.co).
- SUPABASE_SERVICE_ROLE_KEY: service_role key do Supabase (usada apenas no backend para bypass RLS).
- JWT_SECRET: segredo para validar/gerar JWT (usado por `authMiddleware`).
- PORT: porta do servidor (padrão 5000).

2) Permissões e segurança

- A `SUPABASE_SERVICE_ROLE_KEY` deve ficar somente no backend. Ela permite inserir/atualizar tabelas protegidas por RLS.
- Nunca exponha `MERCADO_PAGO_ACCESS_TOKEN` no frontend.
- Recomenda-se usar HTTPS em produção e proteger o endpoint de webhook com uma verificação adicional (HMAC ou checagem de origem) se possível.

3) Como configurar o webhook do Mercado Pago (sandbox)

- Use a URL pública do backend (ex: `https://meu-backend.com/api/payments/webhook`) ou uma URL proporcionada por `ngrok` durante testes locais (veja script `backend/scripts/start-ngrok.js`).
- No painel do Mercado Pago (Sandbox), configure o webhook apontando para `/api/payments/webhook`.

4) Comandos úteis (local)

Instalar dependências e rodar backend:

```bash
cd backend
npm install
npm run dev
```

Gerar URL pública (ngrok helper):

```bash
npm run ngrok
```

Testes de integração (fluxo manual)

1. Garanta que um participant exista em `participants` com status `pending` para o usuário autenticado.
2. No frontend, clique em "Efetuar Pagamento". O frontend chamará `/api/payments/create_preference`.
3. Complete o checkout no Mercado Pago (sandbox).
4. Verifique se o webhook chega ao backend e se o participante é marcado como `paid` e se existe um registro em `transactions`.

5) Migration / banco de dados

- Já existe uma migration em `supabase/migrations/20251108120000_b3c1f0a2-...sql` que cria a tabela `transactions`.
- Aplique essa migration no Supabase (via painel SQL ou CLI) antes de começar os testes.

6) O que eu (dev) preciso fazer depois que você me fornecer os segredos

- Eu posso rodar testes automatizados (mockando MP) caso você queira que eu verifique o controller.
- Se você preferir rodar localmente, eu passo um checklist passo-a-passo para você executar sem enviar segredos por chat.

7) Observações finais

- Se precisar, eu posso adicionar verificação HMAC para o webhook (Mercado Pago pode enviar assinatura, dependendo do método). Também posso criar um endpoint de administração que liste transações e facilite reconciliação.
