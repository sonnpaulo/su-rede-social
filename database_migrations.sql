-- =============================================
-- MIGRAÇÃO: Uso da API Global + ElevenLabs
-- Execute este SQL no Supabase SQL Editor
-- =============================================

-- 1. Adicionar campo elevenlabs_api_key na tabela brands
ALTER TABLE brands ADD COLUMN IF NOT EXISTS elevenlabs_api_key TEXT;

-- 2. Criar tabela de uso da API (global)
CREATE TABLE IF NOT EXISTS api_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    text_requests INTEGER DEFAULT 0,
    image_requests INTEGER DEFAULT 0,
    video_requests INTEGER DEFAULT 0,
    audio_requests INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date)
);

-- 3. Função para atualizar o updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS update_api_usage_updated_at ON api_usage;
CREATE TRIGGER update_api_usage_updated_at
    BEFORE UPDATE ON api_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Inserir registro de hoje se não existir
INSERT INTO api_usage (date) 
VALUES (CURRENT_DATE) 
ON CONFLICT (date) DO NOTHING;

-- =============================================
-- MIGRAÇÃO: Campos para Calendário/Agendamento
-- =============================================

-- 6. Adicionar campos de agendamento na tabela posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS scheduled_date DATE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS posted BOOLEAN DEFAULT FALSE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS posted_at TIMESTAMP WITH TIME ZONE;

-- 7. Índice para busca por data
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_date ON posts(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);

-- =============================================
-- MIGRAÇÃO: Histórico de Posts Gerados
-- =============================================

-- 8. Criar tabela de histórico de posts
CREATE TABLE IF NOT EXISTS post_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    topic TEXT NOT NULL,
    platform TEXT NOT NULL,
    content_type TEXT NOT NULL,
    caption TEXT NOT NULL,
    hashtags TEXT[] DEFAULT '{}',
    image_prompt TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_post_history_created_at ON post_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_history_favorite ON post_history(is_favorite);
CREATE INDEX IF NOT EXISTS idx_post_history_platform ON post_history(platform);

-- =============================================
-- MIGRAÇÃO: Posts Agendados com Imagens
-- =============================================

-- 10. Criar tabela de posts agendados (com imagem)
CREATE TABLE IF NOT EXISTS scheduled_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    scheduled_date DATE NOT NULL,
    topic TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'Instagram',
    content_type TEXT NOT NULL DEFAULT 'CAROUSEL_HD',
    caption TEXT,
    hashtags TEXT[] DEFAULT '{}',
    image_urls TEXT[] DEFAULT '{}',
    carousel_style TEXT DEFAULT 'LIGHT',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'posted')),
    posted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Índices para posts agendados
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_date ON scheduled_posts(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);

-- 12. Trigger para updated_at
DROP TRIGGER IF EXISTS update_scheduled_posts_updated_at ON scheduled_posts;
CREATE TRIGGER update_scheduled_posts_updated_at
    BEFORE UPDATE ON scheduled_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- MIGRAÇÃO: Banco de Ideias
-- =============================================

-- 13. Criar tabela de ideias
CREATE TABLE IF NOT EXISTS ideas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'geral',
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Índice para ideias
CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON ideas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_used ON ideas(is_used);

-- =============================================
-- MIGRAÇÃO: Grupos de Hashtags
-- =============================================

-- 15. Criar tabela de grupos de hashtags
CREATE TABLE IF NOT EXISTS hashtag_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    hashtags TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Inserir grupos padrão
INSERT INTO hashtag_groups (name, hashtags) VALUES 
('Finanças', ARRAY['financaspessoais', 'educacaofinanceira', 'dinheiro', 'economia', 'investimentos', 'poupar', 'organizacaofinanceira']),
('Motivacional', ARRAY['motivacao', 'foco', 'determinacao', 'sucesso', 'mindset', 'crescimento', 'evolucao']),
('Dicas', ARRAY['dicasdodia', 'dicasuteis', 'aprenda', 'saibamais', 'ficaadica', 'vocesakbia'])
ON CONFLICT DO NOTHING;

-- =============================================
-- STORAGE: Criar bucket para imagens (executar no Dashboard do Supabase)
-- =============================================
-- Vá em Storage > Create new bucket
-- Nome: post-images
-- Public: true
-- Allowed MIME types: image/png, image/jpeg, image/webp


-- =============================================
-- MIGRAÇÃO: IA Preferida
-- =============================================

-- Adicionar campo preferred_ai na tabela brands
ALTER TABLE brands ADD COLUMN IF NOT EXISTS preferred_ai TEXT DEFAULT 'gemini';
