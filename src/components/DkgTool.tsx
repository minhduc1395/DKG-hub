import { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Filter, ArrowLeft, ExternalLink, LayoutGrid, Megaphone, Calendar, Shield, Cpu, Code, Database } from 'lucide-react';
import { User } from '../types';
import { cn } from '../lib/utils';

interface Tool {
  id: string;
  title: string;
  description: string;
  icon: any;
  category: 'Event' | 'Marketing' | 'Nội bộ';
  url: string;
  allowed_roles: string[]; // e.g., ['staff', 'manager', 'admin']
  color: string;
}

const mockTools: Tool[] = [
  {
    id: '1',
    title: 'Event Planner Pro',
    description: 'Công cụ quản lý timeline và checklist cho các sự kiện lớn.',
    icon: Calendar,
    category: 'Event',
    url: 'https://example.com', // Replace with actual URL
    allowed_roles: ['staff', 'manager'],
    color: 'text-rose-400 bg-rose-500/20 border-rose-500/20',
  },
  {
    id: '2',
    title: 'Marketing Analytics',
    description: 'Theo dõi hiệu suất chiến dịch và phân tích dữ liệu khách hàng.',
    icon: Megaphone,
    category: 'Marketing',
    url: 'https://example.com',
    allowed_roles: ['manager'],
    color: 'text-blue-400 bg-blue-500/20 border-blue-500/20',
  },
  {
    id: '3',
    title: 'HR Management System',
    description: 'Hệ thống quản lý nhân sự, lương thưởng và phúc lợi.',
    icon: Shield,
    category: 'Nội bộ',
    url: 'https://example.com',
    allowed_roles: ['manager', 'admin'],
    color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/20',
  },
  {
    id: '4',
    title: 'Asset Tracker',
    description: 'Quản lý thiết bị, tài sản và kho bãi của công ty.',
    icon: Database,
    category: 'Nội bộ',
    url: 'https://example.com',
    allowed_roles: ['staff', 'manager'],
    color: 'text-amber-400 bg-amber-500/20 border-amber-500/20',
  },
  {
    id: '5',
    title: 'Campaign Builder',
    description: 'Tạo và quản lý các chiến dịch quảng cáo đa kênh.',
    icon: LayoutGrid,
    category: 'Marketing',
    url: 'https://example.com',
    allowed_roles: ['staff', 'manager'],
    color: 'text-purple-400 bg-purple-500/20 border-purple-500/20',
  },
  {
    id: '6',
    title: 'Developer Console',
    description: 'Công cụ dành cho team dev để quản lý API và services.',
    icon: Code,
    category: 'Nội bộ',
    url: 'https://example.com',
    allowed_roles: ['admin'],
    color: 'text-slate-400 bg-slate-500/20 border-slate-500/20',
  }
];

const categories = ['All', 'Event', 'Marketing', 'Nội bộ'];

interface DkgToolProps {
  user: User;
}

export function DkgTool({ user }: DkgToolProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeTool, setActiveTool] = useState<Tool | null>(null);

  // Filter tools based on user role, search query, and category
  const filteredTools = mockTools.filter(tool => {
    // Role check
    const hasAccess = tool.allowed_roles.includes(user.role);
    
    const matchesSearch = tool.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'All' || tool.category === activeCategory;
    
    return hasAccess && matchesSearch && matchesCategory;
  });

  if (activeTool) {
    return (
      <div className="flex flex-col w-full h-full animate-in fade-in duration-300 -m-4 md:-m-8 lg:-mt-6 lg:-mx-10 lg:-mb-10">
        {/* Iframe Header */}
        <div className="flex items-center justify-between p-4 bg-white/5 border-b border-white/10 shrink-0 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveTool(null)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-bold hidden sm:inline">Quay lại</span>
            </button>
            <div className="flex items-center gap-3 border-l border-white/10 pl-4">
              <div className={cn("p-1.5 rounded-lg border", activeTool.color)}>
                <activeTool.icon className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-sm font-bold text-white leading-tight">{activeTool.title}</h2>
                <span className="text-[10px] text-slate-400">{activeTool.category}</span>
              </div>
            </div>
          </div>
          <a 
            href={activeTool.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2"
            title="Mở trong tab mới"
          >
            <span className="text-xs font-medium hidden md:inline">Mở tab mới</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Iframe Container */}
        <div className="flex-1 bg-black/50 relative">
          <iframe 
            src={activeTool.url}
            className="absolute inset-0 w-full h-full border-0"
            title={activeTool.title}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full h-full animate-in fade-in duration-500">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-white text-3xl font-black tracking-tight">DKG Tools</h1>
          <p className="text-slate-400">Khám phá và truy cập các ứng dụng nội bộ của DKG.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative group flex-1 md:w-80">
            <div className="absolute inset-0 bg-white/[0.03] rounded-xl border border-white/10 backdrop-blur-md transition-all duration-300 group-focus-within:bg-white/[0.07] group-focus-within:border-white/20 group-focus-within:shadow-[0_0_20px_rgba(59,130,246,0.15)] pointer-events-none" />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-400 transition-colors z-10" />
            <input 
              type="text"
              placeholder="Tìm kiếm ứng dụng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none relative z-10"
            />
          </div>
          <button className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
            <Filter className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar shrink-0">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all",
              activeCategory === category 
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" 
                : "bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10 hover:text-white"
            )}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Tools Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-8">
        {filteredTools.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTools.map(tool => (
              <div 
                key={tool.id} 
                className="group flex flex-col p-6 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/[0.07] hover:border-white/20 transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border transition-transform duration-300 group-hover:scale-110", tool.color)}>
                    <tool.icon className="w-7 h-7" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-white/5 text-slate-300 border border-white/10">
                    {tool.category}
                  </span>
                </div>
                
                <div className="flex flex-col flex-1 mb-6">
                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed line-clamp-2">
                    {tool.description}
                  </p>
                </div>

                <button 
                  onClick={() => setActiveTool(tool)}
                  className="w-full py-3 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold text-sm transition-colors border border-blue-500/20 flex items-center justify-center gap-2"
                >
                  Mở ứng dụng <ExternalLink className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <Cpu className="w-12 h-12 mb-4 opacity-20" />
            <p>Không tìm thấy ứng dụng nào phù hợp.</p>
          </div>
        )}
      </div>
    </div>
  );
}
