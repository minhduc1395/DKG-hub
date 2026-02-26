import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabaseClient';
import { Lock, Check, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export function Settings() {
  const { user } = useUser();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!newPassword || !confirmPassword || !currentPassword) {
      setMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmChangePassword = async () => {
    setShowConfirmDialog(false);
    setIsLoading(true);
    setMessage(null);

    try {
      if (!user?.email) throw new Error('User email not found');

      // 1. Verify old password by attempting to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error('Incorrect current password');
      }

      // 2. Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      setMessage({ type: 'success', text: 'Password updated successfully' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update password' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Settings</h1>
          <p className="text-slate-400 mt-1">Manage your account preferences and security.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Security Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Security</h2>
              <p className="text-sm text-slate-400">Update your password and security settings</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="max-w-md space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="Enter new password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="Re-enter new password"
              />
            </div>

            {message && (
              <div
                className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
                  message.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                {message.type === 'success' ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                {message.text}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Change Password
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-xl"
          >
            <h3 className="text-xl font-bold text-white mb-2">Confirm Password Change</h3>
            <p className="text-slate-400 mb-6">
              Are you sure you want to change your password? You will need to use the new password for future logins.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmChangePassword}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
