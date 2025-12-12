import React from 'react';
import { TemplateType, TemplateData, BrandIdentity, CarouselSlide, CarouselStyle, BRAND_COLORS } from '../../types';
import { 
  Lightbulb, TrendingUp, DollarSign, CheckCircle2, 
  AlertTriangle, Info, ShieldCheck, Target, Rocket
} from 'lucide-react';

interface PostRendererProps {
  type: TemplateType;
  data: TemplateData;
  brand: BrandIdentity | null;
  forwardedRef?: React.Ref<HTMLDivElement>;
}

interface CarouselRendererProps {
  slide: CarouselSlide;
  brand: BrandIdentity | null;
  style?: CarouselStyle;
  forwardedRef?: React.Ref<HTMLDivElement>;
}

// Mapeamento de nomes de string para componentes Lucide
const IconMap: Record<string, any> = {
  'Lightbulb': Lightbulb,
  'TrendingUp': TrendingUp,
  'DollarSign': DollarSign,
  'CheckCircle2': CheckCircle2,
  'AlertTriangle': AlertTriangle,
  'Info': Info,
  'ShieldCheck': ShieldCheck,
  'Target': Target,
  'Rocket': Rocket
};

export const PostRenderer: React.FC<PostRendererProps> = ({ type, data, brand, forwardedRef }) => {
  const IconComponent = data.iconName && IconMap[data.iconName] ? IconMap[data.iconName] : Lightbulb;
  
  const brandName = brand?.name ? brand.name.replace("Sú", "SU") : "SU Controle";
  const primaryColor = BRAND_COLORS.orange;  // #eb693d
  const darkColor = BRAND_COLORS.darkBlue;   // #1a1a2e

  // Container Comum (Quadrado 1080x1080 visualmente escalado)
  const containerStyle = "w-full aspect-square relative overflow-hidden shadow-sm flex flex-col";

  // 1. TEMPLATE EDUCATIVO (Clássico SU Controle: Fundo claro, ícone laranja)
  if (type === TemplateType.EDUCATIONAL) {
    return (
      <div ref={forwardedRef} className={`${containerStyle} bg-[#f8f9fa] p-8 md:p-12 items-start justify-between`}>
        {/* Cabeçalho */}
        <div className="flex items-center space-x-3">
             <div className="w-2 h-8 bg-[#ff6e40]"></div>
             <span className="text-sm font-bold tracking-widest text-[#1a1a2e] uppercase">{brandName}</span>
        </div>

        {/* Conteúdo Central */}
        <div className="flex-1 flex flex-col justify-center space-y-6">
           <div className="p-4 bg-orange-50 rounded-2xl w-fit">
              <IconComponent size={48} color="#ff6e40" strokeWidth={1.5} />
           </div>
           
           <h1 className="text-3xl md:text-4xl font-bold text-[#1a1a2e] leading-tight">
             {data.title}
           </h1>
           
           <p className="text-lg text-gray-600 font-medium leading-relaxed">
             {data.body}
           </p>
        </div>

        {/* Rodapé */}
        <div className="w-full pt-6 border-t border-gray-200 flex justify-between items-center text-gray-400 text-sm">
           <span>{data.footer || "Salve este post"}</span>
           <span>@sucontrole</span>
        </div>
      </div>
    );
  }

  // 2. TEMPLATE CITAÇÃO / FRASE (Fundo Gradiente Laranja -> Roxo)
  if (type === TemplateType.QUOTE) {
    return (
      <div ref={forwardedRef} className={`${containerStyle} bg-gradient-to-br from-[#ff6e40] to-[#1a1a2e] p-8 md:p-12 flex flex-col justify-center items-center text-center`}>
        
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

        <div className="relative z-10 space-y-8">
            <IconComponent size={64} className="text-white/20 mx-auto" />
            
            <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight drop-shadow-lg">
                "{data.title}"
            </h1>
            
            {data.body && (
                <p className="text-white/80 text-lg font-light max-w-md mx-auto border-l-2 border-white/30 pl-4">
                    {data.body}
                </p>
            )}
        </div>

        <div className="absolute bottom-8 text-white/50 text-sm font-medium tracking-widest uppercase">
            {brandName}
        </div>
      </div>
    );
  }

  // 3. TEMPLATE MINIMAL DARK (Fundo Azul Escuro, Texto Branco)
  if (type === TemplateType.MINIMAL_DARK) {
      return (
        <div ref={forwardedRef} className={`${containerStyle} bg-[#1a1a2e] p-8 md:p-12 flex flex-col`}>
           <div className="flex justify-end">
               <div className="bg-[#ff6e40] text-[#1a1a2e] font-bold px-3 py-1 rounded text-xs">DICA</div>
           </div>

           <div className="flex-1 flex flex-col justify-center space-y-6">
                <h2 className="text-2xl text-[#ff6e40] font-semibold">{data.highlight || "Atenção"}</h2>
                <h1 className="text-3xl md:text-4xl font-bold text-white leading-snug">
                    {data.title}
                </h1>
                <p className="text-gray-300 text-lg border-l-4 border-[#ff6e40] pl-4 py-1">
                    {data.body}
                </p>
           </div>

           <div className="flex items-center space-x-2 mt-auto pt-8">
               <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-[#1a1a2e] font-bold text-xs">
                   {brandName.substring(0,1)}
               </div>
               <span className="text-white text-sm font-medium">{brandName}</span>
           </div>
        </div>
      );
  }

  return <div>Template não encontrado</div>;
};

// Renderizador de Slide de Carrossel com 3 estilos
export const CarouselSlideRenderer: React.FC<CarouselRendererProps> = ({ slide, brand, style = CarouselStyle.LIGHT, forwardedRef }) => {
  const brandName = brand?.name ? brand.name.replace("Sú", "SU") : "SU Controle";
  const containerStyle = "w-full aspect-square relative overflow-hidden flex flex-col p-8 md:p-10";
  
  const { orange, darkBlue, lightGray } = BRAND_COLORS;

  // ============ ESTILO CLARO (LIGHT) ============
  if (style === CarouselStyle.LIGHT) {
    if (slide.type === 'COVER') {
      return (
        <div ref={forwardedRef} className={`${containerStyle} bg-[${lightGray}] justify-between`} style={{ backgroundColor: lightGray }}>
            <div className="w-12 h-1 rounded-full" style={{ backgroundColor: orange }}></div>
            <div className="space-y-4">
                <span className="font-bold tracking-widest text-xs uppercase" style={{ color: orange }}>FINANÇAS SIMPLES</span>
                <h1 className="text-4xl md:text-5xl font-bold leading-[1.1]" style={{ color: darkBlue }}>{slide.title}</h1>
                <p className="text-gray-600 text-lg">{slide.body}</p>
            </div>
            <div className="flex justify-between items-center border-t border-gray-300 pt-4">
               <span className="text-gray-500 text-xs font-semibold">{brandName}</span>
               <span className="text-gray-400 text-xs">Arrasta pro lado →</span>
            </div>
        </div>
      );
    }
    if (slide.type === 'CTA') {
      return (
        <div ref={forwardedRef} className={`${containerStyle} justify-center items-center text-center`} style={{ backgroundColor: orange }}>
           <div className="bg-white/20 p-4 rounded-full mb-6"><Rocket size={48} className="text-white" /></div>
           <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">{slide.title}</h1>
           <p className="text-white/90 text-lg mb-8 max-w-xs mx-auto">{slide.body}</p>
           <div className="text-white px-8 py-3 rounded-full font-bold shadow-lg" style={{ backgroundColor: darkBlue }}>ASSINE AGORA</div>
           <div className="absolute bottom-6 text-white/50 text-xs font-bold">{slide.pageNumber} / {slide.totalPages}</div>
        </div>
      );
    }
    return (
      <div ref={forwardedRef} className={`${containerStyle} bg-white justify-between border border-gray-200`}>
          <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: darkBlue }}>{slide.pageNumber}</div>
              <span className="font-bold text-sm uppercase" style={{ color: darkBlue }}>{slide.title}</span>
          </div>
          <div className="flex-1 flex flex-col justify-center">
              <p className="text-xl md:text-2xl text-gray-800 font-medium leading-relaxed">{slide.body}</p>
          </div>
          <div className="flex justify-between items-center border-t border-gray-100 pt-4">
             <span className="text-gray-400 text-xs">@sucontrole</span>
             <div className="flex space-x-1">
                {[...Array(slide.totalPages)].map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: i + 1 === slide.pageNumber ? orange : '#e5e7eb' }}></div>
                ))}
             </div>
          </div>
      </div>
    );
  }

  // ============ ESTILO ESCURO (DARK) ============
  if (style === CarouselStyle.DARK) {
    if (slide.type === 'COVER') {
      return (
        <div ref={forwardedRef} className={`${containerStyle} justify-between`} style={{ backgroundColor: darkBlue }}>
            <div className="w-12 h-1 rounded-full" style={{ backgroundColor: orange }}></div>
            <div className="space-y-4">
                <span className="font-bold tracking-widest text-xs uppercase" style={{ color: orange }}>FINANÇAS SIMPLES</span>
                <h1 className="text-4xl md:text-5xl font-bold text-white leading-[1.1]">{slide.title}</h1>
                <p className="text-gray-300 text-lg">{slide.body}</p>
            </div>
            <div className="flex justify-between items-center border-t border-white/10 pt-4">
               <span className="text-white/50 text-xs font-semibold">{brandName}</span>
               <span className="text-white/30 text-xs">Arrasta pro lado →</span>
            </div>
        </div>
      );
    }
    if (slide.type === 'CTA') {
      return (
        <div ref={forwardedRef} className={`${containerStyle} justify-center items-center text-center`} style={{ backgroundColor: orange }}>
           <div className="bg-white/20 p-4 rounded-full mb-6"><Rocket size={48} className="text-white" /></div>
           <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">{slide.title}</h1>
           <p className="text-white/90 text-lg mb-8 max-w-xs mx-auto">{slide.body}</p>
           <div className="text-white px-8 py-3 rounded-full font-bold shadow-lg" style={{ backgroundColor: darkBlue }}>ASSINE AGORA</div>
           <div className="absolute bottom-6 text-white/50 text-xs font-bold">{slide.pageNumber} / {slide.totalPages}</div>
        </div>
      );
    }
    return (
      <div ref={forwardedRef} className={`${containerStyle} justify-between`} style={{ backgroundColor: darkBlue }}>
          <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: orange, color: 'white' }}>{slide.pageNumber}</div>
              <span className="font-bold text-sm uppercase" style={{ color: orange }}>{slide.title}</span>
          </div>
          <div className="flex-1 flex flex-col justify-center">
              <p className="text-xl md:text-2xl text-white font-medium leading-relaxed">{slide.body}</p>
          </div>
          <div className="flex justify-between items-center border-t border-white/10 pt-4">
             <span className="text-white/40 text-xs">@sucontrole</span>
             <div className="flex space-x-1">
                {[...Array(slide.totalPages)].map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: i + 1 === slide.pageNumber ? orange : 'rgba(255,255,255,0.2)' }}></div>
                ))}
             </div>
          </div>
      </div>
    );
  }

  // ============ ESTILO VIBRANTE (VIBRANT) ============
  if (style === CarouselStyle.VIBRANT) {
    if (slide.type === 'COVER') {
      return (
        <div ref={forwardedRef} className={`${containerStyle} justify-between`} style={{ backgroundColor: orange }}>
            <div className="w-12 h-1 bg-white/30 rounded-full"></div>
            <div className="space-y-4">
                <span className="text-white/80 font-bold tracking-widest text-xs uppercase">FINANÇAS SIMPLES</span>
                <h1 className="text-4xl md:text-5xl font-bold text-white leading-[1.1]">{slide.title}</h1>
                <p className="text-white/80 text-lg">{slide.body}</p>
            </div>
            <div className="flex justify-between items-center border-t border-white/20 pt-4">
               <span className="text-white/60 text-xs font-semibold">{brandName}</span>
               <span className="text-white/40 text-xs">Arrasta pro lado →</span>
            </div>
        </div>
      );
    }
    if (slide.type === 'CTA') {
      return (
        <div ref={forwardedRef} className={`${containerStyle} justify-center items-center text-center`} style={{ backgroundColor: darkBlue }}>
           <div className="p-4 rounded-full mb-6" style={{ backgroundColor: orange }}><Rocket size={48} className="text-white" /></div>
           <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">{slide.title}</h1>
           <p className="text-white/80 text-lg mb-8 max-w-xs mx-auto">{slide.body}</p>
           <div className="text-white px-8 py-3 rounded-full font-bold shadow-lg" style={{ backgroundColor: orange }}>ASSINE AGORA</div>
           <div className="absolute bottom-6 text-white/50 text-xs font-bold">{slide.pageNumber} / {slide.totalPages}</div>
        </div>
      );
    }
    return (
      <div ref={forwardedRef} className={`${containerStyle} justify-between text-white`} style={{ backgroundColor: orange }}>
          <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-[10px] font-bold" style={{ color: orange }}>{slide.pageNumber}</div>
              <span className="font-bold text-sm uppercase text-white">{slide.title}</span>
          </div>
          <div className="flex-1 flex flex-col justify-center">
              <p className="text-xl md:text-2xl text-white font-medium leading-relaxed">{slide.body}</p>
          </div>
          <div className="flex justify-between items-center border-t border-white/20 pt-4">
             <span className="text-white/60 text-xs">@sucontrole</span>
             <div className="flex space-x-1">
                {[...Array(slide.totalPages)].map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: i + 1 === slide.pageNumber ? 'white' : 'rgba(255,255,255,0.3)' }}></div>
                ))}
             </div>
          </div>
      </div>
    );
  }

  // Fallback
  return <div>Estilo não encontrado</div>;
};