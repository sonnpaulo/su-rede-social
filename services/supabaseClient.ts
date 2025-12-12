import { createClient } from '@supabase/supabase-js';
import { BrandIdentity, DashboardStats } from '../types';

// Credenciais fornecidas diretamente para o MVP
const supabaseUrl = 'https://rmtippolgtucbwvjytng.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJtdGlwcG9sZ3R1Y2J3dmp5dG5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyOTU3MjYsImV4cCI6MjA4MDg3MTcyNn0.uLaJ-ag1qEmDsmiAQPm_XMldLF5bgzI3VKeKleOW1cU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Salva o perfil da marca (Criação ou Atualização)
 */
export const saveBrandProfile = async (brand: BrandIdentity): Promise<void> => {
  // 1. Salva no LocalStorage (Backup/Offline)
  localStorage.setItem('nexus_brand_identity', JSON.stringify(brand));

  if (!supabaseUrl || !supabaseAnonKey) return;

  try {
    // Verifica se já existe alguma marca criada
    const { data: existingData } = await supabase.from('brands').select('id').limit(1).maybeSingle();

    // Mapeia camelCase (App) para snake_case (Banco de Dados)
    const dbPayload = {
        name: brand.name,
        website: brand.website,
        instagram: brand.instagram,
        description: brand.description,
        colors: brand.colors,
        tone_of_voice: brand.toneOfVoice,
        niche: brand.niche,
        target_audience: brand.targetAudience,
        gemini_api_key: brand.apiKey || null,
        elevenlabs_api_key: brand.elevenLabsApiKey || null,
        preferred_ai: brand.preferredAI || 'gemini'
    };

    if (existingData?.id) {
      // Atualiza existente
      const { error } = await supabase
        .from('brands')
        .update(dbPayload)
        .eq('id', existingData.id);
      
      if (error) throw error;
    } else {
      // Cria nova
      const { error } = await supabase
        .from('brands')
        .insert([dbPayload]);

      if (error) throw error;
    }
  } catch (error) {
    console.error('Erro ao salvar no Supabase:', error);
  }
};

/**
 * Atualiza apenas campos específicos do perfil (Usado na tela de Configurações)
 */
export const updateBrandProfile = async (brand: BrandIdentity): Promise<void> => {
    return saveBrandProfile(brand);
};

export const getBrandProfile = async (): Promise<BrandIdentity | null> => {
  // Tenta pegar do Supabase primeiro
  if (supabaseUrl && supabaseAnonKey) {
    try {
        const { data, error } = await supabase.from('brands').select('*').limit(1).maybeSingle();
        
        if (!error && data) {
            // Mapeia snake_case (Banco) para camelCase (App)
            const brand: BrandIdentity = {
                id: data.id,
                name: data.name,
                website: data.website,
                instagram: data.instagram,
                description: data.description,
                colors: data.colors || [],
                toneOfVoice: data.tone_of_voice,
                niche: data.niche,
                targetAudience: data.target_audience,
                apiKey: data.gemini_api_key,
                elevenLabsApiKey: data.elevenlabs_api_key,
                preferredAI: data.preferred_ai || 'gemini'
            };
            
            // Atualiza cache local
            localStorage.setItem('nexus_brand_identity', JSON.stringify(brand));
            return brand;
        }
    } catch (e) {
        console.error("Erro ao buscar do Supabase, tentando cache local", e);
    }
  }

  // Fallback para LocalStorage
  const localData = localStorage.getItem('nexus_brand_identity');
  if (localData) return JSON.parse(localData);

  return null;
};

/**
 * Busca os últimos 5 posts para dar contexto à IA e evitar repetições
 */
export const getRecentPosts = async (limit: number = 5): Promise<string[]> => {
    if (!supabaseUrl || !supabaseAnonKey) return [];
    
    try {
        const { data, error } = await supabase
            .from('posts')
            .select('content, topic')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error || !data) return [];
        
        return data.map(p => `Tema: ${p.topic} -> Conteúdo: ${p.content.substring(0, 100)}...`);
    } catch (error) {
        console.error("Erro ao buscar histórico:", error);
        return [];
    }
};

/**
 * Salva um novo post no histórico
 */
export const savePost = async (topic: string, content: string, type: string, platform: string, scheduledDate?: string): Promise<void> => {
    if (!supabaseUrl || !supabaseAnonKey) return;

    try {
        await supabase.from('posts').insert([{
            topic: topic,
            content: content,
            type: type,
            platform: platform,
            scheduled_date: scheduledDate || null,
            created_at: new Date().toISOString()
        }]);
    } catch (error) {
        console.error("Erro ao salvar post:", error);
    }
};

/**
 * Busca posts por intervalo de datas (para o calendário)
 */
export const getPostsByDateRange = async (startDate: string, endDate: string): Promise<any[]> => {
    if (!supabaseUrl || !supabaseAnonKey) return [];

    try {
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .or(`scheduled_date.gte.${startDate},created_at.gte.${startDate}T00:00:00`)
            .or(`scheduled_date.lte.${endDate},created_at.lte.${endDate}T23:59:59`)
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Erro ao buscar posts por data:", error);
            return [];
        }
        
        return data || [];
    } catch (error) {
        console.error("Erro ao buscar posts:", error);
        return [];
    }
};

/**
 * Marca um post como postado
 */
export const markPostAsPosted = async (postId: string): Promise<void> => {
    if (!supabaseUrl || !supabaseAnonKey) return;

    try {
        await supabase
            .from('posts')
            .update({ posted: true, posted_at: new Date().toISOString() })
            .eq('id', postId);
    } catch (error) {
        console.error("Erro ao marcar como postado:", error);
    }
};

// ============ POST HISTORY (Histórico de Posts) ============

export interface PostHistoryItem {
  id: string;
  topic: string;
  platform: string;
  content_type: string;
  caption: string;
  hashtags: string[];
  image_prompt?: string;
  is_favorite: boolean;
  created_at: string;
}

/**
 * Salva um post no histórico do banco
 */
export const savePostToHistory = async (post: {
  topic: string;
  platform: string;
  contentType: string;
  caption: string;
  hashtags: string[];
  imagePrompt?: string;
}): Promise<PostHistoryItem | null> => {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  try {
    const { data, error } = await supabase
      .from('post_history')
      .insert([{
        topic: post.topic,
        platform: post.platform,
        content_type: post.contentType,
        caption: post.caption,
        hashtags: post.hashtags,
        image_prompt: post.imagePrompt || null,
        is_favorite: false
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erro ao salvar no histórico:", error);
    return null;
  }
};

/**
 * Busca todo o histórico de posts
 */
export const getPostHistory = async (limit: number = 100): Promise<PostHistoryItem[]> => {
  if (!supabaseUrl || !supabaseAnonKey) return [];

  try {
    const { data, error } = await supabase
      .from('post_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Erro ao buscar histórico:", error);
    return [];
  }
};

/**
 * Busca apenas posts favoritos
 */
export const getFavoritePostHistory = async (): Promise<PostHistoryItem[]> => {
  if (!supabaseUrl || !supabaseAnonKey) return [];

  try {
    const { data, error } = await supabase
      .from('post_history')
      .select('*')
      .eq('is_favorite', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Erro ao buscar favoritos:", error);
    return [];
  }
};

/**
 * Alterna favorito de um post
 */
export const togglePostHistoryFavorite = async (id: string, currentValue: boolean): Promise<boolean> => {
  if (!supabaseUrl || !supabaseAnonKey) return currentValue;

  try {
    const { error } = await supabase
      .from('post_history')
      .update({ is_favorite: !currentValue })
      .eq('id', id);

    if (error) throw error;
    return !currentValue;
  } catch (error) {
    console.error("Erro ao atualizar favorito:", error);
    return currentValue;
  }
};

/**
 * Exclui um post do histórico
 */
export const deletePostFromHistory = async (id: string): Promise<boolean> => {
  if (!supabaseUrl || !supabaseAnonKey) return false;

  try {
    const { error } = await supabase
      .from('post_history')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Erro ao excluir do histórico:", error);
    return false;
  }
};

/**
 * Exclui múltiplos posts do histórico
 */
export const deleteMultipleFromHistory = async (ids: string[]): Promise<boolean> => {
  if (!supabaseUrl || !supabaseAnonKey || ids.length === 0) return false;

  try {
    const { error } = await supabase
      .from('post_history')
      .delete()
      .in('id', ids);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Erro ao excluir múltiplos:", error);
    return false;
  }
};

/**
 * Calcula estatísticas REAIS baseadas no uso do banco de dados.
 */
export const getDashboardStats = async (): Promise<DashboardStats> => {
    if (!supabaseUrl || !supabaseAnonKey) {
        return {
            totalPosts: 0,
            postsThisWeek: 0,
            topPlatform: '-',
            mostFrequentType: '-',
            recentActivity: [],
            platformDistribution: [],
            dailyActivity: [],
            weeklyGoal: 5,
            nextScheduledPost: null
        };
    }

    try {
        const { data: allPosts, error } = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error || !allPosts) throw error;

        const now = new Date();
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);

        const totalPosts = allPosts.length;
        const postsThisWeek = allPosts.filter(p => new Date(p.created_at) > oneWeekAgo).length;

        const platformMap: Record<string, number> = {};
        const typeMap: Record<string, number> = {};
        
        const dailyMap: Record<string, number> = {};
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        
        for(let i=6; i>=0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const dayName = days[d.getDay()];
            dailyMap[dayName] = 0; 
        }

        allPosts.forEach(post => {
            const plat = post.platform || 'Outro';
            platformMap[plat] = (platformMap[plat] || 0) + 1;

            const type = post.type || 'Texto';
            typeMap[type] = (typeMap[type] || 0) + 1;

            const postDate = new Date(post.created_at);
            if (postDate > oneWeekAgo) {
                const dayName = days[postDate.getDay()];
                dailyMap[dayName] = (dailyMap[dayName] || 0) + 1;
            }
        });

        let topPlatform = '-';
        let maxPlat = 0;
        Object.entries(platformMap).forEach(([k, v]) => {
            if (v > maxPlat) {
                maxPlat = v;
                topPlatform = k;
            }
        });

        let mostFrequentType = '-';
        let maxType = 0;
        Object.entries(typeMap).forEach(([k, v]) => {
            if (v > maxType) {
                maxType = v;
                mostFrequentType = k;
            }
        });

        const platformDistribution = Object.entries(platformMap).map(([name, value]) => ({ name, value }));
        const dailyActivity = Object.entries(dailyMap).map(([name, posts]) => ({ name, posts }));

        // Buscar próximo post agendado
        let nextScheduledPost = null;
        try {
            const today = new Date().toISOString().split('T')[0];
            const { data: scheduled } = await supabase
                .from('scheduled_posts')
                .select('topic, scheduled_date')
                .gte('scheduled_date', today)
                .neq('status', 'posted')
                .order('scheduled_date', { ascending: true })
                .limit(1)
                .maybeSingle();
            
            if (scheduled) {
                const date = new Date(scheduled.scheduled_date + 'T12:00:00');
                const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
                nextScheduledPost = {
                    topic: scheduled.topic,
                    date: scheduled.scheduled_date,
                    dayName: dayNames[date.getDay()]
                };
            }
        } catch (e) {
            console.warn("Erro ao buscar próximo agendado:", e);
        }

        return {
            totalPosts,
            postsThisWeek,
            topPlatform,
            mostFrequentType: mostFrequentType.replace('POST_', '').replace('IMAGE', 'Imagem').replace('VIDEO', 'Vídeo'),
            recentActivity: allPosts.slice(0, 5),
            platformDistribution,
            dailyActivity,
            weeklyGoal: 5,
            nextScheduledPost
        };

    } catch (error) {
        console.error("Erro ao calcular stats:", error);
        return {
            totalPosts: 0,
            postsThisWeek: 0,
            topPlatform: '-',
            mostFrequentType: '-',
            recentActivity: [],
            platformDistribution: [],
            dailyActivity: [],
            weeklyGoal: 5,
            nextScheduledPost: null
        };
    }
};


// ============ SCHEDULED POSTS (Posts Agendados) ============

export interface ScheduledPost {
  id: string;
  scheduled_date: string;
  topic: string;
  platform: string;
  content_type: string;
  caption: string | null;
  hashtags: string[];
  image_urls: string[];
  carousel_style: string;
  status: 'draft' | 'ready' | 'posted';
  posted_at: string | null;
  created_at: string;
}

/**
 * Salva um post agendado
 */
export const saveScheduledPost = async (post: {
  scheduled_date: string;
  topic: string;
  platform: string;
  content_type: string;
  caption?: string;
  hashtags?: string[];
  image_urls?: string[];
  carousel_style?: string;
}): Promise<ScheduledPost | null> => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase não configurado');
    return null;
  }

  try {
    console.log('📤 Enviando para Supabase:', {
      date: post.scheduled_date,
      topic: post.topic,
      images: post.image_urls?.length || 0,
      imageSize: post.image_urls ? Math.round(JSON.stringify(post.image_urls).length / 1024) + 'KB' : '0KB'
    });

    const { data, error } = await supabase
      .from('scheduled_posts')
      .insert([{
        scheduled_date: post.scheduled_date,
        topic: post.topic,
        platform: post.platform,
        content_type: post.content_type,
        caption: post.caption || null,
        hashtags: post.hashtags || [],
        image_urls: post.image_urls || [],
        carousel_style: post.carousel_style || 'LIGHT',
        status: post.image_urls && post.image_urls.length > 0 ? 'ready' : 'draft'
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Erro do Supabase:', error);
      throw error;
    }
    
    console.log('✅ Post salvo no Supabase:', data?.id);
    return data;
  } catch (error) {
    console.error("❌ Erro ao salvar post agendado:", error);
    return null;
  }
};

/**
 * Atualiza um post agendado
 */
export const updateScheduledPost = async (
  id: string, 
  updates: Partial<Omit<ScheduledPost, 'id' | 'created_at'>>
): Promise<boolean> => {
  if (!supabaseUrl || !supabaseAnonKey) return false;

  try {
    const { error } = await supabase
      .from('scheduled_posts')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Erro ao atualizar post agendado:", error);
    return false;
  }
};

/**
 * Busca posts agendados por intervalo de datas
 */
export const getScheduledPostsByDateRange = async (
  startDate: string, 
  endDate: string
): Promise<ScheduledPost[]> => {
  if (!supabaseUrl || !supabaseAnonKey) return [];

  try {
    const { data, error } = await supabase
      .from('scheduled_posts')
      .select('*')
      .gte('scheduled_date', startDate)
      .lte('scheduled_date', endDate)
      .order('scheduled_date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Erro ao buscar posts agendados:", error);
    return [];
  }
};

/**
 * Busca um post agendado por data específica
 */
export const getScheduledPostByDate = async (date: string): Promise<ScheduledPost | null> => {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  try {
    const { data, error } = await supabase
      .from('scheduled_posts')
      .select('*')
      .eq('scheduled_date', date)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erro ao buscar post por data:", error);
    return null;
  }
};

/**
 * Marca post como postado
 */
export const markScheduledPostAsPosted = async (id: string): Promise<boolean> => {
  return updateScheduledPost(id, { 
    status: 'posted', 
    posted_at: new Date().toISOString() 
  });
};

/**
 * Exclui um post agendado
 */
export const deleteScheduledPost = async (id: string): Promise<boolean> => {
  if (!supabaseUrl || !supabaseAnonKey) return false;

  try {
    const { error } = await supabase
      .from('scheduled_posts')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Erro ao excluir post agendado:", error);
    return false;
  }
};

// ============ STORAGE (Upload de Imagens) ============
// NOTA: Atualmente salvamos imagens como base64 direto no banco (image_urls)
// para evitar problemas com RLS policies do Storage.
// Se quiser usar Storage no futuro, configure as policies:
// - INSERT policy para anon role no bucket 'post-images'
// - SELECT policy para anon role no bucket 'post-images'

const STORAGE_BUCKET = 'post-images';

/**
 * Faz upload de uma imagem para o Supabase Storage
 * NOTA: Não está sendo usado - salvamos base64 direto no banco
 */
export const uploadImage = async (
  base64Data: string, 
  fileName: string
): Promise<string | null> => {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  try {
    // Converter base64 para blob usando fetch (mais robusto)
    const response = await fetch(base64Data);
    const blob = await response.blob();

    // Upload para o storage
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, blob, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) throw error;

    // Retornar URL pública
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error("Erro ao fazer upload:", error);
    return null;
  }
};

/**
 * Faz upload de múltiplas imagens (para carrossel)
 * NOTA: Não está sendo usado - salvamos base64 direto no banco
 */
export const uploadCarouselImages = async (
  images: string[], 
  postId: string
): Promise<string[]> => {
  // Retorna as imagens base64 como estão
  return images;
};

/**
 * Exclui imagens de um post
 */
export const deletePostImages = async (postId: string): Promise<boolean> => {
  if (!supabaseUrl || !supabaseAnonKey) return false;

  try {
    const { data: files } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(postId);

    if (files && files.length > 0) {
      const filePaths = files.map(f => `${postId}/${f.name}`);
      await supabase.storage.from(STORAGE_BUCKET).remove(filePaths);
    }
    
    return true;
  } catch (error) {
    console.error("Erro ao excluir imagens:", error);
    return false;
  }
};


// ============ BANCO DE IDEIAS ============

export interface Idea {
  id: string;
  content: string;
  category: string;
  is_used: boolean;
  created_at: string;
}

export const saveIdea = async (content: string, category: string = 'geral'): Promise<Idea | null> => {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  try {
    const { data, error } = await supabase
      .from('ideas')
      .insert([{ content, category }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erro ao salvar ideia:", error);
    return null;
  }
};

export const getIdeas = async (showUsed: boolean = true): Promise<Idea[]> => {
  if (!supabaseUrl || !supabaseAnonKey) return [];

  try {
    let query = supabase.from('ideas').select('*').order('created_at', { ascending: false });
    
    if (!showUsed) {
      query = query.eq('is_used', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Erro ao buscar ideias:", error);
    return [];
  }
};

export const markIdeaAsUsed = async (id: string): Promise<boolean> => {
  if (!supabaseUrl || !supabaseAnonKey) return false;

  try {
    const { error } = await supabase
      .from('ideas')
      .update({ is_used: true })
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Erro ao marcar ideia:", error);
    return false;
  }
};

export const deleteIdea = async (id: string): Promise<boolean> => {
  if (!supabaseUrl || !supabaseAnonKey) return false;

  try {
    const { error } = await supabase.from('ideas').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Erro ao excluir ideia:", error);
    return false;
  }
};

// ============ GRUPOS DE HASHTAGS ============

export interface HashtagGroup {
  id: string;
  name: string;
  hashtags: string[];
  created_at: string;
}

export const getHashtagGroups = async (): Promise<HashtagGroup[]> => {
  if (!supabaseUrl || !supabaseAnonKey) return [];

  try {
    const { data, error } = await supabase
      .from('hashtag_groups')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Erro ao buscar hashtags:", error);
    return [];
  }
};

export const saveHashtagGroup = async (name: string, hashtags: string[]): Promise<HashtagGroup | null> => {
  if (!supabaseUrl || !supabaseAnonKey) return null;

  try {
    const { data, error } = await supabase
      .from('hashtag_groups')
      .insert([{ name, hashtags }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Erro ao salvar grupo:", error);
    return null;
  }
};

export const deleteHashtagGroup = async (id: string): Promise<boolean> => {
  if (!supabaseUrl || !supabaseAnonKey) return false;

  try {
    const { error } = await supabase.from('hashtag_groups').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Erro ao excluir grupo:", error);
    return false;
  }
};
