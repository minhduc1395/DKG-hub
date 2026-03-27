import { motion } from 'motion/react';
import { Send, User, Mail, MessageSquare, Loader2, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import React from 'react';
import { supabase } from '../lib/supabaseClient';

export function Form() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setIsSuccess(false);

    try {
      const { error: submitError } = await supabase
        .from('inquiries')
        .insert([{
          name: formData.name,
          email: formData.email,
          message: formData.message,
          status: 'Pending'
        }]);

      if (submitError) throw submitError;

      setIsSuccess(true);
      setFormData({ name: '', email: '', message: '' });
      
      // Reset success message after 3 seconds
      setTimeout(() => setIsSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error submitting form:', err);
      setError('Failed to submit your inquiry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full">
      <div className="flex flex-col gap-1">
        <h1 className="text-white text-3xl md:text-4xl font-black tracking-tight">General Inquiry Form</h1>
        <p className="text-blue-200/60 text-base">Submit your questions or feedback directly to the HR team.</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/[0.03] backdrop-blur-2xl rounded-[2rem] border border-white/10 shadow-[inset_0_0_30px_rgba(255,255,255,0.02)] p-8 relative overflow-hidden"
      >
        {isSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-0 left-0 right-0 bg-emerald-500/20 border-b border-emerald-500/30 p-4 flex items-center justify-center gap-2 text-emerald-400 font-bold z-10"
          >
            <CheckCircle2 className="w-5 h-5" />
            Message sent successfully!
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 mt-4">
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-300 ml-1">Full Name</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                  <User className="w-5 h-5" />
                </div>
                <input 
                  required
                  type="text" 
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                />
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-slate-300 ml-1">Email Address</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <input 
                  required
                  type="email" 
                  placeholder="john@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-slate-300 ml-1">Message</label>
            <div className="relative group">
              <div className="absolute left-4 top-4 text-slate-500 group-focus-within:text-blue-400 transition-colors">
                <MessageSquare className="w-5 h-5" />
              </div>
              <textarea 
                required
                rows={5}
                placeholder="How can we help you?"
                value={formData.message}
                onChange={(e) => setFormData({...formData, message: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end mt-2">
            <button 
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <span>Send Message</span>
                  <Send className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
