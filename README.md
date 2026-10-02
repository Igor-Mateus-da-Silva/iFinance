# iFinance Capital

Plataforma de gestão patrimonial e inteligência financeira que integra controle orçamentário pessoal, gestão de custódia de investimentos com rebalanceamento passivo e assistência analítica por inteligência artificial multimodal.

---

## 1. Visão Geral e Princípios de Design

O sistema foi concebido sob princípios de Clean Architecture, separação rígida de responsabilidades e foco em escalabilidade horizontal:

- **Minimalismo Executivo:** Interface enxuta, densa em dados e focada na usabilidade rápida sem atritos.
- **PWA First:** Experiência nativa instalável para desktop e mobile, com ciclo de vida de sessão seguro e limpeza de storage no logout.
- **Segurança Zero-Trust no Cliente:** Nenhuma credencial de provedores externos (como chaves de IA) trafega ou reside no navegador.
- **Human-in-the-Loop:** Ações geradas por inteligência artificial realizam apenas pré-preenchimento defensivo; nenhuma persistência em banco ocorre sem validação explícita do usuário.

---

## 2. Arquitetura da Solução

A aplicação utiliza arquitetura baseada em microsserviços desacoplados e Backend-for-Frontend (BFF):

```
┌────────────────────────────────────────────────────────┐
│                   Cliente (Angular 21)                 │
│  - Signals & Standalone Components                     │
│  - Injeção Dinâmica de Contexto de Rota                │
│  - Compressão de Mídia em Memória (Canvas)             │
└──────────────────────────┬─────────────────────────────┘
                           │
                 HTTPS / JWT Efêmero
                           │
       ┌───────────────────┴───────────────────┐
       ▼                                       ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│  Supabase Database      │         │  Supabase Edge Function │
│  - PostgreSQL 15        │         │  (gemini-proxy / Deno)  │
│  - Row Level Security   │         │  - Validação de JWT     │
│  - Multi-tenant isolado │         │  - Injeção de Secret    │
└─────────────────────────┘         └────────────┬────────────┘
                                                 │
                                           HTTPS / Secret
                                                 │
                                                 ▼
                                    ┌─────────────────────────┐
                                    │    Google Gemini API    │
                                    │    (gemini-3.5-flash)   │
                                    └─────────────────────────┘
```

---

## 3. Módulos da Aplicação

### 3.1 Central de Operações (Hub)
Ponto de entrada autenticado que permite alternância de contexto operacional entre o módulo orçamentário e a carteira de investimentos.

### 3.2 Controle Financeiro
- **Dashboard Executivo:** Consolidação de saldo em contas, receitas, despesas, taxa de poupança mensal e acompanhamento da regra 50/30/20 (Necessidades, Desejos e Investimentos).
- **Lançamentos & Faturas:** Gestão de transações (despesas, receitas, transferências), controle de faturas de cartão de crédito e parcelamentos.
- **Configurações (Setup):** Cadastro de contas financeiras, cartões de crédito e categorização com vínculo direto aos grupos orçamentários.

### 3.3 Controle de Investimentos
- **Estratégia de Metas:** Definição de árvore hierárquica de classes de ativos (ex: Renda Fixa, Ações Brasil, FIIs, Ativos Internacionais) com metas percentuais ideais que somam 100%.
- **Carteira & Cotações:** Registro de posições em custódia, cálculo de valor de mercado consolidado e edição rápida de preços médios e quantidades.
- **Engine de Aportes Inteligentes:** Algoritmo determinístico de rebalanceamento passivo por alocação de novos recursos, direcionando capital para classes e ativos mais distantes da meta sem necessidade de alienação de ativos.

---

## 4. Assistente de IA Multimodal (iFinance AI)

O assistente foi integrado de forma global no layout e adapta seu comportamento conforme a rota ativa:

### 4.1 Injeção de Contexto por Rota
- **Em `/financial`:** O serviço compila em tempo real o saldo disponível em contas, teto orçamentário consumido no mês e histórico de categorias para responder perguntas financeiras imediatas.
- **Em `/investments`:** O serviço consolida o patrimônio total, pesos atuais por classe contra as metas cadastradas e sinaliza posições prioritárias para novo aporte.

### 4.2 Modo Visão (OCR Inteligente)
- **Recibos Financeiros:** Extração de valor, data, estabelecimento e sugestão de categoria orçamentária, abrindo modal de lançamento pré-preenchido.
- **Notas de Corretagem:** Extração de ticker, quantidade, preço unitário e data de operação, disparando modal de inclusão de ativo na carteira com seleção automática da classe.

### 4.3 Pipeline de Segurança do Proxy
1. O cliente obtém um token JWT de curta duração via Supabase Auth.
2. O payload é enviado para a Edge Function `gemini-proxy` via HTTPS.
3. A Edge Function valida a autenticidade do JWT com a API Auth do Supabase.
4. Se autorizado, a função anexa a `GEMINI_API_KEY` mantida nos secrets do ambiente Deno e consome a API do Google.
5. As respostas de texto utilizam Server-Sent Events (SSE) para renderização progressiva por streaming.

---

## 5. Stack Tecnológico

| Camada | Tecnologia | Propósito |
| :--- | :--- | :--- |
| **Frontend** | Angular 21 | Framework SPA reativo baseado em Signals e Standalone Components |
| **Estilização** | Tailwind CSS | Utility-first CSS com foco em design limpo e responsivo |
| **Testes Unitários** | Vitest | Execução veloz de testes unitários sem overhead de compilação pesada |
| **Armazenamento / DB** | PostgreSQL (Supabase) | Banco de dados relacional com RLS por usuário |
| **Autenticação** | Supabase Auth | Gerenciamento de sessões seguras e emissão de tokens JWT |
| **Serverless / BFF** | Deno (Supabase Functions) | Proxy reverso seguro para comunicação com a IA |
| **Modelo de Linguagem** | Google Gemini 3.5 Flash | Processamento de linguagem natural e visão computacional (OCR) |

---

## 6. Configuração e Execução Local

### Pré-requisitos
- Node.js 20+
- NPM 10+
- Conta no Supabase (com projeto ativo)

### 1. Clonar o repositório
```bash
git clone https://github.com/Igor-Mateus-da-Silva/iFinance.git
cd iFinance
```

### 2. Instalar dependências
```bash
npm install
```

### 3. Configurar variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto com as chaves públicas do Supabase:

```env
SUPABASE_URL=https://sua-url-supabase.supabase.co
SUPABASE_ANON_KEY=sua-chave-publica-anon
```

> **Nota:** A chave `GEMINI_API_KEY` não deve ser configurada no frontend. Ela deve ser cadastrada diretamente nos Secrets do Supabase via CLI (`supabase secrets set GEMINI_API_KEY=...`).

### 4. Executar o ambiente de desenvolvimento
```bash
npm start
```
Acesse a aplicação em `http://localhost:4200/`.

### 5. Executar suíte de testes
```bash
npm test
```

### 6. Compilar para produção
```bash
npm run build
```
Os artefatos otimizados serão gerados no diretório `dist/ifinance-capital`.

---

## 7. Licença

Este projeto é de propriedade privada e desenvolvido para gestão financeira pessoal e de investimentos.
Desenvolvido por **IgorMS Dev**.
