import React, { useState, useEffect } from 'react';
import { Clock, Copy, Trash2, Search, Star, Loader2, RefreshCcw, CheckSquare, Square, Trash } from 'lucide-react';
import { 
  getPostHistory, 
  getFavoritePostHistory, 
  togglePostHistoryFavorite, 
  deletePostFromHistory,
  deleteMultipleFromHistory,
  PostHistoryItem 
} from '../services/supabaseClient';
import { showToast } from '../services/toastService';

type FilterType = 'all' | 'favorites';

export const PostHistory: React.FC = () => {
  const [posts, setPosts] = useState<PostHistoryItem[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  useEffect(() => {
    loadPosts();
  }, [filter]);

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const data = filter === 'favorites' 
        ? await getFavoritePostHistory() 
        : await getPostHistory();
      setPosts(data);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      showToast('Erro ao carregar histórico', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFavorite = async (post: PostHistoryItem) => {
    const newValue = await togglePostHistoryFavorite(post.id, post.is_favorite);
    setPosts(prev => prev.map(p => 
      p.id === post.id ? { ...p, is_favorite: newValue } : p
    ));
    showToast(newValue ? 'Adicionado aos favoritos!' : 'Removido dos favoritos', 'success');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Excluir este post do histórico?')) {
      const success = await deletePostFromHistory(id);
      if (success) {
        setPosts(prev => prev.filter(p => p.id !== id));
        showToast('Post excluído', 'info');
      } else {
        showToast('Erro ao excluir', 'error');
      }
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    
    if (confirm(`Excluir ${selectedIds.size} post(s) selecionado(s)?`)) {
      const success = await deleteMultipleFromHistory(Array.from(selectedIds));
      if (success) {
        setPosts(prev => prev.filter(p => !selectedIds.has(p.id)));
        setSelectedIds(new Set());
        setIsSelectionMode(false);
        showToast(`${selectedIds.size} post(s) excluído(s)`, 'info');
      } else {
        showToast('Erro ao excluir', 'error');
      }
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredPosts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPosts.map(p => p.id)));
    }
  };

  const handleCopy = (post: PostHistoryItem) => {
    const text = `${post.caption}\n\n${post.hashtags.map(h => `#${h}`).join(' ')}`;
    navigator.clipboard.writeText(text);
    showToast('Legenda copiada!', 'success');
  };

  const filteredPosts = posts.filter(post => 
    post.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.caption.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Histórico de Posts</h1>
          <p className="text-gray-500 text-sm">
            {posts.length} post(s) salvos no banco de dados
          </p>
        </div>
        <button
          onClick={loadPosts}
          disabled={isLoading}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          title="Atualizar"
        >
          <RefreshCcw size={20} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar posts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === 'all' 
                ? 'bg-primary-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('favorites')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1 ${
              filter === 'favorites' 
                ? 'bg-primary-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Star size={14} />
            Favoritos
          </button>
        </div>
      </div>

      {/* Barra de seleção */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-xl">
        <button
          onClick={() => {
            setIsSelectionMode(!isSelectionMode);
            setSelectedIds(new Set());
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isSelectionMode 
              ? 'bg-primary-100 text-primary-700' 
              : 'text-gray-600 hover:bg-gray-200'
          }`}
        >
          {isSelectionMode ? <CheckSquare size={16} /> : <Square size={16} />}
          {isSelectionMode ? 'Cancelar' : 'Selecionar'}
        </button>

        {isSelectionMode && (
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="text-sm text-primary-600 hover:underline"
            >
              {selectedIds.size === filteredPosts.length ? 'Desmarcar todos' : 'Selecionar todos'}
            </button>
            
            {selectedIds.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
              >
                <Trash size={14} />
                Excluir ({selectedIds.size})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="text-center py-16">
          <Loader2 size={32} className="mx-auto text-primary-500 animate-spin mb-4" />
          <p className="text-gray-500">Carregando histórico...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl">
          <Clock size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">
            {filter === 'favorites' 
              ? 'Nenhum post favorito ainda' 
              : 'Nenhum post no histórico'}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Os posts que você criar aparecerão aqui
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <div 
              key={post.id}
              className={`bg-white rounded-xl border p-4 shadow-sm hover:shadow-md transition-all ${
                selectedIds.has(post.id) 
                  ? 'border-primary-500 ring-2 ring-primary-100' 
                  : 'border-gray-100'
              }`}
              onClick={() => isSelectionMode && toggleSelection(post.id)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  {isSelectionMode && (
                    <div className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      selectedIds.has(post.id) 
                        ? 'bg-primary-500 border-primary-500 text-white' 
                        : 'border-gray-300'
                    }`}>
                      {selectedIds.has(post.id) && <CheckSquare size={12} />}
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900 line-clamp-1">{post.topic}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{post.platform}</span>
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                        {post.content_type.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(post.created_at)}</span>
                    </div>
                  </div>
                </div>
                
                {!isSelectionMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(post);
                    }}
                    className={`p-2 rounded-full transition-colors ${
                      post.is_favorite 
                        ? 'text-yellow-500 bg-yellow-50' 
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                  >
                    <Star size={18} fill={post.is_favorite ? 'currentColor' : 'none'} />
                  </button>
                )}
              </div>

              {/* Caption Preview - Toque para copiar */}
              <p 
                className="text-sm text-gray-600 line-clamp-3 mb-3 cursor-pointer hover:bg-gray-50 rounded p-1 -m-1 transition-colors active:bg-primary-50"
                onClick={(e) => {
                  if (!isSelectionMode) {
                    e.stopPropagation();
                    handleCopy(post);
                  }
                }}
                title="Toque para copiar"
              >
                {post.caption}
              </p>

              {/* Hashtags */}
              {post.hashtags && post.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {post.hashtags.slice(0, 5).map((tag, idx) => (
                    <span key={idx} className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      #{tag}
                    </span>
                  ))}
                  {post.hashtags.length > 5 && (
                    <span className="text-xs text-gray-400">+{post.hashtags.length - 5}</span>
                  )}
                </div>
              )}

              {/* Actions */}
              {!isSelectionMode && (
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(post);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-primary-50 text-primary-600 rounded-lg text-sm font-medium hover:bg-primary-100 transition-colors"
                  >
                    <Copy size={14} />
                    Copiar
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(post.id);
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
