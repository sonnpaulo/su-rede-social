// Multi-Provider AI Service - Fallback automático entre APIs

import { trackApiUsage } from './apiUsageService';

// ============ API KEYS (via variáveis de ambiente) ============
const API_KEYS = {
  gemini: '', // Vem do banco de dados (Settings)
  groq: import.meta.env.VITE_GROQ_API_KEY || '',
  openrouter: import.meta.env.VITE_OPENROUTER_API_KEY || '',
  mistral: import.meta.env.VITE_MISTRAL_API_KEY || '',
  openai: import.meta.env.VITE_OPENAI_API_KEY || '',
  replicate: import.meta.env.VITE_REPLICATE_API_KEY || '',
  stability: import.meta.env.VITE_STABILITY_API_KEY || '',
  fal: import.meta.env.VITE_FAL_API_KEY || '',
  huggingface: import.meta.env.VITE_HUGGINGFACE_API_KEY || '',
  twitter: {
    apiKey: import.meta.env.VITE_TWITTER_API_KEY || '',
    apiSecret: import.meta.env.VITE_TWITTER_API_SECRET || ''
  }
};

// ============ MODELOS ============
const MODELS = {
  groq: 'llama-3.3-70b-versatile', // Rápido e gratuito
  openrouter: 'meta-llama/llama-3.3-70b-instruct', // Via OpenRouter
  mistral: 'mistral-large-latest',
  openai: 'gpt-4o-mini', // Mais barato
};

// ============ PROVIDERS DE TEXTO ============

type TextProvider = 'groq' | 'openrouter' | 'mistral' | 'openai' | 'huggingface';

const TEXT_PROVIDERS: TextProvider[] = ['groq', 'openrouter', 'mistral', 'openai', 'huggingface'];

// Groq - Mais rápido, 14.400 req/dia grátis
async function callGroq(prompt: string, systemPrompt: string): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEYS.groq}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODELS.groq,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Groq: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// OpenRouter - Acesso a vários modelos
async function callOpenRouter(prompt: string, systemPrompt: string): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEYS.openrouter}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://su-rede-social.app',
    },
    body: JSON.stringify({
      model: MODELS.openrouter,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenRouter: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Mistral
async function callMistral(prompt: string, systemPrompt: string): Promise<string> {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEYS.mistral}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODELS.mistral,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Mistral: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// OpenAI
async function callOpenAI(prompt: string, systemPrompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEYS.openai}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODELS.openai,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// HuggingFace - Modelos gratuitos
async function callHuggingFace(prompt: string, systemPrompt: string): Promise<string> {
  const response = await fetch('https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEYS.huggingface}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: `<s>[INST] ${systemPrompt}\n\n${prompt} [/INST]`,
      parameters: {
        max_new_tokens: 2000,
        temperature: 0.7,
        return_full_text: false
      }
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`HuggingFace: ${error.error || response.statusText}`);
  }

  const data = await response.json();
  return data[0]?.generated_text || '';
}

// Função principal com fallback
export async function generateTextWithFallback(
  prompt: string, 
  systemPrompt: string,
  preferredProvider?: TextProvider
): Promise<{ text: string; provider: string }> {
  
  const providers = preferredProvider 
    ? [preferredProvider, ...TEXT_PROVIDERS.filter(p => p !== preferredProvider)]
    : TEXT_PROVIDERS;

  let lastError: Error | null = null;

  for (const provider of providers) {
    try {
      console.log(`Tentando ${provider}...`);
      let text: string;

      switch (provider) {
        case 'groq':
          text = await callGroq(prompt, systemPrompt);
          break;
        case 'openrouter':
          text = await callOpenRouter(prompt, systemPrompt);
          break;
        case 'mistral':
          text = await callMistral(prompt, systemPrompt);
          break;
        case 'openai':
          text = await callOpenAI(prompt, systemPrompt);
          break;
        case 'huggingface':
          text = await callHuggingFace(prompt, systemPrompt);
          break;
        default:
          continue;
      }

      trackApiUsage('text', 1500);
      console.log(`✅ Sucesso com ${provider}`);
      return { text, provider };

    } catch (error: any) {
      console.warn(`❌ ${provider} falhou:`, error.message);
      lastError = error;
      continue;
    }
  }

  throw lastError || new Error('Todos os providers falharam');
}

// ============ PROVIDERS DE IMAGEM ============

// Replicate - FLUX (melhor qualidade)
export async function generateImageReplicate(prompt: string): Promise<string> {
  // Criar prediction
  const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${API_KEYS.replicate}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: 'black-forest-labs/flux-schnell', // Rápido e grátis
      input: {
        prompt: prompt,
        aspect_ratio: '1:1',
        output_format: 'png',
        num_outputs: 1
      }
    }),
  });

  if (!createResponse.ok) {
    throw new Error(`Replicate create: ${createResponse.statusText}`);
  }

  const prediction = await createResponse.json();
  
  // Aguardar resultado (polling)
  let result = prediction;
  while (result.status !== 'succeeded' && result.status !== 'failed') {
    await new Promise(r => setTimeout(r, 1000));
    const pollResponse = await fetch(result.urls.get, {
      headers: { 'Authorization': `Token ${API_KEYS.replicate}` }
    });
    result = await pollResponse.json();
  }

  if (result.status === 'failed') {
    throw new Error('Replicate: Geração falhou');
  }

  // Converter URL para base64
  const imageUrl = result.output[0];
  const imageResponse = await fetch(imageUrl);
  const blob = await imageResponse.blob();
  
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

// Stability AI
export async function generateImageStability(prompt: string): Promise<string> {
  const response = await fetch('https://api.stability.ai/v2beta/stable-image/generate/sd3', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEYS.stability}`,
      'Accept': 'image/*',
    },
    body: (() => {
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('aspect_ratio', '1:1');
      formData.append('output_format', 'png');
      return formData;
    })(),
  });

  if (!response.ok) {
    throw new Error(`Stability: ${response.statusText}`);
  }

  const blob = await response.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

// FAL.ai - FLUX
export async function generateImageFal(prompt: string): Promise<string> {
  const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${API_KEYS.fal}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: prompt,
      image_size: 'square',
      num_images: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`FAL: ${response.statusText}`);
  }

  const data = await response.json();
  const imageUrl = data.images[0].url;
  
  // Converter para base64
  const imageResponse = await fetch(imageUrl);
  const blob = await imageResponse.blob();
  
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

// HuggingFace - Stable Diffusion gratuito
export async function generateImageHuggingFace(prompt: string): Promise<string> {
  const response = await fetch('https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEYS.huggingface}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
    }),
  });

  if (!response.ok) {
    throw new Error(`HuggingFace Image: ${response.statusText}`);
  }

  const blob = await response.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

// Função principal de imagem com fallback
export async function generateImageWithFallback(prompt: string): Promise<{ image: string; provider: string }> {
  const providers = [
    { name: 'fal', fn: generateImageFal },
    { name: 'replicate', fn: generateImageReplicate },
    { name: 'stability', fn: generateImageStability },
    { name: 'huggingface', fn: generateImageHuggingFace },
  ];

  let lastError: Error | null = null;

  for (const { name, fn } of providers) {
    try {
      console.log(`Tentando imagem com ${name}...`);
      const image = await fn(prompt);
      trackApiUsage('image');
      console.log(`✅ Imagem gerada com ${name}`);
      return { image, provider: name };
    } catch (error: any) {
      console.warn(`❌ ${name} falhou:`, error.message);
      lastError = error;
      continue;
    }
  }

  throw lastError || new Error('Todos os providers de imagem falharam');
}
