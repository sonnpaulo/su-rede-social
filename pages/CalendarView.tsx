import React, { useEffect, useState, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronRight, ChevronLeft, Sparkles, Loader2, Plus, Check, Clock, Download, X, Wand2, Image as ImageIcon, Trash2, Eye, CheckCircle } from 'lucide-react';
import { getBrandProfile, getScheduledPostsByDateRange, saveScheduledPost, updateScheduledPost, deleteScheduledPost, uploadCarouselImages, markScheduledPostAsPosted, ScheduledPost } from '../services/supabaseClient';
import { generateWeeklyContentPlan, generateSocialText, generateCarouselData } from '../services/geminiService';
import { BrandIdentity, CarouselSlide, CarouselStyle, BRAND_COLORS } from '../types';
import { CarouselSlideRenderer } from '../components/Templates/PostTemplates';
import { showToast } from '../services/toastService';

declare const html2canvas: any;

interface DayPlan {
  date: Date;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  scheduledPost: ScheduledPost | null;
  suggestedTopic?: string;
  suggestedType?: string;
  suggestedTime?: string;
}

const SUGGESTED_TIMES: Record<string, string> = {
  'Segunda': '19:00',
  'Terça': '12:00',
  'Quarta': '19:00',
  'Quinta': '12:00',
  'Sexta': '20:00',
  'Sábado': '11:00',
  'Domingo': '18:00'
};

export const CalendarView: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [weekPlan, setWeekPlan] = useState<DayPlan[]>([]);
  const [brand, setBrand] = useState<BrandIdentity | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayPlan | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [creatingStep, setCreatingStep] = useState<'idle' | 'generating' | 'preview' | 'saving'>('idle');
  const [generatedCaption, setGeneratedCaption] = useState<string>('');
  const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([]);
  const [generatedSlides, setGeneratedSlides] = useState<CarouselSlide[] | null>(null);
  const [carouselStyle, setCarouselStyle] = useState<CarouselStyle>(CarouselStyle.LIGHT);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const carouselRefs = useRef<(HTMLDivElement | null)[]>([]);


  useEffect(() => {
    loadWeekData();
  }, [weekOffset]);

  const getWeekDates = (offset: number = 0): Date[] => {
    const today = new Date();
    const currentDay = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1) + (offset * 7));
    
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const getDayName = (date: Date): string => {
    const names = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return names[date.getDay()];
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const formatDateStr = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const loadWeekData = async () => {
    setLoading(true);
    try {
      const brandData = await getBrandProfile();
      setBrand(brandData);
      
      const dates = getWeekDates(weekOffset);
      const startDate = formatDateStr(dates[0]);
      const endDate = formatDateStr(dates[6]);
      
      const scheduledPosts = await getScheduledPostsByDateRange(startDate, endDate);
      const savedPlan = localStorage.getItem(`week_plan_${startDate}`);
      const suggestions = savedPlan ? JSON.parse(savedPlan) : null;
      
      const plan: DayPlan[] = dates.map((date) => {
        const dateStr = formatDateStr(date);
        const dayName = getDayName(date);
        const scheduled = scheduledPosts.find(p => p.scheduled_date === dateStr);
        const suggestion = suggestions?.find((s: any) => s.day === dayName);
        
        return {
          date,
          dayName,
          dayNumber: date.getDate(),
          isToday: isToday(date),
          scheduledPost: scheduled || null,
          suggestedTopic: suggestion?.topic,
          suggestedType: suggestion?.type,
          suggestedTime: SUGGESTED_TIMES[dayName]
        };
      });
      
      setWeekPlan(plan);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    setGeneratingPlan(true);
    try {
      if (!brand) {
        showToast("Configure sua marca primeiro.", 'error');
        return;
      }
      
      const plan = await generateWeeklyContentPlan(brand);
      const dates = getWeekDates(weekOffset);
      const startDate = formatDateStr(dates[0]);
      localStorage.setItem(`week_plan_${startDate}`, JSON.stringify(plan));
      
      setWeekPlan(prev => prev.map((day) => {
        const suggestion = plan.find((p: any) => p.day === day.dayName);
        return {
          ...day,
          suggestedTopic: suggestion?.topic,
          suggestedType: suggestion?.type
        };
      }));
      
      showToast('Plano semanal gerado!', 'success');
    } catch (e) {
      showToast("Erro ao gerar plano.", 'error');
    } finally {
      setGeneratingPlan(false);
    }
  };


  const handleOpenCreateModal = (day: DayPlan) => {
    setSelectedDay(day);
    setIsCreating(true);
    setCreatingStep('idle');
    setGeneratedCaption('');
    setGeneratedHashtags([]);
    setGeneratedSlides(null);
    setCurrentSlideIndex(0);
    carouselRefs.current = [];
  };

  const handleGenerateContent = async () => {
    if (!selectedDay || !brand) return;
    
    setCreatingStep('generating');
    try {
      const topic = selectedDay.suggestedTopic || 'Dica de finanças pessoais';
      
      const [textResult, carouselData] = await Promise.all([
        generateSocialText(topic, 'Instagram', brand),
        generateCarouselData(topic, brand)
      ]);
      
      setGeneratedCaption(textResult.caption);
      setGeneratedHashtags(textResult.hashtags);
      setGeneratedSlides(carouselData);
      setCreatingStep('preview');
      
    } catch (e: any) {
      showToast(e.message || 'Erro ao gerar conteúdo', 'error');
      setCreatingStep('idle');
    }
  };

  const handleSaveScheduledPost = async () => {
    if (!selectedDay || !generatedSlides) return;
    
    setCreatingStep('saving');
    try {
      console.log('🔄 Iniciando captura de slides...');
      
      // Aguarda um pouco para garantir que os slides estão renderizados
      await new Promise(r => setTimeout(r, 300));
      
      // Capturar imagens dos slides
      const slideImages: string[] = [];
      
      // Captura cada slide individualmente
      for (let i = 0; i < (generatedSlides?.length || 0); i++) {
        console.log(`📸 Capturando slide ${i + 1}/${generatedSlides?.length}`);
        
        const el = carouselRefs.current[i];
        console.log('Elemento:', el, 'html2canvas:', typeof html2canvas);
        
        if (el && typeof html2canvas !== 'undefined') {
          const scale = 1080 / el.offsetWidth;
          const canvas = await html2canvas(el, { 
            scale, 
            useCORS: true, 
            backgroundColor: null,
            logging: false
          });
          const base64 = canvas.toDataURL('image/png');
          slideImages.push(base64);
          console.log(`✅ Slide ${i + 1} capturado (${Math.round(base64.length / 1024)}KB)`);
        } else {
          console.error(`❌ Elemento ou html2canvas não disponível para slide ${i + 1}`);
        }
      }
      
      console.log(`💾 Salvando post com ${slideImages.length} imagens...`);
      
      // Criar post no banco com imagens base64 direto
      const dateStr = formatDateStr(selectedDay.date);
      const post = await saveScheduledPost({
        scheduled_date: dateStr,
        topic: selectedDay.suggestedTopic || 'Post do dia',
        platform: 'Instagram',
        content_type: 'CAROUSEL_HD',
        caption: generatedCaption,
        hashtags: generatedHashtags,
        carousel_style: carouselStyle,
        image_urls: slideImages,
      });
      
      console.log('📝 Post criado:', post);
      
      if (post && slideImages.length > 0) {
        // Atualizar status para ready
        await updateScheduledPost(post.id, { 
          status: 'ready'
        });
        console.log('✅ Status atualizado para ready');
      }
      
      showToast(`Post agendado com ${slideImages.length} imagens!`, 'success');
      setIsCreating(false);
      loadWeekData();
      
    } catch (e: any) {
      console.error('❌ Erro ao salvar post:', e);
      showToast(e.message || 'Erro ao salvar', 'error');
      setCreatingStep('preview');
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Excluir este post agendado?')) return;
    
    const success = await deleteScheduledPost(postId);
    if (success) {
      showToast('Post excluído', 'info');
      loadWeekData();
      setSelectedDay(null);
    }
  };

  const handleMarkAsPosted = async (postId: string) => {
    const success = await markScheduledPostAsPosted(postId);
    if (success) {
      showToast('Marcado como postado!', 'success');
      loadWeekData();
    }
  };

  const handleDownloadImages = async (post: ScheduledPost) => {
    if (!post.image_urls || post.image_urls.length === 0) {
      showToast('Nenhuma imagem disponível', 'error');
      return;
    }
    
    for (let i = 0; i < post.image_urls.length; i++) {
      const link = document.createElement('a');
      link.href = post.image_urls[i];
      link.download = `slide-${i + 1}-${post.scheduled_date}.png`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      await new Promise(r => setTimeout(r, 500));
    }
    showToast('Download iniciado!', 'success');
  };

  const getStatusColor = (day: DayPlan) => {
    if (day.scheduledPost?.status === 'posted') return 'bg-green-500';
    if (day.scheduledPost?.status === 'ready') return 'bg-yellow-500';
    if (day.scheduledPost) return 'bg-orange-500';
    if (day.suggestedTopic) return 'bg-blue-500';
    return 'bg-gray-300';
  };

  const getStatusLabel = (day: DayPlan) => {
    if (day.scheduledPost?.status === 'posted') return { text: 'Postado', color: 'text-green-600 bg-green-50' };
    if (day.scheduledPost?.status === 'ready') return { text: 'Pronto', color: 'text-yellow-600 bg-yellow-50' };
    if (day.scheduledPost) return { text: 'Rascunho', color: 'text-orange-600 bg-orange-50' };
    if (day.suggestedTopic) return { text: 'Sugestão', color: 'text-blue-600 bg-blue-50' };
    return { text: 'Vazio', color: 'text-gray-400 bg-gray-50' };
  };

  const getWeekLabel = () => {
    const dates = getWeekDates(weekOffset);
    const start = dates[0];
    const end = dates[6];
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} - ${end.getDate()} ${months[start.getMonth()]}`;
    }
    return `${start.getDate()} ${months[start.getMonth()]} - ${end.getDate()} ${months[end.getMonth()]}`;
  };

  const todayPlan = weekPlan.find(d => d.isToday);


  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Planejamento Semanal</h1>
          <p className="text-gray-500">Crie e agende seus posts da semana</p>
        </div>
        
        <button 
          onClick={handleGeneratePlan}
          disabled={generatingPlan}
          className="flex items-center px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-all shadow-lg shadow-primary-500/20 font-bold"
        >
          {generatingPlan ? <Loader2 className="animate-spin mr-2" size={18} /> : <Sparkles className="mr-2" size={18} />}
          {generatingPlan ? "Criando..." : "Gerar Pauta da Semana"}
        </button>
      </div>

      {/* Banner do Dia */}
      {todayPlan && (todayPlan.scheduledPost || todayPlan.suggestedTopic) && (
        <div className={`rounded-2xl p-5 text-white shadow-xl ${
          todayPlan.scheduledPost?.status === 'ready' 
            ? 'bg-gradient-to-r from-yellow-500 to-orange-500' 
            : 'bg-gradient-to-r from-primary-500 to-primary-600'
        }`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-white/80 text-sm font-medium">📅 Hoje - {todayPlan.dayName}</p>
              <h2 className="text-xl font-bold mt-1">
                {todayPlan.scheduledPost?.topic || todayPlan.suggestedTopic}
              </h2>
              {todayPlan.suggestedTime && (
                <p className="text-white/80 text-sm mt-1 flex items-center">
                  <Clock size={14} className="mr-1" />
                  Melhor horário: {todayPlan.suggestedTime}
                </p>
              )}
            </div>
            
            <div className="flex gap-2">
              {todayPlan.scheduledPost?.status === 'ready' ? (
                <>
                  <button 
                    onClick={() => handleDownloadImages(todayPlan.scheduledPost!)}
                    className="bg-white text-orange-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-orange-50 transition-colors flex items-center"
                  >
                    <Download size={16} className="mr-2" />
                    Baixar
                  </button>
                  <button 
                    onClick={() => handleMarkAsPosted(todayPlan.scheduledPost!.id)}
                    className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-600 transition-colors flex items-center"
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Marcar Postado
                  </button>
                </>
              ) : !todayPlan.scheduledPost ? (
                <button 
                  onClick={() => handleOpenCreateModal(todayPlan)}
                  className="bg-white text-primary-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-primary-50 transition-colors flex items-center"
                >
                  <Wand2 size={16} className="mr-2" />
                  Criar Agora
                </button>
              ) : (
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                  {todayPlan.scheduledPost.status === 'posted' ? '✓ Postado' : '📝 Rascunho'}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navegação da Semana */}
      <div className="flex items-center justify-between bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
        <button onClick={() => setWeekOffset(prev => prev - 1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <span className="font-bold text-gray-900">{getWeekLabel()}</span>
          {weekOffset === 0 && <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">Esta semana</span>}
        </div>
        <button onClick={() => setWeekOffset(prev => prev + 1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronRight size={20} />
        </button>
      </div>


      {/* Grade da Semana */}
      {loading ? (
        <div className="grid grid-cols-7 gap-2">
          {[1,2,3,4,5,6,7].map(i => (
            <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          {weekPlan.map((day, idx) => {
            const status = getStatusLabel(day);
            return (
              <div 
                key={idx}
                onClick={() => setSelectedDay(day)}
                className={`bg-white rounded-xl border-2 transition-all overflow-hidden cursor-pointer active:scale-95 ${
                  day.isToday ? 'border-primary-500 shadow-lg shadow-primary-500/10' : 'border-gray-100 hover:border-gray-200 hover:shadow-md'
                }`}
              >
                <div className={`p-3 border-b ${day.isToday ? 'bg-primary-50' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold uppercase ${day.isToday ? 'text-primary-600' : 'text-gray-500'}`}>
                      {day.dayName.slice(0, 3)}
                    </span>
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(day)}`} />
                  </div>
                  <span className={`text-2xl font-bold ${day.isToday ? 'text-primary-600' : 'text-gray-900'}`}>
                    {day.dayNumber}
                  </span>
                </div>
                
                <div className="p-3 min-h-[100px] flex flex-col">
                  {day.scheduledPost ? (
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-900 line-clamp-2 mb-2">{day.scheduledPost.topic}</p>
                      {day.scheduledPost.image_urls && day.scheduledPost.image_urls.length > 0 && (
                        <div className="flex items-center gap-1 mb-2">
                          <ImageIcon size={12} className="text-green-500" />
                          <span className="text-[10px] text-green-600">{day.scheduledPost.image_urls.length} imagens</span>
                        </div>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${status.color}`}>{status.text}</span>
                    </div>
                  ) : day.suggestedTopic ? (
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 line-clamp-2 mb-2">{day.suggestedTopic}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${status.color}`}>Sugestão IA</span>
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <span className="text-gray-300 text-xs">Sem post</span>
                    </div>
                  )}
                  
                  {!day.scheduledPost && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleOpenCreateModal(day); }}
                      className="mt-2 w-full py-1.5 text-xs bg-gray-100 hover:bg-primary-100 hover:text-primary-700 rounded-lg transition-colors flex items-center justify-center font-medium"
                    >
                      <Plus size={12} className="mr-1" /> Criar
                    </button>
                  )}
                </div>
                
                {day.suggestedTime && (
                  <div className="px-3 pb-2">
                    <span className="text-[10px] text-gray-400 flex items-center">
                      <Clock size={10} className="mr-1" />{day.suggestedTime}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 bg-gray-50 rounded-xl p-4">
        <span className="font-medium text-gray-700">Legenda:</span>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-500" /><span>Postado</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-500" /><span>Pronto</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-orange-500" /><span>Rascunho</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /><span>Sugestão</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-gray-300" /><span>Vazio</span></div>
      </div>


      {/* Modal de Detalhes/Visualização */}
      {selectedDay && !isCreating && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto" onClick={() => setSelectedDay(null)}>
          <div className="min-h-full flex items-center justify-center p-3">
            <div className="bg-white w-full max-w-[400px] rounded-2xl max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className={`p-5 ${selectedDay.isToday ? 'bg-primary-500 text-white' : 'bg-gray-100'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${selectedDay.isToday ? 'text-primary-100' : 'text-gray-500'}`}>
                    {selectedDay.isToday ? '📅 Hoje' : selectedDay.dayName}
                  </p>
                  <h2 className={`text-2xl font-bold ${selectedDay.isToday ? 'text-white' : 'text-gray-900'}`}>
                    {selectedDay.dayNumber} {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][selectedDay.date.getMonth()]}
                  </h2>
                </div>
                <button onClick={() => setSelectedDay(null)} className={`p-2 rounded-full ${selectedDay.isToday ? 'hover:bg-white/20' : 'hover:bg-gray-200'}`}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto max-h-[60vh]">
              {/* Post Agendado */}
              {selectedDay.scheduledPost && (
                <div className="space-y-4">
                  <div className={`rounded-xl p-4 ${selectedDay.scheduledPost.status === 'ready' ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {selectedDay.scheduledPost.status === 'posted' ? (
                        <><Check size={16} className="text-green-600" /><span className="text-sm font-bold text-green-700">Postado</span></>
                      ) : selectedDay.scheduledPost.status === 'ready' ? (
                        <><ImageIcon size={16} className="text-yellow-600" /><span className="text-sm font-bold text-yellow-700">Pronto para Postar</span></>
                      ) : (
                        <><CalendarIcon size={16} className="text-orange-600" /><span className="text-sm font-bold text-orange-700">Rascunho</span></>
                      )}
                    </div>
                    <p className="text-gray-800 font-medium">{selectedDay.scheduledPost.topic}</p>
                    {selectedDay.scheduledPost.caption && (
                      <p className="text-gray-600 text-sm mt-2 line-clamp-4">{selectedDay.scheduledPost.caption}</p>
                    )}
                  </div>

                  {/* Preview das Imagens */}
                  {selectedDay.scheduledPost.image_urls && selectedDay.scheduledPost.image_urls.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Preview ({selectedDay.scheduledPost.image_urls.length} slides)</p>
                      <div className="grid grid-cols-5 gap-2">
                        {selectedDay.scheduledPost.image_urls.map((url, i) => (
                          <img key={i} src={url} alt={`Slide ${i+1}`} className="w-full aspect-square object-cover rounded-lg border border-gray-200" />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ações */}
                  <div className="flex gap-2">
                    {selectedDay.scheduledPost.status === 'ready' && (
                      <>
                        <button onClick={() => handleDownloadImages(selectedDay.scheduledPost!)} className="flex-1 py-2.5 bg-primary-500 text-white rounded-xl font-bold text-sm flex items-center justify-center">
                          <Download size={16} className="mr-2" /> Baixar Imagens
                        </button>
                        <button onClick={() => handleMarkAsPosted(selectedDay.scheduledPost!.id)} className="py-2.5 px-4 bg-green-500 text-white rounded-xl font-bold text-sm">
                          <Check size={16} />
                        </button>
                      </>
                    )}
                    <button onClick={() => handleDeletePost(selectedDay.scheduledPost!.id)} className="py-2.5 px-4 bg-red-100 text-red-600 rounded-xl hover:bg-red-200">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Sugestão da IA */}
              {selectedDay.suggestedTopic && !selectedDay.scheduledPost && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles size={16} className="text-blue-600" />
                    <span className="text-sm font-bold text-blue-700">Sugestão da IA</span>
                  </div>
                  <p className="text-gray-800">{selectedDay.suggestedTopic}</p>
                </div>
              )}

              {/* Horário */}
              {selectedDay.suggestedTime && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Clock size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Melhor horário</p>
                    <p className="font-bold text-gray-900">{selectedDay.suggestedTime}</p>
                  </div>
                </div>
              )}

              {!selectedDay.suggestedTopic && !selectedDay.scheduledPost && (
                <div className="text-center py-8 text-gray-400">
                  <CalendarIcon size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Nenhum post planejado</p>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-gray-100 bg-gray-50">
              {!selectedDay.scheduledPost ? (
                <button onClick={() => handleOpenCreateModal(selectedDay)} className="w-full py-3 bg-primary-500 text-white rounded-xl font-bold flex items-center justify-center hover:bg-primary-600 text-sm">
                  <Wand2 size={16} className="mr-2" /> Criar Post para {selectedDay.dayName}
                </button>
              ) : (
                <button onClick={() => setSelectedDay(null)} className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 text-sm">
                  Fechar
                </button>
              )}
            </div>
            </div>
          </div>
        </div>
      )}


      {/* Modal de Criação de Post */}
      {isCreating && selectedDay && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2" onClick={() => setIsCreating(false)}>
          <div className="bg-white w-full max-w-[400px] rounded-2xl shadow-2xl flex flex-col" style={{ maxHeight: 'calc(100vh - 100px)' }} onClick={(e) => e.stopPropagation()}>
              {/* Header compacto */}
              <div className="p-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white flex-shrink-0 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-primary-100 text-[10px]">Criar post para</p>
                    <h2 className="text-base font-bold">{selectedDay.dayName}, {selectedDay.dayNumber}</h2>
                  </div>
                  <button onClick={() => setIsCreating(false)} className="p-1.5 hover:bg-white/20 rounded-full">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Botão Gerar - SEMPRE visível no topo quando idle */}
              {creatingStep === 'idle' && (
                <div className="p-3 bg-white border-b border-gray-100 flex-shrink-0">
                  <button onClick={handleGenerateContent} className="w-full py-3 bg-primary-500 text-white rounded-xl font-bold flex items-center justify-center hover:bg-primary-600 shadow-lg shadow-primary-500/30 text-sm">
                    <Wand2 size={18} className="mr-2" /> Gerar Conteúdo
                  </button>
                </div>
              )}

              {/* Conteúdo scrollável */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ minHeight: 0 }}>
              {/* Tema */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs text-blue-600 font-medium mb-1">Tema do Post</p>
                <p className="text-gray-900 font-medium text-sm">{selectedDay.suggestedTopic || 'Dica de finanças pessoais'}</p>
              </div>

              {/* Seletor de Estilo */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Estilo do Carrossel</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: CarouselStyle.LIGHT, label: 'Claro', color: BRAND_COLORS.lightGray, text: BRAND_COLORS.darkBlue },
                    { id: CarouselStyle.DARK, label: 'Escuro', color: BRAND_COLORS.darkBlue, text: '#fff' },
                    { id: CarouselStyle.VIBRANT, label: 'Vibrante', color: BRAND_COLORS.orange, text: '#fff' },
                  ].map(s => (
                    <button
                      key={s.id}
                      onClick={() => setCarouselStyle(s.id)}
                      className={`py-2 px-2 text-sm rounded-xl border-2 transition-all font-medium ${
                        carouselStyle === s.id ? 'ring-2 ring-primary-500 ring-offset-1' : ''
                      }`}
                      style={{ backgroundColor: s.color, color: s.text, borderColor: carouselStyle === s.id ? s.color : 'transparent' }}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Estado: Gerando */}
              {creatingStep === 'generating' && (
                <div className="text-center py-8">
                  <Loader2 size={36} className="mx-auto text-primary-500 animate-spin mb-3" />
                  <p className="text-gray-600 font-medium">Gerando conteúdo...</p>
                  <p className="text-gray-400 text-sm">Criando legenda e 5 slides</p>
                </div>
              )}

              {/* Estado: Preview */}
              {creatingStep === 'preview' && generatedSlides && (
                <div className="space-y-3">
                  {/* Preview do Carrossel com setas */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Preview do Carrossel</p>
                    <div className="relative bg-gray-100 rounded-xl overflow-hidden">
                      <CarouselSlideRenderer
                        slide={generatedSlides[currentSlideIndex]}
                        brand={brand}
                        style={carouselStyle}
                        forwardedRef={(el) => carouselRefs.current[currentSlideIndex] = el}
                      />
                      
                      {/* Setas de navegação */}
                      <button 
                        onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentSlideIndex === 0}
                        className={`absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          currentSlideIndex === 0 ? 'bg-black/20 text-white/40' : 'bg-white shadow-lg text-gray-800'
                        }`}
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button 
                        onClick={() => setCurrentSlideIndex(prev => Math.min(generatedSlides.length - 1, prev + 1))}
                        disabled={currentSlideIndex === generatedSlides.length - 1}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          currentSlideIndex === generatedSlides.length - 1 ? 'bg-black/20 text-white/40' : 'bg-white shadow-lg text-gray-800'
                        }`}
                      >
                        <ChevronRight size={20} />
                      </button>
                      
                      {/* Indicadores */}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                        {generatedSlides.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentSlideIndex(i)}
                            className={`w-2 h-2 rounded-full transition-all ${i === currentSlideIndex ? 'bg-white w-5' : 'bg-white/50'}`}
                          />
                        ))}
                      </div>
                      <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                        {currentSlideIndex + 1} / {generatedSlides.length}
                      </div>
                    </div>
                    
                    {/* Renderiza todos os slides fora da tela para captura */}
                    <div className="fixed -left-[9999px] top-0 pointer-events-none" style={{ width: '1080px' }}>
                      {generatedSlides.map((slide, i) => (
                        <div key={i} className="mb-4">
                          <CarouselSlideRenderer
                            slide={slide}
                            brand={brand}
                            style={carouselStyle}
                            forwardedRef={(el) => carouselRefs.current[i] = el}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Legenda - mais compacta */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Legenda</p>
                    <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 max-h-24 overflow-y-auto">
                      {generatedCaption}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {generatedHashtags.slice(0, 4).map((tag, i) => (
                        <span key={i} className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">#{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Estado: Salvando */}
              {creatingStep === 'saving' && (
                <div className="text-center py-8">
                  <Loader2 size={36} className="mx-auto text-primary-500 animate-spin mb-3" />
                  <p className="text-gray-600 font-medium">Salvando post...</p>
                  <p className="text-gray-400 text-sm">Fazendo upload das imagens</p>
                </div>
              )}
              </div>

              {/* Footer - só aparece no preview */}
              {creatingStep === 'preview' && (
                <div className="p-3 border-t border-gray-100 bg-white flex-shrink-0 rounded-b-2xl">
                  <div className="flex gap-2">
                    <button onClick={() => setCreatingStep('idle')} className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-xl font-medium text-sm">
                      Regenerar
                    </button>
                    <button onClick={handleSaveScheduledPost} className="flex-1 py-2.5 bg-green-500 text-white rounded-xl font-bold flex items-center justify-center hover:bg-green-600 text-sm">
                      <Check size={16} className="mr-1" /> Salvar
                    </button>
                  </div>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
};
