import React, { useState, useEffect } from 'react';
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
  CheckSquare,
  Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { User } from '../types';
import { supabase } from '../lib/supabaseClient';

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

interface TasksProps {
  user: User;
}

export function Tasks({ user }: TasksProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<{id: string, name: string, role: string}[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [requestedDeadline, setRequestedDeadline] = useState('');

  const [activeTab, setActiveTab] = useState<'my-tasks' | 'assigned'>('my-tasks');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [cancelledTaskIds, setCancelledTaskIds] = useState<Set<string>>(new Set());
  const [dirtyTaskIds, setDirtyTaskIds] = useState<Set<string>>(new Set());

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigneeId: user.id,
    priority: 'Medium' as Task['priority'],
    deadline: ''
  });

  useEffect(() => {
    fetchData();
  }, [user.id]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch employees for assignment dropdown
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, job_positions(roles(role_name))');
      
      if (profilesError) throw profilesError;
      setEmployees((profilesData || []).map((p: any) => ({
        id: p.id,
        name: p.full_name || 'Unknown',
        role: p.job_positions?.roles?.role_name || 'staff'
      })));

      // Fetch tasks where user is assignee or assigner
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          id,
          title,
          description,
          assignee_id,
          assigner_id,
          status,
          priority,
          deadline,
          feedback_message,
          feedback_status,
          assignee:assignee_id(full_name),
          assigner:assigner_id(full_name)
        `)
        .or(`assignee_id.eq.${user.id},assigner_id.eq.${user.id}`)
        .order('deadline', { ascending: true });

      if (tasksError) throw tasksError;

      const formattedTasks: Task[] = (tasksData || []).map((t: any) => ({
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
        createdAt: new Date().toISOString(), // Fallback since DB doesn't have created_at
        feedback: t.feedback_message ? {
          message: t.feedback_message,
          status: t.feedback_status || 'Pending'
        } : undefined
      }));

      setTasks(formattedTasks);
    } catch (err: any) {
      console.error('Error fetching tasks:', err);
      // Suppress error as requested by user if data is missing/table not found
      // setError('Failed to load tasks. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!newTask.deadline) {
      setError("Please select a deadline.");
      return;
    }

    const assignee = employees.find(emp => emp.id === newTask.assigneeId) || { name: user.name };
    const tempId = `temp-${Date.now()}`;
    
    // Optimistic UI
    const optimisticTask: Task = {
      id: tempId,
      title: newTask.title,
      description: newTask.description,
      assigneeId: newTask.assigneeId,
      assigneeName: assignee.name,
      assignerId: user.id,
      assignerName: user.name,
      status: 'Todo',
      priority: newTask.priority,
      deadline: newTask.deadline,
      createdAt: new Date().toISOString()
    };
    
    setTasks([optimisticTask, ...tasks]);
    setIsNewTaskOpen(false);
    setNewTask({ title: '', description: '', assigneeId: user.id, priority: 'Medium', deadline: '' });

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          title: optimisticTask.title,
          description: optimisticTask.description,
          assignee_id: optimisticTask.assigneeId,
          assigner_id: optimisticTask.assignerId,
          status: optimisticTask.status,
          priority: optimisticTask.priority,
          deadline: optimisticTask.deadline
        }])
        .select()
        .single();

      if (error) throw error;

      // Update temp ID with real ID
      setTasks(prev => prev.map(t => t.id === tempId ? { ...t, id: data.id } : t));
    } catch (err: any) {
      console.error('Error creating task:', err);
      
      // Handle specific error codes
      if (err.code === '23503') { // Foreign key violation
        setError('Failed to create task: User profile not found. Please ensure your profile exists.');
      } else {
        setError(`Failed to create task: ${err.message || 'Unknown error'}`);
      }
      
      // Revert optimistic update
      setTasks(prev => prev.filter(t => t.id !== tempId));
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;

    const newFeedback = {
      message: feedbackMessage,
      requestedDeadline: requestedDeadline || undefined,
      status: 'Pending'
    };

    // Optimistic UI
    setTasks(prev => prev.map(t => {
      if (t.id === selectedTask.id) {
        return { ...t, feedback: newFeedback as any };
      }
      return t;
    }));
    
    const taskIdToUpdate = selectedTask.id;
    setSelectedTask(null);
    setFeedbackMessage('');
    setRequestedDeadline('');

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          feedback_message: newFeedback.message,
          feedback_status: newFeedback.status
        })
        .eq('id', taskIdToUpdate);

      if (error) throw error;
    } catch (err: any) {
      console.error('Error submitting feedback:', err);
      setError('Failed to submit feedback.');
      // Revert optimistic update (simplified, ideally we'd store previous state)
      fetchData(); 
    }
  };

  const updateTaskStatus = (id: string, newStatus: Task['status']) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    setDirtyTaskIds(prev => new Set(prev).add(id));
  };

  const updateTaskField = (id: string, field: keyof Task, value: any) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    setDirtyTaskIds(prev => new Set(prev).add(id));
  };

  const saveTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          deadline: task.deadline,
          assignee_id: task.assigneeId,
          feedback_message: task.feedback?.message,
          feedback_status: task.feedback?.status
        })
        .eq('id', id);

      if (error) throw error;

      setDirtyTaskIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err: any) {
      console.error('Error saving task:', err);
      setError('Failed to save task changes.');
    }
  };

  const updateTaskAssignee = async (id: string, newAssigneeId: string) => {
    const newAssignee = employees.find(emp => emp.id === newAssigneeId) || { name: 'Unknown' };
    
    // Optimistic UI
    const previousTasks = [...tasks];
    setTasks(prev => prev.map(t => t.id === id ? { ...t, assigneeId: newAssigneeId, assigneeName: newAssignee.name } : t));

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ assignee_id: newAssigneeId })
        .eq('id', id);

      if (error) throw error;
    } catch (err: any) {
      console.error('Error updating assignee:', err);
      setError('Failed to update task assignee.');
      setTasks(previousTasks); // Revert
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (cancelledTaskIds.has(t.id)) return false;
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'my-tasks' ? t.assigneeId === user.id : t.assignerId === user.id;
    return matchesSearch && matchesTab;
  });

  const handleCancelTask = (id: string) => {
    setCancelledTaskIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const toInputDate = (dateStr: string) => {
    if (!dateStr) return '';
    // If it's already YYYY-MM-DD, return it
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'No Deadline';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      const day = date.getDate().toString().padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      
      return `${day}-${month}-${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  const handleDeadlineChange = async (task: Task, newDate: string) => {
    if (activeTab === 'my-tasks') {
      // Direct update for My Tasks as requested
      updateTaskField(task.id, 'deadline', newDate);
    } else {
      // Request approval for Assigned to Others as requested
      try {
        const message = `Requested deadline change to ${formatDate(newDate)}`;
        const { error } = await supabase
          .from('tasks')
          .update({ 
            feedback_message: message,
            feedback_status: 'Pending'
          })
          .eq('id', task.id);

        if (error) throw error;
        
        setTasks(prev => prev.map(t => t.id === task.id ? { 
          ...t, 
          feedback: { message, status: 'Pending' } 
        } : t));
        setDirtyTaskIds(prev => new Set(prev).add(task.id));
      } catch (err) {
        console.error('Error requesting deadline change:', err);
        setError('Failed to request deadline change.');
      }
    }
  };

  const handleFeedbackAction = async (taskId: string, status: 'Approved' | 'Rejected') => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ feedback_status: status })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev => prev.map(t => {
        if (t.id === taskId && t.feedback) {
          return { ...t, feedback: { ...t.feedback, status } };
        }
        return t;
      }));
    } catch (err) {
      console.error('Error updating feedback status:', err);
      setError(`Failed to ${status.toLowerCase()} request.`);
    }
  };

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
              Assigned to Others
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

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Task List */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar pb-32">
          {/* Table Header */}
          <div className="hidden lg:grid grid-cols-[48px_1fr_110px_110px_130px_180px_80px] gap-4 px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
            <div className="flex justify-center">#</div>
            <div>Task Details</div>
            <div className="text-center">Status</div>
            <div className="text-center">Priority</div>
            <div className="text-center">Deadline</div>
            <div>{activeTab === 'my-tasks' ? 'Assigner' : 'Assignee'}</div>
            <div className="text-right pr-2">Actions</div>
          </div>

          {filteredTasks.map((task, index) => (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={task.id} 
              className={cn(
                "bg-white/5 border border-white/10 rounded-2xl lg:rounded-none lg:bg-transparent lg:border-0 lg:border-b lg:border-white/5 p-5 lg:p-0 lg:px-6 lg:py-5 flex flex-col lg:grid lg:grid-cols-[48px_1fr_110px_110px_130px_180px_80px] lg:items-center gap-4 hover:bg-white/[0.03] transition-colors group relative",
                openDropdownId?.startsWith(task.id) ? "z-50" : "z-0"
              )}
            >
              {/* Column 1: Icon/Checkbox */}
              <div className="hidden lg:flex justify-center items-center">
                {task.status === 'Done' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <div className="w-5 h-5 rounded-md border-2 border-slate-700 group-hover:border-slate-500 transition-colors" />
                )}
              </div>

              {/* Column 2: Details */}
              <div className="flex flex-col justify-center min-w-0">
                <div className="flex items-center gap-2 lg:hidden mb-3">
                  <div className="relative">
                    <button
                      onClick={() => setOpenDropdownId(openDropdownId === task.id + '-mobile' ? null : task.id + '-mobile')}
                      className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all active:scale-95", getStatusColor(task.status))}
                    >
                      {task.status}
                    </button>
                    
                    <AnimatePresence>
                      {openDropdownId === task.id + '-mobile' && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setOpenDropdownId(null)} />
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="absolute left-0 top-full mt-2 w-40 bg-[#1A1D24] border border-white/10 rounded-xl shadow-2xl z-50"
                          >
                            <div className="p-1 flex flex-col">
                              {['Todo', 'In Progress', 'Review', 'Done'].map((status) => (
                                <button
                                  key={status}
                                  onClick={() => {
                                    updateTaskStatus(task.id, status as Task['status']);
                                    setOpenDropdownId(null);
                                  }}
                                  className={cn(
                                    "px-3 py-2 text-xs font-bold text-left rounded-lg transition-colors",
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
                  
                  {task.assignerId === user.id ? (
                    <div className="relative">
                      <button
                        onClick={() => setOpenDropdownId(openDropdownId === task.id + '-priority-mobile' ? null : task.id + '-priority-mobile')}
                        className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all active:scale-95", getPriorityColor(task.priority))}
                      >
                        {task.priority}
                      </button>
                      <AnimatePresence>
                        {openDropdownId === task.id + '-priority-mobile' && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setOpenDropdownId(null)} />
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 10 }}
                              className="absolute left-0 top-full mt-2 w-32 bg-[#1A1D24] border border-white/10 rounded-xl shadow-2xl z-50"
                            >
                              <div className="p-1 flex flex-col">
                                {['Low', 'Medium', 'High'].map((p) => (
                                  <button
                                    key={p}
                                    onClick={() => {
                                      updateTaskField(task.id, 'priority', p);
                                      setOpenDropdownId(null);
                                    }}
                                    className={cn(
                                      "px-3 py-2 text-xs font-bold text-left rounded-lg transition-colors",
                                      task.priority === p ? "bg-blue-500/10 text-blue-400" : "text-slate-300 hover:bg-white/5 hover:text-white"
                                    )}
                                  >
                                    {p}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border", getPriorityColor(task.priority))}>
                      {task.priority}
                    </span>
                  )}
                </div>

                {task.assignerId === user.id ? (
                  <div className="flex flex-row items-center gap-4 w-full group/details">
                    <input 
                      type="text"
                      value={task.title}
                      onChange={(e) => updateTaskField(task.id, 'title', e.target.value)}
                      className="bg-transparent text-white font-bold text-sm lg:text-base leading-tight focus:outline-none focus:bg-white/10 rounded px-2 py-1 -ml-2 border-none transition-colors w-1/3 shrink-0"
                      placeholder="Task Title"
                    />
                    <div className="h-4 w-px bg-white/10 hidden lg:block shrink-0" />
                    <textarea 
                      value={task.description}
                      onChange={(e) => updateTaskField(task.id, 'description', e.target.value)}
                      className="bg-transparent text-slate-400 text-xs group-hover/details:text-slate-300 transition-colors focus:outline-none focus:bg-white/10 rounded px-2 py-1 -ml-2 border-none resize-none h-6 overflow-hidden w-full flex-1"
                      placeholder="Add description..."
                    />
                  </div>
                ) : (
                  <div className="flex flex-row items-baseline gap-4 w-full">
                    <h3 className="text-white font-bold text-sm lg:text-base leading-tight group-hover:text-blue-400 transition-colors shrink-0 max-w-[40%] truncate">{task.title}</h3>
                    <p className="text-slate-400 text-xs group-hover:text-slate-300 transition-colors truncate flex-1">{task.description}</p>
                  </div>
                )}
              </div>

              {/* Column 3: Status (Desktop) */}
              <div className="hidden lg:flex justify-center items-center relative">
                <button
                  onClick={() => setOpenDropdownId(openDropdownId === task.id ? null : task.id)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full text-[10px] font-bold border transition-all hover:scale-105 active:scale-95 min-w-[85px]",
                    getStatusColor(task.status)
                  )}
                >
                  {task.status}
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
                        className="absolute right-0 top-full mt-2 w-40 bg-[#1A1D24] border border-white/10 rounded-xl shadow-2xl z-50"
                      >
                        <div className="p-1 flex flex-col">
                          {['Todo', 'In Progress', 'Review', 'Done'].map((status) => (
                            <button
                              key={status}
                              onClick={() => {
                                updateTaskStatus(task.id, status as Task['status']);
                                setOpenDropdownId(null);
                              }}
                              className={cn(
                                "px-3 py-2 text-xs font-bold text-left rounded-lg transition-colors",
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

              {/* Column 4: Priority (Desktop) */}
              <div className="hidden lg:flex justify-center items-center relative">
                {task.assignerId === user.id ? (
                  <>
                    <button
                      onClick={() => setOpenDropdownId(openDropdownId === task.id + '-priority' ? null : task.id + '-priority')}
                      className={cn(
                        "px-3.5 py-1.5 rounded-full text-[10px] font-bold border transition-all hover:scale-105 active:scale-95 min-w-[85px]",
                        getPriorityColor(task.priority)
                      )}
                    >
                      {task.priority}
                    </button>
                    <AnimatePresence>
                      {openDropdownId === task.id + '-priority' && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setOpenDropdownId(null)} />
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="absolute left-0 top-full mt-2 w-32 bg-[#1A1D24] border border-white/10 rounded-xl shadow-2xl z-50"
                          >
                            <div className="p-1 flex flex-col">
                              {['Low', 'Medium', 'High'].map((p) => (
                                <button
                                  key={p}
                                  onClick={() => {
                                    updateTaskField(task.id, 'priority', p);
                                    setOpenDropdownId(null);
                                  }}
                                  className={cn(
                                    "px-3 py-2 text-xs font-bold text-left rounded-lg transition-colors",
                                    task.priority === p ? "bg-blue-500/10 text-blue-400" : "text-slate-300 hover:bg-white/5 hover:text-white"
                                  )}
                                >
                                  {p}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <span className={cn("px-3.5 py-1.5 rounded-full text-[10px] font-bold border inline-block text-center min-w-[85px]", getPriorityColor(task.priority))}>
                    {task.priority}
                  </span>
                )}
              </div>

              {/* Column 5: Deadline */}
              <div className="flex items-center justify-center text-slate-400 text-xs">
                <div className="relative flex justify-center items-center group/date w-full h-10">
                  <span className={cn(
                    "font-bold text-center transition-colors px-3 py-1.5 rounded-lg group-hover/date:bg-white/10 z-10 whitespace-nowrap flex items-center gap-1.5 pointer-events-none",
                    new Date(task.deadline) < new Date() && task.status !== 'Done' ? "text-rose-400" : "lg:text-slate-300"
                  )}>
                    {formatDate(task.deadline)}
                    {task.feedback?.status === 'Pending' && task.feedback.message.includes('deadline') && (
                      <Clock className="w-3 h-3 text-amber-400 animate-pulse" />
                    )}
                  </span>
                  <input 
                    type="date"
                    value={toInputDate(task.deadline)}
                    onChange={(e) => handleDeadlineChange(task, e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                  />
                </div>
              </div>

              {/* Column 6: Assignee/Assigner */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-[11px] font-black text-white shadow-lg shrink-0">
                  {(activeTab === 'my-tasks' ? task.assignerName : task.assigneeName).charAt(0)}
                </div>
                <div className="flex flex-col min-w-0">
                  {activeTab === 'assigned' ? (
                    <select
                      value={task.assigneeId}
                      onChange={(e) => updateTaskAssignee(task.id, e.target.value)}
                      className="bg-transparent text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer focus:outline-none [color-scheme:dark] border border-white/10 rounded px-2 py-1 max-w-[140px] truncate"
                    >
                      <option value={user.id} className="bg-[#1A1D24]">Me</option>
                      {employees.filter(e => e.id !== user.id).map(emp => (
                        <option key={emp.id} value={emp.id} className="bg-[#1A1D24]">{emp.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs font-bold text-white truncate">
                      {task.assignerName}
                    </span>
                  )}
                </div>
              </div>

              {/* Column 7: Actions */}
              <div className="flex items-center justify-end gap-3 pr-2">
                <button 
                  onClick={() => saveTask(task.id)}
                  disabled={!dirtyTaskIds.has(task.id)}
                  className={cn(
                    "p-2 rounded-xl transition-all hover:scale-110 active:scale-90",
                    dirtyTaskIds.has(task.id) 
                      ? "bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]" 
                      : "bg-white/5 text-slate-500 opacity-50 cursor-not-allowed"
                  )}
                  title={dirtyTaskIds.has(task.id) ? "Save Changes" : "No changes to save"}
                >
                  <CheckSquare className="w-4 h-4" />
                </button>

                {task.assignerId !== user.id && (
                  <button 
                    onClick={() => setSelectedTask(task)}
                    className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-xl transition-all hover:scale-110 active:scale-90"
                    title="Send Feedback / Request Extension"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                )}
                
                <button 
                  onClick={() => handleCancelTask(task.id)}
                  className="p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all hover:scale-110 active:scale-90"
                  title="Cancel Task (UI only)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Feedback Status (Mobile/Desktop Overlay) */}
              {task.feedback && (
                <div className={cn(
                  "lg:absolute lg:left-[40px] lg:right-[40px] lg:bottom-0 lg:translate-y-1/2 mt-2 lg:mt-0 p-3 rounded-xl text-[10px] border z-10 shadow-xl backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                  task.feedback.status === 'Pending' ? "bg-amber-500/10 border-amber-500/20 text-amber-200/70" :
                  task.feedback.status === 'Approved' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-200/70" :
                  "bg-rose-500/10 border-rose-500/20 text-rose-200/70"
                )}>
                  <div className="flex items-center gap-1.5 font-bold">
                    {task.feedback.status === 'Pending' && <Clock className="w-3 h-3 text-amber-400" />}
                    {task.feedback.status === 'Approved' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                    {task.feedback.status === 'Rejected' && <X className="w-3 h-3 text-rose-400" />}
                    <span className="uppercase tracking-wider opacity-60 mr-1">Request:</span>
                    <span className="font-normal italic">"{task.feedback.message}"</span>
                  </div>

                  {task.feedback.status === 'Pending' && (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleFeedbackAction(task.id, 'Approved')}
                        className="px-3 py-1 bg-emerald-500 text-white rounded-lg font-black uppercase tracking-tighter hover:bg-emerald-600 transition-colors"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => handleFeedbackAction(task.id, 'Rejected')}
                        className="px-3 py-1 bg-rose-500 text-white rounded-lg font-black uppercase tracking-tighter hover:bg-rose-600 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
          {filteredTasks.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              No data available.
            </div>
          )}
        </div>
      )}

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
                  <CheckSquare className="w-5 h-5 text-blue-400" /> Create Task
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
                    {employees.filter(e => e.id !== user.id).map(emp => (
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
