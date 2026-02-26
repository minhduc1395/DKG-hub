import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Clock, 
  Search, 
  Plus, 
  MoreVertical, 
  AlertCircle,
  MessageSquare,
  Calendar,
  X,
  Send,
  CheckSquare
} from 'lucide-react';
import { cn } from '../lib/utils';
import { User } from '../types';

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  assigneeName: string;
  assignerId: string;
  assignerName: string;
  status: 'Todo' | 'In Progress' | 'Review' | 'Done';
  priority: 'Low' | 'Medium' | 'High';
  deadline: string;
  createdAt: string;
  feedback?: {
    message: string;
    requestedDeadline?: string;
    status: 'Pending' | 'Approved' | 'Rejected';
  };
}

export const mockTasks: Task[] = [
  {
    id: 't1',
    title: 'Design new landing page',
    description: 'Create wireframes and high-fidelity mockups for the new marketing campaign.',
    assigneeId: '1',
    assigneeName: 'Alex Morgan',
    assignerId: '2',
    assignerName: 'Sarah Jenkins',
    status: 'In Progress',
    priority: 'High',
    deadline: '2023-11-15',
    createdAt: '2023-11-01',
  },
  {
    id: 't2',
    title: 'Update design system components',
    description: 'Add new variants for buttons and input fields.',
    assigneeId: '1',
    assigneeName: 'Alex Morgan',
    assignerId: '1',
    assignerName: 'Alex Morgan',
    status: 'Todo',
    priority: 'Medium',
    deadline: '2023-11-20',
    createdAt: '2023-11-05',
  },
  {
    id: 't3',
    title: 'Review Q4 Marketing Assets',
    description: 'Check all banners and social media posts for brand consistency.',
    assigneeId: '1',
    assigneeName: 'Alex Morgan',
    assignerId: '2',
    assignerName: 'Sarah Jenkins',
    status: 'Review',
    priority: 'High',
    deadline: '2023-11-10',
    createdAt: '2023-10-25',
    feedback: {
      message: 'Need 2 more days to gather feedback from the marketing team.',
      requestedDeadline: '2023-11-12',
      status: 'Pending'
    }
  }
];

interface TasksProps {
  user: User;
}

const mockEmployees = [
  { id: '1', name: 'Alex Morgan', role: 'Senior Designer' },
  { id: '2', name: 'Sarah Jenkins', role: 'Manager' },
  { id: '3', name: 'John Doe', role: 'Frontend Dev' },
  { id: '4', name: 'Emily Chen', role: 'Content Strategist' },
];

export function Tasks({ user }: TasksProps) {
  const [tasks, setTasks] = useState<Task[]>(mockTasks.filter(t => t.assigneeId === user.id || t.assignerId === user.id));
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [requestedDeadline, setRequestedDeadline] = useState('');

  const [activeTab, setActiveTab] = useState<'my-tasks' | 'assigned'>('my-tasks');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigneeId: user.id,
    priority: 'Medium' as Task['priority'],
    deadline: ''
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    const assignee = mockEmployees.find(e => e.id === newTask.assigneeId) || { name: user.name };

    const task: Task = {
      id: `t-${Date.now()}`,
      title: newTask.title,
      description: newTask.description,
      assigneeId: newTask.assigneeId,
      assigneeName: assignee.name,
      assignerId: user.id,
      assignerName: user.name,
      status: 'Todo',
      priority: newTask.priority,
      deadline: newTask.deadline,
      createdAt: new Date().toISOString().split('T')[0]
    };
    setTasks([task, ...tasks]);
    setIsNewTaskOpen(false);
    setNewTask({ title: '', description: '', assigneeId: user.id, priority: 'Medium', deadline: '' });
  };

  const handleSubmitFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    setTasks(prev => prev.map(t => {
      if (t.id === selectedTask.id) {
        return {
          ...t,
          feedback: {
            message: feedbackMessage,
            requestedDeadline: requestedDeadline || undefined,
            status: 'Pending'
          }
        };
      }
      return t;
    }));
    setSelectedTask(null);
    setFeedbackMessage('');
    setRequestedDeadline('');
  };

  const updateTaskStatus = (id: string, newStatus: Task['status']) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
  };

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'my-tasks' ? t.assignerId === user.id : t.assignerId !== user.id;
    return matchesSearch && matchesTab;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'Medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'Low': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Todo': return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
      case 'In Progress': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'Review': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'Done': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full h-full animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-white text-3xl font-black tracking-tight">My Tasks</h1>
          <p className="text-slate-400">Manage your assigned tasks and personal to-dos.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 w-full sm:w-auto">
            <button 
              onClick={() => setActiveTab('my-tasks')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 flex-1 sm:flex-none whitespace-nowrap",
                activeTab === 'my-tasks' ? "bg-blue-500 text-white shadow-lg" : "text-slate-400 hover:text-white"
              )}
            >
              My Tasks
            </button>
            <button 
              onClick={() => setActiveTab('assigned')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 flex-1 sm:flex-none whitespace-nowrap",
                activeTab === 'assigned' ? "bg-blue-500 text-white shadow-lg" : "text-slate-400 hover:text-white"
              )}
            >
              Assigned to Me
            </button>
          </div>
          <div className="relative group w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-400 transition-colors z-10" />
            <input 
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
            />
          </div>
          <button 
            onClick={() => setIsNewTaskOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)] whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> New Task
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar pb-8">
        {filteredTasks.map(task => (
          <div key={task.id} className="bg-white/5 border border-white/10 rounded-[1.5rem] p-5 flex flex-col gap-4 hover:bg-white/[0.07] transition-colors group">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border", getStatusColor(task.status))}>
                  {task.status}
                </span>
                <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border", getPriorityColor(task.priority))}>
                  {task.priority}
                </span>
              </div>
              <div className="relative">
                <button 
                  onClick={() => setOpenDropdownId(openDropdownId === task.id ? null : task.id)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                
                <AnimatePresence>
                  {openDropdownId === task.id && (
                    <>
                      <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setOpenDropdownId(null)}
                      />
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="absolute right-0 top-full mt-2 w-40 bg-[#1A1D24] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
                      >
                        <div className="px-3 py-2 border-b border-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Change Status
                        </div>
                        <div className="p-1 flex flex-col">
                          {['Todo', 'In Progress', 'Review', 'Done'].map((status) => (
                            <button
                              key={status}
                              onClick={() => {
                                updateTaskStatus(task.id, status as Task['status']);
                                setOpenDropdownId(null);
                              }}
                              className={cn(
                                "px-3 py-2 text-xs font-medium text-left rounded-lg transition-colors",
                                task.status === status ? "bg-blue-500/10 text-blue-400" : "text-slate-300 hover:bg-white/5 hover:text-white"
                              )}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div>
              <h3 className="text-white font-bold text-lg leading-tight mb-1">{task.title}</h3>
              <p className="text-slate-400 text-sm line-clamp-2">{task.description}</p>
              
              {activeTab === 'my-tasks' && (
                 <div className="mt-3 flex items-center gap-2 text-xs">
                    <span className="text-slate-500">Assigned to:</span>
                    <div className="relative">
                        <select
                            value={task.assigneeId}
                            onChange={(e) => {
                                const newAssignee = mockEmployees.find(emp => emp.id === e.target.value) || { name: user.name };
                                setTasks(prev => prev.map(t => t.id === task.id ? { ...t, assigneeId: e.target.value, assigneeName: newAssignee.name } : t));
                            }}
                            className="appearance-none bg-transparent font-bold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer focus:outline-none [color-scheme:dark]"
                        >
                            <option value={user.id} className="bg-[#1A1D24]">Me</option>
                            {mockEmployees.filter(e => e.id !== user.id).map(emp => (
                                <option key={emp.id} value={emp.id} className="bg-[#1A1D24]">{emp.name}</option>
                            ))}
                        </select>
                    </div>
                 </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <Calendar className="w-3.5 h-3.5" />
                <span className={cn(new Date(task.deadline) < new Date() && task.status !== 'Done' ? "text-rose-400 font-bold" : "")}>
                  {task.deadline}
                </span>
              </div>
              
              {task.assignerId !== user.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500">from {task.assignerName}</span>
                  <button 
                    onClick={() => setSelectedTask(task)}
                    className="p-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                    title="Send Feedback / Request Extension"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <span className="text-[10px] text-slate-500">Personal Task</span>
              )}
            </div>

            {/* Feedback Status */}
            {task.feedback && (
              <div className={cn(
                "mt-2 p-3 rounded-xl text-xs border",
                task.feedback.status === 'Pending' ? "bg-amber-500/10 border-amber-500/20 text-amber-200/70" :
                task.feedback.status === 'Approved' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-200/70" :
                "bg-rose-500/10 border-rose-500/20 text-rose-200/70"
              )}>
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  {task.feedback.status === 'Pending' && <Clock className="w-3.5 h-3.5 text-amber-400" />}
                  {task.feedback.status === 'Approved' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  {task.feedback.status === 'Rejected' && <X className="w-3.5 h-3.5 text-rose-400" />}
                  Feedback {task.feedback.status}
                </div>
                <p className="italic">"{task.feedback.message}"</p>
              </div>
            )}
          </div>
        ))}
        {filteredTasks.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500">
            No tasks found.
          </div>
        )}
      </div>

      {/* New Task Modal */}
      <AnimatePresence>
        {isNewTaskOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsNewTaskOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#0F1115] border border-white/10 rounded-[2rem] shadow-2xl z-[101] overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <CheckSquare className="w-5 h-5 text-blue-400" /> Create Personal Task
                </h2>
                <button onClick={() => setIsNewTaskOpen(false)} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateTask} className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Assign To</label>
                  <select 
                    value={newTask.assigneeId} 
                    onChange={e => setNewTask({...newTask, assigneeId: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none [color-scheme:dark]"
                  >
                    <option value={user.id} className="bg-[#0F1115] text-white">Me ({user.name})</option>
                    {mockEmployees.filter(e => e.id !== user.id).map(emp => (
                      <option key={emp.id} value={emp.id} className="bg-[#0F1115] text-white">{emp.name} ({emp.role})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Task Title</label>
                  <input required type="text" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" placeholder="e.g. Prepare weekly report" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Description</label>
                  <textarea value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors h-24 resize-none" placeholder="Task details..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Priority</label>
                    <select value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value as any})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none [color-scheme:dark]">
                      <option value="Low" className="bg-[#0F1115] text-white">Low</option>
                      <option value="Medium" className="bg-[#0F1115] text-white">Medium</option>
                      <option value="High" className="bg-[#0F1115] text-white">High</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Deadline</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="Select deadline..."
                      onFocus={(e) => (e.target.type = "date")}
                      onBlur={(e) => { if (!e.target.value) e.target.type = "text"; }}
                      value={newTask.deadline} 
                      onChange={e => setNewTask({...newTask, deadline: e.target.value})} 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors [color-scheme:dark]" 
                    />
                  </div>
                </div>
                <button type="submit" className="w-full py-3.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold transition-all shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                  Create Task
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Feedback Modal */}
      <AnimatePresence>
        {selectedTask && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedTask(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#0F1115] border border-white/10 rounded-[2rem] shadow-2xl z-[101] overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-400" /> Task Feedback
                </h2>
                <button onClick={() => setSelectedTask(null)} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmitFeedback} className="p-6 space-y-5">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h3 className="text-sm font-bold text-white mb-1">{selectedTask.title}</h3>
                  <p className="text-xs text-slate-400">Assigned by: {selectedTask.assignerName}</p>
                  <p className="text-xs text-slate-400">Current Deadline: {selectedTask.deadline}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Feedback / Reason</label>
                  <textarea required value={feedbackMessage} onChange={e => setFeedbackMessage(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors h-24 resize-none" placeholder="Explain why you need an extension or provide feedback..." />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Request New Deadline (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="Select new deadline..."
                    onFocus={(e) => (e.target.type = "date")}
                    onBlur={(e) => { if (!e.target.value) e.target.type = "text"; }}
                    value={requestedDeadline} 
                    onChange={e => setRequestedDeadline(e.target.value)} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors [color-scheme:dark]" 
                  />
                </div>

                <button type="submit" className="w-full py-3.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold transition-all shadow-[0_0_20px_rgba(59,130,246,0.2)] flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> Send to Manager
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
