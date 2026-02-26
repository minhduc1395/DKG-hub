import React, { useState, useEffect } from 'react';
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
  UserX,
  ArrowRight,
  User as UserIcon,
  Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { User } from '../types';
import { Task } from './Tasks';
import { teamService, EmployeePerformance } from '../services/teamService';
import { supabase } from '../lib/supabaseClient';

interface TeamStatusProps {
  user: User;
}

export function TeamStatus({ user }: TeamStatusProps) {
  const [team, setTeam] = useState<EmployeePerformance[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeePerformance | null>(null);
  const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'feedback'>('overview');
  const [loading, setLoading] = useState(true);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigneeId: '',
    priority: 'Medium' as Task['priority'],
    deadline: ''
  });

  useEffect(() => {
    fetchData();
  }, [user.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [teamData, { data: tasksData }] = await Promise.all([
        teamService.getTeamPerformance(),
        supabase
          .from('tasks')
          .select(`
            *,
            assignee:assignee_id(name),
            assigner:assigner_id(name)
          `)
          .eq('assigner_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      setTeam(teamData);
      
      if (tasksData) {
        const formattedTasks: Task[] = tasksData.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          assigneeId: t.assignee_id,
          assigneeName: t.assignee?.name || 'Unknown',
          assignerId: t.assigner_id,
          assignerName: t.assigner?.name || 'Unknown',
          status: t.status,
          priority: t.priority,
          deadline: t.deadline,
          createdAt: t.created_at,
          feedback: t.feedback
        }));
        setTasks(formattedTasks);
      }
    } catch (error) {
      console.error("Error fetching team status data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const assignee = team.find(t => t.id === newTask.assigneeId);
    if (!assignee) return;

    const newTaskData = {
      title: newTask.title,
      description: newTask.description,
      assignee_id: assignee.id,
      assigner_id: user.id,
      status: 'Todo',
      priority: newTask.priority,
      deadline: newTask.deadline,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert([newTaskData])
      .select(`
        *,
        assignee:assignee_id(name),
        assigner:assigner_id(name)
      `)
      .single();

    if (error) {
      console.error("Error creating task:", error);
      return;
    }

    if (data) {
      const task: Task = {
        id: data.id,
        title: data.title,
        description: data.description,
        assigneeId: data.assignee_id,
        assigneeName: data.assignee?.name || 'Unknown',
        assignerId: data.assigner_id,
        assignerName: data.assigner?.name || 'Unknown',
        status: data.status,
        priority: data.priority,
        deadline: data.deadline,
        createdAt: data.created_at,
        feedback: data.feedback
      };
      
      setTasks([task, ...tasks]);
      setIsAssignTaskOpen(false);
      setNewTask({ title: '', description: '', assigneeId: '', priority: 'Medium', deadline: '' });
    }
  };

  const handleFeedbackAction = async (taskId: string, action: 'Approved' | 'Rejected') => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.feedback) return;

    const updatedFeedback = {
      ...task.feedback,
      status: action
    };

    const updates: any = {
      feedback: updatedFeedback
    };

    if (action === 'Approved' && task.feedback.requestedDeadline) {
      updates.deadline = task.feedback.requestedDeadline;
    }

    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId);

    if (error) {
      console.error("Error updating feedback:", error);
      return;
    }

    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          deadline: updates.deadline || t.deadline,
          feedback: updatedFeedback
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full lg:h-full animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-white text-3xl font-black tracking-tight">Team Status</h1>
          <p className="text-slate-400">Monitor performance, assign tasks, and manage feedback.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 w-full sm:w-auto">
            <button 
              onClick={() => setActiveTab('overview')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 flex-1 sm:flex-none whitespace-nowrap",
                activeTab === 'overview' ? "bg-blue-500 text-white shadow-lg" : "text-slate-400 hover:text-white"
              )}
            >
              <Users className="w-3.5 h-3.5" /> Overview
            </button>
            <button 
              onClick={() => setActiveTab('feedback')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 relative flex-1 sm:flex-none whitespace-nowrap",
                activeTab === 'feedback' ? "bg-blue-500 text-white shadow-lg" : "text-slate-400 hover:text-white"
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Assigned Task History
              {pendingFeedbackTasks.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center">
                  {pendingFeedbackTasks.length}
                </span>
              )}
            </button>
          </div>
          <button 
            onClick={() => setIsAssignTaskOpen(true)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)] whitespace-nowrap"
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
                  {team.length > 0 ? Math.round(team.reduce((acc, curr) => acc + curr.attendanceRate, 0) / team.length) : 0}%
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
                    {filteredTeam.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                          No data available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Assigned Task History View */
        <div className="flex flex-col gap-4 lg:overflow-y-auto custom-scrollbar pb-8">
          {tasks.filter(t => t.assignerId === user.id).map(task => (
            <div key={task.id} className="bg-white/5 border border-white/10 rounded-[1.5rem] p-6 flex flex-col md:flex-row gap-6 hover:bg-white/[0.07] transition-colors group">
               {/* Left Side: Task Info */}
               <div className="flex-1 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                     <div>
                        <div className="flex items-center gap-3 mb-2">
                           <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border", getStatusColor(task.status))}>
                              {task.status}
                           </span>
                           <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border", getPriorityColor(task.priority))}>
                              {task.priority}
                           </span>
                        </div>
                        <h3 className="text-xl font-bold text-white">{task.title}</h3>
                     </div>
                  </div>
                  
                  <p className="text-slate-400 text-sm leading-relaxed">{task.description}</p>
                  
                  <div className="flex items-center gap-6 text-sm text-slate-500 border-t border-white/5 pt-4">
                     <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4" />
                        <span>Assigned to <span className="text-white font-medium">{task.assigneeName}</span></span>
                     </div>
                     <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Due: <span className={cn("font-medium", new Date(task.deadline) < new Date() ? "text-rose-400" : "text-white")}>{task.deadline}</span></span>
                     </div>
                  </div>
               </div>

               {/* Right Side: Feedback & Actions (if applicable) */}
               {task.feedback && (
                  <div className="w-full md:w-80 shrink-0 bg-black/20 rounded-2xl border border-white/5 p-4 flex flex-col">
                     <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                           <MessageSquare className="w-3.5 h-3.5" /> Feedback
                        </span>
                        <span className={cn(
                           "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                           task.feedback.status === 'Pending' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                           task.feedback.status === 'Approved' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                           "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        )}>
                           {task.feedback.status}
                        </span>
                     </div>
                     
                     <div className="flex-1 space-y-3">
                        <p className="text-sm text-slate-300 italic">"{task.feedback.message}"</p>
                        
                        {task.feedback.requestedDeadline && (
                           <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                              <p className="text-[10px] text-slate-500 uppercase font-bold">Proposed Deadline Change</p>
                              <div className="flex items-center gap-2 text-sm">
                                 <span className="text-slate-400 line-through">{task.deadline}</span>
                                 <ArrowRight className="w-3 h-3 text-slate-500" />
                                 <span className="text-blue-400 font-bold">{task.feedback.requestedDeadline}</span>
                              </div>
                           </div>
                        )}
                     </div>

                     {task.feedback.status === 'Pending' && (
                        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/5">
                           <button 
                              onClick={() => handleFeedbackAction(task.id, 'Rejected')}
                              className="py-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition-colors flex items-center justify-center gap-1"
                           >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                           </button>
                           <button 
                              onClick={() => handleFeedbackAction(task.id, 'Approved')}
                              className="py-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition-colors flex items-center justify-center gap-1"
                           >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                           </button>
                        </div>
                     )}
                  </div>
               )}
            </div>
          ))}
          {tasks.filter(t => t.assignerId === user.id).length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-500 flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-slate-600" />
              <p>No data available.</p>
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
