import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

/**
 * Cabeçalhos CORS para permitir requisições seguras a partir do frontend Angular.
 */
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // 1. Tratamento de Preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método não permitido. Utilize POST.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // 2. Validação Obrigatória de Autenticação (JWT)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Acesso negado: Header de Autorização ausente.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: 'Configurações de ambiente do Supabase ausentes.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extrai o token puro removendo o prefixo "Bearer "
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    // Inicializa o cliente Supabase para validação sem persistência de sessão em Deno
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      console.error('Erro na validação do JWT:', authError);
      return new Response(
        JSON.stringify({
          error: `Não autorizado: ${authError?.message || 'Token JWT inválido ou expirado.'}`,
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Obtenção da Chave do Gemini a partir dos Secrets do Supabase
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({
          error:
            'Chave GEMINI_API_KEY não configurada nos Secrets do Supabase. Configure com "supabase secrets set GEMINI_API_KEY=...".',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Extração do Payload da Requisição
    const body = await req.json();
    const mode = body.mode || 'chat'; // 'chat' (streaming SSE) ou 'vision' (json)
    const contents = body.contents;
    const systemInstruction = body.systemInstruction;
    const generationConfig = body.generationConfig;

    if (!contents || !Array.isArray(contents)) {
      return new Response(
        JSON.stringify({ error: 'Formato inválido: "contents" deve ser um array.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ==========================================
    // MODO CHAT: Streaming via SSE (Server-Sent Events)
    // ==========================================
    if (mode === 'chat') {
      let geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:streamGenerateContent?alt=sse&key=${geminiApiKey}`;

      const geminiPayload = JSON.stringify({
        contents,
        systemInstruction,
        generationConfig: generationConfig || {
          temperature: 0.7,
          maxOutputTokens: 1024,
        },
      });

      let geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: geminiPayload,
      });

      // Fallback automático para gemini-3.5-flash-lite se gemini-3.5-flash retornar 404/503
      if (geminiResponse.status === 404 || geminiResponse.status === 503) {
        geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:streamGenerateContent?alt=sse&key=${geminiApiKey}`;
        geminiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: geminiPayload,
        });
      }

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        return new Response(
          JSON.stringify({ error: `Erro no Google Gemini (${geminiResponse.status}): ${errorText}` }),
          { status: geminiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Repassa o stream binário diretamente como SSE para manter digitação suave e sem latência
      return new Response(geminiResponse.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // ==========================================
    // MODO VISÃO: Leitura de Comprovantes (JSON síncrono)
    // ==========================================
    if (mode === 'vision') {
      let geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${geminiApiKey}`;

      const geminiPayload = JSON.stringify({
        contents,
        generationConfig: generationConfig || {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      let geminiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: geminiPayload,
      });

      // Fallback resiliente caso 404/503
      if (geminiResponse.status === 404 || geminiResponse.status === 503) {
        geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiApiKey}`;
        geminiResponse = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: geminiPayload,
        });
      }

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        return new Response(
          JSON.stringify({ error: `Erro ao analisar imagem no Gemini (${geminiResponse.status}): ${errorText}` }),
          { status: geminiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await geminiResponse.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

    return new Response(
      JSON.stringify({ error: `Modo "${mode}" não suportado. Utilize "chat" ou "vision".` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: `Erro interno na Edge Function: ${error?.message || error}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
