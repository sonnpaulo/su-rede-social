import { supabase } from './supabaseClient';

export interface ApiUsageStats {
  textRequests: number;
  imageRequests: number;
  videoRequests: number;
  audioRequests: number;
  tokensUsed: number;
  date: string;
}

// Buscar uso de hoje do banco
export const getApiUsage = async (): Promise<ApiUsageStats> => {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const { data, error } = await supabase
      .from('api_usage')
      .select('*')
      .eq('date', today)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      return {
        textRequests: data.text_requests || 0,
        imageRequests: data.image_requests || 0,
        videoRequests: data.video_requests || 0,
        audioRequests: data.audio_requests || 0,
        tokensUsed: data.tokens_used || 0,
        date: data.date
      };
    }

    // Se não existe registro de hoje, criar
    const { data: newData } = await supabase
      .from('api_usage')
      .insert({ date: today })
      .select()
      .single();

    return {
      textRequests: 0,
      imageRequests: 0,
      videoRequests: 0,
      audioRequests: 0,
      tokensUsed: 0,
      date: today
    };
  } catch (error) {
    console.error('Erro ao buscar uso da API:', error);
    // Fallback para localStorage se banco falhar
    return getLocalUsage();
  }
};

// Track de uso - incrementa no banco
export const trackApiUsage = async (
  type: 'text' | 'image' | 'video' | 'audio', 
  tokens: number = 0
): Promise<void> => {
  const today = new Date().toISOString().split('T')[0];

  try {
    // Primeiro, garantir que existe registro de hoje
    await supabase
      .from('api_usage')
      .upsert({ date: today }, { onConflict: 'date' });

    // Incrementar o campo correto
    const fieldMap = {
      text: 'text_requests',
      image: 'image_requests',
      video: 'video_requests',
      audio: 'audio_requests'
    };

    const field = fieldMap[type];
    
    // Buscar valor atual
    const { data } = await supabase
      .from('api_usage')
      .select(field + ', tokens_used')
      .eq('date', today)
      .single();

    if (data) {
      const currentValue = (data as any)[field] || 0;
      const currentTokens = data.tokens_used || 0;
      
      await supabase
        .from('api_usage')
        .update({ 
          [field]: currentValue + 1,
          tokens_used: currentTokens + tokens
        })
        .eq('date', today);
    }

    // Também salvar no localStorage como backup
    trackLocalUsage(type, tokens);
  } catch (error) {
    console.error('Erro ao trackear uso:', error);
    // Fallback para localStorage
    trackLocalUsage(type, tokens);
  }
};

// Resetar uso de hoje
export const resetApiUsage = async (): Promise<void> => {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    await supabase
      .from('api_usage')
      .update({
        text_requests: 0,
        image_requests: 0,
        video_requests: 0,
        audio_requests: 0,
        tokens_used: 0
      })
      .eq('date', today);
      
    resetLocalUsage();
  } catch (error) {
    console.error('Erro ao resetar uso:', error);
    resetLocalUsage();
  }
};

// ============ FALLBACK LOCALSTORAGE ============

const USAGE_KEY = 'su_api_usage';

const getLocalUsage = (): ApiUsageStats => {
  const stored = localStorage.getItem(USAGE_KEY);
  const today = new Date().toISOString().split('T')[0];
  
  if (stored) {
    const usage = JSON.parse(stored);
    if (usage.date === today) {
      return usage;
    }
  }
  
  return {
    textRequests: 0,
    imageRequests: 0,
    videoRequests: 0,
    audioRequests: 0,
    tokensUsed: 0,
    date: today
  };
};

const trackLocalUsage = (type: 'text' | 'image' | 'video' | 'audio', tokens: number = 0) => {
  const usage = getLocalUsage();
  
  if (type === 'text') usage.textRequests++;
  else if (type === 'image') usage.imageRequests++;
  else if (type === 'video') usage.videoRequests++;
  else if (type === 'audio') usage.audioRequests++;
  
  usage.tokensUsed += tokens;
  localStorage.setItem(USAGE_KEY, JSON.stringify(usage));
};

const resetLocalUsage = () => {
  const today = new Date().toISOString().split('T')[0];
  localStorage.setItem(USAGE_KEY, JSON.stringify({
    textRequests: 0,
    imageRequests: 0,
    videoRequests: 0,
    audioRequests: 0,
    tokensUsed: 0,
    date: today
  }));
};
