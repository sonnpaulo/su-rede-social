import React from 'react';
import { LayoutDashboard, PenTool, Calendar, Coins, Settings, Share2, Clock, Lightbulb } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
    { id: 'create', label: 'Criar Conteúdo', icon: PenTool },
    { id: 'calendar', label: 'Calendário', icon: Calendar },
    { id: 'ideas', label: 'Banco de Ideias', icon: Lightbulb },
    { id: 'history', label: 'Histórico', icon: Clock },
    { id: 'usage', label: 'Uso da API', icon: Coins },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 z-20 shadow-xl">
      <div className="p-6 flex items-center space-x-3 border-b border-slate-800">
        <div className="w-8 h-8 bg-gradient-to-tr from-pink-500 to-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
          <Share2 className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
          Su Rede Social
        </span>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                isActive 
                  ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-900/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Seção de rodapé removida para focar no uso interno/empresarial */}
      <div className="p-4 border-t border-slate-800 text-center">
        <p className="text-xs text-slate-500">v1.0.0 • Uso Exclusivo</p>
      </div>
    </aside>
  );
};