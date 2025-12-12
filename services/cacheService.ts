// Cache Service - Salva conteúdo gerado localmente para não perder

import { TextGenerationResponse, CarouselSlide, TemplateData } from '../types';

const CACHE_KEYS = {
  DRAFTS: 'su_drafts',
  HISTORY: 'su_post_history',
  FAVORITES: 'su_favorites'
};

export interface PostDraft {
  id: string;
  topic: string;
  platform: string;
  contentType: string;
  generatedText: TextGenerationResponse | null;
  carouselData: CarouselSlide[] | null;
  templateData: TemplateData | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavedPost {
  id: string;
  topic: string;
  platform: string;
  contentType: string;
  caption: string;
  hashtags: string[];
  imagePrompt?: string;
  createdAt: string;
  isFavorite: boolean;
}

// ============ DRAFTS (Rascunhos) ============

export const saveDraft = (draft: Omit<PostDraft, 'id' | 'createdAt' | 'updatedAt'>): PostDraft => {
  const drafts = getDrafts();
  
  const newDraft: PostDraft = {
    ...draft,
    id: `draft_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  drafts.unshift(newDraft);
  
  // Manter apenas os últimos 20 rascunhos
  const trimmed = drafts.slice(0, 20);
  localStorage.setItem(CACHE_KEYS.DRAFTS, JSON.stringify(trimmed));
  
  return newDraft;
};

export const getDrafts = (): PostDraft[] => {
  try {
    const data = localStorage.getItem(CACHE_KEYS.DRAFTS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const getDraftById = (id: string): PostDraft | null => {
  const drafts = getDrafts();
  return drafts.find(d => d.id === id) || null;
};

export const deleteDraft = (id: string): void => {
  const drafts = getDrafts().filter(d => d.id !== id);
  localStorage.setItem(CACHE_KEYS.DRAFTS, JSON.stringify(drafts));
};

export const clearAllDrafts = (): void => {
  localStorage.removeItem(CACHE_KEYS.DRAFTS);
};

// ============ HISTORY (Histórico) ============
// Agora sincroniza com Supabase + fallback local

import { savePostToHistory } from './supabaseClient';

export const saveToHistory = async (post: Omit<SavedPost, 'id' | 'createdAt' | 'isFavorite'>): Promise<SavedPost> => {
  // Salva no banco primeiro
  const dbPost = await savePostToHistory({
    topic: post.topic,
    platform: post.platform,
    contentType: post.contentType,
    caption: post.caption,
    hashtags: post.hashtags,
    imagePrompt: post.imagePrompt
  });

  // Se salvou no banco, usa o ID do banco
  const newPost: SavedPost = {
    ...post,
    id: dbPost?.id || `post_${Date.now()}`,
    createdAt: dbPost?.created_at || new Date().toISOString(),
    isFavorite: false
  };
  
  // Também salva localmente como backup
  const history = getLocalHistory();
  history.unshift(newPost);
  const trimmed = history.slice(0, 100);
  localStorage.setItem(CACHE_KEYS.HISTORY, JSON.stringify(trimmed));
  
  return newPost;
};

// Função local para backup
export const getLocalHistory = (): SavedPost[] => {
  try {
    const data = localStorage.getItem(CACHE_KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

// Mantém compatibilidade - agora é async e busca do banco
export const getHistory = (): SavedPost[] => {
  // Retorna cache local (a página PostHistory vai buscar do banco diretamente)
  return getLocalHistory();
};

export const getHistoryById = (id: string): SavedPost | null => {
  const history = getLocalHistory();
  return history.find(p => p.id === id) || null;
};

export const deleteFromHistory = (id: string): void => {
  // Remove do cache local
  const history = getLocalHistory().filter(p => p.id !== id);
  localStorage.setItem(CACHE_KEYS.HISTORY, JSON.stringify(history));
};

// ============ FAVORITES (Favoritos) ============

export const toggleFavorite = (id: string): boolean => {
  const history = getHistory();
  const post = history.find(p => p.id === id);
  
  if (post) {
    post.isFavorite = !post.isFavorite;
    localStorage.setItem(CACHE_KEYS.HISTORY, JSON.stringify(history));
    return post.isFavorite;
  }
  
  return false;
};

export const getFavorites = (): SavedPost[] => {
  return getHistory().filter(p => p.isFavorite);
};

// ============ CAPTION BANK (Banco de Legendas) ============

export interface SavedCaption {
  id: string;
  caption: string;
  hashtags: string[];
  category: string;
  createdAt: string;
}

const CAPTIONS_KEY = 'su_saved_captions';

export const saveCaption = (caption: string, hashtags: string[], category: string = 'Geral'): SavedCaption => {
  const captions = getSavedCaptions();
  
  const newCaption: SavedCaption = {
    id: `caption_${Date.now()}`,
    caption,
    hashtags,
    category,
    createdAt: new Date().toISOString()
  };
  
  captions.unshift(newCaption);
  localStorage.setItem(CAPTIONS_KEY, JSON.stringify(captions.slice(0, 50)));
  
  return newCaption;
};

export const getSavedCaptions = (): SavedCaption[] => {
  try {
    const data = localStorage.getItem(CAPTIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const deleteCaption = (id: string): void => {
  const captions = getSavedCaptions().filter(c => c.id !== id);
  localStorage.setItem(CAPTIONS_KEY, JSON.stringify(captions));
};

// ============ AUTO-SAVE (Salvar automaticamente o último estado) ============

const AUTOSAVE_KEY = 'su_autosave';

export interface AutoSaveState {
  topic: string;
  platform: string;
  contentType: string;
  generatedText: TextGenerationResponse | null;
  timestamp: string;
}

export const autoSave = (state: Omit<AutoSaveState, 'timestamp'>): void => {
  const data: AutoSaveState = {
    ...state,
    timestamp: new Date().toISOString()
  };
  localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
};

export const getAutoSave = (): AutoSaveState | null => {
  try {
    const data = localStorage.getItem(AUTOSAVE_KEY);
    if (!data) return null;
    
    const parsed = JSON.parse(data) as AutoSaveState;
    
    // Só retorna se foi salvo nas últimas 24 horas
    const savedTime = new Date(parsed.timestamp).getTime();
    const now = Date.now();
    const hoursDiff = (now - savedTime) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      clearAutoSave();
      return null;
    }
    
    return parsed;
  } catch {
    return null;
  }
};

export const clearAutoSave = (): void => {
  localStorage.removeItem(AUTOSAVE_KEY);
};
