import React, { useState, useRef } from 'react';
import { X, Upload, Link as LinkIcon, Grid, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AvatarPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (url: string) => void;
  currentAvatar: string;
}

const defaultCategories = [
  { id: 'cute-1', label: 'Happy', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Happy' },
  { id: 'cute-2', label: 'Cool', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Cool' },
  { id: 'cute-3', label: 'Love', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Love' },
  { id: 'cute-4', label: 'Wink', url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Wink' },
  { id: 'cute-5', label: 'Cute', url: 'https://api.dicebear.com/7.x/big-smile/svg?seed=Cute' },
  { id: 'cute-6', label: 'Smile', url: 'https://api.dicebear.com/7.x/big-smile/svg?seed=Smile' },
  { id: 'cute-7', label: 'Bear', url: 'https://api.dicebear.com/7.x/big-ears/svg?seed=Bear' },
  { id: 'cute-8', label: 'Cat', url: 'https://api.dicebear.com/7.x/big-ears/svg?seed=Cat' },
  { id: 'cute-9', label: 'Panda', url: 'https://api.dicebear.com/7.x/big-ears/svg?seed=Panda' },
];

export function AvatarPicker({ isOpen, onClose, onSave, currentAvatar }: AvatarPickerProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'link' | 'default'>('upload');
  const [previewUrl, setPreviewUrl] = useState<string>(currentAvatar);
  const [linkInput, setLinkInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLinkInput(e.target.value);
    // Simple debounce or just let user click a "Preview" button? 
    // Let's just update preview on valid url or have a button.
    // For simplicity, we'll update preview when they click a "Load" button or blur?
    // Let's just set it directly for now, user can see if it breaks.
    if (e.target.value.startsWith('http')) {
        setPreviewUrl(e.target.value);
    }
  };

  const handleSave = () => {
    onSave(previewUrl);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#0F1115] border border-white/10 rounded-3xl shadow-2xl z-[101] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <h2 className="text-xl font-bold text-white">Update Avatar</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6">
              {/* Preview */}
              <div className="flex justify-center">
                <div className="w-32 h-32 rounded-full border-4 border-white/10 overflow-hidden bg-white/5">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                </div>
              </div>

              {/* Tabs */}
              <div className="flex p-1 bg-white/5 rounded-xl">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'upload' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Upload
                </button>
                <button
                  onClick={() => setActiveTab('link')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'link' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LinkIcon className="w-4 h-4" />
                  Link
                </button>
                <button
                  onClick={() => setActiveTab('default')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'default' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                  Default
                </button>
              </div>

              {/* Content */}
              <div className="min-h-[200px]">
                {activeTab === 'upload' && (
                  <div className="flex flex-col items-center justify-center h-full gap-4 border-2 border-dashed border-white/10 rounded-2xl p-8 hover:border-blue-500/50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-slate-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-white">Click to upload</p>
                      <p className="text-xs text-slate-400 mt-1">SVG, PNG, JPG or GIF</p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                )}

                {activeTab === 'link' && (
                  <div className="flex flex-col gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-400 uppercase">Image URL</label>
                      <input
                        type="text"
                        value={linkInput}
                        onChange={handleLinkChange}
                        placeholder="https://example.com/image.jpg"
                        className="w-full p-3 bg-white/5 text-white border border-white/10 rounded-xl placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      Paste a direct link to an image. The preview will update automatically.
                    </p>
                  </div>
                )}

                {activeTab === 'default' && (
                  <div className="grid grid-cols-3 gap-3 overflow-y-auto max-h-[200px] pr-2">
                    {defaultCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setPreviewUrl(cat.url)}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                          previewUrl === cat.url ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-transparent hover:border-white/20'
                        }`}
                      >
                        <img src={cat.url} alt={cat.label} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <span className="text-[10px] font-bold text-white uppercase tracking-wider">{cat.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-white/5 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl font-bold text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex-1 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg hover:shadow-blue-500/20 transition-all"
              >
                Save
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
