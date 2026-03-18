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
  Loader2,
  ChevronDown,
  Flag,
  Pencil,
  ArrowRight
} from 'lucide-react';
import { cn, formatDate as formatUtil } from '../lib/utils';
import { User } from '../types';
import { supabase } from '../lib/supabaseClient';
import { DatePicker } from './DatePicker';

export interface Task {
  id: string;
  title: string;
  description: string;
  assigneeId: string;
  assigneeName: string;
  assigneeAvatar?: string;
  assignees?: { id: string; name: string; avatar?: string }[];
  assignerId: string;
  assignerName: string;
  assignerAvatar?: string;
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

export interface Activity {
  id: string;
  task_id: string;
  user_id: string;
  user_name?: string;
  user_avatar?: string;
  content: string;
  type: 'update' | 'feedback' | 'system';
  created_at: string;
}

interface TasksProps {
  user: User;
}

export function Tasks({ user }: TasksProps) {
  console.log('Tasks component rendering');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<{id: string, name: string, avatar?: string, role: string}[]>([]);
  const [activities, setActivities] = useState<Record<string, Activity[]>>({});
  const [newActivityContent, setNewActivityContent] = useState('');
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [requestedDeadline, setRequestedDeadline] = useState('');

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [cancelledTaskIds, setCancelledTaskIds] = useState<Set<string>>(new Set());
  const [dirtyTaskIds, setDirtyTaskIds] = useState<Set<string>>(new Set());
  const [savingTaskIds, setSavingTaskIds] = useState<Set<string>>(new Set());
  const [originalTasks, setOriginalTasks] = useState<Record<string, Task>>({});
  const [editingDeadlineTaskId, setEditingDeadlineTaskId] = useState<string | null>(null);
  const [editingTaskIds, setEditingTaskIds] = useState<Set<string>>(new Set());
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigneeId: user.id,
    priority: 'Medium' as Task['priority'],
    deadline: ''
  });

  useEffect(() => {
    if (user?.id) {
      fetchEmployees();
      fetchTasks();
    }
  }, [user?.id, user?.role, user?.position]);

  useEffect(() => {
    if (expandedTaskId) {
      fetchActivities(expandedTaskId);
    }
  }, [expandedTaskId]);

  const fetchActivities = async (taskId: string) => {
    setIsLoadingActivities(true);
    try {
      const { data, error } = await supabase
        .from('task_activities')
        .select('*, profiles(full_name, avatar_url)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching activities:', error);
        return;
      }

      const formattedActivities: Activity[] = data.map((item: any) => ({
        id: item.id,
        task_id: item.task_id,
        user_id: item.user_id,
        user_name: item.profiles?.full_name || 'Unknown',
        user_avatar: item.profiles?.avatar_url,
        content: item.content,
        type: item.type,
        created_at: item.created_at
      }));

      setActivities(prev => ({
        ...prev,
        [taskId]: formattedActivities
      }));
    } catch (err) {
      console.error('Failed to fetch activities:', err);
    } finally {
      setIsLoadingActivities(false);
    }
  };

  const handlePostActivity = async (taskId: string) => {
    if (!newActivityContent.trim()) return;

    const optimisticActivity: Activity = {
      id: crypto.randomUUID(),
      task_id: taskId,
      user_id: user.id,
      user_name: user.name,
      content: newActivityContent,
      type: 'update',
      created_at: new Date().toISOString()
    };

    setActivities(prev => ({
      ...prev,
      [taskId]: [...(prev[taskId] || []), optimisticActivity]
    }));
    setNewActivityContent('');

    try {
      const { error } = await supabase
        .from('task_activities')
        .insert({
          task_id: taskId,
          user_id: user.id,
          content: optimisticActivity.content,
          type: 'update'
        });

      if (error) throw error;
      fetchActivities(taskId);
    } catch (err) {
      console.error('Error posting activity:', err);
      alert('Failed to save activity. Please check your connection or database setup.');
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to mark this task as complete?')) return;

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'Done' } : t));
    setOriginalTasks(prev => {
      const task = prev[taskId];
      return task ? { ...prev, [taskId]: { ...task, status: 'Done' } } : prev;
    });
    
    try {
      // Update DB
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'Done' })
        .eq('id', taskId);

      if (error) throw error;

      // Log activity
      await supabase.from('task_activities').insert({
        task_id: taskId,
        user_id: user.id,
        content: 'Marked task as Complete',
        type: 'system'
      });
      
      if (expandedTaskId === taskId) fetchActivities(taskId);

    } catch (err) {
      console.error('Error completing task:', err);
      alert('Failed to complete task');
      // Revert optimistic update
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'In Progress' } : t));
    }
  };

  const fetchEmployees = async () => {
    // Only fetch if we haven't already
    if (employees.length > 0) return;

    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, job_positions(roles(role_name))');
      
      if (profilesError) throw profilesError;
      
      const loadedEmployees = (profilesData || []).map((p: any) => ({
        id: p.id,
        name: p.full_name || 'Unknown',
        avatar: p.avatar_url,
        role: p.job_positions?.roles?.role_name || 'staff'
      }));
      setEmployees(loadedEmployees);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const fetchTasks = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      // Step 1: Get task IDs where user is a multi-assignee
      const { data: assignedIdsData, error: assignedIdsError } = await supabase
        .from('task_assignees')
        .select('task_id')
        .eq('user_id', user.id);
      
      if (assignedIdsError) {
        console.error('Error fetching assigned task IDs:', assignedIdsError);
      }
      
      const extraTaskIds = assignedIdsData?.map((x: any) => x.task_id) || [];

      // Fetch tasks where user is assignee, assigner, or in multi-assignees
      let query = supabase
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
          created_at,
          feedback_message,
          feedback_status,
          assignee:assignee_id(full_name, avatar_url),
          assigner:assigner_id(full_name, avatar_url),
          task_assignees(user_id, profiles(full_name, avatar_url))
        `)
        .order('created_at', { ascending: false });

      // CEO, Manager, and Accountant can see all tasks
      const userRole = user.role?.toLowerCase() || '';
      const userPosition = user.position?.toLowerCase() || '';
      const isPrivileged = ['ceo', 'manager', 'accountant'].includes(userRole) || 
                           ['ceo', 'manager', 'accountant', 'kế toán'].includes(userPosition);

      if (!isPrivileged) {
        if (extraTaskIds.length > 0) {
          query = query.or(`assignee_id.eq.${user.id},assigner_id.eq.${user.id},id.in.(${extraTaskIds.join(',')})`);
        } else {
          query = query.or(`assignee_id.eq.${user.id},assigner_id.eq.${user.id}`);
        }
      }

      const { data: tasksData, error: tasksError } = await query;

      if (tasksError) throw tasksError;

      const formattedTasks: Task[] = (tasksData || []).map((t: any) => {
        // Map task_assignees to a clean array
        const assigneesMap = new Map();
        
        // Add primary assignee
        if (t.assignee_id) {
          assigneesMap.set(t.assignee_id, {
            id: t.assignee_id,
            name: t.assignee?.full_name || 'Unknown',
            avatar: t.assignee?.avatar_url
          });
        }
        
        // Add multi-assignees
        t.task_assignees?.forEach((ta: any) => {
          const profile = ta.profiles;
          if (profile && !assigneesMap.has(ta.user_id)) {
            assigneesMap.set(ta.user_id, {
              id: ta.user_id,
              name: profile.full_name || 'Unknown',
              avatar: profile.avatar_url
            });
          }
        });
        
        const assignees = Array.from(assigneesMap.values());

        return {
          id: t.id,
          title: t.title,
          description: t.description || '',
          assigneeId: t.assignee_id || '',
          assigneeName: t.assignee?.full_name || 'Unassigned',
          assigneeAvatar: t.assignee?.avatar_url,
          assignees: assignees,
          assignerId: t.assigner_id,
          assignerName: t.assigner?.full_name || 'Unknown',
          assignerAvatar: t.assigner?.avatar_url,
          status: t.status as Task['status'],
          priority: t.priority as Task['priority'],
          deadline: t.deadline,
          createdAt: t.created_at || new Date().toISOString(),
          feedback: t.feedback_message ? {
            message: t.feedback_message,
            status: t.feedback_status || 'Pending'
          } : undefined
        };
      });

      setTasks(formattedTasks);
      setOriginalTasks(formattedTasks.reduce((acc, task) => ({ ...acc, [task.id]: task }), {}));
    } catch (err: any) {
      console.error('Error fetching tasks:', err);
      setError(`Failed to load tasks: ${err.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchData = async () => {
     // Deprecated: Use fetchEmployees and fetchTasks directly
     await Promise.all([fetchEmployees(), fetchTasks()]);
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
    setOriginalTasks(prev => ({ ...prev, [tempId]: optimisticTask }));
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
      setOriginalTasks(prev => ({ ...prev, [data.id]: { ...optimisticTask, id: data.id } }));
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

  const updateTaskStatus = async (id: string, newStatus: Task['status']) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    setOriginalTasks(prev => {
      const task = prev[id];
      return task ? { ...prev, [id]: { ...task, status: newStatus } } : prev;
    });
    
    // Log activity
    try {
      await supabase.from('tasks').update({ status: newStatus }).eq('id', id);
      await supabase.from('task_activities').insert({
        task_id: id,
        user_id: user.id,
        content: `Changed status to ${newStatus}`,
        type: 'system'
      });
      if (expandedTaskId === id) fetchActivities(id);
    } catch (err) {
      console.error('Error logging status change:', err);
    }
  };

  const updateTaskField = (id: string, field: keyof Task, value: any) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
    setDirtyTaskIds(prev => new Set(prev).add(id));
  };

  const hasTaskChanged = (task: Task) => {
    const original = originalTasks[task.id];
    if (!original) return false;
    
    const normalize = (val: any) => (val === null || val === undefined) ? '' : String(val).trim();

    return (
      normalize(task.title) !== normalize(original.title) ||
      normalize(task.description) !== normalize(original.description) ||
      normalize(task.priority) !== normalize(original.priority) ||
      normalize(task.deadline) !== normalize(original.deadline)
    );
  };

  const saveTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    setSavingTaskIds(prev => new Set(prev).add(id));

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
          feedback_message: task.feedback?.message || null,
          feedback_status: task.feedback?.status || null
        })
        .eq('id', id);

      if (error) throw error;

      // Log activity
      await supabase.from('task_activities').insert({
        task_id: id,
        user_id: user.id,
        content: 'Updated task details',
        type: 'system'
      });
      if (expandedTaskId === id) fetchActivities(id);

      setOriginalTasks(prev => ({ ...prev, [id]: task }));
      setDirtyTaskIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setEditingTaskIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err: any) {
      console.error('Error saving task:', err);
      setError('Failed to save task changes. Please try again.');
    } finally {
      setSavingTaskIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState<number | null>(null);
  const [mentionCursorPos, setMentionCursorPos] = useState<{ top: number; left: number } | null>(null);

  const handleActivityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const selectionStart = e.target.selectionStart || 0;
    setNewActivityContent(value);

    // Check for @ mention
    const lastAtPos = value.lastIndexOf('@', selectionStart - 1);
    if (lastAtPos !== -1) {
      const query = value.substring(lastAtPos + 1, selectionStart);
      // Simple check: no spaces allowed in query for now to keep it simple, or allow spaces if needed
      if (!query.includes(' ')) { 
        setMentionQuery(query);
        setMentionIndex(lastAtPos);
        // Calculate cursor position for dropdown (simplified)
        // In a real textarea/input, this is harder. We'll just position it relative to the input for now.
        return;
      }
    }
    setMentionQuery(null);
    setMentionIndex(null);
  };

  const handleMentionSelect = async (employee: { id: string; name: string }, taskId: string) => {
    if (mentionIndex === null || mentionQuery === null) return;

    const before = newActivityContent.substring(0, mentionIndex);
    const after = newActivityContent.substring(mentionIndex + mentionQuery!.length + 1);
    const newValue = `${before}@${employee.name} ${after}`;
    
    setNewActivityContent(newValue);
    setMentionQuery(null);
    setMentionIndex(null);

    // Auto-assign if not already assigned
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const isAssigned = task.assignees?.some(a => a.id === employee.id) || task.assigneeId === employee.id;
      if (!isAssigned) {
        await toggleTaskAssignee(taskId, employee.id);
      }
    }
  };

  const handleEditActivity = async (activityId: string, newContent: string, taskId: string) => {
    try {
      const { error } = await supabase
        .from('task_activities')
        .update({ content: newContent })
        .eq('id', activityId);

      if (error) throw error;

      // Log the edit action
      await supabase.from('task_activities').insert({
        task_id: taskId,
        user_id: user.id,
        content: 'Edited an update',
        type: 'system'
      });

      fetchActivities(taskId);
    } catch (err) {
      console.error('Error editing activity:', err);
      alert('Failed to edit activity');
    }
  };

  const handleDeleteActivity = async (activityId: string, taskId: string) => {
    if (!confirm('Are you sure you want to delete this update?')) return;

    try {
      const { error } = await supabase
        .from('task_activities')
        .delete()
        .eq('id', activityId);

      if (error) throw error;

      // Log the delete action
      await supabase.from('task_activities').insert({
        task_id: taskId,
        user_id: user.id,
        content: 'Deleted an update',
        type: 'system'
      });

      fetchActivities(taskId);
    } catch (err) {
      console.error('Error deleting activity:', err);
      alert('Failed to delete activity');
    }
  };

  const toggleTaskAssignee = async (taskId: string, userId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const currentAssignees = task.assignees || [];
    const isAssigned = currentAssignees.some(a => a.id === userId);

    // Prevent removing self if not the task creator
    if (isAssigned && userId === user.id && task.assignerId !== user.id) {
      alert("You cannot remove yourself from a task you did not create.");
      return;
    }

    const newAssignees = isAssigned 
      ? currentAssignees.filter(a => a.id !== userId)
      : [...currentAssignees, { id: userId, name: employees.find(e => e.id === userId)?.name || 'Unknown' }];

    // Optimistic Update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assignees: newAssignees } : t));

    try {
      if (isAssigned) {
        // Remove assignee
        // 1. Remove from task_assignees
        const { error: deleteError } = await supabase
          .from('task_assignees')
          .delete()
          .eq('task_id', taskId)
          .eq('user_id', userId);
        
        if (deleteError) throw deleteError;

        // 2. If they are the primary assignee (legacy), clear it
        if (task.assigneeId === userId) {
          await supabase.from('tasks').update({ assignee_id: null }).eq('id', taskId);
        }

        // Log activity
        await supabase.from('task_activities').insert({
          task_id: taskId,
          user_id: user.id,
          content: `Removed assignee: ${employees.find(e => e.id === userId)?.name}`,
          type: 'system'
        });

      } else {
        // Add assignee
        const { error } = await supabase
          .from('task_assignees')
          .insert({ task_id: taskId, user_id: userId });

        if (error) throw error;

        // Log activity
        await supabase.from('task_activities').insert({
          task_id: taskId,
          user_id: user.id,
          content: `Added assignee: ${employees.find(e => e.id === userId)?.name}`,
          type: 'system'
        });
      }
      
      if (expandedTaskId === taskId) fetchActivities(taskId);

    } catch (err) {
      console.error('Error toggling assignee:', err);
      // Revert
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, assignees: currentAssignees } : t));
      alert('Failed to update assignees');
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
    return matchesSearch;
  });

  const activeTasks = filteredTasks.filter(t => t.status !== 'Done');
  const completedTasks = filteredTasks.filter(t => t.status === 'Done');

  const handleDeleteTask = async (taskId: string) => {
    console.log('handleDeleteTask called for:', taskId);
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      // Remove from state
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setOriginalTasks(prev => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
      
      // Also remove from cancelledTaskIds if it was there
      setCancelledTaskIds(prev => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });

    } catch (err) {
      console.error('Error deleting task:', err);
      alert('Failed to delete task.');
    }
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
    return formatUtil(dateStr);
  };

  const handleDeadlineChange = async (task: Task, newDate: string) => {
    if (task.assigneeId === user.id || task.assignees?.some(a => a.id === user.id)) {
      // Direct update for My Tasks
      updateTaskField(task.id, 'deadline', newDate);
    } else {
      // Request approval for Assigned to Others
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
        <div className="flex flex-col gap-2 overflow-y-auto overflow-x-auto custom-scrollbar pb-32">
          {/* Table Header */}
          <div className="hidden lg:grid grid-cols-[80px_minmax(300px,1fr)_110px_110px_130px_220px_150px] gap-4 px-0 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 min-w-[1200px] sticky top-0 z-[60] bg-[#020617]">
            <div className="text-center sticky left-0 z-10 bg-[#020617]">Type</div>
            <div className="sticky left-[96px] z-10 bg-[#020617]">Task Details</div>
            <div className="text-center">Status</div>
            <div className="text-center">Priority</div>
            <div className="text-center">Deadline</div>
            <div className="pl-10">People</div>
            <div className="text-right pr-4">Actions</div>
          </div>

          {activeTasks.map((task, index) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              key={task.id} 
              onClick={() => {
                if (!editingTaskIds.has(task.id)) {
                  setExpandedTaskId(prev => prev === task.id ? null : task.id);
                }
              }}
              className={cn(
                "grid grid-cols-1 lg:grid-cols-[80px_minmax(300px,1fr)_110px_110px_130px_220px_150px] items-start lg:items-center gap-3 lg:gap-4 p-4 lg:p-0 lg:px-0 lg:py-5 border-b border-white/5 transition-all duration-200 group relative bg-[#020617] lg:hover:shadow-lg lg:hover:scale-[1.002] cursor-pointer w-full lg:min-w-[1200px]",
                expandedTaskId === task.id ? "" : "hover:bg-[#0f172a]",
                openDropdownId?.startsWith(task.id) ? "z-50" : "z-0",
                // Feedback Highlight Border
                task.feedback?.status === 'Pending' ? "border-l-2 border-l-amber-500/50" :
                task.feedback?.status === 'Approved' ? "border-l-2 border-l-emerald-500/50" :
                task.feedback?.status === 'Rejected' ? "border-l-2 border-l-rose-500/50" : ""
              )}
            >
              {/* Column 1: Type Badge */}
              <div className={cn(
                "hidden lg:flex justify-center items-center col-span-1 sticky left-0 z-20 bg-[#020617] h-full transition-colors",
                expandedTaskId === task.id ? "" : "group-hover:bg-[#0f172a]"
              )}>
                {task.assignerId === user.id && (task.assigneeId === user.id || task.assignees?.some(a => a.id === user.id)) ? (
                  <span className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-wider">
                    Personal
                  </span>
                ) : (task.assigneeId === user.id || task.assignees?.some(a => a.id === user.id)) ? (
                  <span className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-wider">
                    MY TASK
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[9px] font-black uppercase tracking-wider">
                    ASSIGNED TASK
                  </span>
                )}
              </div>

              {/* Main Row Content */}
              <div 
                className="p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center cursor-pointer"
                onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
              >
                {/* Mobile: Top Row with Status & Priority */}
                <div className="lg:hidden flex items-center justify-between w-full mb-2">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(openDropdownId === task.id ? null : task.id);
                        }}
                        className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all", getStatusColor(task.status))}
                      >
                        {task.status}
                      </button>
                      <AnimatePresence>
                        {openDropdownId === task.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); }} />
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute left-0 top-full mt-2 w-40 bg-[#1A1D24] border border-white/10 rounded-xl shadow-2xl z-50"
                            >
                              <div className="p-1 flex flex-col">
                                {['Todo', 'In Progress', 'Review', 'Done'].map((status) => (
                                  <button
                                    key={status}
                                    onClick={(e) => {
                                      e.stopPropagation();
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

                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(openDropdownId === `${task.id}-priority` ? null : `${task.id}-priority`);
                        }}
                        className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all", getPriorityColor(task.priority))}
                      >
                        {task.priority}
                      </button>
                      <AnimatePresence>
                        {openDropdownId === `${task.id}-priority` && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); }} />
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute left-0 top-full mt-2 w-32 bg-[#1A1D24] border border-white/10 rounded-xl shadow-2xl z-50"
                            >
                              <div className="p-1 flex flex-col">
                                {['Low', 'Medium', 'High'].map((p) => (
                                  <button
                                    key={p}
                                    onClick={(e) => {
                                      e.stopPropagation();
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
                  </div>
                </div>

                {/* Column 1: Checkbox & Title */}
                <div className="lg:col-span-12 flex items-start gap-4 w-full">
                  
                  {/* Column 2: Details */}
                  <div className={cn(
                    "flex-1 min-w-0 flex flex-col gap-1 lg:col-span-1 w-full overflow-hidden sticky left-[96px] z-20 transition-colors cursor-pointer",
                    expandedTaskId === task.id ? "" : ""
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedTaskId(expandedTaskId === task.id ? null : task.id);
                  }}
                  >
                    {task.assignerId === user.id && editingTaskIds.has(task.id) ? (
                      <div 
                        className="flex flex-col gap-1.5 w-full group/details"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input 
                          type="text"
                          value={task.title || ''}
                          onChange={(e) => updateTaskField(task.id, 'title', e.target.value)}
                          className="bg-transparent text-white font-bold text-lg lg:text-xl leading-tight focus:outline-none focus:bg-white/10 rounded px-2 py-1 -ml-2 border-none transition-colors w-full"
                          placeholder="Task Title"
                          autoFocus
                        />
                        <textarea 
                          value={task.description || ''}
                          onChange={(e) => updateTaskField(task.id, 'description', e.target.value)}
                          className="bg-transparent text-slate-400 text-base group-hover/details:text-slate-300 transition-colors focus:outline-none focus:bg-white/10 rounded px-2 py-1 -ml-2 border-none resize-none h-auto min-h-[1.5rem] overflow-hidden w-full"
                          placeholder="Add description..."
                          rows={3}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 w-full pointer-events-none">
                        <h3 className={cn("text-white font-bold text-lg lg:text-xl leading-tight group-hover:text-blue-400 transition-colors break-words pointer-events-auto", task.status === 'Done' && "line-through opacity-50")}>{task.title}</h3>
                        <p 
                          className={cn(
                            "text-slate-400 text-base group-hover:text-slate-300 transition-colors break-words pointer-events-auto", 
                            expandedTaskId === task.id ? "" : "line-clamp-2 lg:line-clamp-1 max-h-[3em] lg:max-h-[1.5em] overflow-hidden"
                          )}
                        >
                          {(task.description || '').split(/(https?:\/\/[^\s]+)/g).map((part, i) => 
                            part.match(/https?:\/\/[^\s]+/) ? (
                              <a 
                                key={i} 
                                href={part} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-400 hover:underline relative z-10 hover:text-blue-300 font-bold pointer-events-auto"
                                onClick={(e) => e.stopPropagation()}
                              >
                                LINK
                              </a>
                            ) : part
                          )}
                        </p>
                        
                        {/* Feedback Status (Moved here) */}
                        {task.feedback && (
                          <div className={cn(
                            "flex items-center gap-2 text-[10px] font-medium mt-1 animate-in fade-in slide-in-from-top-1",
                            task.feedback.status === 'Pending' ? "text-amber-400" :
                            task.feedback.status === 'Approved' ? "text-emerald-400" :
                            "text-rose-400"
                          )}>
                            {task.feedback.status === 'Pending' && <Clock className="w-3 h-3 shrink-0" />}
                            {task.feedback.status === 'Approved' && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                            {task.feedback.status === 'Rejected' && <X className="w-3 h-3 shrink-0" />}
                            
                            <span className="uppercase tracking-wider opacity-90">
                              {task.feedback.status === 'Pending' ? 'Request:' : `Request ${task.feedback.status}:`}
                              <span className="ml-1 normal-case opacity-70 truncate max-w-[200px] inline-block align-bottom">
                                {typeof task.feedback === 'string' ? task.feedback : task.feedback.message}
                              </span>
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile: Bottom Metadata Row */}
                <div className="lg:hidden flex flex-wrap items-center justify-between w-full mt-2 pt-3 border-t border-white/5">
                   <div className="flex items-center gap-4">
                      {/* Deadline */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Clock className={cn("w-3.5 h-3.5", new Date(task.deadline) < new Date() && task.status !== 'Done' ? "text-rose-400" : "text-slate-500")} />
                        <span className={cn(new Date(task.deadline) < new Date() && task.status !== 'Done' ? "text-rose-400 font-bold" : "")}>
                          {formatDate(task.deadline)}
                        </span>
                      </div>
                      
                      {/* Assignee */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                         {task.assigneeAvatar ? (
                           <img 
                             src={task.assigneeAvatar} 
                             alt={task.assigneeName}
                             className="w-5 h-5 rounded-full object-cover border border-white/10"
                             referrerPolicy="no-referrer"
                           />
                         ) : (
                           <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[9px] text-white font-bold">
                              {task.assigneeName.charAt(0)}
                           </div>
                         )}
                         <span>{task.assigneeId === user.id ? 'Me' : task.assigneeName}</span>
                      </div>
                   </div>
                   
                   {/* Expand Icon */}
                   <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform duration-300", expandedTaskId === task.id ? "rotate-180" : "")} />
                </div>
              </div>

              {/* Column 3: Status */}
              <div className="hidden lg:flex justify-center items-center relative col-span-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenDropdownId(openDropdownId === task.id ? null : task.id);
                    }}
                    className={cn(
                      "px-4 py-2 rounded-full text-xs font-bold border transition-all hover:scale-105 active:scale-95 w-full lg:w-auto min-w-[100px] text-center",
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdownId(null);
                          }}
                        />
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full mt-2 w-40 bg-[#1A1D24] border border-white/10 rounded-xl shadow-2xl z-50"
                        >
                          <div className="p-1 flex flex-col">
                            {['Todo', 'In Progress', 'Review', 'Done'].map((status) => (
                              <button
                                key={status}
                                onClick={(e) => {
                                  e.stopPropagation();
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

                {/* Column 4: Priority */}
                <div className="hidden lg:flex justify-center items-center relative col-span-1" onClick={(e) => e.stopPropagation()}>
                  {task.assignerId === user.id ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownId(openDropdownId === task.id + '-priority' ? null : task.id + '-priority');
                        }}
                        className={cn(
                          "px-4 py-2 rounded-full text-xs font-bold border transition-all hover:scale-105 active:scale-95 w-full lg:w-auto min-w-[100px] text-center",
                          getPriorityColor(task.priority)
                        )}
                      >
                        {task.priority}
                      </button>
                      <AnimatePresence>
                        {openDropdownId === task.id + '-priority' && (
                          <>
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownId(null);
                              }} 
                            />
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              onClick={(e) => e.stopPropagation()}
                              className="absolute left-0 top-full mt-2 w-32 bg-[#1A1D24] border border-white/10 rounded-xl shadow-2xl z-50"
                            >
                              <div className="p-1 flex flex-col">
                                {['Low', 'Medium', 'High'].map((p) => (
                                  <button
                                    key={p}
                                    onClick={(e) => {
                                      e.stopPropagation();
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
                    <span className={cn("px-4 py-2 rounded-full text-xs font-bold border inline-block text-center w-full lg:w-auto min-w-[100px]", getPriorityColor(task.priority))}>
                      {task.priority}
                    </span>
                  )}
                </div>

                {/* Column 5: Deadline */}
                <div className="hidden lg:flex items-center justify-center text-slate-400 text-sm col-span-1" onClick={(e) => e.stopPropagation()}>
                  <div className="relative flex justify-center items-center group/date w-full h-10">
                    {editingDeadlineTaskId === task.id ? (
                      <div onClick={(e) => e.stopPropagation()} className="z-50">
                        <DatePicker 
                          value={toInputDate(task.deadline)}
                          onChange={(date) => {
                            handleDeadlineChange(task, date);
                            setEditingDeadlineTaskId(null);
                          }}
                          autoFocus
                          onBlur={() => setEditingDeadlineTaskId(null)}
                          inputClassName="bg-slate-900 text-white font-bold text-sm px-3 py-1.5 rounded-lg border-2 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] outline-none min-w-[180px] text-center h-10"
                          className="min-w-[180px]"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingDeadlineTaskId(task.id);
                        }}
                        className={cn(
                          "font-bold text-center transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10 z-10 whitespace-nowrap flex items-center gap-1.5 cursor-pointer",
                          new Date(task.deadline) < new Date() && task.status !== 'Done' ? "text-rose-400" : "lg:text-slate-300"
                        )}
                      >
                        {formatDate(task.deadline)}
                        {task.feedback?.status === 'Pending' && task.feedback.message.includes('deadline') && (
                          <Clock className="w-3 h-3 text-amber-400 animate-pulse" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Column 6: Assignee/Assigner */}
                <div className="hidden lg:flex items-center justify-start gap-3 min-w-0 col-span-1 pl-10" onClick={(e) => e.stopPropagation()}>
                  <div className="flex -space-x-3 overflow-hidden">
                    {(task.assignees || [{ id: task.assigneeId, name: task.assigneeName, avatar: task.assigneeAvatar }]).map((assignee, idx) => (
                      <div 
                        key={assignee.id}
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white shadow-lg shrink-0 border-2 border-[#0F1115] overflow-hidden",
                          !assignee.avatar && (
                            idx === 0 ? "bg-gradient-to-br from-blue-500 to-indigo-600 z-30" : 
                            idx === 1 ? "bg-gradient-to-br from-purple-500 to-pink-600 z-20" : 
                            "bg-slate-700 z-10"
                          )
                        )}
                        style={{ zIndex: 30 - idx }}
                        title={assignee.name}
                      >
                        {assignee.avatar ? (
                          <img 
                            src={assignee.avatar} 
                            alt={assignee.name}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          assignee.name.charAt(0)
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col min-w-0 justify-center">
                    {task.assignerId === user.id || (task.assignees && task.assignees.some(a => a.id === user.id)) ? (
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setOpenDropdownId(openDropdownId === `${task.id}-assignee` ? null : `${task.id}-assignee`);
                          }}
                          className="flex items-center gap-1.5 text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors group/assignee"
                        >
                          <span className="truncate max-w-[140px]">
                            {(task.assignees && task.assignees.length > 0) 
                              ? `${task.assignees.length} Assigned` 
                              : (task.assigneeId === user.id ? 'Me' : employees.find(e => e.id === task.assigneeId)?.name || 'Unknown')}
                          </span>
                          <ChevronDown className="w-4 h-4 opacity-50 group-hover/assignee:opacity-100 transition-opacity" />
                        </button>

                        <AnimatePresence>
                          {openDropdownId === `${task.id}-assignee` && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setOpenDropdownId(null)} />
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 5 }}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-full mt-2 w-64 bg-[#0F1115]/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] z-50 overflow-hidden ring-1 ring-white/5"
                              >
                                <div className="p-2 border-b border-white/5 mb-1">
                                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider px-2">Assign To (Multi-select)</p>
                                </div>
                                <div className="max-h-60 overflow-y-auto custom-scrollbar p-1 space-y-0.5">
                                  {/* Current User */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleTaskAssignee(task.id, user.id);
                                    }}
                                    className={cn(
                                      "w-full text-left px-2 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-3 group/item",
                                      task.assignees?.some(a => a.id === user.id)
                                        ? "bg-blue-500/20 text-blue-400" 
                                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                                    )}
                                  >
                                    <div className={cn(
                                      "w-8 h-8 rounded-full flex items-center justify-center text-xs shadow-sm transition-transform group-hover/item:scale-110 overflow-hidden",
                                      task.assignees?.some(a => a.id === user.id) ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-300"
                                    )}>
                                      {user.avatar ? (
                                        <img src={user.avatar} alt="Me" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      ) : (
                                        user.name?.charAt(0) || 'M'
                                      )}
                                    </div>
                                    <span>Me</span>
                                    {task.assignees?.some(a => a.id === user.id) && <CheckCircle2 className="w-4 h-4 ml-auto" />}
                                  </button>
                                  
                                  {/* Other Employees */}
                                  {employees.filter(e => e.id !== user.id).map(emp => (
                                    <button
                                      key={emp.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleTaskAssignee(task.id, emp.id);
                                      }}
                                      className={cn(
                                        "w-full text-left px-2 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-3 group/item",
                                        task.assignees?.some(a => a.id === emp.id)
                                          ? "bg-blue-500/20 text-blue-400" 
                                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                                      )}
                                    >
                                      <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-xs shadow-sm transition-transform group-hover/item:scale-110 overflow-hidden",
                                        task.assignees?.some(a => a.id === emp.id) ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-300"
                                      )}>
                                        {emp.avatar ? (
                                          <img src={emp.avatar} alt={emp.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        ) : (
                                          emp.name.charAt(0)
                                        )}
                                      </div>
                                      <span className="truncate">{emp.name}</span>
                                      {task.assignees?.some(a => a.id === emp.id) && <CheckCircle2 className="w-4 h-4 ml-auto" />}
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <span className="text-sm font-bold text-white truncate">
                        {task.assignerName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Column 7: Actions */}
                <div className="flex items-center justify-end gap-3 pr-4 col-span-1 shrink-0">
                  {task.assignerId === user.id && !editingTaskIds.has(task.id) && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTaskIds(prev => new Set(prev).add(task.id));
                      }}
                      className="p-2.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-xl transition-all hover:scale-110 active:scale-90"
                      title="Edit Task"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                  )}

                  {task.assignerId !== user.id && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTask(task);
                      }}
                      className="p-2.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-xl transition-all hover:scale-110 active:scale-90"
                      title="Send Feedback / Request Extension"
                    >
                      <MessageSquare className="w-5 h-5" />
                    </button>
                  )}

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      saveTask(task.id);
                    }}
                    disabled={!hasTaskChanged(task) || savingTaskIds.has(task.id)}
                    className={cn(
                      "p-2.5 rounded-xl transition-all hover:scale-110 active:scale-90",
                      hasTaskChanged(task) && !savingTaskIds.has(task.id)
                        ? "bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]" 
                        : "bg-white/5 text-slate-500 opacity-50 cursor-not-allowed"
                    )}
                    title={savingTaskIds.has(task.id) ? "Saving..." : hasTaskChanged(task) ? "Save Changes" : "No changes to save"}
                  >
                    {savingTaskIds.has(task.id) ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <CheckSquare className="w-5 h-5" />
                    )}
                  </button>
                  
                  <button 
                    onClick={(e) => {
                      console.log('Delete button clicked for:', task.id);
                      e.stopPropagation();
                      e.preventDefault();
                      handleDeleteTask(task.id);
                    }}
                    className="p-2.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all hover:scale-110 active:scale-90"
                    title="Delete Task"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              {/* Expanded Details & Activity */}
              <AnimatePresence>
                {expandedTaskId === task.id && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden w-full bg-white/[0.03] border-t border-white/5 lg:col-span-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
                      {/* Left: Description & Input */}
                      <div className="flex flex-col h-full">
                        <div className="mb-6">
                          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Description</h4>
                          <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {(task.description || 'No description provided.').split(/(https?:\/\/[^\s]+)/g).map((part, i) => 
                              part.match(/https?:\/\/[^\s]+/) ? (
                                <a 
                                  key={i} 
                                  href={part} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="text-blue-400 hover:underline relative z-10 hover:text-blue-300 font-bold"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  LINK
                                </a>
                              ) : part
                            )}
                          </div>
                        </div>

                        {/* Updates Section */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-6 space-y-4">
                          {activities[task.id]?.filter(a => a.type === 'update').map((activity) => (
                            <div key={activity.id} className="bg-white/5 rounded-xl p-4 border border-white/5 group/activity">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0">
                                    {(activity.user_name || 'U').charAt(0)}
                                  </div>
                                  <span className="text-xs font-bold text-white">{activity.user_name || 'Unknown'}</span>
                                  <span className="text-[10px] text-slate-500">{new Date(activity.created_at).toLocaleString()}</span>
                                </div>
                                {activity.user_id === user.id && (
                                  <div className="flex items-center gap-1 opacity-0 group-hover/activity:opacity-100 transition-opacity">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingActivityId(activity.id);
                                        setEditContent(activity.content);
                                      }}
                                      className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-blue-400 transition-colors"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteActivity(activity.id, task.id);
                                      }}
                                      className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                              
                              {editingActivityId === activity.id ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="w-full bg-black/20 rounded-lg p-3 text-sm text-white border border-white/10 focus:border-blue-500/50 focus:outline-none min-h-[80px]"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <div className="flex justify-end gap-2">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingActivityId(null);
                                      }}
                                      className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditActivity(activity.id, editContent, task.id);
                                        setEditingActivityId(null);
                                      }}
                                      className="px-3 py-1.5 text-xs font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-slate-300 whitespace-pre-wrap break-words pl-8">
                                  {activity.content}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                          {/* Input Area (Moved here) */}
                          <div className="mt-auto pt-6 border-t border-white/5">
                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Post Update</h4>
                            <div className="relative group">
                              <div className="absolute inset-0 bg-blue-500/5 rounded-xl border border-white/10 group-focus-within:border-blue-500/30 transition-all pointer-events-none" />
                              <input 
                                type="text"
                                value={newActivityContent}
                                onChange={handleActivityInputChange}
                                placeholder="Post an update or feedback... (Use @ to mention)"
                                className="w-full bg-transparent p-3 pl-4 pr-12 text-sm text-white placeholder:text-slate-500 focus:outline-none relative z-10"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handlePostActivity(task.id);
                                  }
                                }}
                              />
                              
                              {/* Mention Dropdown */}
                              <AnimatePresence>
                                {mentionQuery !== null && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute bottom-full left-0 mb-2 w-64 bg-[#1A1D24] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                                  >
                                    <div className="p-2 border-b border-white/5">
                                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2">Mention & Assign</p>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
                                      {employees
                                        .filter(emp => emp.name.toLowerCase().includes(mentionQuery.toLowerCase()))
                                        .map(emp => (
                                          <button
                                            key={emp.id}
                                            onClick={() => handleMentionSelect(emp, task.id)}
                                            className="w-full text-left px-2 py-2 text-sm font-bold rounded-lg hover:bg-white/5 text-slate-300 hover:text-white flex items-center gap-2 transition-colors"
                                          >
                                            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] text-white overflow-hidden">
                                              {emp.avatar ? (
                                                <img src={emp.avatar} alt={emp.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                              ) : (
                                                emp.name.charAt(0)
                                              )}
                                            </div>
                                            <span className="truncate">{emp.name}</span>
                                            {(task.assignees?.some(a => a.id === emp.id) || task.assigneeId === emp.id) && (
                                              <span className="text-[10px] text-emerald-400 ml-auto">Assigned</span>
                                            )}
                                          </button>
                                        ))}
                                      {employees.filter(emp => emp.name.toLowerCase().includes(mentionQuery.toLowerCase())).length === 0 && (
                                        <div className="px-4 py-2 text-xs text-slate-500 text-center">No matches found</div>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                              <button 
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePostActivity(task.id);
                                }}
                                disabled={!newActivityContent.trim()}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors z-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                              >
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2 italic">Press Enter to post</p>
                          </div>
                      </div>

                      {/* Right: Activity & Metadata */}
                      <div className="flex flex-col h-full lg:border-l lg:border-white/5 lg:pl-8">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <MessageSquare className="w-3 h-3" /> Activity & Feedback
                          </h4>
                          {(task.assignerId === user.id || task.assigneeId === user.id) && task.status !== 'Done' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCompleteTask(task.id);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Complete Task
                            </button>
                          )}
                        </div>
                        
                        <div className="flex-1 min-h-[200px] max-h-[400px] overflow-y-auto custom-scrollbar pr-2 space-y-4 mb-6">
                          {/* System Creation Log */}
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-400 shrink-0 overflow-hidden">
                              {task.assignerAvatar ? (
                                <img src={task.assignerAvatar} alt={task.assignerName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                task.assignerName.charAt(0)
                              )}
                            </div>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-white">{task.assignerName}</span>
                                <span className="text-[10px] text-slate-500">Created task</span>
                              </div>
                              <div className="text-xs text-slate-400 bg-white/5 p-2 rounded-lg rounded-tl-none">
                                Task initialized with priority {task.priority}
                              </div>
                              <span className="text-[9px] text-slate-600 pl-1">{new Date(task.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                          </div>

                          {/* Real Activities */}
                          {activities[task.id]?.map((activity) => (
                            <div key={activity.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
                              <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden",
                                activity.type === 'system' ? "bg-slate-500/20 text-slate-400" :
                                activity.user_id === user.id ? "bg-emerald-500/20 text-emerald-400" : "bg-purple-500/20 text-purple-400"
                              )}>
                                {activity.user_avatar ? (
                                  <img src={activity.user_avatar} alt={activity.user_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  (activity.user_name || 'U').charAt(0)
                                )}
                              </div>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-white">{activity.user_name || 'Unknown'}</span>
                                  <span className="text-[10px] text-slate-500 capitalize">{activity.type}</span>
                                </div>
                                <div className="text-xs text-slate-300 bg-white/5 p-2 rounded-lg rounded-tl-none whitespace-pre-wrap">
                                  {activity.type === 'update' ? (
                                    <span className="italic text-slate-400">Posted an update</span>
                                  ) : (
                                    activity.content
                                  )}
                                </div>
                                <span className="text-[9px] text-slate-600 pl-1">{new Date(activity.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              </div>
                            </div>
                          ))}

                          {/* Legacy Feedback (Fallback) */}
                          {(!activities[task.id] || activities[task.id].length === 0) && task.feedback && (
                            <div className="flex gap-3 opacity-70">
                              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] font-bold text-amber-400 shrink-0 overflow-hidden">
                                {task.assigneeAvatar ? (
                                  <img src={task.assigneeAvatar} alt={task.assigneeName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  task.assigneeName.charAt(0)
                                )}
                              </div>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-white">{task.assigneeName}</span>
                                  <span className="text-[10px] text-slate-500">Legacy Feedback</span>
                                </div>
                                <div className="text-xs text-slate-400 bg-white/5 p-2 rounded-lg rounded-tl-none">
                                  {typeof task.feedback === 'string' ? task.feedback : task.feedback.message || 'Updated task status'}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {isLoadingActivities && (
                            <div className="flex justify-center py-2">
                              <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                            </div>
                          )}
                        </div>

                        {/* Metadata (Moved here) */}
                        <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Created By</span>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[9px] text-white shrink-0 overflow-hidden">
                                {task.assignerAvatar ? (
                                  <img src={task.assignerAvatar} alt={task.assignerName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  task.assignerName.charAt(0)
                                )}
                              </div>
                              <span className="text-xs font-semibold text-white truncate">{task.assignerName}</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Created At</span>
                            <div className="flex items-center gap-1.5 h-6">
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              <span className="text-xs font-semibold text-white">{formatUtil(task.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
          {activeTasks.length === 0 && completedTasks.length === 0 && (
            <div className="py-12 text-center text-slate-500">
              No data available.
            </div>
          )}
          
          {/* Completed Tasks Accordion */}
          {completedTasks.length > 0 && (
            <div className="mt-8">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4 font-bold text-sm"
              >
                <ChevronDown className={cn("w-4 h-4 transition-transform", showCompleted ? "rotate-180" : "")} />
                Completed Tasks ({completedTasks.length})
              </button>
              
              <AnimatePresence>
                {showCompleted && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden flex flex-col gap-2"
                  >
                    {completedTasks.map((task, index) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        key={task.id} 
                        onClick={() => {
                          if (!editingTaskIds.has(task.id)) {
                            setExpandedTaskId(prev => prev === task.id ? null : task.id);
                          }
                        }}
                        className={cn(
                          "grid grid-cols-1 lg:grid-cols-[80px_minmax(300px,1fr)_110px_110px_130px_220px_150px] items-start lg:items-center gap-3 lg:gap-4 p-4 lg:p-0 lg:px-0 lg:py-5 border-b border-white/5 transition-all duration-200 group relative bg-[#020617] lg:hover:shadow-lg lg:hover:scale-[1.002] cursor-pointer w-full lg:min-w-[1200px] opacity-70 hover:opacity-100",
                          expandedTaskId === task.id ? "" : "hover:bg-[#0f172a]",
                          openDropdownId?.startsWith(task.id) ? "z-50" : "z-0",
                          // Feedback Highlight Border
                          task.feedback?.status === 'Pending' ? "border-l-2 border-l-amber-500/50" :
                          task.feedback?.status === 'Approved' ? "border-l-2 border-l-emerald-500/50" :
                          task.feedback?.status === 'Rejected' ? "border-l-2 border-l-rose-500/50" : ""
                        )}
                      >
                        {/* Column 1: Type Badge */}
                        <div className={cn(
                          "hidden lg:flex justify-center items-center col-span-1 sticky left-0 z-20 bg-[#020617] h-full transition-colors",
                          expandedTaskId === task.id ? "" : "group-hover:bg-[#0f172a]"
                        )}>
                          {task.assignerId === user.id && task.assigneeId === user.id ? (
                            <span className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-black uppercase tracking-wider">
                              Personal
                            </span>
                          ) : task.assigneeId === user.id ? (
                            <span className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-wider">
                              MY TASK
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[9px] font-black uppercase tracking-wider">
                              ASSIGNED TASK
                            </span>
                          )}
                        </div>

                        {/* Main Row Content */}
                        <div 
                          className="p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center cursor-pointer"
                          onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                        >
                          {/* Mobile: Top Row with Status & Priority */}
                          <div className="lg:hidden flex items-center justify-between w-full mb-2">
                            <div className="flex items-center gap-2">
                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDropdownId(openDropdownId === task.id ? null : task.id);
                                  }}
                                  className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all", getStatusColor(task.status))}
                                >
                                  {task.status}
                                </button>
                                <AnimatePresence>
                                  {openDropdownId === task.id && (
                                    <>
                                      <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); }} />
                                      <motion.div 
                                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute left-0 top-full mt-2 w-40 bg-[#1A1D24] border border-white/10 rounded-xl shadow-2xl z-50"
                                      >
                                        <div className="p-1 flex flex-col">
                                          {['Todo', 'In Progress', 'Review', 'Done'].map((status) => (
                                            <button
                                              key={status}
                                              onClick={(e) => {
                                                e.stopPropagation();
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

                              <div className="relative">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDropdownId(openDropdownId === `${task.id}-priority` ? null : `${task.id}-priority`);
                                  }}
                                  className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all", getPriorityColor(task.priority))}
                                >
                                  {task.priority}
                                </button>
                                <AnimatePresence>
                                  {openDropdownId === `${task.id}-priority` && (
                                    <>
                                      <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); }} />
                                      <motion.div 
                                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute left-0 top-full mt-2 w-32 bg-[#1A1D24] border border-white/10 rounded-xl shadow-2xl z-50"
                                      >
                                        <div className="p-1 flex flex-col">
                                          {['Low', 'Medium', 'High'].map((p) => (
                                            <button
                                              key={p}
                                              onClick={(e) => {
                                                e.stopPropagation();
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
                            </div>
                          </div>

                          {/* Column 1: Checkbox & Title */}
                          <div className="lg:col-span-12 flex items-start gap-4 w-full">
                            
                            {/* Column 2: Details */}
                            <div className={cn(
                              "flex-1 min-w-0 flex flex-col gap-1 lg:col-span-1 w-full overflow-hidden sticky left-[96px] z-20 transition-colors cursor-pointer",
                              expandedTaskId === task.id ? "" : ""
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedTaskId(expandedTaskId === task.id ? null : task.id);
                            }}
                            >
                              {task.assignerId === user.id && editingTaskIds.has(task.id) ? (
                                <div 
                                  className="flex flex-col gap-1.5 w-full group/details"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input 
                                    type="text"
                                    value={task.title || ''}
                                    onChange={(e) => updateTaskField(task.id, 'title', e.target.value)}
                                    className="bg-transparent text-white font-bold text-lg lg:text-xl leading-tight focus:outline-none focus:bg-white/10 rounded px-2 py-1 -ml-2 border-none transition-colors w-full"
                                    placeholder="Task Title"
                                    autoFocus
                                  />
                                  <textarea 
                                    value={task.description || ''}
                                    onChange={(e) => updateTaskField(task.id, 'description', e.target.value)}
                                    className="bg-transparent text-slate-400 text-base group-hover/details:text-slate-300 transition-colors focus:outline-none focus:bg-white/10 rounded px-2 py-1 -ml-2 border-none resize-none h-auto min-h-[1.5rem] overflow-hidden w-full"
                                    placeholder="Add description..."
                                    rows={3}
                                  />
                                </div>
                              ) : (
                                <div className="flex flex-col gap-1 w-full pointer-events-none">
                                  <h3 className={cn("text-white font-bold text-lg lg:text-xl leading-tight group-hover:text-blue-400 transition-colors break-words pointer-events-auto", task.status === 'Done' && "line-through opacity-50")}>{task.title}</h3>
                                  <p 
                                    className={cn(
                                      "text-slate-400 text-base group-hover:text-slate-300 transition-colors break-words pointer-events-auto", 
                                      expandedTaskId === task.id ? "" : "line-clamp-2 lg:line-clamp-1 max-h-[3em] lg:max-h-[1.5em] overflow-hidden"
                                    )}
                                  >
                                    {(task.description || '').split(/(https?:\/\/[^\s]+)/g).map((part, i) => 
                                      part.match(/https?:\/\/[^\s]+/) ? (
                                        <a 
                                          key={i} 
                                          href={part} 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          className="text-blue-400 hover:underline relative z-10 hover:text-blue-300 font-bold pointer-events-auto"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          LINK
                                        </a>
                                      ) : part
                                    )}
                                  </p>
                                  
                                  {/* Feedback Status (Moved here) */}
                                  {task.feedback && (
                                    <div className={cn(
                                      "flex items-center gap-2 text-[10px] font-medium mt-1 animate-in fade-in slide-in-from-top-1",
                                      task.feedback.status === 'Pending' ? "text-amber-400" :
                                      task.feedback.status === 'Approved' ? "text-emerald-400" :
                                      "text-rose-400"
                                    )}>
                                      {task.feedback.status === 'Pending' && <Clock className="w-3 h-3 shrink-0" />}
                                      {task.feedback.status === 'Approved' && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                                      {task.feedback.status === 'Rejected' && <X className="w-3 h-3 shrink-0" />}
                                      
                                      <span className="uppercase tracking-wider opacity-90">
                                        {task.feedback.status === 'Pending' ? 'Request:' : `Request ${task.feedback.status}:`}
                                        <span className="ml-1 normal-case opacity-70 truncate max-w-[200px] inline-block align-bottom">
                                          {typeof task.feedback === 'string' ? task.feedback : task.feedback.message}
                                        </span>
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Mobile: Bottom Metadata Row */}
                          <div className="lg:hidden flex flex-wrap items-center justify-between w-full mt-2 pt-3 border-t border-white/5">
                             <div className="flex items-center gap-4">
                                {/* Deadline */}
                                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                  <Clock className={cn("w-3.5 h-3.5", new Date(task.deadline) < new Date() && task.status !== 'Done' ? "text-rose-400" : "text-slate-500")} />
                                  <span className={cn(new Date(task.deadline) < new Date() && task.status !== 'Done' ? "text-rose-400 font-bold" : "")}>
                                    {formatDate(task.deadline)}
                                  </span>
                                </div>
                                
                                {/* Assignee */}
                                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                   <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[9px] text-white font-bold">
                                      {(task.assigneeId === user.id ? task.assignerName : task.assigneeName).charAt(0)}
                                   </div>
                                   <span>{task.assigneeId === user.id ? 'Me' : employees.find(e => e.id === task.assigneeId)?.name || 'Unknown'}</span>
                                </div>
                             </div>
                             
                             {/* Expand Icon */}
                             <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform duration-300", expandedTaskId === task.id ? "rotate-180" : "")} />
                          </div>
                        </div>

                        {/* Column 3: Status */}
                        <div className="hidden lg:flex justify-center items-center relative col-span-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownId(openDropdownId === task.id ? null : task.id);
                              }}
                              className={cn(
                                "px-4 py-2 rounded-full text-xs font-bold border transition-all hover:scale-105 active:scale-95 w-full lg:w-auto min-w-[100px] text-center",
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenDropdownId(null);
                                    }}
                                  />
                                  <motion.div 
                                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute right-0 top-full mt-2 w-40 bg-[#1A1D24] border border-white/10 rounded-xl shadow-2xl z-50"
                                  >
                                    <div className="p-1 flex flex-col">
                                      {['Todo', 'In Progress', 'Review', 'Done'].map((status) => (
                                        <button
                                          key={status}
                                          onClick={(e) => {
                                            e.stopPropagation();
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

                        {/* Column 4: Priority */}
                        <div className="hidden lg:flex justify-center items-center relative col-span-1" onClick={(e) => e.stopPropagation()}>
                          {task.assignerId === user.id ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(openDropdownId === task.id + '-priority' ? null : task.id + '-priority');
                                }}
                                className={cn(
                                  "px-4 py-2 rounded-full text-xs font-bold border transition-all hover:scale-105 active:scale-95 w-full lg:w-auto min-w-[100px] text-center",
                                  getPriorityColor(task.priority)
                                )}
                              >
                                {task.priority}
                              </button>
                              <AnimatePresence>
                                {openDropdownId === task.id + '-priority' && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-40" 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenDropdownId(null);
                                      }} 
                                    />
                                    <motion.div 
                                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="absolute left-0 top-full mt-2 w-32 bg-[#1A1D24] border border-white/10 rounded-xl shadow-2xl z-50"
                                    >
                                      <div className="p-1 flex flex-col">
                                        {['Low', 'Medium', 'High'].map((p) => (
                                          <button
                                            key={p}
                                            onClick={(e) => {
                                              e.stopPropagation();
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
                            <span className={cn("px-4 py-2 rounded-full text-xs font-bold border inline-block text-center w-full lg:w-auto min-w-[100px]", getPriorityColor(task.priority))}>
                              {task.priority}
                            </span>
                          )}
                        </div>

                        {/* Column 5: Deadline */}
                        <div className="hidden lg:flex items-center justify-center text-slate-400 text-sm col-span-1" onClick={(e) => e.stopPropagation()}>
                          <div className="relative flex justify-center items-center group/date w-full h-10">
                            {editingDeadlineTaskId === task.id ? (
                              <div onClick={(e) => e.stopPropagation()} className="z-50">
                                <DatePicker 
                                  value={toInputDate(task.deadline)}
                                  onChange={(date) => {
                                    handleDeadlineChange(task, date);
                                    setEditingDeadlineTaskId(null);
                                  }}
                                  autoFocus
                                  onBlur={() => setEditingDeadlineTaskId(null)}
                                  inputClassName="bg-slate-900 text-white font-bold text-sm px-3 py-1.5 rounded-lg border-2 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] outline-none min-w-[180px] text-center h-10"
                                  className="min-w-[180px]"
                                />
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingDeadlineTaskId(task.id);
                                }}
                                className={cn(
                                  "font-bold text-center transition-colors px-3 py-1.5 rounded-lg hover:bg-white/10 z-10 whitespace-nowrap flex items-center gap-1.5 cursor-pointer",
                                  new Date(task.deadline) < new Date() && task.status !== 'Done' ? "text-rose-400" : "lg:text-slate-300"
                                )}
                              >
                                {formatDate(task.deadline)}
                                {task.feedback?.status === 'Pending' && task.feedback.message.includes('deadline') && (
                                  <Clock className="w-3 h-3 text-amber-400 animate-pulse" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Column 6: Assignee/Assigner */}
                        <div className="hidden lg:flex items-center justify-start gap-3 min-w-0 col-span-1 pl-10" onClick={(e) => e.stopPropagation()}>
                          <div className="flex -space-x-3 overflow-hidden">
                            {(task.assignees || [{ id: task.assigneeId, name: task.assigneeName }]).map((assignee, idx) => (
                              <div 
                                key={assignee.id}
                                className={cn(
                                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white shadow-lg shrink-0 border-2 border-[#0F1115]",
                                  idx === 0 ? "bg-gradient-to-br from-blue-500 to-indigo-600 z-30" : 
                                  idx === 1 ? "bg-gradient-to-br from-purple-500 to-pink-600 z-20" : 
                                  "bg-slate-700 z-10"
                                )}
                                title={assignee.name}
                              >
                                {assignee.name.charAt(0)}
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-col min-w-0 justify-center">
                            {task.assignerId === user.id || (task.assignees && task.assignees.some(a => a.id === user.id)) ? (
                              <div className="relative" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => {
                                    setOpenDropdownId(openDropdownId === `${task.id}-assignee` ? null : `${task.id}-assignee`);
                                  }}
                                  className="text-sm font-bold text-white hover:text-blue-400 transition-colors truncate text-left flex items-center gap-1 group/btn"
                                >
                                  <span className="truncate max-w-[120px]">
                                    {task.assignees && task.assignees.length > 1 
                                      ? `${task.assignees.length} people` 
                                      : (task.assignees?.[0]?.id === user.id ? 'Me' : task.assignees?.[0]?.name || 'Unknown')}
                                  </span>
                                  <ChevronDown className="w-3 h-3 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                                </button>
                                
                                <AnimatePresence>
                                  {openDropdownId === `${task.id}-assignee` && (
                                    <>
                                      <div className="fixed inset-0 z-40" onClick={() => setOpenDropdownId(null)} />
                                      <motion.div 
                                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                        className="absolute left-0 top-full mt-2 w-64 bg-[#1A1D24] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                                      >
                                        <div className="p-2 max-h-[300px] overflow-y-auto custom-scrollbar flex flex-col gap-1">
                                          <div className="px-2 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            Manage Assignees
                                          </div>
                                          
                                          {/* Current User Option */}
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleTaskAssignee(task.id, user.id);
                                            }}
                                            className={cn(
                                              "w-full text-left px-2 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-3 group/item",
                                              task.assignees?.some(a => a.id === user.id)
                                                ? "bg-blue-500/20 text-blue-400" 
                                                : "text-slate-400 hover:bg-white/5 hover:text-white"
                                            )}
                                          >
                                            <div className={cn(
                                              "w-8 h-8 rounded-full flex items-center justify-center text-xs shadow-sm transition-transform group-hover/item:scale-110 overflow-hidden",
                                              task.assignees?.some(a => a.id === user.id) ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-300"
                                            )}>
                                              {user.avatar ? (
                                                <img src={user.avatar} alt="Me" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                              ) : (
                                                user.name.charAt(0)
                                              )}
                                            </div>
                                            <span className="truncate">Me</span>
                                            {task.assignees?.some(a => a.id === user.id) && <CheckCircle2 className="w-4 h-4 ml-auto" />}
                                          </button>

                                          <div className="h-px bg-white/10 my-1 mx-2" />

                                          {/* Other Employees */}
                                          {employees.filter(e => e.id !== user.id).map(emp => (
                                            <button
                                              key={emp.id}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggleTaskAssignee(task.id, emp.id);
                                              }}
                                              className={cn(
                                                "w-full text-left px-2 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-3 group/item",
                                                task.assignees?.some(a => a.id === emp.id)
                                                  ? "bg-blue-500/20 text-blue-400" 
                                                  : "text-slate-400 hover:bg-white/5 hover:text-white"
                                              )}
                                            >
                                              <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center text-xs shadow-sm transition-transform group-hover/item:scale-110 overflow-hidden",
                                                task.assignees?.some(a => a.id === emp.id) ? "bg-blue-500 text-white" : "bg-slate-700 text-slate-300"
                                              )}>
                                                {emp.avatar ? (
                                                  <img src={emp.avatar} alt={emp.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                ) : (
                                                  emp.name.charAt(0)
                                                )}
                                              </div>
                                              <span className="truncate">{emp.name}</span>
                                              {task.assignees?.some(a => a.id === emp.id) && <CheckCircle2 className="w-4 h-4 ml-auto" />}
                                            </button>
                                          ))}
                                        </div>
                                      </motion.div>
                                    </>
                                  )}
                                </AnimatePresence>
                              </div>
                            ) : (
                              <span className="text-sm font-bold text-white truncate">
                                {task.assignerName}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Column 7: Actions */}
                        <div className="flex items-center justify-end gap-3 pr-4 col-span-1 shrink-0">
                          {task.assignerId === user.id && !editingTaskIds.has(task.id) && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTaskIds(prev => new Set(prev).add(task.id));
                              }}
                              className="p-2.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-xl transition-all hover:scale-110 active:scale-90"
                              title="Edit Task"
                            >
                              <Pencil className="w-5 h-5" />
                            </button>
                          )}

                          {task.assignerId !== user.id && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTask(task);
                              }}
                              className="p-2.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-xl transition-all hover:scale-110 active:scale-90"
                              title="Send Feedback / Request Extension"
                            >
                              <MessageSquare className="w-5 h-5" />
                            </button>
                          )}

                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              saveTask(task.id);
                            }}
                            disabled={!hasTaskChanged(task) || savingTaskIds.has(task.id)}
                            className={cn(
                              "p-2.5 rounded-xl transition-all hover:scale-110 active:scale-90",
                              hasTaskChanged(task) && !savingTaskIds.has(task.id)
                                ? "bg-emerald-500/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]" 
                                : "bg-white/5 text-slate-500 opacity-50 cursor-not-allowed"
                            )}
                            title={savingTaskIds.has(task.id) ? "Saving..." : hasTaskChanged(task) ? "Save Changes" : "No changes to save"}
                          >
                            {savingTaskIds.has(task.id) ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <CheckSquare className="w-5 h-5" />
                            )}
                          </button>
                          
                          <button 
                            onClick={(e) => {
                              console.log('Delete button clicked for:', task.id);
                              e.stopPropagation();
                              e.preventDefault();
                              handleDeleteTask(task.id);
                            }}
                            className="p-2.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all hover:scale-110 active:scale-90"
                            title="Delete Task"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        
                        {/* Expanded Details & Activity */}
                        <AnimatePresence>
                          {expandedTaskId === task.id && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden w-full bg-white/[0.03] border-t border-white/5 lg:col-span-full"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="p-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
                                {/* Left: Description & Input */}
                                <div className="flex flex-col h-full">
                                  <div className="mb-6">
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Description</h4>
                                    <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap break-words">
                                      {(task.description || 'No description provided.').split(/(https?:\/\/[^\s]+)/g).map((part, i) => 
                                        part.match(/https?:\/\/[^\s]+/) ? (
                                          <a 
                                            key={i} 
                                            href={part} 
                                            target="_blank" 
                                            rel="noopener noreferrer" 
                                            className="text-blue-400 hover:underline relative z-10 hover:text-blue-300 font-bold"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            LINK
                                          </a>
                                        ) : part
                                      )}
                                    </div>
                                  </div>

                                  {/* Updates Section */}
                                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-6 space-y-4">
                                    {activities[task.id]?.filter(a => a.type === 'update').map((activity) => (
                                      <div key={activity.id} className="bg-white/5 rounded-xl p-4 border border-white/5 group/activity">
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0 overflow-hidden">
                                              {activity.user_avatar ? (
                                                <img src={activity.user_avatar} alt={activity.user_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                              ) : (
                                                (activity.user_name || 'U').charAt(0)
                                              )}
                                            </div>
                                            <span className="text-xs font-bold text-white">{activity.user_name || 'Unknown'}</span>
                                            <span className="text-[10px] text-slate-500">{new Date(activity.created_at).toLocaleString()}</span>
                                          </div>
                                          {activity.user_id === user.id && (
                                            <div className="flex items-center gap-1 opacity-0 group-hover/activity:opacity-100 transition-opacity">
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditingActivityId(activity.id);
                                                  setEditContent(activity.content);
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                              >
                                                <Pencil className="w-3.5 h-3.5" />
                                              </button>
                                              <button 
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteActivity(activity.id, task.id);
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                              >
                                                <X className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                        
                                        {editingActivityId === activity.id ? (
                                          <div className="mt-2 flex flex-col gap-2">
                                            <textarea
                                              value={editContent}
                                              onChange={(e) => setEditContent(e.target.value)}
                                              className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors resize-none"
                                              rows={2}
                                              autoFocus
                                            />
                                            <div className="flex justify-end gap-2">
                                              <button
                                                onClick={() => setEditingActivityId(null)}
                                                className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
                                              >
                                                Cancel
                                              </button>
                                              <button
                                                onClick={() => {
                                                  handleEditActivity(activity.id, editContent, task.id);
                                                  setEditingActivityId(null);
                                                }}
                                                disabled={!editContent.trim()}
                                                className="px-3 py-1.5 text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50"
                                              >
                                                Save
                                              </button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="text-sm text-slate-300 whitespace-pre-wrap break-words pl-8">
                                            {activity.content}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>

                                  {/* Input Area */}
                                  <div className="mt-auto pt-4 border-t border-white/5">
                                    <div className="relative">
                                      <textarea
                                        value={newActivityContent[task.id] || ''}
                                        onChange={(e) => setNewActivityContent(prev => ({ ...prev, [task.id]: e.target.value }))}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handlePostActivity(task.id);
                                          }
                                        }}
                                        placeholder="Post an update or add a comment..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors resize-none h-12"
                                      />
                                      <button
                                        onClick={() => handlePostActivity(task.id)}
                                        disabled={!newActivityContent[task.id]?.trim()}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                                      >
                                        <Send className="w-4 h-4" />
                                      </button>
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-2 text-right">Press Enter to post, Shift + Enter for new line</p>
                                  </div>
                                </div>

                                {/* Right: Activity Log & Meta */}
                                <div className="flex flex-col h-full border-l border-white/5 pl-8">
                                  <div className="flex items-center justify-between mb-6">
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Activity Log</h4>
                                    {task.status !== 'Done' && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCompleteTask(task.id);
                                        }}
                                        className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Complete Task
                                      </button>
                                    )}
                                  </div>
                                  
                                  <div className="flex-1 min-h-[200px] max-h-[400px] overflow-y-auto custom-scrollbar pr-2 space-y-4 mb-6">
                                    {/* System Creation Log */}
                                    <div className="flex gap-3">
                                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] font-bold text-blue-400 shrink-0 overflow-hidden">
                                        {task.assignerAvatar ? (
                                          <img src={task.assignerAvatar} alt={task.assignerName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        ) : (
                                          task.assignerName.charAt(0)
                                        )}
                                      </div>
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-white">{task.assignerName}</span>
                                          <span className="text-[10px] text-slate-500">Created task</span>
                                        </div>
                                        <div className="text-xs text-slate-400 bg-white/5 p-2 rounded-lg rounded-tl-none">
                                          Task initialized with priority {task.priority}
                                        </div>
                                        <span className="text-[9px] text-slate-600 pl-1">{new Date(task.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                      </div>
                                    </div>

                                    {/* Real Activities */}
                                    {activities[task.id]?.map((activity) => (
                                      <div key={activity.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
                                        <div className={cn(
                                          "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden",
                                          activity.type === 'system' ? "bg-slate-500/20 text-slate-400" :
                                          activity.user_id === user.id ? "bg-emerald-500/20 text-emerald-400" : "bg-purple-500/20 text-purple-400"
                                        )}>
                                          {activity.user_avatar ? (
                                            <img src={activity.user_avatar} alt={activity.user_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                          ) : (
                                            (activity.user_name || 'U').charAt(0)
                                          )}
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-white">{activity.user_name || 'Unknown'}</span>
                                            <span className="text-[10px] text-slate-500 capitalize">{activity.type}</span>
                                          </div>
                                          <div className="text-xs text-slate-300 bg-white/5 p-2 rounded-lg rounded-tl-none whitespace-pre-wrap">
                                            {activity.type === 'update' ? (
                                              <span className="italic text-slate-400">Posted an update</span>
                                            ) : (
                                              activity.content
                                            )}
                                          </div>
                                          <span className="text-[9px] text-slate-600 pl-1">{new Date(activity.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                        </div>
                                      </div>
                                    ))}

                                    {/* Legacy Feedback (Fallback) */}
                                    {(!activities[task.id] || activities[task.id].length === 0) && task.feedback && (
                                      <div className="flex gap-3 opacity-70">
                                        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-[10px] font-bold text-amber-400 shrink-0 overflow-hidden">
                                          {task.assigneeAvatar ? (
                                            <img src={task.assigneeAvatar} alt={task.assigneeName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                          ) : (
                                            task.assigneeName.charAt(0)
                                          )}
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-white">{task.assigneeName}</span>
                                            <span className="text-[10px] text-slate-500">Legacy Feedback</span>
                                          </div>
                                          <div className="text-xs text-slate-400 bg-white/5 p-2 rounded-lg rounded-tl-none">
                                            {typeof task.feedback === 'string' ? task.feedback : task.feedback.message || 'Updated task status'}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    
                                    {isLoadingActivities && (
                                      <div className="flex justify-center py-2">
                                        <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                                      </div>
                                    )}
                                  </div>

                                  {/* Metadata (Moved here) */}
                                  <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                                    <div>
                                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Created By</span>
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[9px] text-white shrink-0 overflow-hidden">
                                          {task.assignerAvatar ? (
                                            <img src={task.assignerAvatar} alt={task.assignerName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                          ) : (
                                            task.assignerName.charAt(0)
                                          )}
                                        </div>
                                        <span className="text-xs font-semibold text-white truncate">{task.assignerName}</span>
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Created At</span>
                                      <div className="flex items-center gap-1.5 h-6">
                                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                        <span className="text-xs font-semibold text-white">{formatUtil(task.createdAt)}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
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
                    <option value={user.id} className="bg-[#0F1115] text-white">Me</option>
                    {employees.filter(e => e.id !== user.id).map(emp => (
                      <option key={emp.id} value={emp.id} className="bg-[#0F1115] text-white">{emp.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Task Title</label>
                  <input required type="text" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" placeholder="e.g. Prepare weekly report" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Description</label>
                  <textarea required value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors h-24 resize-none" placeholder="Task details..." />
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
                    <DatePicker 
                      value={newTask.deadline} 
                      onChange={date => setNewTask({...newTask, deadline: date})} 
                      placeholder="Select deadline..."
                      inputClassName="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors [color-scheme:dark]" 
                    />
                  </div>
                </div>
                <button 
                  type="submit" 
                  disabled={!newTask.title.trim() || !newTask.description.trim()}
                  className="w-full py-3.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold transition-all shadow-[0_0_20px_rgba(59,130,246,0.2)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500"
                >
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
                  <p className="text-xs text-slate-400">Current Deadline: {formatUtil(selectedTask.deadline)}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Feedback / Reason</label>
                  <textarea required value={feedbackMessage} onChange={e => setFeedbackMessage(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors h-24 resize-none" placeholder="Explain why you need an extension or provide feedback..." />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Request New Deadline (Optional)</label>
                  <DatePicker 
                    value={requestedDeadline} 
                    onChange={date => setRequestedDeadline(date)} 
                    placeholder="Select new deadline..."
                    inputClassName="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors [color-scheme:dark]" 
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
