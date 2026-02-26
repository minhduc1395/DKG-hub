import { useState } from 'react';
import { Search, Filter, Cpu } from 'lucide-react';
import { User } from '../types';
import { cn } from '../lib/utils';

interface Tool {
  id: string;
  title: string;
  description: string;
  icon: any;
  category: 'Event' | 'Marketing' | 'Internal';
  url: string;
  allowed_roles: string[];
  color: string;
}

const categories = ['All', 'Event', 'Marketing', 'Internal'];

interface DkgToolProps {
  user: User;
}

export function DkgTool({ user }: DkgToolProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  
  // No tools connected to database yet
  const filteredTools: Tool[] = [];

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
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
          <Cpu className="w-12 h-12 mb-4 opacity-20" />
          <p>No data available.</p>
        </div>
      </div>
    </div>
  );
}
