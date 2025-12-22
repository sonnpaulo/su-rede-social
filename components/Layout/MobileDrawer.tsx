import React from 'react';
import { X, LayoutDashboard, PenTool, Calendar, Coins, Settings, Clock, Lightbulb, Sparkles, Share2 } from 'lucide-react';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
  { id: 'create', label: 'Criar Conteúdo', icon: PenTool },
  { id: 'viral', label: 'Conteúdo Viral', icon: Sparkles, highlight: true },
  { id: 'calendar', label: 'Calendário', icon: Calendar },
  { id: 'ideas', label: 'Banco de Ideias', icon: Lightbulb },
  { id: 'history', label: 'Histórico', icon: Clock },
  { id: 'usage', label: 'Uso da API', icon: Coins },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ 
  isOpen, 
  onClose, 
  activeTab, 
  setActiveTab 
}) => {
  const handleNavigation = (tabId: string) => {
    setActiveTab(tabId);
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 md:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <aside 
        className={`fixed top-0 left-0 h-full w-72 bg-slate-900 text-white z-50 transform transition-transform duration-300 ease-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-pink-500 to-orange-500 rounded-lg flex items-center justify-center shadow-lg">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white">Su Rede Social</span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={22} className={isActive ? 'text-white' : 'text-slate-400'} />
                <span className="font-medium text-base">{item.label}</span>
                {item.highlight && !isActive && (
                  <span className="ml-auto text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full">
                    Novo
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-500">v1.0.0 • Uso Exclusivo</p>
        </div>
      </aside>
    </>
  );
};
