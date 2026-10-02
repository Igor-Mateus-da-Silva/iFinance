import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { SupabaseService } from '../../../core/services/supabase.service';
import { FinancialDashboardService } from './financial-dashboard.service';
import { FinanceSetupService } from './finance-setup.service';
import { PortfolioService } from '../../investments/services/portfolio.service';
import { AssetClassesService } from '../../investments/services/asset-classes.service';
import {
  ToastService,
  DEMO_LIMIT_MESSAGE,
  isDemoLimitError,
} from '../../../core/services/toast.service';

export interface ReceiptExtractionResult {
  amount: number;
  date: string; // 'YYYY-MM-DD'
  description: string;
  suggested_category_type: 'INCOME' | 'EXPENSE';
  suggested_category_name?: string;
}

export interface InvestmentExtractionResult {
  ticker: string;
  quantity: number;
  price: number;
  date: string; // 'YYYY-MM-DD'
  total: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isStreaming?: boolean;
  isReceipt?: boolean;
  receiptData?: ReceiptExtractionResult;
  isInvestmentNote?: boolean;
  investmentData?: InvestmentExtractionResult;
}

export interface TransactionModalPrefill {
  amount: number;
  date: string;
  description: string;
  type: 'INCOME' | 'EXPENSE';
  suggestedCategoryName?: string;
}

export interface AssetModalPrefill {
  ticker: string;
  quantity: number;
  current_price: number;
  date?: string;
  asset_class_id?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AiAssistantService {
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);
  private readonly dashboardService = inject(FinancialDashboardService);
  private readonly setupService = inject(FinanceSetupService);
  private readonly portfolioService = inject(PortfolioService);
  private readonly assetClassesService = inject(AssetClassesService);
  private readonly toastService = inject(ToastService);

  // Signals reativos para pré-preenchimento de modais pela IA
  readonly modalPrefill = signal<TransactionModalPrefill | null>(null);
  readonly isModalRequested = signal<boolean>(false);

  readonly assetPrefill = signal<AssetModalPrefill | null>(null);
  readonly isAssetModalRequested = signal<boolean>(false);

  /**
   * Identifica dinamicamente se o usuário está navegando no Módulo de Investimentos
   */
  isInvestmentsRoute(): boolean {
    return this.router.url.startsWith('/investments');
  }

  /**
   * Obtém a URL da Edge Function gemini-proxy no Supabase.
   */
  private getProxyUrl(): string {
    const baseUrl = environment.supabase.url
      .replace(/\/rest\/v1\/?$/, '')
      .replace(/\/$/, '');
    return `${baseUrl}/functions/v1/gemini-proxy`;
  }

  /**
   * Dispara a abertura do modal de transação financeira com os dados pré-preenchidos.
   */
  openTransactionWithPrefill(data: TransactionModalPrefill): void {
    this.modalPrefill.set(data);
    this.isModalRequested.set(true);
  }

  clearModalRequest(): void {
    this.modalPrefill.set(null);
    this.isModalRequested.set(false);
  }

  /**
   * Dispara a abertura do modal de ativo com os dados pré-preenchidos da nota de corretagem.
   */
  openAssetWithPrefill(data: AssetModalPrefill): void {
    this.assetPrefill.set(data);
    this.isAssetModalRequested.set(true);
  }

  clearAssetModalRequest(): void {
    this.assetPrefill.set(null);
    this.isAssetModalRequested.set(false);
  }

  /**
   * Monta o contexto financeiro consolidado em tempo real (para rotas de Controle Financeiro).
   */
  async buildFinancialContext(): Promise<string> {
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    try {
      const [metrics, categories] = await Promise.all([
        this.dashboardService.getDashboardMetrics(currentYearMonth),
        this.setupService.getCategories(),
      ]);

      const groupsSummary = metrics.budgetProgressList
        .map(
          (b) =>
            `- Grupo: "${b.group.name}" (Meta: ${b.targetPercentage}% = R$ ${b.targetAmount.toFixed(
              2
            )}) | Gasto atual: R$ ${b.spentAmount.toFixed(2)} (${b.percentageConsumed}%) | Status: ${b.status}`
        )
        .join('\n');

      const topCatsSummary = metrics.topCategories
        .map((c) => `- ${c.categoryName}: R$ ${c.amount.toFixed(2)} (${c.percentageOfTotal}%)`)
        .join('\n');

      const catsList = categories.map((c) => `${c.name} (${c.type})`).join(', ');

      return `
[DADOS EM TEMPO REAL DO CONTROLE FINANCEIRO]:
- Data/Hora Atual: ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}
- Mês de Competência: ${currentYearMonth}
- Saldo Consolidado em Contas (Dinheiro Real Hoje): R$ ${metrics.totalCurrentBalance.toFixed(2)}
- Receitas do Mês: R$ ${metrics.totalIncome.toFixed(2)}
- Despesas do Mês: R$ ${metrics.totalExpense.toFixed(2)}
- Resultado Líquido: R$ ${metrics.netResult.toFixed(2)} (${metrics.netResult >= 0 ? 'Superávit' : 'Déficit'})
- Taxa de Poupança/Sobra: ${metrics.savingsRate}%

[METAS DA REGRA 50/30/20]:
${groupsSummary || 'Nenhum grupo cadastrado'}

[TOP CATEGORIAS DE GASTO NO MÊS]:
${topCatsSummary || 'Nenhuma despesa registrada ainda'}

[CATEGORIAS CADASTRADAS NO SISTEMA]:
${catsList || 'Sem categorias'}
`.trim();
    } catch (err) {
      return `[Aviso]: Não foi possível obter as métricas financeiras em tempo real (${err}).`;
    }
  }

  /**
   * Monta o contexto da carteira e metas de alocação (para rotas de Investimentos).
   */
  async buildInvestmentsContext(): Promise<string> {
    try {
      const [holdings, classes] = await Promise.all([
        this.portfolioService.getHoldings(),
        this.assetClassesService.getClasses(),
      ]);

      const totalPortfolioValue = holdings.reduce((sum, h) => sum + h.totalValue, 0);

      // Mapeia classes e calcula percentual atual consolidado vs meta ideal
      const classMap = new Map<string, { name: string; targetPercentage: number; currentTotal: number }>();
      for (const cls of classes) {
        classMap.set(cls.id, {
          name: cls.name,
          targetPercentage: Number(cls.target_percentage) || 0,
          currentTotal: 0,
        });
      }

      for (const h of holdings) {
        if (classMap.has(h.assetClassId)) {
          classMap.get(h.assetClassId)!.currentTotal += h.totalValue;
        }
      }

      const classSummaries: string[] = [];
      for (const item of classMap.values()) {
        const currentPct = totalPortfolioValue > 0 ? (item.currentTotal / totalPortfolioValue) * 100 : 0;
        const diff = currentPct - item.targetPercentage;
        const status = diff < -0.5 ? 'ABAIXO DA META (Prioridade de Aporte)' : diff > 0.5 ? 'ACIMA DA META' : 'EQUILIBRADO';
        classSummaries.push(
          `- Classe "${item.name}": Atual: R$ ${item.currentTotal.toFixed(2)} (${currentPct.toFixed(1)}%) | Meta Ideal: ${item.targetPercentage}% | Diferença: ${diff > 0 ? '+' : ''}${diff.toFixed(1)}% [${status}]`
        );
      }

      const holdingsSummaries = holdings.map((h) => {
        const weight = totalPortfolioValue > 0 ? (h.totalValue / totalPortfolioValue) * 100 : 0;
        return `- ${h.ticker} (${h.assetClassName}): ${h.quantity} un. @ R$ ${h.currentPrice.toFixed(2)} = R$ ${h.totalValue.toFixed(2)} (${weight.toFixed(1)}% da carteira)`;
      });

      return `
[CARTEIRA DE INVESTIMENTOS DO USUÁRIO]:
- Patrimônio Total Consolidado: R$ ${totalPortfolioValue.toFixed(2)}
- Total de Ativos em Custódia: ${holdings.length}

[DISTRIBUIÇÃO POR CLASSE DE ATIVOS (ATUAL VS META ESTRATÉGICA)]:
${classSummaries.join('\n') || 'Nenhuma classe configurada'}

[POSIÇÕES INDIVIDUAIS EM CUSTÓDIA]:
${holdingsSummaries.join('\n') || 'Nenhum ativo cadastrado na carteira'}
`.trim();
    } catch (err) {
      return `[Aviso]: Não foi possível carregar os dados de investimentos no momento (${err}).`;
    }
  }

  /**
   * Envia uma mensagem para o Gemini com injeção dinâmica de contexto baseada na rota ativa.
   */
  sendMessageStream(message: string, history: ChatMessage[] = []): Observable<string> {
    return new Observable<string>((subscriber) => {
      const abortController = new AbortController();

      (async () => {
        try {
          const token = await this.supabase.getAccessToken();

          if (!token) {
            subscriber.next(
              '⚠️ **Sessão não encontrada.**\n\nPor favor, faça login novamente no aplicativo para conversar com o assistente.'
            );
            subscriber.complete();
            return;
          }

          const isInvestments = this.isInvestmentsRoute();
          let systemInstruction = '';

          if (isInvestments) {
            const investmentsContext = await this.buildInvestmentsContext();
            systemInstruction = `
Você é o "iFinance AI", o estrategista de investimentos e consultor de alocação de patrimônio do iFinance Capital.
Seu objetivo é orientar o investidor com análises técnicas, visão de longo prazo e sabedoria de rebalanceamento passivo, baseando-se estritamente na carteira real e nas metas de alocação fornecidas abaixo.

${investmentsContext}

DIRETRIZES DE RESPOSTA PARA INVESTIMENTOS:
1. Responda em Português do Brasil (PT-BR).
2. Seja pragmático, analítico e claro. Use formatação Markdown (negrito, listas e tabelas comparativas quando oportuno).
3. Quando o usuário perguntar onde aportar (ex: "Onde devo aportar meus R$ 500 hoje?" ou "Qual classe está mais defasada?"), analise quais classes estão marcadas como "ABAIXO DA META (Prioridade de Aporte)". Explique a lógica de rebalanceamento passivo: comprar o que está para trás para equilibrar os percentuais sem precisar vender ativos.
4. Explique riscos e diversificação com equilíbrio e sobriedade, respeitando sempre a meta da estratégia do usuário.
5. Nunca invente dados que contradigam a carteira real informada acima.
`.trim();
          } else {
            const financialContext = await this.buildFinancialContext();
            systemInstruction = `
Você é o "iFinance AI", o assistente financeiro pessoal inteligente do aplicativo iFinance Capital.
Seu objetivo é orientar o usuário com sabedoria, clareza e pragmatismo, cruzando sempre as perguntas dele com o seu contexto financeiro real fornecido abaixo.

${financialContext}

DIRETRIZES DE RESPOSTA FINANCEIRA:
1. Responda em Português do Brasil (PT-BR).
2. Seja conciso, direto e amigável. Use formatação Markdown (negrito, listas e emojis pontuais).
3. Quando o usuário perguntar se pode comprar algo (ex: "Posso gastar R$ 200 em pizza?"), avalie se isso cabe no grupo "Desejos Pessoais / Não essenciais", se o grupo já está no limite ou estourado, e alerte sobre o impacto no saldo.
4. Nunca invente dados que contradigam o contexto financeiro acima.
`.trim();
          }

          // Constrói o histórico de mensagens
          const contents: any[] = [];
          const recentHistory = history.slice(-10);
          for (const msg of recentHistory) {
            contents.push({
              role: msg.role === 'user' ? 'user' : 'model',
              parts: [{ text: msg.text }],
            });
          }

          contents.push({
            role: 'user',
            parts: [{ text: message }],
          });

          const proxyUrl = this.getProxyUrl();

          const requestBody = JSON.stringify({
            mode: 'chat',
            contents,
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024,
            },
          });

          const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'apikey': environment.supabase.anonKey,
            },
            signal: abortController.signal,
            body: requestBody,
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            const errorMsg = errorData?.error || (await response.text());
            if (response.status === 403 || isDemoLimitError(errorData) || isDemoLimitError(errorMsg)) {
              this.toastService.showDemoLimitNotice();
              throw new Error(DEMO_LIMIT_MESSAGE);
            }
            throw new Error(`Falha no proxy da IA (${response.status}): ${errorMsg}`);
          }

          if (!response.body) {
            throw new Error('A resposta do servidor não suporta streaming.');
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith('data: ')) {
                const jsonStr = trimmed.substring(6).trim();
                if (jsonStr) {
                  try {
                    const parsed = JSON.parse(jsonStr);
                    const chunkText =
                      parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    if (chunkText) {
                      subscriber.next(chunkText);
                    }
                  } catch {
                    // Ignora chunks parciais de SSE
                  }
                }
              }
            }
          }

          if (buffer.trim().startsWith('data: ')) {
            try {
              const parsed = JSON.parse(buffer.trim().substring(6).trim());
              const chunkText = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (chunkText) subscriber.next(chunkText);
            } catch {
              // ignore
            }
          }

          subscriber.complete();
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            subscriber.error(err);
          }
        }
      })();

      return () => {
        abortController.abort();
      };
    });
  }

  /**
   * Converte um arquivo do tipo File em string Base64 pura.
   */
  async fileToBase64(file: File): Promise<{ base64Data: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const commaIndex = result.indexOf(',');
        const base64Data = commaIndex !== -1 ? result.substring(commaIndex + 1) : result;
        const mimeType = file.type || 'image/jpeg';
        resolve({ base64Data, mimeType });
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }

  /**
   * Modo Visão: Extrai dados estruturados de um comprovante financeiro (Controle Financeiro).
   */
  async extractReceiptData(file: File): Promise<ReceiptExtractionResult> {
    const token = await this.supabase.getAccessToken();

    if (!token) {
      throw new Error('Sessão expirada. Faça login novamente para ler comprovantes.');
    }

    const { base64Data, mimeType } = await this.fileToBase64(file);

    const prompt = `
Você é um auditor financeiro especialista em OCR e leitura de comprovantes brasileiros (PIX, comprovantes de cartão de débito/crédito, notas fiscais, cupons de supermercado, faturas e recibos).

Analise a imagem anexada com precisão cirúrgica e extraia os dados essenciais da transação.
Responda ESTRITAMENTE com um objeto JSON válido (sem texto introdutório, sem formatações adicionais) no seguinte formato:

{
  "amount": number (valor monetário total como número positivo decimal, ex: 154.20),
  "date": string (data da compra ou transação no formato YYYY-MM-DD. Se ano não for explícito, assuma o ano atual ${new Date().getFullYear()}),
  "description": string (nome claro do estabelecimento, favorecido, empresa ou item principal, ex: "Restaurante Sabor Natural" ou "Supermercado Extra"),
  "suggested_category_type": "EXPENSE" ou "INCOME" (geralmente EXPENSE para compras e pagamentos, INCOME se for transferência recebida),
  "suggested_category_name": string (categoria sugerida em português, ex: "Alimentação", "Supermercado", "Saúde", "Transporte", "Lazer", "Serviços")
}
`.trim();

    const proxyUrl = this.getProxyUrl();

    const requestBody = JSON.stringify({
      mode: 'vision',
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': environment.supabase.anonKey,
      },
      body: requestBody,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMsg = errorData?.error || (await response.text());
      if (response.status === 403 || isDemoLimitError(errorData) || isDemoLimitError(errorMsg)) {
        this.toastService.showDemoLimitNotice();
        throw new Error(DEMO_LIMIT_MESSAGE);
      }
      throw new Error(`Falha ao ler comprovante com IA (${response.status}): ${errorMsg}`);
    }

    const result = await response.json();
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error('O Gemini não retornou nenhum dado analisável para esta imagem.');
    }

    const parsed = JSON.parse(rawText.trim());

    const amount =
      typeof parsed.amount === 'number'
        ? Math.abs(parsed.amount)
        : parseFloat(String(parsed.amount).replace(/[^\d.-]/g, '')) || 0;

    let date = String(parsed.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const now = new Date();
      date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    const description = String(parsed.description || 'Despesa via Comprovante').trim();
    const suggested_category_type = parsed.suggested_category_type === 'INCOME' ? 'INCOME' : 'EXPENSE';
    const suggested_category_name = parsed.suggested_category_name || 'Geral';

    return {
      amount: Math.round(amount * 100) / 100,
      date,
      description,
      suggested_category_type,
      suggested_category_name,
    };
  }

  /**
   * Modo Visão: Extrai dados estruturados de Notas de Corretagem ou comprovantes de ativos (Controle de Investimentos).
   */
  async extractInvestmentData(file: File): Promise<InvestmentExtractionResult> {
    const token = await this.supabase.getAccessToken();

    if (!token) {
      throw new Error('Sessão expirada. Faça login novamente para ler notas de corretagem.');
    }

    const { base64Data, mimeType } = await this.fileToBase64(file);

    const prompt = `
Você é um auditor financeiro especialista em notas de corretagem B3, extratos de corretoras brasileiras (XP, BTG, Clear, NuInvest, Rico, Inter, etc.) e comprovantes de compra de ações, FIIs, ETFs, BDRs e Criptoativos.

Analise a imagem anexada com precisão cirúrgica e extraia os dados essenciais da operação de compra/investimento.
Responda ESTRITAMENTE com um objeto JSON válido (sem texto introdutório, sem formatações markdown adicionais) no seguinte formato:

{
  "ticker": string (código de negociação do ativo em letras maiúsculas, ex: "PETR4", "IVVB11", "MXRF11", "HGLG11", "BTC"),
  "quantity": number (quantidade de cotas ou ações negociadas como número positivo, ex: 100 ou 10),
  "price": number (preço unitário da cota/ação em reais como número positivo decimal, ex: 38.50),
  "date": string (data da operação no formato YYYY-MM-DD. Se ano não for explícito, assuma o ano atual ${new Date().getFullYear()})
}
`.trim();

    const proxyUrl = this.getProxyUrl();

    const requestBody = JSON.stringify({
      mode: 'vision',
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': environment.supabase.anonKey,
      },
      body: requestBody,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMsg = errorData?.error || (await response.text());
      if (response.status === 403 || isDemoLimitError(errorData) || isDemoLimitError(errorMsg)) {
        this.toastService.showDemoLimitNotice();
        throw new Error(DEMO_LIMIT_MESSAGE);
      }
      throw new Error(`Falha ao ler nota de corretagem com IA (${response.status}): ${errorMsg}`);
    }

    const result = await response.json();
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error('O Gemini não retornou nenhum dado analisável para esta nota de corretagem.');
    }

    const parsed = JSON.parse(rawText.trim());

    const ticker = String(parsed.ticker || 'ATIVO').trim().toUpperCase();
    const quantity =
      typeof parsed.quantity === 'number'
        ? Math.abs(parsed.quantity)
        : parseFloat(String(parsed.quantity).replace(/[^\d.-]/g, '')) || 1;

    const price =
      typeof parsed.price === 'number'
        ? Math.abs(parsed.price)
        : parseFloat(String(parsed.price).replace(/[^\d.-]/g, '')) || 0;

    let date = String(parsed.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const now = new Date();
      date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    const total = Math.round(quantity * price * 100) / 100;

    return {
      ticker,
      quantity,
      price: Math.round(price * 100) / 100,
      date,
      total,
    };
  }
}
