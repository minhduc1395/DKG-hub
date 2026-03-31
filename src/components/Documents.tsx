import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, FileText, FileImage, FileCode, Download, Eye, MoreVertical, Folder, Clock, Upload, CheckSquare, X, CheckCircle, XCircle, Book, FileSignature, AlertCircle, File as FileIcon, Loader2, RotateCcw, RefreshCw, Trash2 } from 'lucide-react';
import { Document, DocumentWithHistory } from '../types';
import { cn, formatDate, normalizeFileName } from '../lib/utils';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabaseClient';

const departments = [
  'All',
  'BOD',
  'HR',
  'Accounting',
  'Sales',
  'OP & Tech'
];

export function Documents() {
  const { user } = useUser();
  const [documents, setDocuments] = useState<DocumentWithHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'Guidelines' | 'Templates' | 'Contracts'>('Guidelines');
  const [previewDoc, setPreviewDoc] = useState<DocumentWithHistory | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [updatingDoc, setUpdatingDoc] = useState<Document | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'update' | 'rollback' | 'delete';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'update'
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dbError, setDbError] = useState<{title: string, message: string, sql?: string} | null>(null);

  // Upload Form State
  const [uploadForm, setUploadForm] = useState({
    title: '',
    category_type: 'Guideline' as Document['category_type'],
    department: 'All'
  });

  const isBOD = 
    user?.department?.toUpperCase() === 'BOD' || 
    user?.role?.toLowerCase() === 'ceo' || 
    user?.role?.toLowerCase() === 'chairman' ||
    user?.role?.toLowerCase() === 'bod' ||
    user?.position?.toLowerCase() === 'ceo' ||
    user?.position?.toLowerCase() === 'chairman' ||
    user?.position?.toLowerCase() === 'bod';

  const isAccountingManager = 
    user?.department?.toLowerCase() === 'accounting' && 
    user?.role?.toLowerCase() === 'manager';

  useEffect(() => {
    if (user?.department && !isBOD) {
      setUploadForm(prev => ({ ...prev, department: user.department }));
    }
  }, [user, isBOD]);

  const fetchDocuments = async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('documents')
        .select(`
          *,
          author:profiles!documents_author_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      // Security: Apply restrictions based on role/department
      if (!isBOD && !isAccountingManager) {
        // Staff can only see 'All' documents OR documents they authored
        query = query.or(`department.eq.All,author_id.eq.${user?.id}`);
      }

      const { data: docsData, error: docsError } = await query;

      if (docsError) throw docsError;

      console.log('Fetched documents raw data:', docsData);

      const { data: historyData, error: historyError } = await supabase
        .from('document_history')
        .select(`
          *,
          user:profiles!document_history_user_id_fkey(full_name)
        `)
        .order('timestamp', { ascending: false });

      if (historyError && historyError.code !== '42P01') {
        console.error('Error fetching history:', historyError);
      }

      const formattedDocs: DocumentWithHistory[] = (docsData || []).map((doc: any) => ({
        id: doc.id,
        title: doc.title,
        category_type: doc.category_type,
        department: doc.department,
        file_type: doc.file_type || 'doc',
        file_url: doc.file_url,
        drive_folder_id: doc.drive_folder_id,
        version: doc.version,
        previous_file_url: doc.previous_file_url,
        previous_version: doc.previous_version,
        author_id: doc.author_id,
        author_name: doc.author?.full_name || 'Unknown',
        created_at: doc.created_at,
        history: (historyData || [])
          .filter((h: any) => h.document_id === doc.id)
          .map((h: any) => ({
            id: h.id,
            document_id: h.document_id,
            user_id: h.user_id,
            user_name: h.user?.full_name || 'Unknown',
            action: h.action,
            timestamp: formatDate(h.timestamp)
          }))
      }));

      setDocuments(formattedDocs);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchDocuments();
    }
  }, [user?.id, isBOD, isAccountingManager]);

  const getBadge = (doc: Document) => {
    if (doc.category_type === 'Guideline') return { label: 'Guideline', className: 'text-blue-400 bg-blue-500/10 border-blue-500/20' };
    if (doc.category_type === 'Template') return { label: 'Template', className: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };
    if (doc.category_type === 'Contract') return { label: 'Contract', className: 'text-orange-400 bg-orange-500/10 border-orange-500/20' };
    return { label: 'Unknown', className: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };
  };

  const getFileIcon = (type: string, size: 'sm' | 'lg' = 'lg') => {
    const className = size === 'lg' ? "w-8 h-8" : "w-4 h-4";
    switch (type) {
      case 'pdf': return <FileText className={cn(className, "text-rose-400")} />;
      case 'image': return <FileImage className={cn(className, "text-emerald-400")} />;
      case 'sheet': return <FileCode className={cn(className, "text-emerald-500")} />;
      case 'doc': return <FileText className={cn(className, "text-blue-400")} />;
      default: return <FileIcon className={cn(className, "text-slate-400")} />;
    }
  };

  const logAction = async (docId: string, action: string) => {
    if (!user) return;
    try {
      await supabase.from('document_history').insert([{
        document_id: docId,
        user_id: user.id,
        action,
        timestamp: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Error logging action:', error);
    }
  };

  const handleDownload = async (doc: Document) => {
    await logAction(doc.id, 'Downloaded document');
    window.open(doc.file_url, '_blank');
  };

  const handlePreview = async (doc: DocumentWithHistory) => {
    await logAction(doc.id, 'Previewed document');
    setPreviewDoc(doc);
  };

  const handleDelete = async (doc: Document) => {
    if (!user || !isBOD) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Delete',
      message: `Are you sure you want to delete "${doc.title}"? This action cannot be undone and will be logged.`,
      type: 'delete',
      onConfirm: async () => {
        setIsSubmitting(true);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          // Log before delete because doc might be gone
          await logAction(doc.id, 'Deleted document (BOD Action)');
          
          const { error } = await supabase.from('documents').delete().eq('id', doc.id);
          if (error) throw error;
          
          await fetchDocuments();
        } catch (error: any) {
          alert(`Delete failed: ${error.message}`);
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  const incrementVersion = (currentVersion: string) => {
    const match = currentVersion.match(/v(\d+)\.(\d+)/);
    if (match) {
      const major = parseInt(match[1]);
      return `v${major + 1}.0`;
    }
    return 'v2.0';
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedFile) return;
    
    // If updating, show confirmation first
    if (updatingDoc) {
      setConfirmModal({
        isOpen: true,
        title: 'Confirm Update',
        message: `Are you sure you want to update "${updatingDoc.title}" to version ${incrementVersion(updatingDoc.version)}? The previous version will be saved for rollback.`,
        type: 'update',
        onConfirm: () => executeUpload()
      });
      return;
    }

    executeUpload();
  };

  const executeUpload = async () => {
    setIsSubmitting(true);
    setConfirmModal(prev => ({ ...prev, isOpen: false }));

    try {
      // 1. Upload file lên Supabase Storage (Bucket: 'documents')
      const fileExt = selectedFile?.name.split('.').pop()?.toLowerCase() || '';
      const fileName = `${Date.now()}_${normalizeFileName(selectedFile?.name || '')}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, selectedFile!);

      if (uploadError) throw uploadError;

      // 2. Lấy Public URL từ Supabase Storage
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // 3. Xác định loại file
      let docType = 'doc';
      if (fileExt === 'pdf') docType = 'pdf';
      else if (['png', 'jpg', 'jpeg', 'gif'].includes(fileExt)) docType = 'image';
      else if (['xls', 'xlsx', 'csv'].includes(fileExt)) docType = 'sheet';

      if (updatingDoc) {
        // UPDATE MODE
        const updatedDoc = {
          file_url: publicUrl,
          version: incrementVersion(updatingDoc.version),
          previous_file_url: updatingDoc.file_url,
          previous_version: updatingDoc.version,
          created_at: new Date().toISOString()
        };

        const { error: updateError } = await supabase
          .from('documents')
          .update(updatedDoc)
          .eq('id', updatingDoc.id);

        if (updateError) throw updateError;

        // History
        await supabase.from('document_history').insert([{
          document_id: updatingDoc.id,
          user_id: user?.id,
          action: `Updated to ${updatedDoc.version}`,
          timestamp: new Date().toISOString()
        }]);

      } else {
        // NEW UPLOAD MODE
        const newDoc = {
          title: uploadForm.title,
          category_type: uploadForm.category_type,
          department: uploadForm.department,
          file_type: docType,
          file_url: publicUrl,
          drive_folder_id: null,
          version: 'v1.0',
          author_id: user?.id,
          created_at: new Date().toISOString()
        };

        const { data: insertedDoc, error: insertError } = await supabase
          .from('documents')
          .insert([newDoc])
          .select()
          .single();

        if (insertError) throw insertError;

        await supabase.from('document_history').insert([{
          document_id: insertedDoc.id,
          user_id: user?.id,
          action: 'Uploaded to Storage (Pending Drive Sync)',
          timestamp: new Date().toISOString()
        }]);
      }

      await fetchDocuments();
      setIsUploadOpen(false);
      setUpdatingDoc(null);
      setUploadForm({ title: '', category_type: 'Guideline', department: 'HR' });
      setSelectedFile(null);

    } catch (error: any) {
      console.error('Detailed upload error:', error);
      alert(`Error saving document: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRollback = async (doc: Document) => {
    if (!doc.previous_file_url || !doc.previous_version) return;

    setConfirmModal({
      isOpen: true,
      title: 'Confirm Rollback',
      message: `Are you sure you want to rollback "${doc.title}" to version ${doc.previous_version}? This will replace the current version.`,
      type: 'rollback',
      onConfirm: async () => {
        setIsSubmitting(true);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        try {
          const { error: rollbackError } = await supabase
            .from('documents')
            .update({
              file_url: doc.previous_file_url,
              version: doc.previous_version,
              previous_file_url: null,
              previous_version: null,
              created_at: new Date().toISOString()
            })
            .eq('id', doc.id);

          if (rollbackError) throw rollbackError;

          await supabase.from('document_history').insert([{
            document_id: doc.id,
            user_id: user?.id,
            action: `Rolled back to ${doc.previous_version}`,
            timestamp: new Date().toISOString()
          }]);

          await fetchDocuments();
        } catch (error: any) {
          alert(`Rollback failed: ${error.message}`);
        } finally {
          setIsSubmitting(false);
        }
      }
    });
  };

  const filteredDocs = documents.filter(doc => {
    // Permission check: 
    // BOD and Accounting Manager see all.
    // Others see only 'All' documents OR their own uploads.
    if (!isBOD && !isAccountingManager) {
      const isVisible = doc.department === 'All' || doc.author_id === user?.id;
      if (!isVisible) return false;
    }

    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          doc.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.category_type.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesTab = false;
    if (activeTab === 'Guidelines') matchesTab = doc.category_type === 'Guideline';
    if (activeTab === 'Templates') matchesTab = doc.category_type === 'Template';
    if (activeTab === 'Contracts') matchesTab = doc.category_type === 'Contract';

    return matchesSearch && matchesTab;
  });

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full h-full animate-in fade-in duration-500">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-white text-3xl font-black tracking-tight">Documents</h1>
          <p className="text-slate-400">Manage guidelines, templates, and contracts.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group w-full md:w-64">
            <div className="absolute inset-0 bg-white/[0.03] rounded-xl border border-white/10 backdrop-blur-md transition-all duration-300 group-focus-within:bg-white/[0.07] group-focus-within:border-white/20 group-focus-within:shadow-[0_0_20px_rgba(59,130,246,0.15)] pointer-events-none" />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-400 transition-colors z-10" />
            <input 
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:outline-none relative z-10"
            />
          </div>
          
          <button 
            onClick={() => setIsUploadOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-sm transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)]"
          >
            <Upload className="w-4 h-4" /> Smart Upload
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-white/10 overflow-x-auto whitespace-nowrap custom-scrollbar pb-1">
        {[
          { id: 'Guidelines', label: 'Guidelines', icon: Book },
          { id: 'Templates', label: 'Templates', icon: FileCode },
          { id: 'Contracts', label: 'Contracts & Agreements', icon: FileSignature },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "pb-3 text-sm font-bold transition-all flex items-center gap-2 border-b-2 shrink-0",
              activeTab === tab.id 
                ? "text-blue-400 border-blue-400" 
                : "text-slate-400 border-transparent hover:text-slate-200"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-8">
        <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[inset_0_0_30px_rgba(255,255,255,0.02)] rounded-[2rem] overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase text-slate-400 font-bold tracking-wider border-b border-white/10">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Status / Type</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Last Updated</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Loading documents...
                    </div>
                  </td>
                </tr>
              ) : filteredDocs.length > 0 ? (
                filteredDocs.map(doc => {
                  const badge = getBadge(doc);
                  return (
                    <tr key={doc.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {getFileIcon(doc.file_type, 'sm')}
                          <div className="flex flex-col">
                            <span className="font-bold text-white group-hover:text-blue-300 transition-colors cursor-pointer" onClick={() => setPreviewDoc(doc)}>
                              {doc.title}
                            </span>
                            <span className="text-[10px] text-slate-500">{doc.version}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border", badge.className)}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-300">{doc.department}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-slate-300">{formatDate(doc.created_at)}</span>
                          <span className="text-[10px] text-slate-500">by {doc.author_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handlePreview(doc)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Preview">
                            <Eye className="w-4 h-4" />
                          </button>
                          {(isBOD || user?.department === doc.department || user?.id === doc.author_id) && (
                            <button 
                              onClick={() => {
                                setUpdatingDoc(doc);
                                setUploadForm({
                                  title: doc.title,
                                  category_type: doc.category_type,
                                  department: doc.department
                                });
                                setIsUploadOpen(true);
                              }}
                              className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors" 
                              title="Update Version"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                          {doc.previous_file_url && (isBOD || user?.department === doc.department || user?.id === doc.author_id) && (
                            <button 
                              onClick={() => handleRollback(doc)}
                              className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition-colors" 
                              title="Rollback"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                          <button 
                            onClick={() => handleDownload(doc)}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" 
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          {isBOD && (
                            <button 
                              onClick={() => handleDelete(doc)}
                              className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors" 
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal (Staff) */}
      <AnimatePresence>
        {isUploadOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setIsUploadOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[inset_0_0_30px_rgba(255,255,255,0.02)] z-[101] overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/[0.03]">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {updatingDoc ? (
                    <><RefreshCw className="w-5 h-5 text-blue-400" /> Update Version</>
                  ) : (
                    <><Upload className="w-5 h-5 text-blue-400" /> Smart Upload</>
                  )}
                </h2>
                <button 
                  onClick={() => {
                    setIsUploadOpen(false);
                    setUpdatingDoc(null);
                  }} 
                  disabled={isSubmitting}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleUploadSubmit} className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">File Upload <span className="text-rose-500">*</span></label>
                  <div className="relative group">
                    <input 
                      type="file" 
                      required
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setSelectedFile(file);
                        if (file && !uploadForm.title) {
                          // Lấy tên file bỏ phần mở rộng
                          const nameWithoutExt = file.name.split('.').slice(0, -1).join('.');
                          setUploadForm(prev => ({ ...prev, title: nameWithoutExt }));
                        }
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Document Title <span className="text-rose-500">*</span></label>
                  <input required type="text" value={uploadForm.title} onChange={e => setUploadForm({...uploadForm, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all" placeholder="e.g. Q4 Marketing Plan" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Category Type</label>
                    <select value={uploadForm.category_type} onChange={e => setUploadForm({...uploadForm, category_type: e.target.value as any})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all appearance-none cursor-pointer">
                      <option value="Guideline" className="text-black">Guideline</option>
                      <option value="Template" className="text-black">Template</option>
                      <option value="Contract" className="text-black">Contract & Agreement</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Department</label>
                    <select 
                      value={uploadForm.department} 
                      onChange={e => setUploadForm({...uploadForm, department: e.target.value})} 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all appearance-none cursor-pointer"
                    >
                      {departments.filter(d => {
                        if (isBOD) return true;
                        return d === 'All' || d === user?.department;
                      }).map(d => <option key={d} value={d} className="text-black">{d}</option>)}
                    </select>
                  </div>
                </div>

                {/* Smart Routing Info */}
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
                  <Folder className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-blue-200/70 leading-relaxed">
                    File will be automatically routed to Google Drive folder: <br/>
                    <strong className="text-blue-400 font-mono">gdrive_{uploadForm.category_type.toLowerCase()}_{uploadForm.department.toLowerCase()}</strong>
                  </p>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting || !selectedFile}
                  className="w-full py-3.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    updatingDoc ? 'Update Document' : 'Save Document'
                  )}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[inset_0_0_30px_rgba(255,255,255,0.02)] z-[201] p-6 text-center"
            >
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
                confirmModal.type === 'update' ? "bg-blue-500/20 text-blue-400" : 
                confirmModal.type === 'rollback' ? "bg-amber-500/20 text-amber-400" :
                "bg-rose-500/20 text-rose-400"
              )}>
                {confirmModal.type === 'update' ? <RefreshCw className="w-8 h-8" /> : 
                 confirmModal.type === 'rollback' ? <RotateCcw className="w-8 h-8" /> :
                 <Trash2 className="w-8 h-8" />}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{confirmModal.title}</h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all border border-white/5 hover:border-white/10"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-white font-bold transition-all",
                    confirmModal.type === 'update' ? "bg-blue-500 hover:bg-blue-600 shadow-[0_0_20px_rgba(59,130,246,0.3)]" : 
                    confirmModal.type === 'rollback' ? "bg-amber-500 hover:bg-amber-600 shadow-[0_0_20px_rgba(245,158,11,0.3)]" :
                    "bg-rose-500 hover:bg-rose-600 shadow-[0_0_20px_rgba(244,63,94,0.3)]"
                  )}
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Preview & Approval Modal */}
      <AnimatePresence>
        {previewDoc && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setPreviewDoc(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-[85vh] bg-black/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[inset_0_0_30px_rgba(255,255,255,0.02)] z-[101] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/[0.03] shrink-0">
                <div className="flex items-center gap-4">
                  {getFileIcon(previewDoc.file_type)}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white leading-tight">{previewDoc.title}</h3>
                      <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold border", getBadge(previewDoc).className)}>
                        {getBadge(previewDoc).label}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">Drive ID: {previewDoc.drive_folder_id} • {previewDoc.version}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 text-xs font-bold transition-colors flex items-center gap-2">
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                  <button onClick={() => setPreviewDoc(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="flex-1 flex overflow-hidden">
                {/* Preview Area */}
                <div className="flex-1 bg-black/50 p-4 overflow-hidden">
                  {previewDoc.file_type === 'pdf' ? (
                    <iframe src={`${previewDoc.file_url}#toolbar=0`} className="w-full h-full rounded-xl border border-white/10 bg-white" title="PDF Preview" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
                      {getFileIcon(previewDoc.file_type)}
                      <p className="text-sm">Preview not available for this file type.</p>
                    </div>
                  )}
                </div>

                {/* Sidebar Details */}
                <div className="w-80 border-l border-white/10 bg-white/[0.03] flex flex-col overflow-y-auto custom-scrollbar">
                  {/* Audit Log */}
                  <div className="p-5 space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Audit Log
                    </h4>
                    <div className="relative">
                      <div className="absolute left-2 top-2 bottom-2 w-px bg-white/10" />
                      <div className="space-y-4">
                        {previewDoc.history.map((item, idx) => (
                          <div key={item.id} className="relative pl-6">
                            <div className="absolute left-1.5 top-1.5 w-1.5 h-1.5 rounded-full bg-slate-500 ring-4 ring-[#0F1115]" />
                            <p className="text-xs text-white font-medium">{item.action}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{item.user_name} • {item.timestamp}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* DB Error Modal */}
      {dbError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-slate-900 border border-red-500/30 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3 text-red-400">
                <AlertCircle className="w-6 h-6" />
                <h2 className="text-xl font-bold">{dbError.title}</h2>
              </div>
              <button 
                onClick={() => setDbError(null)}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <p className="text-slate-300 leading-relaxed">
                {dbError.message}
              </p>
              
              {dbError.sql && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-400 uppercase">SQL Fix Script</label>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(dbError.sql || '');
                        alert('SQL copied to clipboard!');
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <FileCode className="w-3 h-3" /> Copy SQL
                    </button>
                  </div>
                  <pre className="bg-black/50 p-4 rounded-xl border border-white/10 overflow-x-auto text-sm font-mono text-emerald-400">
                    {dbError.sql}
                  </pre>
                  <p className="text-xs text-slate-500 mt-2">
                    Go to your Supabase Dashboard → SQL Editor → New Query, paste this code, and click Run.
                  </p>
                </div>
              )}
              
              <div className="flex justify-end pt-4">
                <button 
                  onClick={() => setDbError(null)}
                  className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
