import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Search, 
  Plus, 
  MoreVertical, 
  AlertCircle,
  MessageSquare,
  Calendar,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  UserCheck,
  UserX
} from 'lucide-react';
import { cn } from '../lib/utils';
import { User } from '../types';
import { Task, mockTasks } from './Tasks';

interface EmployeePerformance {
  id: string;
  name: string;
  avatar: string;
  department: string;
  role: string;
  tasksCompleted: number;
  tasksPending: number;
  tasksOverdue: number;
  lateDays: number;
  attendanceRate: number;
}

const mockTeam: EmployeePerformance[] = [
  {
    id: '1',
    name: 'Alex Morgan',
    avatar: 'https://picsum.photos/seed/alex/100/100',
    department: 'Product Design',
    role: 'Senior Designer',
    tasksCompleted: 45,
    tasksPending: 3,
    tasksOverdue: 1,
    lateDays: 2,
    attendanceRate: 95
  },
  {
    id: '3',
    name: 'John Doe',
    avatar: 'https://picsum.photos/seed/john/100/100',
    department: 'Engineering',
    role: 'Frontend Dev',
    tasksCompleted: 62,
    tasksPending: 5,
    tasksOverdue: 0,
    lateDays: 0,
    attendanceRate: 100
  },
  {
    id: '4',
    name: 'Emily Chen',
    avatar: 'https://picsum.photos/seed/emily/100/100',
    department: 'Marketing',
    role: 'Content Strategist',
    tasksCompleted: 28,
    tasksPending: 8,
    tasksOverdue: 3,
    lateDays: 5,
    attendanceRate: 88
  }
];

interface TeamStatusProps {
  user: User;
}

export function TeamStatus({ user }: TeamStatusProps) {
  const [team, setTeam] = useState<EmployeePerformance[]>(mockTeam);
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeePerformance | null>(null);
  const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'feedback'>('overview');

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigneeId: '',
    priority: 'Medium' as Task['priority'],
    deadline: ''
  });

  const handleAssignTask = (e: React.FormEvent) => {
    e.preventDefault();
    const assignee = team.find(t => t.id === newTask.assigneeId);
    if (!assignee) return;

    const task: Task = {
      id: `t-${Date.now()}`,
      title: newTask.title,
      description: newTask.description,
      assigneeId: assignee.id,
      assigneeName: assignee.name,
      assignerId: user.id,
      assignerName: user.name,
      status: 'Todo',
      priority: newTask.priority,
      deadline: newTask.deadline,
      createdAt: new Date().toISOString().split('T')[0]
    };
    
    setTasks([task, ...tasks]);
    setIsAssignTaskOpen(false);
    setNewTask({ title: '', description: '', assigneeId: '', priority: 'Medium', deadline: '' });
  };

  const handleFeedbackAction = (taskId: string, action: 'Approved' | 'Rejected') => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId && t.feedback) {
        return {
          ...t,
          deadline: action === 'Approved' && t.feedback.requestedDeadline ? t.feedback.requestedDeadline : t.deadline,
          feedback: {
            ...t.feedback,
            status: action
          }
        };
      }
      return t;
    }));
  };

  const filteredTeam = team.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingFeedbackTasks = tasks.filter(t => t.feedback && t.feedback.status === 'Pending' && t.assignerId === user.id);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full lg:h-full animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-white text-3xl font-black tracking-tight">Team Status</h1>
          <p className="text-slate-400">Monitor performance, assign tasks, and manage feedback.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
            <button 
              onClick={() => setActiveTab('overview')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                activeTab === 'overview' ? "bg-blue-500 text-white shadow-lg" : "text-slate-400 hover:text-white"
              )}
            >
              <Users className="w-3.5 h-3.5" /> Overview
            </button>
            <button 
              onClick={() => setActiveTab('feedback')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 relative",
                activeTab === 'feedback' ? "bg-blue-500 text-white shadow-lg" : "text-slate-400 hover:text-white"
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Feedback Requests
              {pendingFeedbackTasks.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center">
                  {pendingFeedbackTasks.length}
                </span>
              )}
            </button>
          </div>
          <button 
            onClick={() => setIsAssignTaskOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)] whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Assign Task
          </button>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <CheckCircle2 className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Completed</p>
                <p className="text-xl font-black text-white">{team.reduce((acc, curr) => acc + curr.tasksCompleted, 0)}</p>
              </div>
            </div>
            <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <Clock className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Tasks</p>
                <p className="text-xl font-black text-white">{team.reduce((acc, curr) => acc + curr.tasksPending, 0)}</p>
              </div>
            </div>
            <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                <AlertCircle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overdue Tasks</p>
                <p className="text-xl font-black text-white">{team.reduce((acc, curr) => acc + curr.tasksOverdue, 0)}</p>
              </div>
            </div>
            <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <UserCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Attendance</p>
                <p className="text-xl font-black text-white">
                  {Math.round(team.reduce((acc, curr) => acc + curr.attendanceRate, 0) / team.length)}%
                </p>
              </div>
            </div>
          </div>

          {/* Team List */}
          <div className="flex flex-col gap-4 lg:flex-1 lg:overflow-hidden">
            <div className="relative group w-full md:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-400 transition-colors z-10" />
              <input 
                type="text"
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all"
              />
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden flex flex-col lg:flex-1">
              <div className="overflow-x-auto lg:overflow-auto lg:flex-1 w-full custom-scrollbar relative">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-xs uppercase text-slate-400 font-bold tracking-wider border-b border-white/10">
                    <tr>
                      <th className="px-6 py-4">Employee</th>
                      <th className="px-6 py-4 text-center">Tasks (Done/Pending)</th>
                      <th className="px-6 py-4 text-center">Overdue</th>
                      <th className="px-6 py-4 text-center">Late Days</th>
                      <th className="px-6 py-4 text-center">Attendance</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredTeam.map((emp) => (
                      <tr key={emp.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <img src={emp.avatar} alt="" className="w-10 h-10 rounded-full border border-white/10" />
                            <div className="flex flex-col">
                              <span className="font-bold text-white">{emp.name}</span>
                              <span className="text-[10px] text-slate-500">{emp.role} • {emp.department}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <span className="text-emerald-400 font-bold">{emp.tasksCompleted}</span>
                            <span className="text-slate-500">/</span>
                            <span className="text-amber-400 font-bold">{emp.tasksPending}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={cn("font-bold", emp.tasksOverdue > 0 ? "text-rose-400" : "text-slate-400")}>
                            {emp.tasksOverdue}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={cn("font-bold", emp.lateDays > 0 ? "text-orange-400" : "text-slate-400")}>
                            {emp.lateDays}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className={cn("h-full rounded-full", emp.attendanceRate >= 95 ? "bg-emerald-500" : emp.attendanceRate >= 90 ? "bg-amber-500" : "bg-rose-500")}
                                style={{ width: `${emp.attendanceRate}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-300 w-8">{emp.attendanceRate}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => {
                                setSelectedEmployee(emp);
                                setIsAssignTaskOpen(true);
                                setNewTask(prev => ({ ...prev, assigneeId: emp.id }));
                              }}
                              className="px-3 py-1.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg text-xs font-bold transition-colors"
                            >
                              Assign Task
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Feedback Requests View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:overflow-y-auto custom-scrollbar pb-8">
          {pendingFeedbackTasks.map(task => (
            <div key={task.id} className="bg-white/5 border border-white/10 rounded-[1.5rem] p-5 flex flex-col gap-4 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
              
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-amber-400 uppercase">Feedback Request</span>
                </div>
                <span className="text-[10px] text-slate-500">{task.assigneeName}</span>
              </div>

              <div>
                <h3 className="text-white font-bold text-sm mb-1 line-clamp-1">{task.title}</h3>
                <div className="p-3 bg-black/20 rounded-xl border border-white/5 mt-2">
                  <p className="text-slate-300 text-sm italic">"{task.feedback?.message}"</p>
                  {task.feedback?.requestedDeadline && (
                    <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-2 text-xs">
                      <span className="text-slate-500">Requested Deadline:</span>
                      <span className="text-blue-400 font-bold flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {task.feedback.requestedDeadline}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-auto pt-4">
                <button 
                  onClick={() => handleFeedbackAction(task.id, 'Rejected')}
                  className="flex-1 py-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition-colors flex items-center justify-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject
                </button>
                <button 
                  onClick={() => handleFeedbackAction(task.id, 'Approved')}
                  className="flex-1 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition-colors flex items-center justify-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                </button>
              </div>
            </div>
          ))}
          {pendingFeedbackTasks.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-slate-600" />
              <p>No pending feedback requests.</p>
            </div>
          )}
        </div>
      )}

      {/* Assign Task Modal */}
      <AnimatePresence>
        {isAssignTaskOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setIsAssignTaskOpen(false); setSelectedEmployee(null); }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#0F1115] border border-white/10 rounded-[2rem] shadow-2xl z-[101] overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-blue-400" /> Assign Task
                </h2>
                <button onClick={() => { setIsAssignTaskOpen(false); setSelectedEmployee(null); }} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAssignTask} className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Assign To</label>
                  <select 
                    required 
                    value={newTask.assigneeId} 
                    onChange={e => setNewTask({...newTask, assigneeId: e.target.value})} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none [color-scheme:dark]"
                  >
                    <option value="" disabled className="bg-[#0F1115] text-white">Select Team Member...</option>
                    {team.map(emp => (
                      <option key={emp.id} value={emp.id} className="bg-[#0F1115] text-white">{emp.name} ({emp.role})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Task Title</label>
                  <input required type="text" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" placeholder="e.g. Prepare Q4 Presentation" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Description</label>
                  <textarea value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors h-24 resize-none" placeholder="Task details and expectations..." />
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
                    <input required type="date" value={newTask.deadline} onChange={e => setNewTask({...newTask, deadline: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors [color-scheme:dark]" />
                  </div>
                </div>
                <button type="submit" className="w-full py-3.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold transition-all shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                  Assign Task
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
