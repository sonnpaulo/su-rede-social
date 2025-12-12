import React, { useState, useEffect } from 'react';
import { Lightbulb, Plus, Trash2, Check, Send, Filter, Loader2 } from 'lucide-react';
import { getIdeas, saveIdea, deleteIdea, markIdeaAsUsed, Idea } from '../services/supabaseClient';
import { showToast } from '../services/toastService';

export const IdeasBank: React.FC = () => {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [newIdea, setNewIdea] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showUsed, setShowUsed] = useState(false);
  const [category, setCategory] = useState('geral');

  const categories = [
    { id: 'geral', label: 'Geral', emoji: '💡' },
    { id: 'dica', label: 'Dica', emoji: '📝' },
    { id: 'mito', label: 'Mito x Verdade', emoji: '🤔' },
    { id: 'historia', label: 'História', emoji: '📖' },
    { id: 'trend', label: 'Trend', emoji: '🔥' },
  ];

  useEffect(() => {
    loadIdeas();
  }, [showUsed]);

  const loadIdeas = async () => {
    setIsLoading(true);
    const data = await getIdeas(showUsed);
    setIdeas(data);
    setIsLoading(false);
  };

  const handleSaveIdea = async () => {
    if (!newIdea.trim()) return;
    
    setIsSaving(true);
    const saved = await saveIdea(newIdea.trim(), category);
    if (saved) {
      setIdeas(prev => [saved, ...prev]);
      setNewIdea('');
      showToast('Ideia salva!', 'success');
    } else {
      showToast('Erro ao salvar', 'error');
    }
    setIsSaving(false);
  };


  const handleUseIdea = async (idea: Idea) => {
    await markIdeaAsUsed(idea.id);
    // Dispara evento para ir para o criador com essa ideia
    window.dispatchEvent(new CustomEvent('select-topic', { detail: idea.content }));
    showToast('Ideia enviada para o Criador!', 'success');
  };

  const handleDeleteIdea = async (id: string) => {
    const success = await deleteIdea(id);
    if (success) {
      setIdeas(prev => prev.filter(i => i.id !== id));
      showToast('Ideia excluída', 'info');
    }
  };

  const getCategoryEmoji = (cat: string) => {
    return categories.find(c => c.id === cat)?.emoji || '💡';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Lightbulb className="text-yellow-500" />
          Banco de Ideias
        </h1>
        <p className="text-gray-500 text-sm">Anote ideias de posts para usar depois</p>
      </div>

      {/* Input de nova ideia */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 shadow-sm">
        <textarea
          value={newIdea}
          onChange={(e) => setNewIdea(e.target.value)}
          placeholder="Tive uma ideia de post sobre..."
          className="w-full resize-none border-none outline-none text-gray-800 placeholder-gray-400 text-sm min-h-[80px]"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSaveIdea();
            }
          }}
        />
        
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
          <div className="flex gap-1 overflow-x-auto pb-1">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  category === cat.id 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>
          
          <button
            onClick={handleSaveIdea}
            disabled={!newIdea.trim() || isSaving}
            className={`p-2.5 rounded-full transition-colors ${
              newIdea.trim() 
                ? 'bg-primary-500 text-white hover:bg-primary-600' 
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          </button>
        </div>
      </div>

      {/* Filtro */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-gray-500">{ideas.length} ideia(s)</span>
        <button
          onClick={() => setShowUsed(!showUsed)}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            showUsed ? 'bg-gray-200 text-gray-700' : 'bg-gray-100 text-gray-500'
          }`}
        >
          <Filter size={14} />
          {showUsed ? 'Mostrando usadas' : 'Ocultar usadas'}
        </button>
      </div>


      {/* Lista de Ideias */}
      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 size={32} className="mx-auto text-primary-500 animate-spin mb-3" />
          <p className="text-gray-500">Carregando ideias...</p>
        </div>
      ) : ideas.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl">
          <Lightbulb size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">Nenhuma ideia ainda</p>
          <p className="text-gray-400 text-sm mt-1">Anote suas ideias de posts aqui</p>
        </div>
      ) : (
        <div className="space-y-3">
          {ideas.map((idea) => (
            <div 
              key={idea.id}
              className={`bg-white rounded-xl border p-4 transition-all ${
                idea.is_used 
                  ? 'border-gray-100 opacity-60' 
                  : 'border-gray-200 hover:border-primary-200 hover:shadow-md'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">{getCategoryEmoji(idea.category)}</span>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-gray-800 text-sm ${idea.is_used ? 'line-through' : ''}`}>
                    {idea.content}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-400">{formatDate(idea.created_at)}</span>
                    {idea.is_used && (
                      <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">Usada</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {!idea.is_used && (
                    <button
                      onClick={() => handleUseIdea(idea)}
                      className="p-2 text-primary-500 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Usar esta ideia"
                    >
                      <Send size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteIdea(idea.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dica */}
      <div className="mt-8 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
        <p className="text-sm text-yellow-800">
          💡 <strong>Dica:</strong> Anote ideias quando elas surgirem! No dia de criar conteúdo, você já terá várias opções prontas.
        </p>
      </div>
    </div>
  );
};
