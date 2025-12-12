import React, { useState, useEffect } from 'react';
import { getApiUsage, resetApiUsage, ApiUsageStats } from '../services/apiUsageService';
import { BarChart3, Image, MessageSquare, Video, RefreshCw, AlertCircle, CheckCircle2, Mic } from 'lucide-react';

// Limites diários do tier gratuito
const LIMITS = {
  text: 300,
  image: 70,
  video: 10,
  audio: 100 // ~10k caracteres / ~100 chars por request
};

export const ApiUsage: React.FC = () => {
  const [usage, setUsage] = useState<ApiUsageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsage();
  }, []);

  const loadUsage = async () => {
    setLoading(true);
    const data = await getApiUsage();
    setUsage(data);
    setLoading(false);
  };

  const handleReset = async () => {
    await resetApiUsage();
    await loadUsage();
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>;
  if (!usage) return null;

  const textPercent = Math.min((usage.textRequests / LIMITS.text) * 100, 100);
  const imagePercent = Math.min((usage.imageRequests / LIMITS.image) * 100, 100);
  const videoPercent = Math.min((usage.videoRequests / LIMITS.video) * 100, 100);
  const audioPercent = Math.min((usage.audioRequests / LIMITS.audio) * 100, 100);

  const UsageBar = ({ percent, color }: { percent: number; color: string }) => (
    <div className="w-full bg-gray-200 rounded-full h-3">
      <div 
        className={`h-3 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );

  const StatusIcon = ({ percent }: { percent: number }) => {
    if (percent >= 90) return <AlertCircle className="text-red-500" size={20} />;
    if (percent >= 70) return <AlertCircle className="text-yellow-500" size={20} />;
    return <CheckCircle2 className="text-green-500" size={20} />;
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Uso da API</h1>
          <p className="text-gray-500 mt-1">Acompanhe seu consumo diário (global)</p>
        </div>
        <button 
          onClick={handleReset}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <RefreshCw size={16} />
          <span className="text-sm">Resetar</span>
        </button>
      </div>

      {/* Resumo */}
      <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm">Data</p>
            <p className="text-2xl font-bold">{new Date(usage.date).toLocaleDateString('pt-BR')}</p>
            <p className="text-white/60 text-xs mt-1">Tier GRATUITO 🎉</p>
          </div>
          <div className="text-right">
            <p className="text-white/80 text-sm">Tokens usados</p>
            <p className="text-lg font-medium">{usage.tokensUsed.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Cards de Uso */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Texto */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <MessageSquare className="text-blue-600" size={18} />
            </div>
            <StatusIcon percent={textPercent} />
          </div>
          <p className="font-medium text-gray-800 text-sm">Texto</p>
          <UsageBar percent={textPercent} color="bg-blue-500" />
          <p className="text-xs text-gray-500 mt-2">{usage.textRequests} / {LIMITS.text}</p>
        </div>

        {/* Imagem */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Image className="text-purple-600" size={18} />
            </div>
            <StatusIcon percent={imagePercent} />
          </div>
          <p className="font-medium text-gray-800 text-sm">Imagens</p>
          <UsageBar percent={imagePercent} color="bg-purple-500" />
          <p className="text-xs text-gray-500 mt-2">{usage.imageRequests} / {LIMITS.image}</p>
        </div>

        {/* Vídeo */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Video className="text-orange-600" size={18} />
            </div>
            <StatusIcon percent={videoPercent} />
          </div>
          <p className="font-medium text-gray-800 text-sm">Vídeos</p>
          <UsageBar percent={videoPercent} color="bg-orange-500" />
          <p className="text-xs text-gray-500 mt-2">{usage.videoRequests} / {LIMITS.video}</p>
        </div>

        {/* Áudio */}
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-pink-50 rounded-lg">
              <Mic className="text-pink-600" size={18} />
            </div>
            <StatusIcon percent={audioPercent} />
          </div>
          <p className="font-medium text-gray-800 text-sm">Áudio (Voz)</p>
          <UsageBar percent={audioPercent} color="bg-pink-500" />
          <p className="text-xs text-gray-500 mt-2">{usage.audioRequests} / {LIMITS.audio}</p>
        </div>
      </div>

      {/* Tabela de Modelos */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="mr-2 text-gray-400" size={20} />
          Modelos em Uso
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 text-gray-500 font-medium">Recurso</th>
                <th className="text-left py-3 text-gray-500 font-medium">Modelo/API</th>
                <th className="text-right py-3 text-gray-500 font-medium">Limite/Dia</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-50">
                <td className="py-3 text-gray-800">Texto</td>
                <td className="py-3 text-gray-500">gemini-2.5-flash</td>
                <td className="py-3 text-right text-gray-600">300 req</td>
              </tr>
              <tr className="border-b border-gray-50">
                <td className="py-3 text-gray-800">Imagem</td>
                <td className="py-3 text-gray-500">imagen-4.0-fast</td>
                <td className="py-3 text-right text-gray-600">70 img</td>
              </tr>
              <tr className="border-b border-gray-50">
                <td className="py-3 text-gray-800">Vídeo</td>
                <td className="py-3 text-gray-500">veo-3.0-fast</td>
                <td className="py-3 text-right text-gray-600">10 vid</td>
              </tr>
              <tr>
                <td className="py-3 text-gray-800">Áudio (Voz)</td>
                <td className="py-3 text-gray-500">ElevenLabs</td>
                <td className="py-3 text-right text-gray-600">10k chars/mês</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Dicas */}
      <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
        <h3 className="font-medium text-blue-900 mb-2">💡 Dicas para economizar</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Use templates prontos ao invés de gerar imagens quando possível</li>
          <li>• Revise o prompt antes de regenerar</li>
          <li>• Áudio com voz consome caracteres - textos curtos são melhores</li>
        </ul>
      </div>
    </div>
  );
};
