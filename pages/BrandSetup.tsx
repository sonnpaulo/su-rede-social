import React, { useState } from 'react';
import { Rocket, Globe, Instagram, ArrowRight, Loader2, CheckCircle2, ShoppingBag } from 'lucide-react';
import { analyzeBrandIdentity } from '../services/geminiService';
import { saveBrandProfile } from '../services/supabaseClient';
import { BrandIdentity } from '../types';

interface BrandSetupProps {
  onComplete: () => void;
}

export const BrandSetup: React.FC<BrandSetupProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1); // 1: Input, 2: Loading, 3: Confirmation
  const [website, setWebsite] = useState('');
  const [website2, setWebsite2] = useState('');
  const [instagram, setInstagram] = useState('');
  const [analyzedData, setAnalyzedData] = useState<BrandIdentity | null>(null);

  const handleAnalyze = async () => {
    if (!website && !instagram) {
        alert("Por favor, insira pelo menos um link principal.");
        return;
    }
    setStep(2);
    try {
        const result = await analyzeBrandIdentity(website, website2, instagram);
        setAnalyzedData(result);
        setStep(3);
    } catch (error) {
        console.error(error);
        alert("Erro ao analisar. Tente novamente.");
        setStep(1);
    }
  };

  const handleSave = async () => {
    if (analyzedData) {
        await saveBrandProfile(analyzedData);
        onComplete();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 transition-all">
        
        <div className="flex items-center justify-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Rocket className="text-white w-6 h-6" />
            </div>
        </div>

        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
            {step === 1 && "Vamos configurar sua marca"}
            {step === 2 && "Lendo seus sites..."}
            {step === 3 && "Isso parece correto?"}
        </h1>
        
        <p className="text-center text-gray-500 mb-8 text-sm">
            {step === 1 && "Insira seus links. Tentaremos ler o conteúdo do site diretamente e pesquisar o Instagram."}
            {step === 2 && "Estamos baixando o conteúdo do seu site e analisando com IA..."}
            {step === 3 && "Encontramos essas informações. Você pode editar ou confirmar."}
        </p>

        {step === 1 && (
            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 ml-1">SITE INSTITUCIONAL / PRINCIPAL</label>
                    <div className="relative">
                        <Globe className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="www.suamarca.com.br"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 ml-1">SITE DE VENDAS / SECUNDÁRIO (Opcional)</label>
                    <div className="relative">
                        <ShoppingBag className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="loja.suamarca.com.br"
                            value={website2}
                            onChange={(e) => setWebsite2(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1 ml-1">INSTAGRAM (Ou Link da Bio)</label>
                    <div className="relative">
                        <Instagram className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="@suamarca"
                            value={instagram}
                            onChange={(e) => setInstagram(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <button 
                    onClick={handleAnalyze}
                    className="w-full mt-4 py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-black transition-all flex items-center justify-center group"
                >
                    Analisar com IA
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
                </button>
            </div>
        )}

        {step === 2 && (
            <div className="flex flex-col items-center py-8">
                <Loader2 className="w-12 h-12 text-primary-500 animate-spin mb-4" />
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden max-w-[200px]">
                    <div className="h-full bg-primary-500 animate-pulse w-2/3 rounded-full"></div>
                </div>
            </div>
        )}

        {step === 3 && analyzedData && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                    <div>
                        <span className="text-xs font-bold text-gray-400 uppercase">Nome</span>
                        <p className="font-semibold text-gray-900">{analyzedData.name}</p>
                    </div>
                    <div>
                        <span className="text-xs font-bold text-gray-400 uppercase">Nicho</span>
                        <p className="text-sm text-gray-700">{analyzedData.niche}</p>
                    </div>
                    <div>
                        <span className="text-xs font-bold text-gray-400 uppercase">Tom de Voz</span>
                        <p className="text-sm text-gray-700">{analyzedData.toneOfVoice}</p>
                    </div>
                    <div>
                        <span className="text-xs font-bold text-gray-400 uppercase">Cores Identificadas</span>
                        <div className="flex gap-2 mt-1">
                            {analyzedData.colors.map((c, i) => (
                                <div key={i} className="w-8 h-8 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: c }} title={c}></div>
                            ))}
                        </div>
                    </div>
                </div>

                <button 
                    onClick={handleSave}
                    className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-all flex items-center justify-center shadow-lg shadow-green-500/20"
                >
                    <CheckCircle2 className="mr-2" size={18} />
                    Confirmar e Começar
                </button>
                
                <button 
                    onClick={() => setStep(1)}
                    className="w-full py-2 text-gray-500 text-sm hover:text-gray-800"
                >
                    Tentar Novamente
                </button>
            </div>
        )}

      </div>
    </div>
  );
};