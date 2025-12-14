import { GoogleGenAI, Type } from "@google/genai";
import { BrandIdentity, TextGenerationResponse, TemplateData, TemplateType, CarouselSlide } from "../types";
import { getBrandProfile } from "./supabaseClient";
import { trackApiUsage } from "./apiUsageService";
import { generateTextWithFallback, generateImageWithFallback } from "./aiProviders";

// Variável para armazenar a instância
let aiInstance: GoogleGenAI | null = null;
let currentKey: string = '';

// Modelos disponíveis em ordem de preferência
const MODELS = {
  primary: 'gemini-2.5-flash',
  fallback: 'gemini-2.0-flash',  // Fallback se o principal estiver em rate limit
};

// Helper para retry com delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Wrapper com retry rápido - vai pro fallback logo se Gemini der rate limit
const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 1,
  initialDelay: number = 2000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Se for rate limit (429), espera pouco e vai pro fallback
      if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        if (attempt < maxRetries) {
          console.log(`Rate limit Gemini. Aguardando ${initialDelay/1000}s...`);
          await sleep(initialDelay);
          continue;
        }
        console.log('Gemini em rate limit, usando fallback (Groq/Mistral)...');
      }
      
      throw error;
    }
  }
  
  throw lastError;
};

// Função auxiliar para obter o cliente AI, priorizando a chave do banco
const getAI = async () => {
    // 1. Tenta buscar a marca e a chave do banco
    const profile = await getBrandProfile();
    const apiKey = profile?.apiKey || process.env.API_KEY || '';

    // Se já temos uma instância com a mesma chave, reusa
    if (aiInstance && currentKey === apiKey) {
        return aiInstance;
    }

    if (!apiKey) {
        throw new Error("API Key do Gemini não encontrada. Configure-a nas 'Configurações'.");
    }

    // Cria nova instância
    aiInstance = new GoogleGenAI({ apiKey });
    currentKey = apiKey;
    return aiInstance;
}

// GUIA DE ESTILO SÚ CONTROLE - HARDCODED PARA GARANTIR CONSISTÊNCIA
const SUCONTROLE_STYLE_GUIDE = `
ESTILO VISUAL OBRIGATÓRIO (SU CONTROLE):
- NOME DA MARCA: SU Controle (NUNCA USE ACENTO AGUDO NO "U"). É "SU", não "Sú".
- Cores: Predominância de branco, cinza claro (#f0f0f0) e acentos em laranja (#ff6e40) ou roxo/azul escuro (#1a1a2e).
- Estilo: Minimalista, limpo, moderno, "flat design" ou fotografia high-end com iluminação suave.
- Elementos: Ícones simples, muito espaço em branco (respiro), tipografia grande e legível.
- NUNCA GERAR: Imagens poluídas, neon excessivo, estilo cyberpunk, 3D complexo ou cores que fujam da paleta da marca.
- Se for foto real: Pessoas comuns em situações financeiras cotidianas, mas com estética limpa e organizada.
`;

const cleanJsonResult = (text: string): string => {
  let result = text;
  
  // Remove markdown code blocks
  const jsonMatch = result.match(/```json\n([\s\S]*?)\n```/);
  if (jsonMatch && jsonMatch[1]) {
    result = jsonMatch[1];
  }
  
  // Remove caracteres de controle que quebram JSON.parse
  // Substitui quebras de linha literais dentro de strings por \n escapado
  result = result.replace(/[\x00-\x1F\x7F]/g, (char) => {
    if (char === '\n') return '\\n';
    if (char === '\r') return '\\r';
    if (char === '\t') return '\\t';
    return '';
  });
  
  return result;
};

const fetchWebPageContent = async (url: string): Promise<string> => {
  if (!url) return "";
  let cleanUrl = url.trim();
  if (!cleanUrl.startsWith('http')) {
      cleanUrl = `https://${cleanUrl}`;
  }

  try {
      console.log(`Tentando ler diretamente: ${cleanUrl}`);
      const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(cleanUrl)}`);
      const data = await response.json();
      
      if (data.contents) {
          return data.contents.substring(0, 25000); 
      }
      return "";
  } catch (error) {
      console.warn(`Não foi possível ler o site ${url} diretamente.`, error);
      return "";
  }
};

export const analyzeBrandIdentity = async (website: string, extraLink: string, instagram: string): Promise<BrandIdentity> => {
  // A análise inicial pode usar a ENV var padrão se o usuário ainda não tiver configurado a dele
  // Mas idealmente já usamos getAI se possível
  let ai;
  try {
      ai = await getAI();
  } catch (e) {
      // Fallback para key de ambiente se a do banco falhar no setup inicial
      if (process.env.API_KEY) {
          ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      } else {
          throw e;
      }
  }

  const [site1Content, site2Content] = await Promise.all([
      fetchWebPageContent(website),
      fetchWebPageContent(extraLink)
  ]);

  const prompt = `
    Atue como um especialista em Branding e Marketing Digital.
    Preciso que você analise a identidade de uma marca.
    
    IMPORTANTE: O nome da marca pode aparecer como "Sú Controle" em textos antigos, mas o padrão oficial agora é "SU Controle" (sem acento).
    
    FONTES DE DADOS:
    ${site1Content ? `1. CONTEÚDO BRUTO DO SITE PRINCIPAL (${website}):\n"""${site1Content}"""\n` : `1. URL Principal: ${website} (Conteúdo não acessível, tente inferir)`}
    ${site2Content ? `2. CONTEÚDO BRUTO DO SITE SECUNDÁRIO (${extraLink}):\n"""${site2Content}"""\n` : `2. URL Secundária: ${extraLink}`}
    3. Perfil do Instagram: "${instagram}" (Use a ferramenta de busca para analisar este perfil se necessário).
    
    INSTRUÇÕES:
    - O site pode ser novo, então confie mais no TEXTO BRUTO fornecido acima do que na pesquisa do Google para os sites.
    - Analise o texto para identificar o nome da marca, o que ela vende e como ela fala.
    
    Retorne um JSON estritamente com:
    - name: Nome da marca (Use "SU Controle").
    - description: O que a empresa faz (resumo de 20 palavras).
    - colors: Array com 3 cores Hex (Ex: #000000). Se não achar no HTML, sugira cores baseadas no nicho.
    - toneOfVoice: O tom de voz (Ex: Autoritário, Amigável, Luxuoso).
    - niche: O nicho de mercado específico.
    - targetAudience: Público alvo.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: prompt,
      config: {
        responseMimeType: "application/json", 
      }
    });

    const text = response.text;
    if (!text) throw new Error("Não foi possível analisar a marca.");

    const cleanText = cleanJsonResult(text);
    const data = JSON.parse(cleanText);
    
    return {
      ...data,
      website: extraLink ? `${website} | ${extraLink}` : website,
      instagram
    };

  } catch (error) {
    console.error("Erro na análise de marca:", error);
    return {
        name: "SU Controle",
        website: extraLink ? `${website} | ${extraLink}` : website,
        instagram,
        description: "Gestão financeira simplificada.",
        colors: ["#ff6e40", "#1a1a2e", "#f0f0f0"],
        toneOfVoice: "Simples, acessível, motivador",
        niche: "Finanças Pessoais",
        targetAudience: "Pessoas que querem organizar as contas"
    };
  }
};

export const generateSocialText = async (
  topic: string,
  platform: string,
  brandContext?: BrandIdentity,
  historyContext: string[] = []
): Promise<TextGenerationResponse> => {
  const ai = await getAI();

  let systemInstruction = `Você é um copywriter sênior especializado em redes sociais, com 10 anos de experiência criando conteúdo viral para marcas de finanças pessoais. Você domina técnicas de storytelling, gatilhos mentais e copywriting persuasivo.

SUA MISSÃO: Criar posts que CONECTAM emocionalmente, EDUCAM de forma simples e CONVERTEM em engajamento.

MARCA: "a SU Controle" (FEMININO - sempre use "a SU Controle", nunca "o SU Controle")
- NUNCA escreva "Sú" com acento - é "SU" sem acento!
- NUNCA chame de "app" ou "aplicativo" - a SU Controle é uma PLATAFORMA de gestão financeira
- Tom: Amiga que entende suas dificuldades, não uma professora chata
- Linguagem: Simples como conversa de WhatsApp, zero economês
- Objetivo: Fazer a pessoa sentir que controlar dinheiro é FÁCIL

TOM DE VOZ OBRIGATÓRIO (SU CONTROLE):
- Fale como PESSOA REAL conversando: calmo, gentil, simples, prático, humano
- Use expressões: "vamos fazer juntos", "passo a passo", "devagar e sempre", "respira", "tá tudo bem", "isso aqui é simples", "calma", "sem pressa", "olha só", "percebe?", "que tal?"
- PALAVRAS PROIBIDAS: insights, framework, mindset, performance, implementar, analisar, estratégia, otimizar, gerenciar
- SUBSTITUA: implementar→fazer, analisar→olhar, estratégia→jeito, otimizar→melhorar, gerenciar→cuidar
- Frases CURTAS (máximo 8 linhas), palavras SIMPLES do dia a dia
- Tom ACOLHEDOR, zero julgamento, mensagem PRÁTICA e clara

REGRAS DE SEGURANÇA (MUITO IMPORTANTE):
- NUNCA fale sobre investimentos, ações, fundos, renda variável ou qualquer tipo de aplicação financeira
- NUNCA incentive a pessoa a investir dinheiro em nada
- Foque APENAS em: organização financeira, controle de gastos, economia, orçamento, metas de economia
- Se o tema envolver investimento, redirecione para "guardar dinheiro" ou "economizar"

REGRA DE TRATAMENTO:
- VARIE o tratamento em cada post: use "Ei, você", "Oi, pessoal", "E aí, galera", "Bora lá", etc.
- Seja inclusivo - alterne tratamentos para alcançar todo mundo
- Quando mencionar a marca, use: "a SU Controle te ajuda", "assine a SU Controle", "com a SU Controle"
- CTA OBRIGATÓRIO: Sempre use "ASSINE AGORA" ou "Assine a SU Controle" - NUNCA "baixe" ou "download"`;
  
  if (brandContext) {
      systemInstruction += `

CONTEXTO DA MARCA:
- Nicho: ${brandContext.niche}
- Público: ${brandContext.targetAudience}
- Tom de voz: ${brandContext.toneOfVoice}
- Cores visuais: ${brandContext.colors.join(', ')}`;
  }

  const historyPrompt = historyContext.length > 0 
    ? `\n\nPOSTS ANTERIORES (não repita esses temas):\n${historyContext.join('\n')}`
    : "";

  const platformTips: Record<string, string> = {
    'INSTAGRAM': 'Use ganchos fortes na primeira linha. Quebre em parágrafos curtos. CTAs no final. Máximo 2200 caracteres.',
    'TIKTOK': 'Seja direto e provocativo. Use linguagem jovem. Ganchos polêmicos funcionam. Curto e impactante.',
    'LINKEDIN': 'Tom mais profissional mas ainda acessível. Storytelling pessoal funciona. Insights práticos.',
    'TWITTER': 'Máximo 280 caracteres. Seja conciso e memorável. Uma ideia forte por tweet.'
  };

  const prompt = `${historyPrompt}

TAREFA: Crie um post VIRAL para ${platform} sobre: "${topic}"

DICAS PARA ${platform}: ${platformTips[platform] || 'Adapte ao formato da plataforma.'}

TÉCNICAS OBRIGATÓRIAS:
1. GANCHO: Primeira frase deve parar o scroll (pergunta, dado chocante, ou provocação)
2. CONEXÃO: Mostre que você entende a dor/desejo do público
3. VALOR: Entregue algo útil (dica, insight, reflexão)
4. CTA: Termine com chamada para ação (comentar, salvar, compartilhar)

REGRAS DE FORMATAÇÃO (MUITO IMPORTANTE):
- PROIBIDO usar markdown: nada de ** (negrito), * (itálico), # (títulos), _ (sublinhado)
- Instagram NÃO renderiza markdown, então o texto fica feio com asteriscos
- Use APENAS texto puro, emojis e quebras de linha
- Use emojis estrategicamente para destacar (não exagere)
- Parágrafos curtos (máximo 2 linhas)
- Espaçamento entre blocos de texto

RETORNE APENAS JSON VÁLIDO:
{
  "caption": "texto completo do post aqui",
  "hashtags": ["5 a 10 hashtags relevantes"],
  "suggestedImagePrompt": "Prompt detalhado em inglês para imagem minimalista, clean, cores ${brandContext?.colors.join(', ') || '#ff6e40, #1a1a2e'}, estilo flat design ou foto lifestyle"
}`;

  try {
    const response = await withRetry(async () => {
      return await ai.models.generateContent({
        model: MODELS.primary, 
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json"
        }
      });
    });

    const text = response.text;
    if (!text) throw new Error("Resposta vazia do Gemini");
    
    // Track usage (~1500 tokens por request de texto)
    trackApiUsage('text', 1500);
    
    // Emitir evento com provider usado
    window.dispatchEvent(new CustomEvent('ai-provider-used', { detail: { provider: 'Gemini', type: 'text' } }));
    
    // Parse JSON - o modelo já retorna JSON limpo com responseMimeType
    const result = JSON.parse(text) as TextGenerationResponse;
    return result;
  } catch (error: any) {
    console.error("Gemini falhou, tentando fallback:", error.message);
    
    // Tentar com outros providers (Groq, OpenRouter, etc)
    try {
      // Busca IA preferida do usuário
      const profile = await getBrandProfile();
      const preferredAI = profile?.preferredAI as any;
      
      console.log(`🔄 Usando fallback (preferido: ${preferredAI || 'groq'})...`);
      const { text, provider } = await generateTextWithFallback(prompt, systemInstruction, preferredAI);
      console.log(`✅ Fallback bem-sucedido com ${provider}`);
      
      // Emitir evento com provider usado
      window.dispatchEvent(new CustomEvent('ai-provider-used', { detail: { provider, type: 'text' } }));
      
      // Limpar e parsear JSON
      let cleanText = text;
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) cleanText = jsonMatch[1];
      
      const result = JSON.parse(cleanText) as TextGenerationResponse;
      return result;
    } catch (fallbackError: any) {
      console.error("Fallback também falhou:", fallbackError.message);
      
      // Mensagem amigável
      if (error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
        throw new Error(
          "Limite de requisições atingido em todos os providers. Tente novamente em alguns minutos."
        );
      }
      throw error;
    }
  }
};

export const generateTemplateData = async (
  topic: string,
  templateType: TemplateType,
  brandContext?: BrandIdentity
): Promise<TemplateData> => {
  const ai = await getAI();

  const prompt = `
    Você é um designer gráfico e redator para a marca SU Controle.
    Crie o conteúdo de texto para um post visual estilo "${templateType}" sobre: "${topic}".
    
    Regras de Redação:
    - Frases curtas e diretas.
    - Fonte Poppins será usada, então capriche na legibilidade.
    - Evite "economês". Fale a língua do povo.
    - SEMPRE escreva "SU Controle" (NUNCA "Sú Controle" com acento!)
    - Varie o tratamento: "você", "pessoal", "galera" - não só "amiga"
    - PROIBIDO markdown: nada de ** ou * ou # - use texto puro

    Retorne APENAS JSON:
    {
      "title": "Manchete curta e impactante (max 7 palavras)",
      "body": "Texto de apoio ou explicação (max 15 palavras). Se for Citação, coloque a frase aqui.",
      "highlight": "Uma pequena tag de destaque (Ex: Dica, Atenção, Cuidado)",
      "footer": "Chamada para ação curta (Ex: Baixe o App)",
      "iconName": "Nome de um ícone da biblioteca Lucide React que represente o tema (Ex: DollarSign, AlertTriangle, CheckCircle2, TrendingUp, Lightbulb)"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) throw new Error("Erro ao gerar dados do template");
    trackApiUsage('text', 800);
    return JSON.parse(text);
  } catch (error) {
    console.error("Erro template data:", error);
    throw error;
  }
};

export const generateCarouselData = async (
  topic: string,
  _brandContext?: BrandIdentity
): Promise<CarouselSlide[]> => {
  const prompt = `
    Crie um Carrossel Educativo de 5 slides para o Instagram da marca "a SU Controle" sobre: "${topic}".
    
    SOBRE A MARCA:
    - Nome: "a SU Controle" (FEMININO, sem acento no U)
    - NUNCA chame de "app" ou "aplicativo" - é uma PLATAFORMA de gestão financeira
    - Foco: organização financeira, controle de gastos, economia doméstica
    
    TOM DE VOZ OBRIGATÓRIO (SU CONTROLE):
    - Fale como PESSOA REAL: calmo, gentil, simples, prático, humano
    - Use: "vamos fazer juntos", "passo a passo", "devagar e sempre", "respira", "tá tudo bem", "calma", "sem pressa", "olha só", "percebe?"
    - PROIBIDO: insights, framework, mindset, performance, implementar, analisar, estratégia, otimizar
    - SUBSTITUA: implementar→fazer, analisar→olhar, estratégia→jeito, otimizar→melhorar
    - Frases CURTAS, palavras SIMPLES, tom ACOLHEDOR, zero julgamento
    
    REGRAS DE SEGURANÇA (OBRIGATÓRIO):
    - NUNCA fale sobre investimentos, ações, fundos ou renda variável
    - NUNCA incentive a investir dinheiro
    - Foque APENAS em: economizar, organizar contas, controlar gastos, guardar dinheiro
    - Se o tema envolver investimento, mude para "guardar dinheiro" ou "criar reserva"
    
    ESTRUTURA OBRIGATÓRIA:
    - Slide 1: CAPA com título impactante (3-6 palavras) + subtítulo explicativo (8-12 palavras)
    - Slide 2, 3, 4: CONTEÚDO com dicas práticas, cada um com título curto (2-4 palavras) e corpo detalhado (8-15 palavras)
    - Slide 5: CTA com "ASSINE AGORA" + frase motivacional (8-12 palavras)

    REGRAS DE TEXTO:
    - O "body" de cada slide DEVE ter entre 8 e 15 palavras - NUNCA menos que 8!
    - Use português simples e direto, sem jargões financeiros
    - SEMPRE escreva "SU Controle" (NUNCA "Sú" com acento!)
    - Varie o tratamento: use "você", "pessoal", "galera" - não só "amiga"
    - PROIBIDO markdown: nada de ** ou * ou # - use texto puro
    - CTA: Use "ASSINE AGORA" - NUNCA "baixe" ou "download"

    EXEMPLOS DE BODY BOM vs RUIM:
    ❌ RUIM: "Anote gastos" (muito curto)
    ✅ BOM: "Anote todos os seus gastos diariamente. Isso já ajuda muito." (10 palavras)
    
    ❌ RUIM: "Invista seu dinheiro" (proibido falar de investimento!)
    ✅ BOM: "Guarde 10% do salário assim que receber. Devagar e sempre." (11 palavras)

    Retorne APENAS um JSON array de 5 objetos:
    [
      { "type": "COVER", "title": "Título Impactante Aqui", "body": "Subtítulo explicativo com oito a doze palavras completas", "pageNumber": 1, "totalPages": 5 },
      { "type": "CONTENT", "title": "Dica 1", "body": "Explicação detalhada da dica com oito a quinze palavras", "pageNumber": 2, "totalPages": 5 },
      { "type": "CONTENT", "title": "Dica 2", "body": "Explicação detalhada da dica com oito a quinze palavras", "pageNumber": 3, "totalPages": 5 },
      { "type": "CONTENT", "title": "Dica 3", "body": "Explicação detalhada da dica com oito a quinze palavras", "pageNumber": 4, "totalPages": 5 },
      { "type": "CTA", "title": "ASSINE AGORA", "body": "Frase motivacional com oito a doze palavras completas", "pageNumber": 5, "totalPages": 5 }
    ]
  `;

  try {
    // Tenta Gemini primeiro
    const ai = await getAI();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) throw new Error("Erro ao gerar carrossel");
    trackApiUsage('text', 1200);
    
    window.dispatchEvent(new CustomEvent('ai-provider-used', { detail: { provider: 'Gemini', type: 'carousel' } }));
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Gemini falhou para carrossel, tentando fallback:", error.message);
    
    // Fallback para outros providers
    try {
      const fallbackSystemPrompt = `Você é um copywriter especialista em carrosséis para Instagram da marca "a SU Controle" (plataforma de gestão financeira).

REGRAS CRÍTICAS:
1. Retorne APENAS JSON válido, sem markdown, sem explicações
2. O "body" de cada slide DEVE ter entre 8 e 15 palavras - NUNCA menos!
3. Use português brasileiro simples e direto
4. NUNCA use "Sú" com acento - é "SU Controle" (feminino: "a SU Controle")
5. NUNCA chame de "app" ou "aplicativo" - é uma PLATAFORMA
6. NUNCA fale sobre investimentos, ações ou fundos - foque em ECONOMIZAR e ORGANIZAR
7. CTA sempre "ASSINE AGORA" - nunca "baixe" ou "download"
8. Varie tratamento: "você", "pessoal", "galera" - não só "amiga"`;
      
      // Busca IA preferida do usuário
      const profile = await getBrandProfile();
      const preferredAI = profile?.preferredAI as any;
      
      const { text, provider } = await generateTextWithFallback(prompt, fallbackSystemPrompt, preferredAI);
      console.log(`✅ Carrossel gerado com ${provider}`);
      
      window.dispatchEvent(new CustomEvent('ai-provider-used', { detail: { provider, type: 'carousel' } }));
      
      // Limpar e parsear JSON
      let cleanText = text;
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) cleanText = jsonMatch[1];
      
      const arrayMatch = cleanText.match(/\[[\s\S]*\]/);
      if (arrayMatch) cleanText = arrayMatch[0];
      
      return JSON.parse(cleanText);
    } catch (fallbackError: any) {
      console.error("Fallback também falhou:", fallbackError.message);
      
      // Retorna carrossel padrão se tudo falhar
      return [
        { type: "COVER" as const, title: topic, body: "Dicas práticas para você", pageNumber: 1, totalPages: 5 },
        { type: "CONTENT" as const, title: "Dica 1", body: "Anote todos os seus gastos diariamente", pageNumber: 2, totalPages: 5 },
        { type: "CONTENT" as const, title: "Dica 2", body: "Separe 10% do salário assim que receber", pageNumber: 3, totalPages: 5 },
        { type: "CONTENT" as const, title: "Dica 3", body: "Evite compras por impulso, espere 24h", pageNumber: 4, totalPages: 5 },
        { type: "CTA" as const, title: "Assine a SU Controle", body: "Organize suas finanças de forma simples", pageNumber: 5, totalPages: 5 }
      ];
    }
  }
};

export const generateSocialImage = async (prompt: string): Promise<string> => {
  const enhancedPrompt = `
    ${prompt}
    
    Style: Minimalist, clean design. White/light gray background. 
    Brand colors: orange (#ff6e40) and dark blue (#1a1a2e) accents.
    Modern flat design or high-end lifestyle photography.
    Professional social media post aesthetic.
  `;

  try {
    // Usar providers de imagem com fallback (FAL → Replicate → Stability)
    console.log("🖼️ Gerando imagem com AI providers...");
    const { image, provider } = await generateImageWithFallback(enhancedPrompt);
    console.log(`✅ Imagem gerada com ${provider}`);
    return image;
  } catch (error: any) {
    console.error("Erro ao gerar imagem:", error);
    throw new Error(
      "Não foi possível gerar a imagem. Tente novamente ou use 'Post Único HD'."
    );
  }
};

export const analyzeImageAndGenerateCaption = async (
  base64Image: string,
  brandContext?: BrandIdentity
): Promise<TextGenerationResponse> => {
  const ai = await getAI();

  const pureBase64 = base64Image.split(',')[1] || base64Image;

  const prompt = `
    Aja como o Social Media Manager E Designer da marca SU Controle.
    Analise esta imagem que o usuário enviou.

    TAREFA 1 (LEGENDA):
    Escreva uma legenda para o Instagram que conecte o que está na foto com a solução da SU Controle.
    Use o tom de voz: ${brandContext ? brandContext.toneOfVoice : "Simples, direto e motivador."}
    
    TAREFA 2 (REMASTERIZAÇÃO DE DESIGN):
    Eu quero "consertar" o design dessa imagem usando nossa identidade visual oficial.
    Leia o texto que está na imagem (OCR). Se não tiver texto, crie um título curto baseado no que você vê.
    Adapte o texto para o estilo SU Controle (Sem acento em SU, linguagem simples).
    
    Retorne um JSON com:
    {
      "caption": "Legenda completa...",
      "hashtags": ["tags"],
      "suggestedImagePrompt": "...",
      "extractedTemplateData": {
         "title": "O Título Principal da imagem (max 7 palavras)",
         "body": "O texto de apoio ou corpo (max 15 palavras). Resuma se for longo.",
         "highlight": "Uma palavra de destaque (Ex: Dica, Cuidado)",
         "footer": "Assine Agora",
         "iconName": "Escolha um icone Lucide: DollarSign, AlertTriangle, CheckCircle2, TrendingUp"
      }
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", 
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: pureBase64 } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text;
    if (!text) throw new Error("Erro ao analisar imagem");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Erro vision:", error);
    throw error;
  }
};

export const generateSocialVideo = async (prompt: string): Promise<string> => {
  const ai = await getAI();

  // Veo ainda exige chave manual em alguns fluxos, mas aqui estamos usando a do cliente
  // Se a chave não for válida para vídeo, dará erro, mas é esperado no MVP
  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: `${prompt}. ${SUCONTROLE_STYLE_GUIDE}`, 
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '9:16'
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    
    if (!videoUri) throw new Error("Falha na geração do vídeo");
    
    trackApiUsage('video');
    
    // Anexa a chave (que sabemos que está carregada pois getAI foi chamado)
    return `${videoUri}&key=${currentKey}`;

  } catch (error) {
    console.error("Erro ao gerar vídeo:", error);
    return "MOCK_VIDEO_ERROR"; 
  }
};

export const fetchVideoBlob = async (videoUrl: string): Promise<string> => {
    try {
        const response = await fetch(videoUrl);
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (e) {
        console.error("Erro ao baixar vídeo", e);
        return "";
    }
}

export const generateWeeklyContentPlan = async (brandContext: BrandIdentity): Promise<{ day: string, topic: string, type: string }[]> => {
    const prompt = `
      Você é um estrategista de conteúdo para a marca ${brandContext.name} (SU Controle).
      Crie um plano de conteúdo de 5 dias (Segunda a Sexta) para esta semana.
      
      Nicho: ${brandContext.niche}
      Objetivo: Educar, Engajar e Vender (balanceado).
      
      Retorne APENAS um JSON array com exatamente 5 objetos:
      [
        {"day": "Segunda", "topic": "Dica rápida de economia", "type": "CAROUSEL"},
        {"day": "Terça", "topic": "Mito vs Verdade sobre cartão", "type": "CAROUSEL"},
        {"day": "Quarta", "topic": "Como organizar as contas do mês", "type": "CAROUSEL"},
        {"day": "Quinta", "topic": "Erro comum que te deixa no vermelho", "type": "CAROUSEL"},
        {"day": "Sexta", "topic": "Desafio: economize R$50 essa semana", "type": "CAROUSEL"}
      ]
    `;
  
    try {
      // Tenta Gemini primeiro
      const ai = await getAI();
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      
      const text = response.text;
      if (!text) throw new Error("Sem resposta do plano.");
      
      return JSON.parse(text);
    } catch (error: any) {
      console.error("Gemini falhou para plano, tentando fallback:", error.message);
      
      // Fallback para outros providers
      try {
        // Busca IA preferida do usuário
        const profile = await getBrandProfile();
        const preferredAI = profile?.preferredAI as any;
        
        const { text, provider } = await generateTextWithFallback(prompt, "Você é um estrategista de conteúdo. Retorne APENAS JSON válido, sem markdown.", preferredAI);
        console.log(`✅ Plano gerado com ${provider}`);
        
        // Limpar e parsear JSON
        let cleanText = text;
        const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
        if (jsonMatch) cleanText = jsonMatch[1];
        
        // Tentar encontrar o array no texto
        const arrayMatch = cleanText.match(/\[[\s\S]*\]/);
        if (arrayMatch) cleanText = arrayMatch[0];
        
        return JSON.parse(cleanText);
      } catch (fallbackError: any) {
        console.error("Fallback também falhou:", fallbackError.message);
        
        // Retorna plano padrão se tudo falhar
        return [
          { day: "Segunda", topic: "Como economizar no mercado", type: "CAROUSEL" },
          { day: "Terça", topic: "3 erros que te deixam no vermelho", type: "CAROUSEL" },
          { day: "Quarta", topic: "Organize suas contas em 5 minutos", type: "CAROUSEL" },
          { day: "Quinta", topic: "Mitos sobre cartão de crédito", type: "CAROUSEL" },
          { day: "Sexta", topic: "Desafio: guarde R$20 hoje", type: "CAROUSEL" }
        ];
      }
    }
  };