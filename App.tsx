import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { ContentCreator } from './pages/ContentCreator';
import { CalendarView } from './pages/CalendarView';
import { BrandSetup } from './pages/BrandSetup';
import { Analytics } from './pages/Analytics'; 
import { Settings } from './pages/Settings';
import { ApiUsage } from './pages/ApiUsage';
import { PostHistory } from './pages/PostHistory';
import { IdeasBank } from './pages/IdeasBank';
import { getBrandProfile } from './services/supabaseClient';
import { ToastContainer } from './components/UI/Toast.tsx';
import { Bell, Search, User, LayoutDashboard, PenTool, Calendar, BarChart3, Settings as SettingsIcon, Share2, Coins, Clock, Lightbulb } from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('create');
  const [hasBrand, setHasBrand] = useState<boolean | null>(null); // null = loading
  
  // Estado para passar tópico do Calendário para o Criador
  const [selectedTopic, setSelectedTopic] = useState<string>('');

  useEffect(() => {
    checkBrand();

    // Listener para quando o usuário seleciona uma ideia no calendário
    const handleSelectTopic = (e: CustomEvent<string>) => {
        setSelectedTopic(e.detail);
        setActiveTab('create');
    };

    // Listener para navegação entre páginas
    const handleNavigate = (e: CustomEvent<string>) => {
        setActiveTab(e.detail);
    };

    window.addEventListener('select-topic', handleSelectTopic as EventListener);
    window.addEventListener('navigate', handleNavigate as EventListener);

    return () => {
        window.removeEventListener('select-topic', handleSelectTopic as EventListener);
        window.removeEventListener('navigate', handleNavigate as EventListener);
    };
  }, []);

  const checkBrand = async () => {
    const brand = await getBrandProfile();
    setHasBrand(!!brand);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'create':
        return <ContentCreator initialTopic={selectedTopic} />;
      case 'calendar':
        return <CalendarView />;
      case 'history':
        return <PostHistory />;
      case 'ideas':
        return <IdeasBank />;
      case 'analytics':
        return <Analytics />;
      case 'usage':
        return <ApiUsage />;
      case 'settings':
        return <Settings />; 
      default:
        return <Dashboard />;
    }
  };

  const navItems = [
    { id: 'create', label: 'Criar', icon: PenTool },
    { id: 'calendar', label: 'Agenda', icon: Calendar },
    { id: 'ideas', label: 'Ideias', icon: Lightbulb },
    { id: 'history', label: 'Histórico', icon: Clock },
  ];

  // Mostra Loading enquanto verifica
  if (hasBrand === null) {
      return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  // Se não tiver marca, mostra onboarding obrigatório
  if (hasBrand === false) {
      return <BrandSetup onComplete={() => setHasBrand(true)} />;
  }

  // App Principal
  return (
    <div className="min-h-screen bg-gray-50 flex font-sans pb-24 md:pb-0">
      <ToastContainer />
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 md:ml-64 transition-all duration-300 w-full">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 md:px-8 py-3 md:py-4 flex justify-between items-center shadow-sm">
           <div className="flex items-center">
              <div className="md:hidden flex items-center space-x-2">
                 <div className="w-8 h-8 bg-gradient-to-tr from-primary-500 to-orange-400 rounded-lg flex items-center justify-center shadow-lg shadow-primary-500/30">
                    <Share2 className="text-white w-4 h-4" />
                 </div>
                 <span className="font-bold text-lg text-gray-800">Su Rede Social</span>
              </div>
              
              <div className="hidden md:flex relative w-96 ml-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Pesquisar projetos..." 
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  />
              </div>
           </div>
           
           <div className="flex items-center space-x-3 md:space-x-4">
              <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              </button>
              <div className="w-8 h-8 rounded-full bg-primary-900 p-0.5 cursor-pointer">
                 <div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden">
                    <User size={16} className="text-gray-600" />
                 </div>
              </div>
           </div>
        </header>

        <div className="h-full overflow-y-auto">
          {renderContent()}
        </div>
      </main>

      <div className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 flex justify-around items-center py-3 px-2 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center space-y-1 w-16 ${
                isActive ? 'text-primary-600' : 'text-gray-400'
              }`}
            >
              <Icon size={24} className={isActive ? 'fill-current' : ''} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center space-y-1 w-16 ${
            activeTab === 'settings' ? 'text-primary-600' : 'text-gray-400'
          }`}
        >
          <SettingsIcon size={24} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />
          <span className="text-[10px] font-medium">Ajustes</span>
        </button>
      </div>
    </div>
  );
};

export default App;