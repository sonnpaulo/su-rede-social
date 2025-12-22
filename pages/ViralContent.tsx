import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Download, Copy, RefreshCcw, User, Quote, Lightbulb, Rocket, Heart, DollarSign, Target, Zap, Upload, ChevronLeft, ChevronRight, Wand2, Loader2, ZoomIn, ZoomOut, Move, X, Check } from 'lucide-react';
import { getBrandProfile, savePostToHistory } from '../services/supabaseClient';
import { showToast } from '../services/toastService';
import { generateCarouselData, generateViralCaption } from '../services/geminiService';
import { BrandIdentity, BRAND_COLORS } from '../types';

// Declaração global para html2canvas
declare const html2canvas: any;

// Categorias de conteúdo
const CONTENT_CATEGORIES = [
  { id: 'lembrete', label: 'Lembrete', icon: Heart, emoji: '💡' },
  { id: 'empreendedorismo', label: 'Empreendedorismo', icon: Rocket, emoji: '🚀' },
  { id: 'financas', label: 'Finanças', icon: DollarSign, emoji: '💰' },
  { id: 'motivacional', label: 'Motivacional', icon: Target, emoji: '🎯' },
  { id: 'produtividade', label: 'Produtividade', icon: Zap, emoji: '⚡' },
  { id: 'citacao', label: 'Citação', icon: Quote, emoji: '💬' },
];

// Estilos visuais
const VISUAL_STYLES = [
  { id: 'light', label: 'Claro', bg: 'linear-gradient(135deg, #fff5f0 0%, #ffe8dc 100%)', text: BRAND_COLORS.darkBlue },
  { id: 'dark', label: 'Escuro', bg: `linear-gradient(135deg, ${BRAND_COLORS.darkBlue} 0%, #2d2d4a 100%)`, text: '#ffffff' },
  { id: 'orange', label: 'Vibrante', bg: `linear-gradient(135deg, ${BRAND_COLORS.orange} 0%, #ff8a50 100%)`, text: '#ffffff' },
  { id: 'gradient', label: 'Gradiente', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', text: '#ffffff' },
];

// Frases de exemplo por categoria
const SAMPLE_PHRASES: Record<string, string[]> = {
  lembrete: [
    "Você não precisa ter tudo resolvido hoje. Um passo de cada vez.",
    "Cuidar do seu dinheiro é cuidar de você.",
    "Pequenas decisões de hoje constroem o futuro que você quer.",
  ],
  empreendedorismo: [
    "Empreender é resolver problemas que as pessoas nem sabiam que tinham.",
    "O melhor momento para começar foi ontem. O segundo melhor é agora.",
    "Seu negócio cresce quando você cresce.",
  ],
  financas: [
    "Não é sobre quanto você ganha, é sobre quanto você guarda.",
    "Dívida é a escravidão moderna. Liberte-se.",
    "Quem não controla o dinheiro, é controlado por ele.",
  ],
  motivacional: [
    "Você é mais forte do que imagina.",
    "Cada dia é uma nova chance de recomeçar.",
    "O sucesso é a soma de pequenos esforços repetidos dia após dia.",
  ],
  produtividade: [
    "Foco não é dizer sim para o importante. É dizer não para todo o resto.",
    "Feito é melhor que perfeito.",
    "Sua energia é limitada. Invista com sabedoria.",
  ],
  citacao: [
    "O dinheiro não traz felicidade, mas a falta dele traz muita infelicidade.",
    "Investir em conhecimento rende sempre os melhores juros. — Benjamin Franklin",
    "O segredo do sucesso é a constância do propósito. — Benjamin Disraeli",
  ],
};

// Tipos de conteúdo
type ContentMode = 'single' | 'carousel';

interface ViralContentProps {}

export const ViralContent: React.FC<ViralContentProps> = () => {
  const [contentMode, setContentMode] = useState<ContentMode>('single');
  const [category, setCategory] = useState('lembrete');
  const [visualStyle, setVisualStyle] = useState('light');
  const [phrase, setPhrase] = useState('');
  const [authorName, setAuthorName] = useState('David');
  const [authorHandle, setAuthorHandle] = useState('@sucontrole');
  const [authorPhoto, setAuthorPhoto] = useState<string | null>(null);
  const [photoZoom, setPhotoZoom] = useState(1);
  const [photoPosition, setPhotoPosition] = useState({ x: 0, y: 0 });
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [tempPhoto, setTempPhoto] = useState<string | null>(null);
  const [tempZoom, setTempZoom] = useState(1);
  const [tempPosition, setTempPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showLogo, setShowLogo] = useState(true);
  const [brandProfile, setBrandProfile] = useState<BrandIdentity | null>(null);
  
  // Carrossel - 5 slides
  const [carouselTitle, setCarouselTitle] = useState('');
  const [carouselSlides, setCarouselSlides] = useState<string[]>(['', '', '']);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [aiTopic, setAiTopic] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  
  // Legenda
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  
  const templateRef = useRef<HTMLDivElement>(null);
  const carouselRefs = useRef<(HTMLDivElement | null)[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadBrand = async () => {
      const profile = await getBrandProfile();
      setBrandProfile(profile);
    };
    loadBrand();
    
    // Carregar uma frase de exemplo inicial
    setPhrase(SAMPLE_PHRASES[category][0]);
    
    // Carregar dados salvos do localStorage
    const savedPhoto = localStorage.getItem('viral_author_photo');
    const savedName = localStorage.getItem('viral_author_name');
    const savedHandle = localStorage.getItem('viral_author_handle');
    
    if (savedPhoto) setAuthorPhoto(savedPhoto);
    if (savedName) setAuthorName(savedName);
    if (savedHandle) setAuthorHandle(savedHandle);
    
    // Carregar zoom e posição salvos
    const savedZoom = localStorage.getItem('viral_photo_zoom');
    const savedPosition = localStorage.getItem('viral_photo_position');
    if (savedZoom) setPhotoZoom(parseFloat(savedZoom));
    if (savedPosition) setPhotoPosition(JSON.parse(savedPosition));
  }, []);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const photoData = reader.result as string;
        // Abrir editor ao invés de salvar direto
        setTempPhoto(photoData);
        setTempZoom(1);
        setTempPosition({ x: 0, y: 0 });
        setShowPhotoEditor(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Funções do editor de foto
  const handleEditorMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - tempPosition.x, y: e.clientY - tempPosition.y });
  };

  const handleEditorMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const maxOffset = 50 * tempZoom;
    const newX = Math.max(-maxOffset, Math.min(maxOffset, e.clientX - dragStart.x));
    const newY = Math.max(-maxOffset, Math.min(maxOffset, e.clientY - dragStart.y));
    setTempPosition({ x: newX, y: newY });
  }, [isDragging, dragStart, tempZoom]);

  const handleEditorMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (showPhotoEditor) {
      window.addEventListener('mousemove', handleEditorMouseMove);
      window.addEventListener('mouseup', handleEditorMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleEditorMouseMove);
        window.removeEventListener('mouseup', handleEditorMouseUp);
      };
    }
  }, [showPhotoEditor, handleEditorMouseMove, handleEditorMouseUp]);

  const handleSavePhoto = () => {
    if (tempPhoto) {
      setAuthorPhoto(tempPhoto);
      setPhotoZoom(tempZoom);
      setPhotoPosition(tempPosition);
      localStorage.setItem('viral_author_photo', tempPhoto);
      localStorage.setItem('viral_photo_zoom', tempZoom.toString());
      localStorage.setItem('viral_photo_position', JSON.stringify(tempPosition));
      showToast('Foto ajustada e salva!', 'success');
    }
    setShowPhotoEditor(false);
  };

  const handleCancelPhotoEdit = () => {
    setShowPhotoEditor(false);
    setTempPhoto(null);
  };

  const handleEditExistingPhoto = () => {
    if (authorPhoto) {
      setTempPhoto(authorPhoto);
      setTempZoom(photoZoom);
      setTempPosition(photoPosition);
      setShowPhotoEditor(true);
    }
  };

  // Gerar legenda com IA
  const handleGenerateCaption = async () => {
    const content = contentMode === 'single' 
      ? phrase 
      : `${carouselTitle}\n${carouselSlides.join('\n')}`;
    
    if (!content.trim()) {
      showToast('Preencha o conteúdo primeiro', 'error');
      return;
    }

    setIsGeneratingCaption(true);
    try {
      showToast('🤖 Gerando legenda...', 'info');
      const result = await generateViralCaption(content, contentMode, category, brandProfile || undefined);
      setCaption(result.caption);
      setHashtags(result.hashtags);
      showToast('✨ Legenda criada!', 'success');
    } catch (error: any) {
      console.error('Erro ao gerar legenda:', error);
      showToast(error.message || 'Erro ao gerar legenda', 'error');
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  const handleCopyCaption = () => {
    const fullCaption = `${caption}\n\n${hashtags.map(h => `#${h}`).join(' ')}`;
    navigator.clipboard.writeText(fullCaption);
    showToast('Legenda copiada!', 'success');
  };

  // Salvar nome e handle quando mudar
  const handleNameChange = (name: string) => {
    setAuthorName(name);
    localStorage.setItem('viral_author_name', name);
  };

  const handleHandleChange = (handle: string) => {
    setAuthorHandle(handle);
    localStorage.setItem('viral_author_handle', handle);
  };

  const getRandomPhrase = () => {
    const phrases = SAMPLE_PHRASES[category];
    const randomIndex = Math.floor(Math.random() * phrases.length);
    setPhrase(phrases[randomIndex]);
  };

  const getCurrentStyle = () => VISUAL_STYLES.find(s => s.id === visualStyle) || VISUAL_STYLES[0];
  const getCurrentCategory = () => CONTENT_CATEGORIES.find(c => c.id === category) || CONTENT_CATEGORIES[0];

  const handleDownload = async () => {
    if (!templateRef.current || typeof html2canvas === 'undefined') {
      showToast('Erro ao baixar. Tente novamente.', 'error');
      return;
    }

    try {
      const currentWidth = templateRef.current.offsetWidth;
      const scale = 1080 / currentWidth;

      const canvas = await html2canvas(templateRef.current, { 
        scale: scale, 
        useCORS: true, 
        backgroundColor: null 
      });
      
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `su-controle-${category}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Salvar no histórico
      const cat = getCurrentCategory();
      await savePostToHistory({
        topic: `Viral: ${cat.label}`,
        platform: 'Instagram',
        contentType: 'VIRAL_SINGLE',
        caption: phrase,
        hashtags: [category, 'sucontrole', 'financas'],
      });
      
      showToast('Download iniciado e salvo no histórico!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Erro ao baixar. Tente novamente.', 'error');
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(phrase);
    showToast('Frase copiada!', 'success');
  };

  // Funções do carrossel
  const updateSlide = (index: number, value: string) => {
    const newSlides = [...carouselSlides];
    newSlides[index] = value;
    setCarouselSlides(newSlides);
  };

  // Gerar carrossel com IA
  const handleGenerateWithAI = async () => {
    if (!aiTopic.trim()) {
      showToast('Digite um tema para a IA criar o carrossel', 'error');
      return;
    }

    setIsGeneratingAI(true);
    try {
      showToast('🤖 Gerando carrossel com IA...', 'info');
      const slides = await generateCarouselData(aiTopic, brandProfile || undefined);
      
      // Preencher os campos com o resultado da IA
      if (slides.length >= 5) {
        setCarouselTitle(slides[0].title); // Capa
        setCarouselSlides([
          slides[1].body, // Dica 1
          slides[2].body, // Dica 2
          slides[3].body, // Dica 3
        ]);
      }
      
      showToast('✨ Carrossel criado! Revise e ajuste se precisar.', 'success');
      setAiTopic(''); // Limpa o campo
    } catch (error: any) {
      console.error('Erro ao gerar com IA:', error);
      showToast(error.message || 'Erro ao gerar com IA. Tente novamente.', 'error');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleDownloadCarousel = async () => {
    if (typeof html2canvas === 'undefined') {
      showToast('Erro ao baixar. Tente novamente.', 'error');
      return;
    }

    if (!confirm('Isso vai baixar 5 imagens (1 capa + 3 conteúdo + 1 CTA). Continuar?')) return;

    try {
      showToast('Gerando slides...', 'info');
      
      for (let i = 0; i < 5; i++) {
        setCurrentSlide(i);
        await new Promise(r => setTimeout(r, 300)); // Aguarda render
        
        const el = carouselRefs.current[i];
        if (el) {
          const currentWidth = el.offsetWidth;
          const scale = 1080 / currentWidth;
          const canvas = await html2canvas(el, { scale, useCORS: true, backgroundColor: null });
          
          const link = document.createElement('a');
          link.href = canvas.toDataURL('image/png');
          link.download = `carrossel-slide-${i + 1}-${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          await new Promise(r => setTimeout(r, 500));
        }
      }
      
      // Salvar no histórico - só o título da capa
      const allContent = `${carouselTitle}\n\n${carouselSlides.join('\n\n')}`;
      await savePostToHistory({
        topic: carouselTitle || 'Carrossel sem título',
        platform: 'Instagram',
        contentType: 'VIRAL_CAROUSEL',
        caption: allContent,
        hashtags: [category, 'sucontrole', 'carrossel', 'financas'],
      });
      
      showToast('5 slides baixados e salvos no histórico!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Erro ao baixar slides.', 'error');
    }
  };

  const style = getCurrentStyle();
  const cat = getCurrentCategory();

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-[calc(100vh-80px)]">
      {/* Modal Editor de Foto */}
      {showPhotoEditor && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">Ajustar Foto</h3>
              <button onClick={handleCancelPhotoEdit} className="p-1 hover:bg-gray-100 rounded-full">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            {/* Preview circular */}
            <div className="flex justify-center mb-4">
              <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary-200 bg-gray-100 relative">
                {tempPhoto && (
                  <img 
                    src={tempPhoto} 
                    className="absolute cursor-move select-none"
                    style={{
                      width: `${100 * tempZoom}%`,
                      height: `${100 * tempZoom}%`,
                      left: `${50 + tempPosition.x}%`,
                      top: `${50 + tempPosition.y}%`,
                      transform: 'translate(-50%, -50%)',
                      objectFit: 'cover',
                    }}
                    onMouseDown={handleEditorMouseDown}
                    draggable={false}
                  />
                )}
              </div>
            </div>
            
            <p className="text-xs text-gray-500 text-center mb-4 flex items-center justify-center gap-1">
              <Move size={12} /> Arraste a foto para posicionar
            </p>
            
            {/* Controle de Zoom */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Zoom</label>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setTempZoom(Math.max(1, tempZoom - 0.1))}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  <ZoomOut size={18} />
                </button>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={tempZoom}
                  onChange={(e) => setTempZoom(parseFloat(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
                />
                <button 
                  onClick={() => setTempZoom(Math.min(3, tempZoom + 0.1))}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  <ZoomIn size={18} />
                </button>
              </div>
              <p className="text-xs text-gray-400 text-center mt-1">{Math.round(tempZoom * 100)}%</p>
            </div>
            
            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={handleCancelPhotoEdit}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePhoto}
                className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Check size={18} />
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="text-primary-500" />
          Conteúdo Viral
        </h1>
        <p className="text-gray-500 mt-1">Crie posts engajadores com a identidade SU Controle</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Painel de Configuração */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-5">
          
          {/* Tipo de Conteúdo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Conteúdo</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setContentMode('single')}
                className={`py-3 px-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                  contentMode === 'single'
                    ? 'border-primary-500 bg-primary-50 text-primary-700 font-bold'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <span className="text-lg">📷</span>
                <span>Post Único</span>
              </button>
              <button
                onClick={() => setContentMode('carousel')}
                className={`py-3 px-4 rounded-lg border-2 transition-all flex items-center justify-center gap-2 ${
                  contentMode === 'carousel'
                    ? 'border-primary-500 bg-primary-50 text-primary-700 font-bold'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <span className="text-lg">🎠</span>
                <span>Carrossel (5)</span>
              </button>
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
            <div className="grid grid-cols-3 gap-2">
              {CONTENT_CATEGORIES.map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    setCategory(c.id);
                    setPhrase(SAMPLE_PHRASES[c.id][0]);
                  }}
                  className={`py-2 px-3 text-xs rounded-lg border transition-all flex items-center justify-center gap-1 ${
                    category === c.id
                      ? 'bg-primary-50 border-primary-500 text-primary-700 font-bold'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span>{c.emoji}</span>
                  <span className="hidden sm:inline">{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Estilo Visual */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estilo Visual</label>
            <div className="grid grid-cols-4 gap-2">
              {VISUAL_STYLES.map(s => (
                <button
                  key={s.id}
                  onClick={() => setVisualStyle(s.id)}
                  className={`py-3 px-2 text-xs rounded-lg border-2 transition-all ${
                    visualStyle === s.id
                      ? 'ring-2 ring-primary-500 ring-offset-1'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                  style={{ background: s.bg, color: s.text }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Frase (Post Único) ou Carrossel */}
          {contentMode === 'single' ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Sua Frase</label>
                <button
                  onClick={getRandomPhrase}
                  className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <RefreshCcw size={12} />
                  Sugestão
                </button>
              </div>
              <textarea
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                placeholder="Digite sua frase de impacto..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none h-28 resize-none"
              />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Criar com IA */}
              <div className="bg-gradient-to-r from-purple-50 to-primary-50 p-3 rounded-xl border border-purple-200">
                <label className="block text-sm font-medium text-purple-700 mb-2 flex items-center gap-1">
                  <Wand2 size={14} />
                  Criar com IA
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="Ex: como economizar no mercado"
                    className="flex-1 px-3 py-2 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm bg-white"
                    disabled={isGeneratingAI}
                  />
                  <button
                    onClick={handleGenerateWithAI}
                    disabled={isGeneratingAI || !aiTopic.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-purple-600 to-primary-600 hover:from-purple-700 hover:to-primary-700 text-white font-medium rounded-lg flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isGeneratingAI ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span className="hidden sm:inline">Criando...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        <span className="hidden sm:inline">Criar</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-purple-600 mt-1">
                  Digite um tema e a IA preenche tudo pra você
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-gray-400">ou preencha manualmente</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título do Carrossel (Capa)</label>
                <input
                  type="text"
                  value={carouselTitle}
                  onChange={(e) => setCarouselTitle(e.target.value)}
                  placeholder="Ex: 3 dicas para economizar"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                />
              </div>
              
              {carouselSlides.map((slide, idx) => (
                <div key={idx}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Slide {idx + 2}: Dica {idx + 1}
                  </label>
                  <textarea
                    value={slide}
                    onChange={(e) => updateSlide(idx, e.target.value)}
                    placeholder={`Digite a dica ${idx + 1}...`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm h-16 resize-none"
                  />
                </div>
              ))}
              
              <p className="text-xs text-gray-400 italic">
                Slide 5 (CTA) é gerado automaticamente com "Siga para mais" + "Link na bio"
              </p>
            </div>
          )}

          {/* Autor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seu Nome</label>
              <input
                type="text"
                value={authorName}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">@ Rede Social</label>
              <input
                type="text"
                value={authorHandle}
                onChange={(e) => handleHandleChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
              />
            </div>
          </div>

          {/* Foto do Autor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Sua Foto</label>
            <div className="flex items-center gap-3">
              <div 
                onClick={() => authorPhoto ? handleEditExistingPhoto() : fileInputRef.current?.click()}
                className="w-16 h-16 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-50 overflow-hidden relative"
                title={authorPhoto ? "Clique para ajustar" : "Clique para enviar"}
              >
                {authorPhoto ? (
                  <img 
                    src={authorPhoto} 
                    className="absolute"
                    style={{
                      width: `${100 * photoZoom}%`,
                      height: `${100 * photoZoom}%`,
                      left: `${50 + photoPosition.x}%`,
                      top: `${50 + photoPosition.y}%`,
                      transform: 'translate(-50%, -50%)',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <Upload size={20} className="text-gray-400" />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <div className="text-xs text-gray-500 flex-1">
                {authorPhoto ? (
                  <div className="space-y-1">
                    <p className="text-primary-600 font-medium">Foto salva ✓</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={handleEditExistingPhoto}
                        className="text-primary-600 hover:text-primary-700 underline"
                      >
                        Ajustar zoom
                      </button>
                      <span className="text-gray-300">|</span>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="text-gray-500 hover:text-gray-700 underline"
                      >
                        Trocar foto
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p>Clique para enviar sua foto</p>
                    <p className="text-gray-400">Recomendado: foto quadrada</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Opções */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showLogo}
                onChange={(e) => setShowLogo(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded"
              />
              <span className="text-sm text-gray-600">Mostrar logo SU Controle</span>
            </label>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-3 pt-2">
            {contentMode === 'single' ? (
              <>
                <button
                  onClick={handleDownload}
                  disabled={!phrase}
                  className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={18} />
                  Baixar 1080x1080
                </button>
                <button
                  onClick={handleCopyText}
                  className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
                >
                  <Copy size={18} />
                </button>
              </>
            ) : (
              <button
                onClick={handleDownloadCarousel}
                disabled={!carouselTitle || carouselSlides.some(s => !s)}
                className="flex-1 py-3 bg-gradient-to-r from-primary-600 to-orange-500 hover:from-primary-700 hover:to-orange-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={18} />
                Baixar 5 Slides
              </button>
            )}
          </div>

          {/* Seção de Legenda */}
          <div className="mt-5 pt-5 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">Legenda para o Post</label>
              <button
                onClick={handleGenerateCaption}
                disabled={isGeneratingCaption || (contentMode === 'single' ? !phrase : !carouselTitle)}
                className="text-xs bg-gradient-to-r from-purple-500 to-primary-500 hover:from-purple-600 hover:to-primary-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingCaption ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Wand2 size={12} />
                    Gerar com IA
                  </>
                )}
              </button>
            </div>
            
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Clique em 'Gerar com IA' ou escreva sua legenda aqui..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none h-32 resize-none text-sm"
            />
            
            {/* Hashtags */}
            {hashtags.length > 0 && (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">Hashtags sugeridas:</p>
                <div className="flex flex-wrap gap-1">
                  {hashtags.map((tag, idx) => (
                    <span 
                      key={idx}
                      className="text-xs bg-primary-50 text-primary-700 px-2 py-1 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Botão copiar legenda */}
            {caption && (
              <button
                onClick={handleCopyCaption}
                className="mt-3 w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg flex items-center justify-center gap-2 transition-colors text-sm"
              >
                <Copy size={16} />
                Copiar Legenda + Hashtags
              </button>
            )}
          </div>
        </div>

        {/* Preview do Template */}
        <div className="flex flex-col items-center">
          <p className="text-sm text-gray-500 mb-3">
            Preview (1080x1080) {contentMode === 'carousel' && `- Slide ${currentSlide + 1}/5`}
          </p>
          
          {/* Navegação do Carrossel */}
          {contentMode === 'carousel' && (
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                disabled={currentSlide === 0}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map(i => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlide(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === currentSlide ? 'bg-primary-500 w-4' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={() => setCurrentSlide(Math.min(4, currentSlide + 1))}
                disabled={currentSlide === 4}
                className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
          
          {/* Template Renderizado - Post Único */}
          {contentMode === 'single' && (
          <div 
            ref={templateRef}
            className="w-full max-w-[400px] aspect-square rounded-2xl overflow-hidden shadow-2xl relative"
            style={{ background: style.bg }}
          >
            {/* Elementos decorativos */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/20 rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>

            {/* Conteúdo */}
            <div className="relative h-full flex flex-col p-6">
              {/* Espaço no topo para balancear o layout */}
              <div className="mb-auto" />

              {/* Card da Frase */}
              <div className="bg-white rounded-2xl p-5 shadow-lg mx-2 my-4">
                {/* Header do card com foto e @ */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border-2 border-primary-100 relative">
                    {authorPhoto ? (
                      <img 
                        src={authorPhoto} 
                        className="absolute"
                        style={{
                          width: `${100 * photoZoom}%`,
                          height: `${100 * photoZoom}%`,
                          left: `${50 + photoPosition.x}%`,
                          top: `${50 + photoPosition.y}%`,
                          transform: 'translate(-50%, -50%)',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary-100">
                        <User size={20} className="text-primary-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{authorName}</p>
                    <p className="text-gray-500 text-xs">{authorHandle}</p>
                  </div>
                </div>

                {/* Frase */}
                <p className="text-gray-800 text-base leading-relaxed font-medium text-center">
                  {phrase || "Digite sua frase de impacto..."}
                </p>
              </div>

              {/* Logo no rodapé - Estilo oficial: SU laranja + Controle® preto */}
              {showLogo && (
                <div className="mt-auto flex flex-col items-center gap-1">
                  <div className="flex items-baseline">
                    <span 
                      className="text-xl font-bold"
                      style={{ color: BRAND_COLORS.orange }}
                    >
                      SU
                    </span>
                    <span 
                      className="text-xl font-normal"
                      style={{ color: style.id === 'light' || style.id === 'orange' ? '#1a1a2e' : '#ffffff' }}
                    >
                      Controle<sup className="text-[8px]">®</sup>
                    </span>
                  </div>
                  <span 
                    className="text-[10px] tracking-wider"
                    style={{ 
                      color: style.id === 'light' || style.id === 'orange' ? '#666' : 'rgba(255,255,255,0.7)',
                      fontStyle: 'italic'
                    }}
                  >
                    Anote. Controle. Cresça.
                  </span>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Template Renderizado - Carrossel */}
          {contentMode === 'carousel' && (
            <div className="w-full max-w-[400px]">
              {/* Slide atual visível */}
              <div 
                ref={(el) => carouselRefs.current[currentSlide] = el}
                className="w-full aspect-square rounded-2xl overflow-hidden shadow-2xl relative"
                style={{ background: style.bg }}
              >
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/20 rounded-full translate-y-1/2 -translate-x-1/2" />
                </div>

                <div className="relative h-full flex flex-col p-6">
                  {/* SLIDE 0: CAPA */}
                  {currentSlide === 0 && (
                    <>
                      <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <h2 
                          className="text-2xl font-bold leading-tight px-4"
                          style={{ color: style.text }}
                        >
                          {carouselTitle || 'Título do Carrossel'}
                        </h2>
                        <div className="flex flex-col items-center gap-1 mt-6">
                          <div className="w-12 h-12 rounded-full bg-white overflow-hidden border-2 border-white/50 relative">
                            {authorPhoto ? (
                              <img 
                                src={authorPhoto} 
                                className="absolute"
                                style={{
                                  width: `${100 * photoZoom}%`,
                                  height: `${100 * photoZoom}%`,
                                  left: `${50 + photoPosition.x}%`,
                                  top: `${50 + photoPosition.y}%`,
                                  transform: 'translate(-50%, -50%)',
                                  objectFit: 'cover',
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                                <User size={18} className="text-gray-400" />
                              </div>
                            )}
                          </div>
                          <span style={{ color: style.text }} className="text-base font-bold mt-1">{authorName}</span>
                          <span style={{ color: style.text, opacity: 0.7 }} className="text-sm">{authorHandle}</span>
                        </div>
                      </div>
                      <div className="text-center" style={{ color: style.text, opacity: 0.7 }}>
                        <span className="text-xs">Arraste para ver →</span>
                      </div>
                    </>
                  )}

                  {/* SLIDES 1-3: CONTEÚDO */}
                  {currentSlide >= 1 && currentSlide <= 3 && (
                    <>
                      <div className="flex items-center justify-center mb-4">
                        <span 
                          className="text-5xl font-bold"
                          style={{ color: style.text }}
                        >
                          {currentSlide}
                        </span>
                      </div>
                      
                      <div className="flex-1 flex items-center justify-center">
                        <div className="bg-white rounded-2xl p-6 shadow-lg mx-2">
                          <p className="text-gray-800 text-lg leading-relaxed font-medium text-center">
                            {carouselSlides[currentSlide - 1] || `Dica ${currentSlide}...`}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-center gap-1 mt-4">
                        {[0, 1, 2, 3, 4].map(i => (
                          <div 
                            key={i} 
                            className={`w-2 h-2 rounded-full ${i === currentSlide ? 'bg-white' : 'bg-white/40'}`}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {/* SLIDE 4: CTA */}
                  {currentSlide === 4 && (
                    <>
                      <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <span className="text-5xl mb-4">🚀</span>
                        <h2 
                          className="text-2xl font-bold mb-2"
                          style={{ color: style.text }}
                        >
                          Gostou?
                        </h2>
                        <p 
                          className="text-lg mb-6"
                          style={{ color: style.text, opacity: 0.9 }}
                        >
                          Salva e compartilha!
                        </p>
                        
                        <div className="bg-white rounded-xl p-4 shadow-lg">
                          <p className="text-gray-800 font-bold text-lg mb-1">Siga {authorHandle}</p>
                          <p className="text-primary-600 font-medium">👆 Link na bio</p>
                        </div>
                      </div>

                      {/* Logo */}
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-baseline">
                          <span className="text-xl font-bold" style={{ color: BRAND_COLORS.orange }}>SU</span>
                          <span className="text-xl font-normal" style={{ color: style.id === 'light' || style.id === 'orange' ? '#1a1a2e' : '#ffffff' }}>Controle<sup className="text-[8px]">®</sup></span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Dicas */}
          <div className="mt-4 p-4 bg-primary-50 rounded-xl text-sm text-primary-800 max-w-[400px]">
            <p className="font-medium mb-1">💡 Dicas para engajamento:</p>
            <ul className="text-xs space-y-1 text-primary-700">
              <li>• Frases curtas funcionam melhor</li>
              <li>• Use sua foto real para criar conexão</li>
              <li>• Poste nos melhores horários (12h, 18h, 21h)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViralContent;
