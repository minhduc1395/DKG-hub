import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, FileText, FileImage, FileCode, Download, Eye, MoreVertical, Folder, Clock, Upload, CheckSquare, X, CheckCircle, XCircle, Book, FileSignature, AlertCircle, File as FileIcon } from 'lucide-react';
import { User } from '../types';
import { cn } from '../lib/utils';

interface DocumentHistory {
  id: string;
  action: string;
  user: string;
  timestamp: string;
}

interface Document {
  id: string;
  title: string;
  category_type: 'Guideline' | 'Template' | 'Contract';
  department: string;
  type: 'pdf' | 'image' | 'doc' | 'sheet';
  size: string;
  updatedAt: string;
  author: string;
  tags: string[];
  version: string;
  url: string;
  drive_folder_id?: string;
  history: DocumentHistory[];
}

const mockDocuments: Document[] = [
  {
    id: '1',
    title: 'Employee Handbook 2024.pdf',
    category_type: 'Guideline',
    department: 'HR',
    type: 'pdf',
    size: '2.4 MB',
    updatedAt: '2 hours ago',
    author: 'HR Dept',
    tags: ['Policy', 'HR'],
    version: 'v2.0',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    drive_folder_id: 'gdrive_guideline_hr',
    history: [{ id: 'h1', action: 'Uploaded', user: 'HR Dept', timestamp: '2 hours ago' }]
  },
  {
    id: '2',
    title: 'Vendor Contract Template.doc',
    category_type: 'Template',
    department: 'Legal',
    type: 'doc',
    size: '45 KB',
    updatedAt: '1 month ago',
    author: 'Legal Team',
    tags: ['Template', 'Vendor'],
    version: 'v1.1',
    url: '#',
    drive_folder_id: 'gdrive_template_legal',
    history: [{ id: 'h2', action: 'Uploaded', user: 'Legal Team', timestamp: '1 month ago' }]
  },
  {
    id: '3',
    title: 'Tech Summit Venue Agreement.pdf',
    category_type: 'Contract',
    department: 'Event',
    type: 'pdf',
    size: '1.5 MB',
    updatedAt: '1 day ago',
    author: 'Alex Morgan',
    tags: ['Contract', 'TechSummit'],
    version: 'v1.0',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    drive_folder_id: 'gdrive_contract_event',
    history: [
      { id: 'h3', action: 'Uploaded', user: 'Alex Morgan', timestamp: '1 day ago' }
    ]
  },
  {
    id: '4',
    title: 'Q4 Marketing Agency NDA.pdf',
    category_type: 'Contract',
    department: 'Marketing',
    type: 'pdf',
    size: '800 KB',
    updatedAt: '3 days ago',
    author: 'Alex Morgan',
    tags: ['NDA', 'Marketing'],
    version: 'v1.0',
    url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    drive_folder_id: 'gdrive_contract_marketing',
    history: [
      { id: 'h4', action: 'Uploaded', user: 'Alex Morgan', timestamp: '4 days ago' }
    ]
  }
];

const departments = ['HR', 'Event', 'Marketing', 'Finance', 'Legal'];
const usersList = ['Sarah Jenkins', 'John Doe', 'System Admin'];

interface DocumentsProps {
  user: User;
}

export function Documents({ user }: DocumentsProps) {
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'Guidelines' | 'Templates' | 'Contracts'>('Guidelines');
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Upload Form State
  const [uploadForm, setUploadForm] = useState({
    title: '',
    category_type: 'Guideline' as Document['category_type'],
    department: 'Event'
  });

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

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newDoc: Document = {
      id: `doc-${Date.now()}`,
      title: uploadForm.title,
      category_type: uploadForm.category_type,
      department: uploadForm.department,
      type: 'pdf',
      size: '1.2 MB',
      updatedAt: 'Just now',
      author: user.name,
      tags: [uploadForm.department, uploadForm.category_type],
      version: 'v1.0',
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      drive_folder_id: `gdrive_${uploadForm.category_type.toLowerCase()}_${uploadForm.department.toLowerCase()}`,
      history: [{
        id: `h-${Date.now()}`,
        action: 'Uploaded',
        user: user.name,
        timestamp: 'Just now'
      }]
    };

    setDocuments([newDoc, ...documents]);
    setIsUploadOpen(false);
    setUploadForm({ title: '', category_type: 'Guideline', department: 'Event' });
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
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
      <div className="flex items-center gap-6 border-b border-white/10">
        {[
          { id: 'Guidelines', label: 'Guidelines', icon: Book },
          { id: 'Templates', label: 'Templates', icon: FileCode },
          { id: 'Contracts', label: 'Contracts & Agreements', icon: FileSignature },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "pb-4 text-sm font-bold transition-all flex items-center gap-2 border-b-2",
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
        <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase text-slate-400 font-bold tracking-wider border-b border-white/10">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Status / Type</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Last Updated</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredDocs.map(doc => {
                const badge = getBadge(doc);
                return (
                  <tr key={doc.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {getFileIcon(doc.type, 'sm')}
                        <div className="flex flex-col">
                          <span className="font-bold text-white group-hover:text-blue-300 transition-colors cursor-pointer" onClick={() => setPreviewDoc(doc)}>
                            {doc.title}
                          </span>
                          <span className="text-[10px] text-slate-500">{doc.size} • {doc.version}</span>
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
                        <span className="text-slate-300">{doc.updatedAt}</span>
                        <span className="text-[10px] text-slate-500">by {doc.author}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setPreviewDoc(doc)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Preview">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors" title="Download">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No documents found in this section.
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
              onClick={() => setIsUploadOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-[#0F1115] border border-white/10 rounded-[2rem] shadow-2xl z-[101] overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-blue-400" /> Smart Upload
                </h2>
                <button onClick={() => setIsUploadOpen(false)} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleUploadSubmit} className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase">Document Title</label>
                  <input required type="text" value={uploadForm.title} onChange={e => setUploadForm({...uploadForm, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors" placeholder="e.g. Q4 Marketing Plan" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Category Type</label>
                    <select value={uploadForm.category_type} onChange={e => setUploadForm({...uploadForm, category_type: e.target.value as any})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none">
                      <option value="Guideline" className="text-black">Guideline</option>
                      <option value="Template" className="text-black">Template</option>
                      <option value="Contract" className="text-black">Contract & Agreement</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Department</label>
                    <select value={uploadForm.department} onChange={e => setUploadForm({...uploadForm, department: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none">
                      {departments.map(d => <option key={d} value={d} className="text-black">{d}</option>)}
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

                {/* Assignment Fields for Contracts removed */}

                <button type="submit" className="w-full py-3.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold transition-all shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                  Upload Document
                </button>
              </form>
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
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-[85vh] bg-[#0F1115] border border-white/10 rounded-[2rem] shadow-2xl z-[101] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5 shrink-0">
                <div className="flex items-center gap-4">
                  {getFileIcon(previewDoc.type)}
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white leading-tight">{previewDoc.title}</h3>
                      <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold border", getBadge(previewDoc).className)}>
                        {getBadge(previewDoc).label}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">Drive ID: {previewDoc.drive_folder_id} • {previewDoc.size}</span>
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
                  {previewDoc.type === 'pdf' ? (
                    <iframe src={`${previewDoc.url}#toolbar=0`} className="w-full h-full rounded-xl border border-white/10 bg-white" title="PDF Preview" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
                      {getFileIcon(previewDoc.type)}
                      <p className="text-sm">Preview not available for this file type.</p>
                    </div>
                  )}
                </div>

                {/* Sidebar Details */}
                <div className="w-80 border-l border-white/10 bg-white/5 flex flex-col overflow-y-auto custom-scrollbar">
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
                            <p className="text-[10px] text-slate-500 mt-0.5">{item.user} • {item.timestamp}</p>
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
    </div>
  );
}
