import { getBrandProfile } from './supabaseClient';
import { trackApiUsage } from './apiUsageService';

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Vozes brasileiras recomendadas (IDs públicos)
export const VOICE_OPTIONS = [
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily (Feminina)', description: 'Voz feminina natural e amigável' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam (Masculina)', description: 'Voz masculina clara e profissional' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte (Feminina)', description: 'Voz feminina suave e acolhedora' },
];

export interface TextToSpeechOptions {
  text: string;
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
}

const getApiKey = async (): Promise<string> => {
  const profile = await getBrandProfile();
  const apiKey = profile?.elevenLabsApiKey;
  
  if (!apiKey) {
    throw new Error('API Key do ElevenLabs não configurada. Vá em Configurações para adicionar.');
  }
  
  return apiKey;
};

export const generateSpeech = async (options: TextToSpeechOptions): Promise<string> => {
  const { 
    text, 
    voiceId = VOICE_OPTIONS[0].id, 
    stability = 0.5, 
    similarityBoost = 0.75 
  } = options;

  const apiKey = await getApiKey();

  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability,
          similarity_boost: similarityBoost
        }
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail?.message || `Erro ${response.status}: ${response.statusText}`);
    }

    // Converter para base64
    const audioBlob = await response.blob();
    const base64 = await blobToBase64(audioBlob);
    
    // Track usage
    await trackApiUsage('audio');
    
    return base64;
  } catch (error) {
    console.error('Erro ao gerar áudio:', error);
    throw error;
  }
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Verificar quota restante
export const checkElevenLabsQuota = async (): Promise<{ character_count: number; character_limit: number }> => {
  const apiKey = await getApiKey();
  
  const response = await fetch(`${ELEVENLABS_API_URL}/user/subscription`, {
    headers: {
      'xi-api-key': apiKey
    }
  });

  if (!response.ok) {
    throw new Error('Erro ao verificar quota');
  }

  const data = await response.json();
  return {
    character_count: data.character_count || 0,
    character_limit: data.character_limit || 10000
  };
};
