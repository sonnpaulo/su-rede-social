import React, { useEffect, useState } from 'react';
import { PenTool, CalendarClock, Layers, Share2, Loader2, Target, Calendar, ChevronRight } from 'lucide-react';
import { StatsCard } from '../components/Dashboard/StatsCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { getDashboardStats } from '../services/supabaseClient';
import { DashboardStats } from '../types';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
        const data = await getDashboardStats();
        setStats(data);
        setLoading(false);
    };
    loadStats();
  }, []);

  if (loading) {
      return (
          <div className="flex items-center justify-center h-full min-h-[400px]">
              <Loader2 className="animate-spin text-primary-500" size={32} />
          </div>
      );
  }

  // Se não houver dados ainda
  if (stats && stats.totalPosts === 0) {
      return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 text-center">
             <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-100">
                 <h1 className="text-2xl font-bold text-gray-900 mb-2">Bem-vindo ao Su Rede Social!</h1>
                 <p className="text-gray-500 mb-6">Você ainda não criou nenhum conteúdo. Comece agora para ver suas métricas.</p>
                 <a href="#create" className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors">
                     <PenTool className="mr-2" size={18} />
                     Criar Primeiro Post
                 </a>
             </div>
        </div>
      )
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="mb-4 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Visão Geral da Produção</h1>
        <p className="text-gray-500 mt-2">Métricas reais baseadas no conteúdo que você gerou.</p>
      </div>

      {/* Cartões de Métricas REAIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatsCard 
          title="Posts Criados (Total)" 
          value={stats?.totalPosts.toString() || "0"} 
          trend="Todo o histórico" 
          trendUp={true} 
          icon={PenTool} 
          color="blue" 
        />
        <StatsCard 
          title="Produção na Semana" 
          value={stats?.postsThisWeek.toString() || "0"} 
          trend="Últimos 7 dias" 
          trendUp={stats?.postsThisWeek! > 0} 
          icon={CalendarClock} 
          color="purple" 
        />
        <StatsCard 
          title="Formato Favorito" 
          value={stats?.mostFrequentType || "-"} 
          trend="Mais frequente" 
          trendUp={true} 
          icon={Layers} 
          color="orange" 
        />
        <StatsCard 
          title="Rede Principal" 
          value={stats?.topPlatform || "-"} 
          trend="Maior volume" 
          trendUp={true} 
          icon={Share2} 
          color="green" 
        />
      </div>

      {/* Meta Semanal + Próximo Post */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Meta Semanal */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-5 rounded-xl text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target size={20} />
              <span className="font-bold">Meta Semanal</span>
            </div>
            <span className="text-purple-200 text-sm">{stats?.postsThisWeek || 0}/{stats?.weeklyGoal || 5} posts</span>
          </div>
          <div className="w-full bg-purple-400/30 rounded-full h-3 mb-2">
            <div 
              className="bg-white rounded-full h-3 transition-all duration-500"
              style={{ width: `${Math.min(100, ((stats?.postsThisWeek || 0) / (stats?.weeklyGoal || 5)) * 100)}%` }}
            />
          </div>
          <p className="text-purple-100 text-sm">
            {(stats?.postsThisWeek || 0) >= (stats?.weeklyGoal || 5) 
              ? '🎉 Meta atingida! Parabéns!' 
              : `Faltam ${(stats?.weeklyGoal || 5) - (stats?.postsThisWeek || 0)} posts para bater a meta`}
          </p>
        </div>

        {/* Próximo Post Agendado */}
        <div className={`p-5 rounded-xl shadow-lg ${stats?.nextScheduledPost ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white' : 'bg-white border border-gray-100'}`}>
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={20} className={stats?.nextScheduledPost ? 'text-white' : 'text-gray-400'} />
            <span className={`font-bold ${stats?.nextScheduledPost ? 'text-white' : 'text-gray-700'}`}>Próximo Post</span>
          </div>
          {stats?.nextScheduledPost ? (
            <>
              <p className="font-medium text-lg line-clamp-1">{stats.nextScheduledPost.topic}</p>
              <p className="text-orange-100 text-sm mt-1">
                📅 {stats.nextScheduledPost.dayName}, {new Date(stats.nextScheduledPost.date + 'T12:00:00').toLocaleDateString('pt-BR')}
              </p>
              <button onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'calendar' }))} className="inline-flex items-center mt-3 text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors">
                Ver no Calendário <ChevronRight size={14} className="ml-1" />
              </button>
            </>
          ) : (
            <div className="text-center py-2">
              <p className="text-gray-500 text-sm">Nenhum post agendado</p>
              <button onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'calendar' }))} className="inline-flex items-center mt-2 text-sm text-primary-600 hover:text-primary-700 font-medium">
                Agendar agora <ChevronRight size={14} className="ml-1" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Atividade Diária */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Ritmo de Criação (Última Semana)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.dailyActivity}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} fontSize={12} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Bar dataKey="posts" radius={[4, 4, 0, 0]}>
                    {stats?.dailyActivity.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.posts > 0 ? '#3b82f6' : '#e2e8f0'} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuição por Plataforma */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Por Plataforma</h2>
          {stats?.platformDistribution && stats.platformDistribution.length > 0 ? (
            <>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.platformDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {stats.platformDistribution.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#f97316', '#10b981', '#ec4899'][index % 5]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 mt-2 justify-center">
                {stats.platformDistribution.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ['#3b82f6', '#8b5cf6', '#f97316', '#10b981', '#ec4899'][i % 5] }} />
                    <span className="text-gray-600">{item.name} ({item.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">
              Sem dados ainda
            </div>
          )}
        </div>
      </div>

      {/* Histórico Recente */}
      <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Últimos Posts Gerados</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {stats?.recentActivity.map((post) => (
            <div key={post.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
                {post.type === 'IMAGE' ? '🖼️' : post.type === 'VIDEO' ? '🎥' : '📝'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 line-clamp-1">{post.topic}</p>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] bg-white text-gray-600 px-1.5 py-0.5 rounded">{post.platform}</span>
                    <span className="text-[10px] text-gray-400">
                        {new Date(post.created_at).toLocaleDateString('pt-BR')}
                    </span>
                </div>
              </div>
            </div>
          ))}
          {stats?.recentActivity.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4 col-span-full">Nenhuma atividade recente.</p>
          )}
        </div>
      </div>
    </div>
  );
};