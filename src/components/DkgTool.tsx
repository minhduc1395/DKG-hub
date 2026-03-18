import { useState, useEffect } from 'react';
import { Search, Filter, Cpu, ExternalLink, Loader2, Globe, Layout, Shield, Zap, AlertTriangle } from 'lucide-react';
import { User } from '../types';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabaseClient';

interface Tool {
  id: string;
  title: string;
  description: string;
  icon_name: string;
  category: string;
  url: string;
  allowed_roles?: string[];
  color?: string;
}

const categories = ['All', 'Event', 'Marketing', 'Internal'];

interface DkgToolProps {
  user: User;
}

export function DkgTool({ user }: DkgToolProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTools = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: supabaseError } = await supabase
          .from('dkg_tools')
          .select('*')
          .order('title');

        if (supabaseError) {
          console.error('Error fetching tools:', supabaseError);
          setError(supabaseError.message);
          return;
        }

        setTools(data || []);
      } catch (err) {
        console.error('Error fetching tools:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTools();
  }, []);

  const normalizeCategory = (cat: string | undefined) => {
    if (!cat) return '';
    return cat.charAt(0).toUpperCase() + cat.slice(1).toLowerCase();
  };

  const dynamicCategories = ['All', ...new Set(tools.map(t => normalizeCategory(t.category)).filter(Boolean))];

  const getIcon = (iconName: string) => {
    switch (iconName?.toLowerCase()) {
      case 'globe': return <Globe className="w-6 h-6" />;
      case 'layout': return <Layout className="w-6 h-6" />;
      case 'shield': return <Shield className="w-6 h-6" />;
      case 'zap': return <Zap className="w-6 h-6" />;
      case 'cpu': return <Cpu className="w-6 h-6" />;
      default: return <Cpu className="w-6 h-6" />;
    }
  };

  const filteredTools = tools.filter(tool => {
    const matchesSearch = (tool.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
                          (tool.description?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    
    const normalizedToolCategory = normalizeCategory(tool.category);
    const matchesCategory = activeCategory === 'All' || normalizedToolCategory === activeCategory;
    
    // Check if user has permission
    const allowedRoles = Array.isArray(tool.allowed_roles) 
      ? tool.allowed_roles 
      : (typeof tool.allowed_roles === 'string' ? [tool.allowed_roles] : []);
      
    const hasPermission = allowedRoles.length === 0 || allowedRoles.includes(user.role);

    return matchesSearch && matchesCategory && hasPermission;
  });

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full animate-in fade-in duration-500">
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
        </div>
      </div>

      {/* Categories */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar shrink-0">
        {dynamicCategories.map(category => (
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
      <div className="pb-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-rose-400 bg-rose-500/5 border border-rose-500/10 rounded-[2rem] p-8 text-center">
            <AlertTriangle className="w-12 h-12 mb-4 opacity-50" />
            <h3 className="text-lg font-bold mb-2">Error Loading Tools</h3>
            <p className="text-sm opacity-80 max-w-md">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-2 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : filteredTools.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 bg-white/5 border border-white/10 rounded-[2rem]">
            <Cpu className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-medium">No tools found.</p>
            {tools.length > 0 && (
              <p className="text-xs mt-2 opacity-50">Try changing your search or category filter.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTools.map(tool => (
              <a 
                key={tool.id} 
                href={tool.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="group relative overflow-hidden rounded-[2rem] bg-white/5 border border-white/10 p-6 hover:bg-white/[0.07] transition-all hover:shadow-[0_0_30px_rgba(59,130,246,0.1)] hover:-translate-y-1"
              >
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-white" />
                </div>
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-lg", tool.color || "bg-blue-500/20 text-blue-400")}>
                  {getIcon(tool.icon_name)}
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{tool.title}</h3>
                <p className="text-sm text-slate-400 line-clamp-2 group-hover:text-slate-300 transition-colors">{tool.description}</p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="px-2 py-1 rounded-md bg-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border border-white/5">
                    {normalizeCategory(tool.category)}
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
