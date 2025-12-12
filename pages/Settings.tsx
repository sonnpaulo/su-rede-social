import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Key, Mic, Cpu } from 'lucide-react';
import { getBrandProfile, updateBrandProfile } from '../services/supabaseClient';
import { BrandIdentity, AIProvider } from '../types';
import { showToast } from '../services/toastService';

const AI_PROVIDERS: { id: AIProvider; name: string; description: string }[] = [
  { id: 'gemini', name: 'Google Gemini', description: 'Requer sua API Key (gratuito até 60 req/min)' },
  { id: 'groq', name: 'Groq (Llama 3.3)', description: 'Rápido e gratuito (14.400 req/dia)' },
  { id: 'mistral', name: 'Mistral Large', description: 'Alta qualidade, pago' },
  { id: 'openrouter', name: 'OpenRouter', description: 'Acesso a vários modelos' },
  { id: 'openai', name: 'OpenAI GPT-4o', description: 'Melhor qualidade, pago' },
];

export const Settings: React.FC = () => {
  const [brand, setBrand] = useState<BrandIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const data = await getBrandProfile();
    setBrand(data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!brand) return;
    setSaving(true);
    try {
        await updateBrandProfile(brand);
        showToast('Configurações salvas com sucesso!', 'success');
    } catch (e) {
        showToast('Erro ao salvar configurações.', 'error');
    } finally {
        setSaving(false);
    }
  };

  const handleChange = (field: keyof BrandIdentity, value: any) => {
    if (!brand) return;
    setBrand({ ...brand, [field]: value });
  };

  const handleColorChange = (index: number, value: string) => {
      if (!brand) return;
      const newColors = [...brand.colors];
      newColors[index] = value;
      setBrand({ ...brand, colors: newColors });
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando configurações...</div>;
  if (!brand) return <div className="p-8 text-center">Nenhuma marca configurada.</div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Configurações da Marca</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 space-y-6">
            
            {/* API Keys Section */}
            <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                     <h3 className="text-yellow-800 font-bold flex items-center mb-2">
                         <Key size={18} className="mr-2" />
                         Chave da API Gemini
                     </h3>
                     <p className="text-xs text-yellow-700 mb-3">
                         Para usar todos os recursos (Imagem, Visão, Texto), insira sua chave da API do Google AI Studio. 
                     </p>
                     <input 
                        type="password"
                        placeholder="Cole sua API Key aqui (começa com AIza...)"
                        value={brand.apiKey || ''}
                        onChange={(e) => handleChange('apiKey', e.target.value)}
                        className="w-full px-4 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-sm"
                    />
                </div>

                <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                     <h3 className="text-purple-800 font-bold flex items-center mb-2">
                         <Mic size={18} className="mr-2" />
                         Chave da API ElevenLabs (Voz)
                     </h3>
                     <p className="text-xs text-purple-700 mb-3">
                         Para gerar vídeos com narração em voz natural. Crie sua conta grátis em{' '}
                         <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="underline">elevenlabs.io</a>
                         {' '}(10.000 caracteres/mês grátis).
                     </p>
                     <input 
                        type="password"
                        placeholder="Cole sua API Key do ElevenLabs aqui"
                        value={brand.elevenLabsApiKey || ''}
                        onChange={(e) => handleChange('elevenLabsApiKey', e.target.value)}
                        className="w-full px-4 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white text-sm"
                    />
                </div>

                {/* Seletor de IA */}
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                     <h3 className="text-blue-800 font-bold flex items-center mb-2">
                         <Cpu size={18} className="mr-2" />
                         IA Preferida para Texto
                     </h3>
                     <p className="text-xs text-blue-700 mb-3">
                         Escolha qual IA usar para gerar legendas e carrosséis. Se a escolhida falhar, usará fallback automático.
                     </p>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {AI_PROVIDERS.map((provider) => (
                          <button
                            key={provider.id}
                            onClick={() => handleChange('preferredAI', provider.id)}
                            className={`p-3 rounded-lg border-2 text-left transition-all ${
                              brand.preferredAI === provider.id || (!brand.preferredAI && provider.id === 'gemini')
                                ? 'border-blue-500 bg-blue-100'
                                : 'border-gray-200 bg-white hover:border-blue-300'
                            }`}
                          >
                            <p className="font-medium text-sm text-gray-900">{provider.name}</p>
                            <p className="text-xs text-gray-500">{provider.description}</p>
                          </button>
                        ))}
                     </div>
                </div>
            </div>

            {/* Informações Básicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Marca</label>
                    <input 
                        type="text" 
                        value={brand.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nicho de Mercado</label>
                    <input 
                        type="text" 
                        value={brand.niche}
                        onChange={(e) => handleChange('niche', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Websites (Separados por " | ")</label>
                <input 
                    type="text" 
                    value={brand.website || ''}
                    onChange={(e) => handleChange('website', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-gray-600"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
                <input 
                    type="text" 
                    value={brand.instagram || ''}
                    onChange={(e) => handleChange('instagram', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição da Empresa</label>
                <textarea 
                    value={brand.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                />
            </div>

            {/* Identidade Visual e Textual */}
            <div className="pt-6 border-t border-gray-100">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Identidade Visual & Textual</h3>
                
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cores da Marca</label>
                    <div className="flex space-x-3">
                        {brand.colors.map((color, idx) => (
                            <div key={idx} className="flex flex-col items-center space-y-1">
                                <input 
                                    type="color" 
                                    value={color}
                                    onChange={(e) => handleColorChange(idx, e.target.value)}
                                    className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 cursor-pointer p-0"
                                />
                                <span className="text-xs text-gray-500 uppercase">{color}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tom de Voz (Instrução para a IA)</label>
                    <input 
                        type="text" 
                        value={brand.toneOfVoice}
                        onChange={(e) => handleChange('toneOfVoice', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-blue-50 text-blue-900 border-blue-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">Ex: "Descontraído, usa emojis e gírias leves" ou "Profissional, sério e técnico".</p>
                </div>
            </div>

        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
            <button 
                onClick={handleSave}
                disabled={saving}
                className="flex items-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium transition-colors disabled:opacity-50"
            >
                {saving ? <RefreshCw className="animate-spin mr-2" size={18} /> : <Save className="mr-2" size={18} />}
                Salvar Alterações
            </button>
        </div>
      </div>
    </div>
  );
};