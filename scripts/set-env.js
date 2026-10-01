const fs = require('fs');
const path = require('path');

// Caminhos dos arquivos
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const targetDir = path.join(rootDir, 'src', 'environments');
const prodEnvFile = path.join(targetDir, 'environment.ts');
const devEnvFile = path.join(targetDir, 'environment.development.ts');

// 1. Carrega variáveis do arquivo .env se existir
const envVars = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.substring(0, idx).trim();
        let value = trimmed.substring(idx + 1).trim();
        // Remove aspas simples ou duplas ao redor do valor
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.substring(1, value.length - 1);
        }
        envVars[key] = value;
      }
    }
  });
}

// 2. Mescla com process.env (variáveis injetadas pela Vercel / CI/CD têm precedência)
let supabaseUrl =
  process.env.SUPABASE_URL || envVars.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY || envVars.SUPABASE_ANON_KEY || 'placeholder-anon-key';
const geminiApiKey =
  process.env.GEMINI_API_KEY || envVars.GEMINI_API_KEY || '';

// Sanitiza URL para remover sufixos acidentais como /rest/v1/ ou barras finais
supabaseUrl = supabaseUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

// Garante que o diretório de destino existe
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// 3. Conteúdo para produção e desenvolvimento
const prodContent = `// Arquivo gerado automaticamente por scripts/set-env.js - NÃO EDITAR MANUALMENTE
export const environment = {
  production: true,
  supabase: {
    url: '${supabaseUrl}',
    anonKey: '${supabaseAnonKey}',
  },
  geminiApiKey: '${geminiApiKey}',
};
`;

const devContent = `// Arquivo gerado automaticamente por scripts/set-env.js - NÃO EDITAR MANUALMENTE
export const environment = {
  production: false,
  supabase: {
    url: '${supabaseUrl}',
    anonKey: '${supabaseAnonKey}',
  },
  geminiApiKey: '${geminiApiKey}',
};
`;

// 4. Escreve os arquivos de ambiente
fs.writeFileSync(prodEnvFile, prodContent, 'utf8');
fs.writeFileSync(devEnvFile, devContent, 'utf8');

console.log('✅ [set-env] Arquivos de ambiente Angular gerados com sucesso!');
