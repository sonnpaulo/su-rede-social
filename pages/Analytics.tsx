import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Layers, Smartphone, PenTool, Loader2 } from 'lucide-react';
import { StatsCard } from '../components/Dashboard/StatsCard';
import { getDashboardStats } from '../services/supabaseClient';
import { DashboardStats } from '../types';

export const Analytics: React.FC = () => {
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

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-primary-500"/></div>;

  // Prepara dados para o gráfico de Pizza (Distribuição por Plataforma)
  const platformData = stats?.platformDistribution || [];
  const COLORS = ['#3b82f6', '#8b5cf6', '#f97316', '#10b981'];

  // Dados calculados para os cards
  const textPosts = stats?.recentActivity.filter(p => p.type === 'POST_TEXT').length || 0;
  const mediaPosts = stats?.recentActivity.filter(p => p.type !== 'POST_TEXT').length || 0;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Estatísticas de Criação</h1>
        <p className="text-gray-500 mt-1">Entenda como você está distribuindo seu conteúdo.</p>
      </div>

      {/* Cards focados em volume de produção */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatsCard 
            title="Total Produzido" 
            value={stats?.totalPosts.toString() || "0"} 
            trend="Desde o início" 
            trendUp={true} 
            icon={Layers} 
            color="blue" 
        />
        <StatsCard 
            title="Foco em Texto" 
            value={textPosts.toString()} 
            trend="Últimos 5 posts" 
            trendUp={true} 
            icon={PenTool} 
            color="green" 
        />
        <StatsCard 
            title="Foco em Mídia (Img/Vid)" 
            value={mediaPosts.toString()} 
            trend="Últimos 5 posts" 
            trendUp={true} 
            icon={Smartphone} 
            color="purple" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Distribuição por Plataforma */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 w-full text-left">Distribuição por Rede Social</h2>
            
            {platformData.length > 0 ? (
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={platformData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {platformData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-64 flex items-center justify-center text-gray-400">
                    Sem dados suficientes
                </div>
            )}
            <p className="text-xs text-gray-500 mt-4 text-center">Baseado no total histórico de posts gerados.</p>
        </div>

        {/* Card Informativo de Dica Real */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-6 rounded-xl shadow-lg text-white flex flex-col justify-between">
            <div>
                <h2 className="text-xl font-bold mb-2">Dica de Produtividade 💡</h2>
                <p className="text-indigo-200 text-sm leading-relaxed mb-4">
                    Com base no seu histórico, você posta mais no <strong>{stats?.topPlatform || "Instagram"}</strong>. 
                    Experimente diversificar criando versões curtas do mesmo conteúdo para outras redes.
                </p>
            </div>
            <div className="mt-4 p-4 bg-white/10 rounded-lg backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300 mb-1">Seu ritmo atual</p>
                <div className="text-2xl font-bold">{stats?.postsThisWeek} posts</div>
                <div className="text-xs text-indigo-200">criados nos últimos 7 dias</div>
            </div>
        </div>

      </div>
    </div>
  );
};