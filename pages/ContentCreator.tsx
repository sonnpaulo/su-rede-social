import React, { useState, useEffect, useRef } from 'react';
import { Wand2, Image as ImageIcon, Video, Type, Save, Share2, Loader2, Copy, Download, LayoutTemplate, Layers, ChevronRight, ChevronLeft, Upload, Camera, Film, RefreshCcw, Eye, Mic, Star } from 'lucide-react';
import { generateSocialText, generateSocialImage, generateSocialVideo, fetchVideoBlob, generateTemplateData, generateCarouselData, analyzeImageAndGenerateCaption } from '../services/geminiService';
import { generateSpeech } from '../services/elevenLabsService';
import { getBrandProfile, getRecentPosts, savePost } from '../services/supabaseClient';
import { LoadingState, ContentType, TextGenerationResponse, BrandIdentity, TemplateType, TemplateData, CarouselSlide, CarouselStyle, BRAND_COLORS } from '../types';
import { PostRenderer, CarouselSlideRenderer } from '../components/Templates/PostTemplates';
import { showToast } from '../services/toastService';
import { saveToHistory, saveCaption } from '../services/cacheService';

// Declaração global para evitar erro de TS com script externo
declare const html2canvas: any;

// Componente de preview do carrossel com navegação
interface CarouselPreviewProps {
    slides: CarouselSlide[];
    brand: BrandIdentity | null;
    carouselRefs: React.MutableRefObject<(HTMLDivElement | null)[]>;
    style?: CarouselStyle;
}

const CarouselPreview: React.FC<CarouselPreviewProps> = ({ slides, brand, carouselRefs, style = CarouselStyle.LIGHT }) => {
    const [currentSlide, setCurrentSlide] = useState(0);

    const goToSlide = (index: number) => {
        if (index >= 0 && index < slides.length) {
            setCurrentSlide(index);
        }
    };

    return (
        <div className="relative w-full">
            {/* Slide atual */}
            <div className="w-full">
                <CarouselSlideRenderer 
                    slide={slides[currentSlide]} 
                    brand={brand}
                    style={style}
                    forwardedRef={(el) => carouselRefs.current[currentSlide] = el}
                />
            </div>

            {/* Botões de navegação */}
            <button 
                onClick={() => goToSlide(currentSlide - 1)}
                disabled={currentSlide === 0}
                className={`absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    currentSlide === 0 
                        ? 'bg-black/20 text-white/50 cursor-not-allowed' 
                        : 'bg-white shadow-lg text-gray-800 hover:bg-gray-100'
                }`}
            >
                <ChevronLeft size={24} />
            </button>

            <button 
                onClick={() => goToSlide(currentSlide + 1)}
                disabled={currentSlide === slides.length - 1}
                className={`absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    currentSlide === slides.length - 1 
                        ? 'bg-black/20 text-white/50 cursor-not-allowed' 
                        : 'bg-white shadow-lg text-gray-800 hover:bg-gray-100'
                }`}
            >
                <ChevronRight size={24} />
            </button>

            {/* Indicadores de slide */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                {slides.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => goToSlide(idx)}
                        className={`w-2 h-2 rounded-full transition-all ${
                            idx === currentSlide 
                                ? 'bg-white w-6' 
                                : 'bg-white/50 hover:bg-white/70'
                        }`}
                    />
                ))}
            </div>

            {/* Contador */}
            <div className="absolute top-4 right-4 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                {currentSlide + 1} / {slides.length}
            </div>

            {/* Renderiza todos os slides ocultos para o download */}
            <div className="hidden">
                {slides.map((slide, idx) => (
                    <CarouselSlideRenderer 
                        key={idx}
                        slide={slide} 
                        brand={brand}
                        style={style}
                        forwardedRef={(el) => carouselRefs.current[idx] = el}
                    />
                ))}
            </div>
        </div>
    );
};

interface ContentCreatorProps {
    initialTopic?: string;
}

export const ContentCreator: React.FC<ContentCreatorProps> = ({ initialTopic }) => {
  const [contentType, setContentType] = useState<ContentType>(ContentType.TEMPLATE_HD);
  const [templateType, setTemplateType] = useState<TemplateType>(TemplateType.EDUCATIONAL);
  const [carouselStyle, setCarouselStyle] = useState<CarouselStyle>(CarouselStyle.LIGHT);
  
  const [platform, setPlatform] = useState<string>('Instagram');
  const [topic, setTopic] = useState(initialTopic || '');
  
  const templateRef = useRef<HTMLDivElement>(null);
  const carouselRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [showRemastered, setShowRemastered] = useState(true);

  useEffect(() => {
      if (initialTopic) {
          setTopic(initialTopic);
      }
  }, [initialTopic]);

  const [brandProfile, setBrandProfile] = useState<BrandIdentity | null>(null);

  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  
  const [generatedText, setGeneratedText] = useState<TextGenerationResponse | null>(null);
  const [generatedMedia, setGeneratedMedia] = useState<string | null>(null);
  const [generatedTemplateData, setGeneratedTemplateData] = useState<TemplateData | null>(null);
  const [generatedCarouselData, setGeneratedCarouselData] = useState<CarouselSlide[] | null>(null);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [isGeneratingVoiceVideo, setIsGeneratingVoiceVideo] = useState(false);
  const [voiceVideoProgress, setVoiceVideoProgress] = useState(0);
  const [usedProvider, setUsedProvider] = useState<string | null>(null); // Qual AI foi usada

  useEffect(() => {
    const loadBrand = async () => {
        const profile = await getBrandProfile();
        setBrandProfile(profile);
    };
    loadBrand();

    // Listener para saber qual AI provider foi usado
    const handleProviderUsed = (e: CustomEvent<{ provider: string; type: string }>) => {
      setUsedProvider(e.detail.provider);
    };
    window.addEventListener('ai-provider-used', handleProviderUsed as EventListener);
    
    return () => {
      window.removeEventListener('ai-provider-used', handleProviderUsed as EventListener);
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setUploadedImage(reader.result as string);
              setGeneratedTemplateData(null); 
          };
          reader.readAsDataURL(file);
      }
  };

  const handleGenerate = async () => {
    if (contentType !== ContentType.UPLOAD_VISION && !topic) return;
    if (contentType === ContentType.UPLOAD_VISION && !uploadedImage) {
        showToast("Por favor, envie uma foto primeiro.", 'error');
        return;
    }

    setLoadingState(LoadingState.LOADING);
    setErrorMsg('');
    setGeneratedText(null);
    setGeneratedMedia(null);
    setGeneratedTemplateData(null);
    setGeneratedCarouselData(null);
    setVideoBlobUrl(null);
    setUsedProvider(null); // Reset provider

    carouselRefs.current = [];

    try {
      const recentHistory = await getRecentPosts(5);
      const brandContext = brandProfile || undefined;
      let finalText: TextGenerationResponse | null = null;

      if (contentType === ContentType.TEMPLATE_HD) {
        const textResult = await generateSocialText(topic, platform, brandContext, recentHistory);
        setGeneratedText(textResult);
        finalText = textResult;
        const templateData = await generateTemplateData(topic, templateType, brandContext);
        setGeneratedTemplateData(templateData);
      }
      
      else if (contentType === ContentType.CAROUSEL_HD) {
        const textResult = await generateSocialText(topic, platform, brandContext, recentHistory);
        setGeneratedText(textResult);
        finalText = textResult;
        const carouselData = await generateCarouselData(topic, brandContext);
        setGeneratedCarouselData(carouselData);
      }

      else if (contentType === ContentType.UPLOAD_VISION && uploadedImage) {
        const result = await analyzeImageAndGenerateCaption(uploadedImage, brandContext);
        setGeneratedText(result);
        finalText = result;
        
        if (result.extractedTemplateData) {
            setGeneratedTemplateData(result.extractedTemplateData);
            setShowRemastered(true);
        }
      }

      else if (contentType === ContentType.POST_TEXT) {
        const result = await generateSocialText(topic, platform, brandContext, recentHistory);
        setGeneratedText(result);
        finalText = result;
      } 
      
      else if (contentType === ContentType.IMAGE) {
        const textResult = await generateSocialText(topic, platform, brandContext, recentHistory);
        setGeneratedText(textResult);
        finalText = textResult;
        const imageBase64 = await generateSocialImage(textResult.suggestedImagePrompt);
        setGeneratedMedia(imageBase64);
      }
      
      else if (contentType === ContentType.VIDEO) {
        const textResult = await generateSocialText(topic, platform, brandContext, recentHistory);
        setGeneratedText(textResult);
        finalText = textResult;

        const videoUri = await generateSocialVideo(topic);
        if (videoUri === "MOCK_VIDEO_ERROR") {
             setErrorMsg("A geração de vídeo requer permissões (Veo). Modo simulado.");
        } else {
             const blobUrl = await fetchVideoBlob(videoUri);
             setVideoBlobUrl(blobUrl);
        }
      }

      else if (contentType === ContentType.VOICE_VIDEO) {
        // Gera texto para o vídeo com voz
        const textResult = await generateSocialText(topic, 'TIKTOK', brandContext, recentHistory);
        setGeneratedText(textResult);
        finalText = textResult;
        
        // Gera os slides do carrossel para usar como visual
        const carouselData = await generateCarouselData(topic, brandContext);
        setGeneratedCarouselData(carouselData);
        
        // Marca que é um vídeo com voz (o áudio será gerado no download)
        showToast('Conteúdo pronto! Clique em "Gerar Vídeo com Voz" para criar o vídeo narrado.', 'info');
      }

      if (finalText) {
          const saveTopic = contentType === ContentType.UPLOAD_VISION ? "Análise de Foto" : topic;
          await savePost(saveTopic, finalText.caption, contentType, platform);
          
          // Salvar no histórico local também
          saveToHistory({
            topic: saveTopic,
            platform,
            contentType,
            caption: finalText.caption,
            hashtags: finalText.hashtags,
            imagePrompt: finalText.suggestedImagePrompt
          });
      }

      setLoadingState(LoadingState.SUCCESS);
      showToast('Conteúdo gerado com sucesso!', 'success');
    } catch (error: any) {
      console.error(error);
      setLoadingState(LoadingState.ERROR);
      setErrorMsg(error.message || "Erro ao conectar com a IA.");
      showToast(error.message || "Erro ao conectar com a IA.", 'error');
    }
  };

  const handleDownloadTemplate = async () => {
      if (templateRef.current && typeof html2canvas !== 'undefined') {
          try {
              const currentWidth = templateRef.current.offsetWidth;
              const scale = 1080 / currentWidth;

              const canvas = await html2canvas(templateRef.current, { scale: scale, useCORS: true, backgroundColor: null });
              const link = document.createElement('a');
              link.href = canvas.toDataURL('image/png');
              link.download = `su-controle-post-${Date.now()}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              showToast('Download iniciado!', 'success');
          } catch (e) {
              showToast("Erro ao baixar. Tente novamente.", 'error');
          }
      }
  };

  const handleDownloadCarousel = async () => {
      if (!carouselRefs.current.length || typeof html2canvas === 'undefined') return;

      if (!confirm("Isso vai baixar 5 imagens para o seu dispositivo. Continuar?")) return;

      try {
          showToast('Iniciando download dos 5 slides...', 'info');
          for (let i = 0; i < carouselRefs.current.length; i++) {
              const el = carouselRefs.current[i];
              if (el) {
                  const currentWidth = el.offsetWidth;
                  const scale = 1080 / currentWidth;

                  const canvas = await html2canvas(el, { scale: scale, useCORS: true, backgroundColor: null });
                  const link = document.createElement('a');
                  link.href = canvas.toDataURL('image/png');
                  link.download = `slide-${i + 1}-sucontrole.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  await new Promise(r => setTimeout(r, 500));
              }
          }
      } catch (e) {
          console.error(e);
          showToast("Erro ao baixar slides.", 'error');
      }
  };

  const handleDownloadMotionVideo = async () => {
    if (!carouselRefs.current.length || typeof html2canvas === 'undefined') return;
    
    setIsGeneratingVideo(true);
    setVideoProgress(0);

    try {
        const slideImages: string[] = [];
        const totalSlides = carouselRefs.current.length;
        
        for (let i = 0; i < totalSlides; i++) {
            const el = carouselRefs.current[i];
            if (el) {
                const currentWidth = el.offsetWidth;
                const scale = 1080 / currentWidth;
                
                const canvas = await html2canvas(el, { scale: scale, useCORS: true, backgroundColor: null });
                slideImages.push(canvas.toDataURL('image/png'));
            }
            setVideoProgress(10 + (i / totalSlides) * 20); 
        }

        const canvas = document.createElement('canvas');
        canvas.width = 1080;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error("Canvas context falhou");

        const stream = canvas.captureStream(30); 
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
            ? 'video/webm;codecs=vp9' 
            : 'video/webm'; 
        
        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        const chunks: BlobPart[] = [];
        
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, { type: 'video/mp4' }); 
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `su-controle-video-${Date.now()}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setIsGeneratingVideo(false);
            setVideoProgress(0);
            showToast('Vídeo baixado com sucesso!', 'success');
        };

        mediaRecorder.start();

        const FPS = 30;
        const SECONDS_PER_SLIDE = 3;
        const FRAMES_PER_SLIDE = FPS * SECONDS_PER_SLIDE;

        for (let i = 0; i < slideImages.length; i++) {
            const img = new Image();
            img.src = slideImages[i];
            await new Promise((r) => (img.onload = r));

            for (let f = 0; f < FRAMES_PER_SLIDE; f++) {
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                const scale = 1 + (0.05 * (f / FRAMES_PER_SLIDE));
                const width = canvas.width * scale;
                const height = canvas.height * scale;
                const x = (canvas.width - width) / 2;
                const y = (canvas.height - height) / 2;

                ctx.drawImage(img, x, y, width, height);
                await new Promise(r => setTimeout(r, 1000 / FPS));
            }
            setVideoProgress(30 + ((i + 1) / slideImages.length) * 60);
        }

        await new Promise(r => setTimeout(r, 500));
        mediaRecorder.stop();

    } catch (e) {
        console.error(e);
        showToast("Erro ao gerar vídeo. Tente novamente.", 'error');
        setIsGeneratingVideo(false);
    }
  };

  const handleDownloadMedia = () => {
      if (generatedMedia) {
          const link = document.createElement('a');
          link.href = generatedMedia;
          link.download = `su-rede-social-${Date.now()}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      }
  };

  const handleDownloadVoiceVideo = async () => {
    if (!carouselRefs.current.length || typeof html2canvas === 'undefined' || !generatedCarouselData) return;
    
    setIsGeneratingVoiceVideo(true);
    setVoiceVideoProgress(0);

    try {
        // 1. Montar texto dos SLIDES para narração
        const slideTexts = generatedCarouselData.map((slide) => {
            if (slide.type === 'COVER') {
                return slide.title;
            } else {
                return `${slide.title}. ${slide.body}`;
            }
        });
        
        // Juntar textos e substituir nome da marca para pronúncia correta
        let narrationText = slideTexts.join('... ');
        narrationText = narrationText
            .replace(/SU Controle/gi, 'súcontrole')
            .replace(/a SU Controle/gi, 'a súcontrole');
        
        setVoiceVideoProgress(10);
        showToast('Gerando narração...', 'info');
        
        // 2. Gerar áudio
        const audioBase64 = await generateSpeech({ text: narrationText });
        setGeneratedAudio(audioBase64);
        setVoiceVideoProgress(50);

        // 3. Capturar slides como imagens
        showToast('Capturando slides...', 'info');
        const slideImages: string[] = [];
        
        for (let i = 0; i < carouselRefs.current.length; i++) {
            const el = carouselRefs.current[i];
            if (el) {
                const currentWidth = el.offsetWidth;
                const scale = 1080 / currentWidth;
                const canvas = await html2canvas(el, { scale, useCORS: true, backgroundColor: null });
                slideImages.push(canvas.toDataURL('image/png'));
            }
            setVoiceVideoProgress(50 + (i / carouselRefs.current.length) * 30);
        }

        setVoiceVideoProgress(85);

        // 4. Baixar áudio MP3
        const audioLink = document.createElement('a');
        audioLink.href = audioBase64;
        audioLink.download = `su-controle-narracao-${Date.now()}.mp3`;
        document.body.appendChild(audioLink);
        audioLink.click();
        document.body.removeChild(audioLink);

        // 5. Baixar imagens
        for (let i = 0; i < slideImages.length; i++) {
            const imgLink = document.createElement('a');
            imgLink.href = slideImages[i];
            imgLink.download = `slide-${i + 1}-sucontrole.png`;
            document.body.appendChild(imgLink);
            imgLink.click();
            document.body.removeChild(imgLink);
            await new Promise(r => setTimeout(r, 300));
        }

        setVoiceVideoProgress(100);
        showToast('Áudio + 5 slides baixados! Use o CapCut ou InShot para montar o Reels.', 'success');
        
        setIsGeneratingVoiceVideo(false);
        setVoiceVideoProgress(0);

    } catch (e: any) {
        console.error(e);
        showToast(e.message || "Erro ao gerar conteúdo com voz.", 'error');
        setIsGeneratingVoiceVideo(false);
        setVoiceVideoProgress(0);
    }
  };

  const handleShare = async () => {
    if (!generatedText) return;

    const shareData: ShareData = {
        title: `Post para ${platform}`,
        text: `${generatedText.caption}\n\n${generatedText.hashtags.map(t => `#${t}`).join(' ')}`
    };

    try {
        await navigator.share(shareData);
    } catch (err) {
        console.log('Erro ao compartilhar ou cancelado', err);
        navigator.clipboard.writeText(shareData.text || '');
        showToast('Legenda copiada!', 'info');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-[calc(100vh-80px)] flex flex-col md:flex-row gap-6">
      
      <div className={`w-full md:w-1/3 bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col ${loadingState === LoadingState.SUCCESS ? 'order-2 md:order-1 hidden md:flex' : 'order-1'}`}>
        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 flex items-center justify-between">
          <div className="flex items-center">
             <Wand2 className="mr-2 text-primary-500" size={24}/>
             Estúdio Criativo
          </div>
          {brandProfile && (
              <span className="text-[10px] bg-primary-50 text-primary-700 px-2 py-1 rounded-full border border-primary-100">
                  {brandProfile.name.replace("Sú", "SU")}
              </span>
          )}
        </h2>

        <div className="grid grid-cols-2 gap-2 mb-6">
            <button
              onClick={() => setContentType(ContentType.TEMPLATE_HD)}
              className={`flex items-center justify-center py-2.5 rounded-lg text-xs font-semibold transition-all ${
                contentType === ContentType.TEMPLATE_HD
                  ? 'bg-primary-500 text-white shadow-md' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <LayoutTemplate size={16} className="mr-1.5" />
              Post Único HD
            </button>
            
            <button
              onClick={() => setContentType(ContentType.CAROUSEL_HD)}
              className={`flex items-center justify-center py-2.5 rounded-lg text-xs font-semibold transition-all ${
                contentType === ContentType.CAROUSEL_HD
                  ? 'bg-primary-500 text-white shadow-md' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Layers size={16} className="mr-1.5" />
              Carrossel (5)
            </button>
            
            <button
              onClick={() => setContentType(ContentType.UPLOAD_VISION)}
              className={`flex items-center justify-center py-2 rounded-lg text-xs font-medium transition-all ${
                contentType === ContentType.UPLOAD_VISION
                  ? 'bg-gray-800 text-white' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Camera size={14} className="mr-2" />
              Foto + Legenda
            </button>

            <button
              onClick={() => setContentType(ContentType.IMAGE)}
              className={`flex items-center justify-center py-2 rounded-lg text-xs font-medium transition-all ${
                contentType === ContentType.IMAGE
                  ? 'bg-gray-800 text-white' 
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ImageIcon size={14} className="mr-2" />
              IA Imagem
            </button>

            <button
              onClick={() => setContentType(ContentType.VOICE_VIDEO)}
              className={`col-span-2 flex items-center justify-center py-2.5 rounded-lg text-xs font-semibold transition-all ${
                contentType === ContentType.VOICE_VIDEO
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md' 
                  : 'bg-gradient-to-r from-pink-50 to-purple-50 text-purple-700 hover:from-pink-100 hover:to-purple-100 border border-purple-200'
              }`}
            >
              <Mic size={16} className="mr-2" />
              🎙️ Vídeo com Voz (Reels/TikTok)
            </button>
        </div>

        <div className="space-y-4 flex-1">
          {contentType === ContentType.TEMPLATE_HD && (
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estilo do Template</label>
                  <div className="grid grid-cols-3 gap-2">
                      {[
                          { id: TemplateType.EDUCATIONAL, label: 'Educativo' },
                          { id: TemplateType.QUOTE, label: 'Frase' },
                          { id: TemplateType.MINIMAL_DARK, label: 'Dark' },
                      ].map(t => (
                          <button
                            key={t.id}
                            onClick={() => setTemplateType(t.id)}
                            className={`py-1.5 px-2 text-xs rounded border ${
                                templateType === t.id 
                                ? 'bg-primary-50 border-primary-500 text-primary-700 font-bold' 
                                : 'border-gray-200 text-gray-500 hover:border-gray-300'
                            }`}
                          >
                              {t.label}
                          </button>
                      ))}
                  </div>
              </div>
          )}

          {(contentType === ContentType.CAROUSEL_HD || contentType === ContentType.VOICE_VIDEO) && (
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estilo do Carrossel</label>
                  <div className="grid grid-cols-3 gap-2">
                      {[
                          { id: CarouselStyle.LIGHT, label: 'Claro', color: BRAND_COLORS.lightGray, textColor: BRAND_COLORS.darkBlue },
                          { id: CarouselStyle.DARK, label: 'Escuro', color: BRAND_COLORS.darkBlue, textColor: '#fff' },
                          { id: CarouselStyle.VIBRANT, label: 'Vibrante', color: BRAND_COLORS.orange, textColor: '#fff' },
                      ].map(s => (
                          <button
                            key={s.id}
                            onClick={() => setCarouselStyle(s.id)}
                            className={`py-2 px-2 text-xs rounded border-2 transition-all ${
                                carouselStyle === s.id 
                                ? 'ring-2 ring-primary-500 ring-offset-1' 
                                : 'border-transparent hover:border-gray-300'
                            }`}
                            style={{ 
                                backgroundColor: s.color, 
                                color: s.textColor,
                                fontWeight: carouselStyle === s.id ? 700 : 500
                            }}
                          >
                              {s.label}
                          </button>
                      ))}
                  </div>
              </div>
          )}

          {contentType === ContentType.UPLOAD_VISION ? (
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
                   <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                   />
                   <Upload size={32} className="text-gray-400 mb-2" />
                   <p className="text-sm text-gray-600 font-medium">Toque para enviar foto</p>
                   <p className="text-xs text-gray-400 mt-1">Nós melhoraremos o design e a legenda.</p>
                   
                   {uploadedImage && (
                       <div className="mt-4 w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                           <img src={uploadedImage} className="w-full h-full object-cover" />
                       </div>
                   )}
              </div>
          ) : (
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tema do Post</label>
                <textarea 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={contentType === ContentType.CAROUSEL_HD ? "Ex: 5 passos para sair das dívidas..." : "Ex: Como economizar no mercado..."}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none h-24 md:h-32 resize-none"
                />
             </div>
          )}
        </div>

        <button
          onClick={handleGenerate}
          disabled={loadingState === LoadingState.LOADING || (contentType !== ContentType.UPLOAD_VISION && !topic) || (contentType === ContentType.UPLOAD_VISION && !uploadedImage)}
          className={`w-full mt-6 py-3 rounded-xl flex items-center justify-center text-white font-bold transition-all shadow-lg ${
            loadingState === LoadingState.LOADING || (contentType !== ContentType.UPLOAD_VISION && !topic) || (contentType === ContentType.UPLOAD_VISION && !uploadedImage)
              ? 'bg-primary-300 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-primary-600 to-primary-700 hover:to-primary-800 shadow-primary-500/30'
          }`}
        >
          {loadingState === LoadingState.LOADING ? (
            <>
              <Loader2 className="animate-spin mr-2" size={20} />
              {contentType === ContentType.CAROUSEL_HD ? 'Criando 5 Slides...' : contentType === ContentType.UPLOAD_VISION ? 'Remasterizando Design...' : 'Criando...'}
            </>
          ) : (
            <>
              <Wand2 className="mr-2" size={20} />
              {contentType === ContentType.UPLOAD_VISION ? 'Gerar Legenda & Arte' : 'Gerar Conteúdo'}
            </>
          )}
        </button>

        {errorMsg && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100">
                {errorMsg}
            </div>
        )}
      </div>

      <div className={`w-full md:w-2/3 bg-gray-100 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center relative transition-all ${loadingState === LoadingState.SUCCESS ? 'order-1 md:order-2 h-auto min-h-[500px] border-none bg-transparent' : 'order-2 h-64 md:h-auto'}`}>
        
        {loadingState === LoadingState.SUCCESS && (
            <div className="absolute top-2 right-2 md:hidden z-20">
                 <button onClick={() => setLoadingState(LoadingState.IDLE)} className="text-gray-500 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-xs shadow-sm">
                    Voltar para Edição
                 </button>
            </div>
        )}

        {loadingState === LoadingState.IDLE && (
          <div className="text-center text-gray-400 p-6">
            <Layers size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-sm">Selecione "Carrossel" para criar sequências poderosas.</p>
          </div>
        )}

        {loadingState === LoadingState.LOADING && (
           <div className="text-center p-6">
             <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
             <p className="text-gray-500 font-medium animate-pulse">
                {contentType === ContentType.CAROUSEL_HD ? 'Escrevendo roteiro e desenhando slides...' : contentType === ContentType.UPLOAD_VISION ? 'Lendo imagem e recriando design...' : 'Escrevendo textos...'}
                <br/>
                <span className="text-xs font-normal">Aplicando identidade visual SU Controle...</span>
             </p>
           </div>
        )}

        {loadingState === LoadingState.SUCCESS && (
          <div className="w-full h-full flex flex-col items-center justify-start">
            
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 mb-6 flex-shrink-0">
              
              <div className="p-3 flex items-center space-x-3 border-b border-gray-50 bg-white">
                <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                    style={{ background: '#ff6e40' }}
                >
                    S
                </div>
                <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{brandProfile?.name.replace("Sú", "SU") || "SU Controle"}</p>
                    <p className="text-[10px] text-gray-500">Original Audio</p>
                </div>
                {/* Badge do Provider usado */}
                {usedProvider && (
                  <div className="px-2 py-1 bg-gray-100 rounded-full text-[10px] font-medium text-gray-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                    {usedProvider}
                  </div>
                )}
              </div>

              <div className="bg-gray-50 relative w-full">
                
                {(contentType === ContentType.TEMPLATE_HD || (contentType === ContentType.UPLOAD_VISION && generatedTemplateData && showRemastered)) && generatedTemplateData && (
                    <PostRenderer 
                        forwardedRef={templateRef} 
                        type={templateType} 
                        data={generatedTemplateData} 
                        brand={brandProfile} 
                    />
                )}

                {contentType === ContentType.CAROUSEL_HD && generatedCarouselData && (
                    <CarouselPreview 
                        slides={generatedCarouselData} 
                        brand={brandProfile}
                        carouselRefs={carouselRefs}
                        style={carouselStyle}
                    />
                )}

                {contentType === ContentType.VOICE_VIDEO && generatedCarouselData && (
                    <div className="relative">
                        <CarouselPreview 
                            slides={generatedCarouselData} 
                            brand={brandProfile}
                            carouselRefs={carouselRefs}
                            style={carouselStyle}
                        />
                        {/* Badge indicando que é vídeo com voz */}
                        <div className="absolute top-4 left-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs px-3 py-1.5 rounded-full flex items-center shadow-lg">
                            <Mic size={12} className="mr-1" />
                            Reels/TikTok com Voz
                        </div>
                    </div>
                )}

                {contentType === ContentType.IMAGE && generatedMedia && (
                  <img src={generatedMedia} alt="Generated" className="w-full aspect-square object-cover" />
                )}

                {contentType === ContentType.VIDEO && videoBlobUrl && (
                    <video src={videoBlobUrl} controls className="w-full aspect-[9/16] object-cover" />
                )}

                {contentType === ContentType.UPLOAD_VISION && uploadedImage && (!generatedTemplateData || !showRemastered) && (
                    <img src={uploadedImage} alt="Uploaded" className="w-full aspect-auto object-contain bg-black" />
                )}
              </div>

              {contentType === ContentType.UPLOAD_VISION && generatedTemplateData && (
                 <div className="flex border-t border-gray-100 divide-x divide-gray-100">
                     <button 
                        onClick={() => setShowRemastered(false)}
                        className={`flex-1 py-2 text-xs font-medium flex items-center justify-center ${!showRemastered ? 'bg-gray-100 text-gray-900' : 'text-gray-500'}`}
                     >
                        <ImageIcon size={14} className="mr-1" /> Original
                     </button>
                     <button 
                        onClick={() => setShowRemastered(true)}
                        className={`flex-1 py-2 text-xs font-medium flex items-center justify-center ${showRemastered ? 'bg-primary-50 text-primary-600' : 'text-gray-500'}`}
                     >
                        <RefreshCcw size={14} className="mr-1" /> Remasterizada (HD)
                     </button>
                 </div>
              )}

              <div className="p-4 bg-white">
                <div className="flex justify-between mb-3">
                   <div className="flex space-x-3">
                        <div className="text-gray-800">❤️</div>
                        <div className="text-gray-800">💬</div>
                        <div className="text-gray-800">🚀</div>
                   </div>
                   <div>🔖</div>
                </div>
                
                {generatedText && (
                  <div className="space-y-2 text-sm text-gray-800">
                    <p className="whitespace-pre-wrap leading-relaxed"><span className="font-semibold mr-1">{brandProfile?.name.replace("Sú", "SU") || "sucontrole"}</span>{generatedText.caption}</p>
                    <div className="flex flex-wrap gap-1 mt-2 text-blue-900 text-xs font-medium">
                      {generatedText.hashtags.map(tag => (
                        <span key={tag}>#{tag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full max-w-md grid grid-cols-2 gap-3 mt-auto">
              
              {contentType === ContentType.CAROUSEL_HD && (
                  <>
                  <button 
                    onClick={handleDownloadCarousel}
                    disabled={isGeneratingVideo}
                    className="col-span-1 flex items-center justify-center py-3 bg-white border border-gray-200 text-gray-800 font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <Download size={18} className="mr-2" />
                    5 Imagens (HD)
                  </button>

                  <button 
                    onClick={handleDownloadMotionVideo}
                    disabled={isGeneratingVideo}
                    className="col-span-1 flex items-center justify-center py-3 bg-[#1a1a2e] text-white font-bold rounded-xl hover:bg-black transition-colors shadow-lg relative overflow-hidden"
                  >
                    {isGeneratingVideo ? (
                        <>
                           <div className="absolute inset-0 bg-primary-600 transition-all duration-300" style={{ width: `${videoProgress}%`, opacity: 0.3 }}></div>
                           <Loader2 className="animate-spin mr-2" size={18} />
                           {Math.round(videoProgress)}%
                        </>
                    ) : (
                        <>
                           <Film size={18} className="mr-2" />
                           Baixar Vídeo
                        </>
                    )}
                  </button>
                  </>
              )}

              {(contentType === ContentType.TEMPLATE_HD || (contentType === ContentType.UPLOAD_VISION && generatedTemplateData && showRemastered)) && (
                  <button 
                    onClick={handleDownloadTemplate}
                    className="col-span-2 flex items-center justify-center py-3 bg-[#1a1a2e] text-white font-bold rounded-xl hover:bg-black transition-colors shadow-lg"
                  >
                    <Download size={18} className="mr-2" />
                    Baixar Arte em HD
                  </button>
              )}

              {contentType === ContentType.IMAGE && generatedMedia && (
                  <button 
                    onClick={handleDownloadMedia}
                    className="col-span-2 flex items-center justify-center py-3 bg-[#1a1a2e] text-white font-bold rounded-xl hover:bg-black transition-colors shadow-lg"
                  >
                    <Download size={18} className="mr-2" />
                    Baixar Imagem
                  </button>
              )}

              {contentType === ContentType.VOICE_VIDEO && generatedCarouselData && (
                  <>
                  <button 
                    onClick={handleDownloadCarousel}
                    disabled={isGeneratingVoiceVideo}
                    className="col-span-1 flex items-center justify-center py-3 bg-white border border-gray-200 text-gray-800 font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                  >
                    <Download size={18} className="mr-2" />
                    Só Imagens
                  </button>

                  <button 
                    onClick={handleDownloadVoiceVideo}
                    disabled={isGeneratingVoiceVideo}
                    className="col-span-1 flex items-center justify-center py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-xl hover:from-pink-600 hover:to-purple-700 transition-colors shadow-lg relative overflow-hidden"
                  >
                    {isGeneratingVoiceVideo ? (
                        <>
                           <div className="absolute inset-0 bg-white transition-all duration-300" style={{ width: `${voiceVideoProgress}%`, opacity: 0.2 }}></div>
                           <Loader2 className="animate-spin mr-2" size={18} />
                           {Math.round(voiceVideoProgress)}%
                        </>
                    ) : (
                        <>
                           <Mic size={18} className="mr-2" />
                           🎙️ Gerar com Voz
                        </>
                    )}
                  </button>
                  </>
              )}

              <button 
                onClick={() => {
                     navigator.clipboard.writeText(generatedText?.caption || '');
                     showToast('Legenda copiada!', 'info');
                }}
                className="flex items-center justify-center py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-700 font-medium transition-colors"
              >
                 <Copy size={18} className="mr-2" />
                 Copiar Legenda
              </button>
              
              <button 
                onClick={handleShare}
                className="col-span-1 flex items-center justify-center py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-bold shadow-lg shadow-primary-500/20"
              >
                <Share2 size={18} className="mr-2" />
                Compartilhar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};