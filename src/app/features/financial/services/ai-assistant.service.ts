import { Injectable, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { FinancialDashboardService } from './financial-dashboard.service';
import { FinanceSetupService } from './finance-setup.service';

export interface ReceiptExtractionResult {
  amount: number;
  date: string; // 'YYYY-MM-DD'
  description: string;
  suggested_category_type: 'INCOME' | 'EXPENSE';
  suggested_category_name?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isStreaming?: boolean;
  isReceipt?: boolean;
  receiptData?: ReceiptExtractionResult;
}

export interface TransactionModalPrefill {
  amount: number;
  date: string;
  description: string;
  type: 'INCOME' | 'EXPENSE';
  suggestedCategoryName?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AiAssistantService {
  private readonly dashboardService = inject(FinancialDashboardService);
  private readonly setupService = inject(FinanceSetupService);

  // Signal reativo para abrir o modal de novo lançamento pré-preenchido
  readonly modalPrefill = signal<TransactionModalPrefill | null>(null);
  readonly isModalRequested = signal<boolean>(false);

  /**
   * Obtém a chave da API do Gemini a partir do environment.
   */
  private getApiKey(): string {
    return (environment as any).geminiApiKey || '';
  }

  /**
   * Verifica se a chave de API está configurada.
   */
  hasApiKey(): boolean {
    const key = this.getApiKey();
    return Boolean(key && key.trim().length > 5);
  }

  /**
   * Dispara a abertura do modal de transação com os dados pré-preenchidos pela IA.
   */
  openTransactionWithPrefill(data: TransactionModalPrefill): void {
    this.modalPrefill.set(data);
    this.isModalRequested.set(true);
  }

  /**
   * Limpa o estado da requisição do modal.
   */
  clearModalRequest(): void {
    this.modalPrefill.set(null);
    this.isModalRequested.set(false);
  }

  /**
   * Monta o contexto financeiro consolidado em tempo real para instruir o Gemini.
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
[DADOS EM TEMPO REAL DO USUÁRIO]:
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
      return `[Aviso]: Não foi possível obter as métricas em tempo real no momento (${err}).`;
    }
  }

  /**
   * Envia uma mensagem para o Gemini usando SSE (Server-Sent Events) para streaming em tempo real.
   */
  sendMessageStream(message: string, history: ChatMessage[] = []): Observable<string> {
    return new Observable<string>((subscriber) => {
      const apiKey = this.getApiKey();

      if (!this.hasApiKey()) {
        subscriber.next(
          '⚠️ **Chave da API do Google Gemini não encontrada.**\n\nPor favor, insira sua chave `GEMINI_API_KEY` no arquivo `.env` para conversar com o assistente.'
        );
        subscriber.complete();
        return;
      }

      const abortController = new AbortController();

      (async () => {
        try {
          const financialContext = await this.buildFinancialContext();

          const systemInstruction = `
Você é o "iFinance AI", o assistente financeiro pessoal inteligente do aplicativo iFinance Capital.
Seu objetivo é orientar o usuário com sabedoria, clareza e pragmatismo, cruzando sempre as perguntas dele com o seu contexto financeiro real fornecido abaixo.

${financialContext}

DIRETRIZES DE RESPOSTA:
1. Responda em Português do Brasil (PT-BR).
2. Seja conciso, direto e amigável. Use formatação Markdown (negrito, listas e emojis pontuais).
3. Quando o usuário perguntar se pode comprar algo (ex: "Posso gastar R$ 200 em pizza?"), avalie se isso cabe no grupo "Desejos Pessoais / Não essenciais", se o grupo já está no limite ou estourado, e alerte sobre o impacto no saldo.
4. Nunca invente dados que contradigam o contexto financeiro acima.
`.trim();

          // Constrói o histórico no formato esperado pela API do Gemini
          const contents: any[] = [];

          // Adiciona as mensagens anteriores (até 10 mensagens para economia de tokens)
          const recentHistory = history.slice(-10);
          for (const msg of recentHistory) {
            contents.push({
              role: msg.role === 'user' ? 'user' : 'model',
              parts: [{ text: msg.text }],
            });
          }

          // Adiciona a mensagem atual
          contents.push({
            role: 'user',
            parts: [{ text: message }],
          });

          let url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`;

          const requestBody = JSON.stringify({
            contents,
            systemInstruction: {
              parts: [{ text: systemInstruction }],
            },
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024,
            },
          });

          let response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: abortController.signal,
            body: requestBody,
          });

          // Fallback resiliente caso a API retorne 404 (model not found)
          if (response.status === 404) {
            url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`;
            response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              signal: abortController.signal,
              body: requestBody,
            });
          }

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro na API do Gemini (${response.status}): ${errorText}`);
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
            // Mantém a última linha potencialmente incompleta no buffer
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
                    // Ignora chunks parciais ou formatações especiais de SSE
                  }
                }
              }
            }
          }

          // Processa qualquer resíduo restante no buffer
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
   * Converte um arquivo do tipo File em string Base64 pura (sem cabeçalho data:image/...).
   */
  async fileToBase64(file: File): Promise<{ base64Data: string; mimeType: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // result é do tipo: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
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
   * Modo Visão: Extrai dados estruturados de um comprovante ou nota fiscal.
   */
  async extractReceiptData(file: File): Promise<ReceiptExtractionResult> {
    const apiKey = this.getApiKey();

    if (!this.hasApiKey()) {
      throw new Error(
        'Chave da API do Google Gemini não configurada. Defina GEMINI_API_KEY no arquivo .env.'
      );
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

    let url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

    const requestBody = JSON.stringify({
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

    let response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody,
    });

    // Fallback resiliente caso a API retorne 404 (model not found)
    if (response.status === 404) {
      url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: requestBody,
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Falha ao ler comprovante com Gemini (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error('O Gemini não retornou nenhum dado analisável para esta imagem.');
    }

    // Sanitiza e faz o parse do JSON
    const parsed = JSON.parse(rawText.trim());

    // Validações defensivas
    const amount = typeof parsed.amount === 'number' ? Math.abs(parsed.amount) : parseFloat(String(parsed.amount).replace(/[^\d.-]/g, '')) || 0;
    
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
}
