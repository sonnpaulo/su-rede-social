
export enum ContentType {
  POST_TEXT = 'POST_TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  TEMPLATE_HD = 'TEMPLATE_HD', // Post único renderizado
  CAROUSEL_HD = 'CAROUSEL_HD',  // Modo Carrossel (5 slides)
  UPLOAD_VISION = 'UPLOAD_VISION', // Upload de foto própria para análise
  VOICE_VIDEO = 'VOICE_VIDEO' // Vídeo com narração em voz (ElevenLabs)
}

export enum TemplateType {
  EDUCATIONAL = 'EDUCATIONAL', // Fundo claro, ícone, lista
  QUOTE = 'QUOTE',             // Fundo gradiente, texto grande
  MINIMAL_DARK = 'MINIMAL_DARK' // Fundo escuro, texto branco
}

// Estilos de Carrossel
export enum CarouselStyle {
  LIGHT = 'LIGHT',       // Fundo claro #f0f0f0, texto escuro
  DARK = 'DARK',         // Fundo escuro #1a1a2e, texto branco
  VIBRANT = 'VIBRANT'    // Fundo laranja #eb693d, texto branco
}

// Cores oficiais SU Controle
export const BRAND_COLORS = {
  orange: '#eb693d',
  darkBlue: '#1a1a2e',
  lightGray: '#f0f0f0',
  white: '#ffffff'
};

export interface TemplateData {
  title: string;
  body: string;
  highlight?: string;
  footer?: string;
  iconName?: string; // Nome do ícone Lucide
}

export interface CarouselSlide {
  type: 'COVER' | 'CONTENT' | 'CTA';
  title: string;
  body: string; // Tópicos ou texto corrido
  pageNumber: number;
  totalPages: number;
}

export enum Platform {
  INSTAGRAM = 'INSTAGRAM',
  LINKEDIN = 'LINKEDIN',
  TIKTOK = 'TIKTOK',
  TWITTER = 'TWITTER'
}

export enum LoadingState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface GeneratedContent {
  id: string;
  type: ContentType;
  content: string; // Pode ser texto ou URL de base64
  meta?: {
    prompt?: string;
    hashtags?: string[];
    tone?: string;
  };
  createdAt: Date;
}

export type AIProvider = 'gemini' | 'groq' | 'openrouter' | 'mistral' | 'openai';

export interface BrandIdentity {
  id?: string;
  name: string;
  website?: string;
  instagram?: string;
  description: string;
  colors: string[]; // Ex: ['#FF0000', '#000000']
  fontPairing?: string;
  toneOfVoice: string; // Ex: "Descontraído e Jovem"
  niche: string; // Ex: "Moda Sustentável"
  targetAudience: string;
  apiKey?: string; // Chave da API Gemini salva no banco (Opcional)
  elevenLabsApiKey?: string; // Chave da API ElevenLabs (Opcional)
  preferredAI?: AIProvider; // IA preferida para geração de texto
}

export interface TextGenerationResponse {
  caption: string;
  hashtags: string[];
  suggestedImagePrompt: string;
  extractedTemplateData?: TemplateData; // Novo: Dados para recriar o design
}

export interface DashboardStats {
  totalPosts: number;
  postsThisWeek: number;
  topPlatform: string;
  mostFrequentType: string;
  recentActivity: {
    id: string;
    topic: string;
    platform: string;
    type: string;
    created_at: string;
  }[];
  platformDistribution: { name: string; value: number }[];
  dailyActivity: { name: string; posts: number }[];
  weeklyGoal: number;
  nextScheduledPost?: {
    topic: string;
    date: string;
    dayName: string;
  } | null;
}

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
    id: string;
    type: ToastType;
    message: string;
}
