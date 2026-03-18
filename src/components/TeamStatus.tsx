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
  Loader2,
  ChevronDown,
  ChevronUp,
  Trash2,
  FileText,
  CreditCard,
  CheckSquare,
  Target,
  ExternalLink
} from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import { User } from '../types';
import { Task } from './Tasks';
import { teamService, EmployeePerformance } from '../services/teamService';
import { payslipService } from '../services/payslipService';
import { PayslipData as PayslipDetailData } from './PayslipDetail';
import { supabase } from '../lib/supabaseClient';
import { DatePicker } from './DatePicker';

interface TeamStatusProps {
  user: User;
}

export function TeamStatus({ user }: TeamStatusProps) {
  const [team, setTeam] = useState<EmployeePerformance[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeePerformance | null>(null);
  const [employeePayslips, setEmployeePayslips] = useState<PayslipDetailData[]>([]);
  const [loadingPayslips, setLoadingPayslips] = useState(false);
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

  const [showMorePayslips, setShowMorePayslips] = useState(false);

  useEffect(() => {
    if (selectedEmployee) {
      fetchEmployeePayslips(selectedEmployee.id);
      setShowMorePayslips(false); // Reset when selecting a new employee
    }
  }, [selectedEmployee]);

  const fetchEmployeePayslips = async (employeeId: string) => {
    setLoadingPayslips(true);
    try {
      const data = await payslipService.getMyPayslips(employeeId, 'approved');
      setEmployeePayslips(data);
    } catch (err) {
      console.error("Error fetching employee payslips:", err);
      setEmployeePayslips([]);
    } finally {
      setLoadingPayslips(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [teamData, tasksResponse] = await Promise.all([
        teamService.getTeamPerformance(),
        supabase
          .from('tasks')
          .select(`
            *,
            assignee:assignee_id(full_name),
            assigner:assigner_id(full_name)
          `)
          .eq('assigner_id', user.id)
          .order('deadline', { ascending: true })
      ]);

      setTeam(teamData);
      
      if (tasksResponse.data) {
        const formattedTasks: Task[] = tasksResponse.data.map(t => ({
          id: t.id,
          title: t.title,
          description: t.description,
          assigneeId: t.assignee_id,
          assigneeName: t.assignee?.full_name || 'Unknown',
          assignerId: t.assigner_id,
          assignerName: t.assigner?.full_name || 'Unknown',
          status: t.status,
          priority: t.priority,
          deadline: t.deadline,
          createdAt: t.created_at || new Date().toISOString(),
          feedback: t.feedback_message ? {
            message: t.feedback_message,
            status: t.feedback_status || 'Pending'
          } : undefined
        }));
        setTasks(formattedTasks);
      }
    } catch (error) {
      console.error("Error fetching team status data:", error);
    } finally {
      setLoading(false);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    if (!newTask.assigneeId) {
      setErrorMessage("Please select a team member.");
      setIsSubmitting(false);
      return;
    }

    const assignee = team.find(t => t.id === newTask.assigneeId);
    if (!assignee) {
      setErrorMessage("Selected team member not found.");
      setIsSubmitting(false);
      return;
    }

    try {
      const newTaskData = {
        title: newTask.title,
        description: newTask.description,
        assignee_id: assignee.id,
        assigner_id: user.id,
        status: 'Todo',
        priority: newTask.priority,
        deadline: newTask.deadline || null
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert([newTaskData])
        .select(`
          *,
          assignee:assignee_id(full_name),
          assigner:assigner_id(full_name)
        `)
        .single();

      if (error) {
        console.error("Supabase error:", error);
        setErrorMessage(error.message || "Failed to create task");
        setIsSubmitting(false);
        return;
      }

      if (data) {
        const task: Task = {
          id: data.id,
          title: data.title,
          description: data.description,
          assigneeId: data.assignee_id,
          assigneeName: data.assignee?.full_name || 'Unknown',
          assignerId: data.assigner_id,
          assignerName: data.assigner?.full_name || 'Unknown',
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
    } catch (err: any) {
      console.error("Unexpected error:", err);
      setErrorMessage(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }

    // Optimistic UI update
    const previousTasks = [...tasks];
    setTasks(prev => prev.filter(t => t.id !== id));

    try {
      // 1. Delete task assignees first
      await supabase.from('task_assignees').delete().eq('task_id', id);
      
      // 2. Delete task activities
      await supabase.from('task_activities').delete().eq('task_id', id);

      // 3. Delete the task itself
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
    } catch (err: any) {
      console.error('Error deleting task:', err);
      // Revert optimistic update
      setTasks(previousTasks);
      alert(`Failed to delete task: ${err.message || 'Unknown error'}`);
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
            Assign Task
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
                <p className="text-xl font-black text-white">
                  {team.filter(t => t.id !== user.id).reduce((acc, curr) => acc + curr.tasksCompleted, 0)}
                </p>
              </div>
            </div>
            <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <Clock className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Tasks</p>
                <p className="text-xl font-black text-white">
                  {team.filter(t => t.id !== user.id).reduce((acc, curr) => acc + curr.tasksPending, 0)}
                </p>
              </div>
            </div>
            <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                <AlertCircle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overdue Tasks</p>
                <p className="text-xl font-black text-white">
                  {team.filter(t => t.id !== user.id).reduce((acc, curr) => acc + curr.tasksOverdue, 0)}
                </p>
              </div>
            </div>
            <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <UserCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg OT Hours</p>
                <p className="text-xl font-black text-white">
                  {team.length > 0 ? Math.round((team.reduce((acc, curr) => acc + curr.otHours, 0) / team.length) * 10) / 10 : 0}h
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
                      <th className="px-6 py-4 text-center">Tasks (Active/Total)</th>
                      <th className="px-6 py-4 text-center">Overdue</th>
                      <th className="px-6 py-4 text-center">Late Days</th>
                      <th className="px-6 py-4 text-center">OT Hours</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredTeam.map((emp) => (
                      <tr key={emp.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4">
                          <div 
                            className="flex items-center gap-3 cursor-pointer group/emp"
                            onClick={() => setSelectedEmployee(emp)}
                          >
                            <img 
                              src={emp.id === user.id ? user.avatar : emp.avatar} 
                              alt="" 
                              className="w-10 h-10 rounded-full border border-white/10 group-hover/emp:border-blue-400 transition-colors" 
                            />
                            <div className="flex flex-col">
                              <span className="font-bold text-white group-hover/emp:text-blue-400 transition-colors">{emp.name}</span>
                              <span className="text-[10px] text-slate-500">{emp.position || emp.role} • {emp.department}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {emp.id === user.id ? (
                            <span className="text-slate-500">-</span>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-emerald-400 font-bold">{emp.tasksInProgress}</span>
                              <span className="text-slate-500">/</span>
                              <span className="text-amber-400 font-bold">{emp.totalTasks}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {emp.id === user.id ? (
                            <span className="text-slate-500">-</span>
                          ) : (
                            <span className={cn("font-bold", emp.tasksOverdue > 0 ? "text-rose-400" : "text-slate-400")}>
                              {emp.tasksOverdue}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={cn("font-bold", emp.lateDays > 0 ? "text-orange-400" : "text-slate-400")}>
                            {emp.lateDays}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={cn("font-bold", emp.otHours > 0 ? "text-blue-400" : "text-slate-400")}>
                            {emp.otHours}h
                          </span>
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
                     <button 
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Delete Task"
                     >
                        <Trash2 className="w-5 h-5" />
                     </button>
                  </div>
                  
                  <p className="text-slate-400 text-sm leading-relaxed">{task.description}</p>
                  
                  <div className="flex items-center gap-6 text-sm text-slate-500 border-t border-white/5 pt-4">
                     <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4" />
                        <span>Assigned to <span className="text-white font-medium">{task.assigneeName}</span></span>
                     </div>
                     <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Due: <span className={cn("font-medium", new Date(task.deadline) < new Date() ? "text-rose-400" : "text-white")}>{formatDate(task.deadline)}</span></span>
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
                                 <span className="text-slate-400 line-through">{formatDate(task.deadline)}</span>
                                 <ArrowRight className="w-3 h-3 text-slate-500" />
                                 <span className="text-blue-400 font-bold">{formatDate(task.feedback.requestedDeadline)}</span>
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
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAssignTaskOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-lg bg-[#0F1115] border border-white/10 rounded-[2.5rem] shadow-2xl z-[101] overflow-hidden"
            >
              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-white">Assign Task</h2>
                  <button 
                    onClick={() => setIsAssignTaskOpen(false)}
                    className="p-2 rounded-full hover:bg-white/5 text-slate-400 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleAssignTask} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assign To</label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-white/[0.03] rounded-2xl border border-white/10 backdrop-blur-md transition-all duration-300 group-focus-within:bg-white/[0.07] group-focus-within:border-white/20 group-focus-within:shadow-[0_0_20px_rgba(59,130,246,0.15)] pointer-events-none" />
                      <select 
                        required
                        value={newTask.assigneeId}
                        onChange={(e) => setNewTask({...newTask, assigneeId: e.target.value})}
                        className="w-full p-4 bg-transparent rounded-2xl text-white focus:outline-none relative z-10 transition-all appearance-none cursor-pointer"
                      >
                        <option value="" className="text-black">Select Team Member</option>
                        {team.map((member) => (
                          <option key={member.id} value={member.id} className="text-black">
                            {member.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none z-20" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Task Title</label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-white/[0.03] rounded-2xl border border-white/10 backdrop-blur-md transition-all duration-300 group-focus-within:bg-white/[0.07] group-focus-within:border-white/20 group-focus-within:shadow-[0_0_20px_rgba(59,130,246,0.15)] pointer-events-none" />
                      <input 
                        type="text"
                        required
                        placeholder="e.g. Q4 Financial Report"
                        value={newTask.title}
                        onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                        className="w-full p-4 bg-transparent rounded-2xl text-white focus:outline-none relative z-10 transition-all placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-white/[0.03] rounded-2xl border border-white/10 backdrop-blur-md transition-all duration-300 group-focus-within:bg-white/[0.07] group-focus-within:border-white/20 group-focus-within:shadow-[0_0_20px_rgba(59,130,246,0.15)] pointer-events-none" />
                      <textarea 
                        required
                        placeholder="Detailed instructions..."
                        value={newTask.description}
                        onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                        className="w-full p-4 bg-transparent rounded-2xl text-white focus:outline-none relative z-10 transition-all h-32 resize-none placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Priority</label>
                      <div className="relative group">
                        <div className="absolute inset-0 bg-white/[0.03] rounded-2xl border border-white/10 backdrop-blur-md transition-all duration-300 group-focus-within:bg-white/[0.07] group-focus-within:border-white/20 group-focus-within:shadow-[0_0_20px_rgba(59,130,246,0.15)] pointer-events-none" />
                        <select 
                          value={newTask.priority}
                          onChange={(e) => setNewTask({...newTask, priority: e.target.value as any})}
                          className="w-full p-4 bg-transparent rounded-2xl text-white focus:outline-none relative z-10 transition-all appearance-none cursor-pointer"
                        >
                          <option value="Low" className="text-black">Low</option>
                          <option value="Medium" className="text-black">Medium</option>
                          <option value="High" className="text-black">High</option>
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none z-20" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Deadline</label>
                      <DatePicker 
                        value={newTask.deadline} 
                        onChange={(date) => setNewTask({...newTask, deadline: date})} 
                        placeholder="Select Date"
                        inputClassName="w-full p-4 bg-white/[0.03] rounded-2xl border border-white/10 text-white focus:outline-none transition-all placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  {errorMessage && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {errorMessage}
                    </div>
                  )}

                  <button 
                    type="submit"
                    disabled={isSubmitting || !newTask.title.trim() || !newTask.description.trim()}
                    className="w-full relative group overflow-hidden rounded-2xl transition-all duration-500 transform hover:-translate-y-1 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.4),_inset_0_0_20px_rgba(255,255,255,0.05)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {/* Main Glass Body */}
                    <div className="absolute inset-0 bg-gradient-to-b from-white/[0.1] to-transparent backdrop-blur-md border border-white/10 group-hover:border-white/20 transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] rounded-2xl" />
                    
                    {/* Top Gloss */}
                    <div className="absolute top-0 inset-x-0 h-[40%] bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-t-2xl" />
                    
                    {/* Content */}
                    <div className="relative z-10 py-4 flex items-center justify-center gap-2 text-white font-bold tracking-wide text-lg drop-shadow-md">
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Assigning...
                        </>
                      ) : (
                        "Assign Task"
                      )}
                    </div>
                    
                    {/* Sweep Effect */}
                    <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out skew-x-[-20deg] pointer-events-none" />
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Employee Details Modal */}
      <AnimatePresence>
        {selectedEmployee && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedEmployee(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-[#0F1115] border border-white/10 rounded-[2rem] shadow-2xl z-[101] overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-4">
                  <img 
                    src={selectedEmployee.id === user.id ? user.avatar : selectedEmployee.avatar} 
                    alt="" 
                    className="w-16 h-16 rounded-full border-2 border-white/10" 
                  />
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedEmployee.name}</h2>
                    <p className="text-sm text-slate-400">{selectedEmployee.position || selectedEmployee.role} • {selectedEmployee.department}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedEmployee(null)}
                  className="p-2 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
                {/* Work Info */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-blue-400" /> Work Status
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <p className="text-xs font-bold text-slate-500 uppercase">Completed</p>
                      <p className="text-xl font-black text-emerald-400 mt-1">{selectedEmployee.tasksCompleted}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <p className="text-xs font-bold text-slate-500 uppercase">In Progress</p>
                      <p className="text-xl font-black text-blue-400 mt-1">{selectedEmployee.tasksInProgress}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <p className="text-xs font-bold text-slate-500 uppercase">Pending</p>
                      <p className="text-xl font-black text-amber-400 mt-1">{selectedEmployee.tasksPending}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                      <p className="text-xs font-bold text-slate-500 uppercase">Overdue</p>
                      <p className="text-xl font-black text-rose-400 mt-1">{selectedEmployee.tasksOverdue}</p>
                    </div>
                  </div>
                </div>

                {/* Attendance Info */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-400" /> Attendance
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">Late Days</p>
                        <p className="text-xl font-black text-white mt-1">{selectedEmployee.lateDays}</p>
                      </div>
                      <AlertCircle className={cn("w-8 h-8", selectedEmployee.lateDays > 0 ? "text-rose-400" : "text-slate-600")} />
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">OT Hours</p>
                        <p className="text-xl font-black text-white mt-1">{selectedEmployee.otHours}h</p>
                      </div>
                      <Clock className={cn("w-8 h-8", selectedEmployee.otHours > 0 ? "text-blue-400" : "text-slate-600")} />
                    </div>
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase">Days Off</p>
                        <p className="text-xl font-black text-white mt-1">
                          {selectedEmployee.daysOff} <span className="text-sm text-slate-500 font-medium">/ 14</span>
                        </p>
                      </div>
                      <Calendar className={cn("w-8 h-8", selectedEmployee.daysOff >= 14 ? "text-rose-400" : "text-blue-400")} />
                    </div>
                  </div>
                </div>

                {/* Active Tasks Info */}
                <div>
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-blue-400" /> Active Tasks
                    </div>
                    {selectedEmployee.tasks && selectedEmployee.tasks.filter(t => t.status?.toLowerCase() !== 'done').length > 0 && (
                      <span className="text-xs font-medium text-slate-500">
                        {selectedEmployee.tasks.filter(t => t.status?.toLowerCase() !== 'done').length} tasks
                      </span>
                    )}
                  </h3>
                  {selectedEmployee.tasks && selectedEmployee.tasks.filter(t => t.status?.toLowerCase() !== 'done').length > 0 ? (
                    <div className="space-y-3">
                      {selectedEmployee.tasks
                        .filter(t => t.status?.toLowerCase() !== 'done')
                        .sort((a, b) => {
                          // Sort by overdue first, then by priority
                          const aOverdue = a.deadline && new Date(a.deadline) < new Date(new Date().setHours(0,0,0,0));
                          const bOverdue = b.deadline && new Date(b.deadline) < new Date(new Date().setHours(0,0,0,0));
                          if (aOverdue && !bOverdue) return -1;
                          if (!aOverdue && bOverdue) return 1;
                          
                          const priorityMap = { 'High': 3, 'Medium': 2, 'Low': 1 };
                          return (priorityMap[b.priority as keyof typeof priorityMap] || 0) - (priorityMap[a.priority as keyof typeof priorityMap] || 0);
                        })
                        .map(task => {
                          const isOverdue = task.deadline && new Date(task.deadline) < new Date(new Date().setHours(0,0,0,0));
                          return (
                            <div key={task.id} className={cn(
                              "p-4 rounded-2xl border transition-all",
                              isOverdue ? "bg-rose-500/5 border-rose-500/20" : "bg-white/5 border-white/10"
                            )}>
                              <div className="flex justify-between items-start">
                                <p className="font-bold text-white text-sm">{task.title}</p>
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                  task.status === 'In Progress' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                                  task.status === 'Review' ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                                  "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                                )}>
                                  {task.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-xs mt-2">
                                <span className={cn(
                                  "flex items-center gap-1",
                                  isOverdue ? "text-rose-400 font-bold" : "text-slate-400"
                                )}>
                                  <Calendar className="w-3 h-3" />
                                  {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}
                                  {isOverdue && ' (Overdue)'}
                                </span>
                                <span className={cn(
                                  "flex items-center gap-1",
                                  task.priority === 'High' ? "text-rose-400" :
                                  task.priority === 'Medium' ? "text-amber-400" : "text-emerald-400"
                                )}>
                                  <AlertCircle className="w-3 h-3" />
                                  {task.priority}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center">
                      <p className="text-slate-400">No active tasks for this employee.</p>
                    </div>
                  )}
                </div>

                {/* Salary/Bonus Info */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-emerald-400" /> Recent Payslips
                    </h3>
                    {employeePayslips.length > 0 && (
                      <a
                        href="https://docs.google.com/spreadsheets/d/1hjTy0Q9Kc0OBrcozIwmfzWr0NdWqEsRcOxKDaVZ4KB0/edit?gid=1261202994#gid=1261202994"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
                      >
                        See all <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  
                  {loadingPayslips ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    </div>
                  ) : employeePayslips.length > 0 ? (
                    <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                      <div className="divide-y divide-white/10">
                        {employeePayslips.slice(0, showMorePayslips ? 10 : 3).map((payslip) => {
                          return (
                            <div key={payslip.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                                  <FileText className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div>
                                  <p className="font-bold text-white text-sm">Payslip {payslip.month}/{payslip.year}</p>
                                  <p className="text-[10px] text-slate-400">Net Salary: {(payslip.netSalary || 0).toLocaleString()} VND</p>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Approved
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      
                      {employeePayslips.length > 3 && (
                        <button
                          onClick={() => setShowMorePayslips(!showMorePayslips)}
                          className="w-full py-3 text-[10px] font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-all border-t border-white/10 flex items-center justify-center gap-1 uppercase tracking-wider"
                        >
                          {showMorePayslips ? (
                            <>Show Less <ChevronUp className="w-3 h-3" /></>
                          ) : (
                            <>Show More ({employeePayslips.length - 3} more) <ChevronDown className="w-3 h-3" /></>
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center">
                      <p className="text-slate-400">No payslips found for this employee.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
