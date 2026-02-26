import { useState, useMemo } from 'react';
import React from 'react';
import { motion } from 'motion/react';
import { Hexagon, Lock, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [view, setView] = useState<'login' | 'forgot_password'>('login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccessMessage('Check your email for the password reset link');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate random stars
  const stars = useMemo(() => {
    const baseStars = [...Array(150)].map((_, i) => ({
      id: i,
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 1.5 + 0.5, // Random size between 0.5px and 2px
      opacity: Math.random() * 0.5 + 0.1, // Random opacity
      animationDuration: Math.random() * 3 + 2,
      isHero: false,
    }));

    // Add 2 hero stars
    const heroStars = [...Array(2)].map((_, i) => ({
      id: 150 + i,
      top: `${Math.random() * 60 + 10}%`, // Keep them somewhat central vertically
      left: `${Math.random() * 80 + 10}%`, // Keep them somewhat central horizontally
      size: Math.random() * 2 + 3, // Larger size (3-5px)
      opacity: 0.9, // High opacity
      animationDuration: 4,
      isHero: true,
    }));

    return [...baseStars, ...heroStars];
  }, []);

  // Daily Quote Logic (Updates after 8 AM)
  const dailyQuote = useMemo(() => {
    const quotes = [
      { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
      { text: "Success is not final, failure is not fatal: It is the courage to continue that counts.", author: "Winston Churchill" },
      { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
      { text: "Your time is limited, so don't waste it living someone else's life.", author: "Steve Jobs" },
      { text: "I have not failed. I've just found 10,000 ways that won't work.", author: "Thomas Edison" },
      { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
      { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
      { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
      { text: "Hardships often prepare ordinary people for an extraordinary destiny.", author: "C.S. Lewis" },
      { text: "Dream big and dare to fail.", author: "Norman Vaughan" },
    ];

    const now = new Date();
    // If before 8 AM, use yesterday's date to keep the previous day's quote
    if (now.getHours() < 8) {
      now.setDate(now.getDate() - 1);
    }
    const dateStr = now.toDateString();
    
    // Simple hash to pick a quote based on the date
    let hash = 0;
    for (let i = 0; i < dateStr.length; i++) {
      hash = dateStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % quotes.length;
    return quotes[index];
  }, []);

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
      {/* Layer 1: The Foundation */}
      <div className="absolute inset-0 bg-black"></div>

      {/* Layer 2: The Atmosphere / Nebula */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,_rgba(14,58,118,0.5)_0%,_rgba(0,0,0,1)_70%)] blur-3xl"></div>

      {/* Layer 3: The Core Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-blue-900/20 blur-[100px]"></div>

      {/* Layer 4: The Stars (Randomized) */}
      <div className="absolute inset-0 z-0">
        {stars.map((star) => (
          <motion.div
            key={star.id}
            className={`absolute rounded-full mix-blend-screen ${star.isHero ? 'bg-blue-100 shadow-[0_0_10px_2px_rgba(255,255,255,0.8)]' : 'bg-white'}`}
            style={{
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
            }}
            animate={{ 
              opacity: star.isHero 
                ? [0.9, 0.5, 0.9] 
                : [star.opacity, star.opacity * 0.3, star.opacity],
              scale: star.isHero ? [1, 1.2, 1] : 1,
            }}
            transition={{ 
              duration: star.animationDuration, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
          />
        ))}
      </div>

      {/* Layer 5: The Texture */}
      <div 
        className="absolute inset-0 opacity-5 pointer-events-none mix-blend-overlay" 
        style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }}
      ></div>

      {/* Layer 6: Planet & Horizon Curve */}
      <div className="absolute top-[65%] left-1/2 -translate-x-1/2 w-[600vw] h-[600vw] rounded-full bg-black z-0 pointer-events-none shadow-[0_-50px_150px_rgba(59,130,246,0.15)] overflow-hidden">
        {/* Surface Atmosphere Glow (Below Horizon) - Adds realism to the dark side */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[300px] bg-gradient-to-b from-blue-600/10 via-indigo-900/10 to-transparent blur-[60px] rounded-b-[100%]"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[40%] h-[150px] bg-blue-400/5 blur-[40px] rounded-b-[100%]"></div>

        {/* Glow Layer 1: Wide, Soft Blue - Tapered to screen edges */}
        <div 
          className="absolute inset-0 rounded-full shadow-[0_-80px_120px_rgba(37,99,235,0.25)]" 
          style={{ 
            maskImage: 'linear-gradient(to right, transparent 42%, black 50%, transparent 58%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 42%, black 50%, transparent 58%)' 
          }}
        ></div>

        {/* Glow Layer 2: Medium, Brighter Blue/White - More Tapered */}
        <div 
          className="absolute inset-0 rounded-full shadow-[0_-40px_60px_rgba(255,255,255,0.15)]" 
          style={{ 
            maskImage: 'linear-gradient(to right, transparent 44%, black 50%, transparent 56%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 44%, black 50%, transparent 56%)' 
          }}
        ></div>

        {/* Glow Layer 3: Sharp Rim Light - Highly Tapered */}
        <div 
          className="absolute inset-0 rounded-full border-t-[2px] border-white/50 blur-[2px]" 
          style={{ 
            maskImage: 'linear-gradient(to right, transparent 45%, black 50%, transparent 55%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 45%, black 50%, transparent 55%)' 
          }}
        ></div>
         
        {/* Glow Layer 4: Core Hotspot - Very Narrow */}
        <div 
          className="absolute inset-0 rounded-full border-t-[1px] border-white/90 blur-[1px]" 
          style={{ 
            maskImage: 'linear-gradient(to right, transparent 48%, black 50%, transparent 52%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 48%, black 50%, transparent 52%)' 
          }}
        ></div>
      </div>

      {/* Login Card - Full Liquid Glass Redesign */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="w-full max-w-[260px] md:max-w-md p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] bg-white/[0.01] backdrop-blur-[40px] border border-white/[0.08] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5),_inset_0_0_30px_rgba(255,255,255,0.02)] relative z-10 mx-4 overflow-hidden group/card"
      >
        {/* Card Gloss/Reflection */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-black/[0.1] pointer-events-none rounded-[1.5rem] md:rounded-[2rem]" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-50" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-30" />

        <div className="relative z-10">
          <div className="flex flex-col items-center gap-4 md:gap-6 mb-6 md:mb-10">
            {/* Liquid Glass Logo Container - Refined (Ultra Clear 30% feel) */}
            <div className="w-16 h-16 md:w-28 md:h-28 rounded-[1.5rem] md:rounded-[2.5rem] relative group mb-2 md:mb-4 flex items-center justify-center">
               {/* Main Glass Body - Reduced opacity with blur */}
              <div className="absolute inset-0 rounded-[1.5rem] md:rounded-[2.5rem] bg-gradient-to-br from-white/[0.03] via-white/[0.01] to-transparent backdrop-blur-xl border border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.05),_inset_0_1px_1px_rgba(255,255,255,0.3),_0_20px_40px_rgba(0,0,0,0.4)]"></div>
              
              {/* Top Specular Highlight - The "Gloss" */}
              <div className="absolute top-2 left-4 right-4 h-6 md:h-12 bg-gradient-to-b from-white/20 to-transparent rounded-full blur-[8px] pointer-events-none opacity-60"></div>
              
              {/* Bottom Rim Light - The "Thickness" */}
              <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-white/05 to-transparent rounded-b-[1.5rem] md:rounded-b-[2.5rem] pointer-events-none"></div>
              
              {/* Subtle Iridescence/Color hint */}
              <div className="absolute -inset-1 bg-gradient-to-tr from-blue-400/05 via-transparent to-purple-400/05 rounded-[1.5rem] md:rounded-[2.5rem] blur-xl opacity-30 pointer-events-none"></div>

              <img src="https://i.postimg.cc/nr1gWnR4/Untitled_design_(3).png" alt="DKG Logo" className="w-10 h-10 md:w-16 md:h-16 object-contain relative z-10 drop-shadow-[0_5px_15px_rgba(0,0,0,0.3)]" referrerPolicy="no-referrer" />
            </div>
            <div className="text-center">
              <h1 className="text-xl md:text-3xl font-black text-white mb-2 md:mb-4 tracking-tight drop-shadow-lg">
                {view === 'login' ? 'Welcome to DKG' : 'Reset Password'}
              </h1>
              <div className="flex flex-col gap-1 max-w-xs mx-auto">
                <p className="text-blue-200/90 text-[10px] md:text-sm font-medium italic">"{dailyQuote.text}"</p>
                <p className="text-blue-200/60 text-[8px] md:text-xs font-medium italic text-right">- {dailyQuote.author}</p>
              </div>
            </div>
          </div>

          <form onSubmit={view === 'login' ? handleSubmit : handleResetPassword} className="flex flex-col gap-4 md:gap-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-2 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {successMessage && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-start gap-2 text-emerald-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}
            
            <div className="space-y-3 md:space-y-5">
              <div className="relative group">
                <div className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-blue-200/50 group-focus-within:text-blue-300 transition-colors z-20">
                  <User className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <div className="absolute inset-0 bg-white/[0.03] rounded-xl md:rounded-2xl border border-white/10 backdrop-blur-md transition-all duration-300 group-focus-within:bg-white/[0.07] group-focus-within:border-white/20 group-focus-within:shadow-[0_0_20px_rgba(59,130,246,0.15)] pointer-events-none" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-transparent rounded-xl md:rounded-2xl py-3 md:py-4 pl-10 md:pl-14 pr-4 text-sm md:text-base text-white placeholder:text-blue-200/20 focus:outline-none relative z-10 transition-all duration-300"
                  required
                />
              </div>
              
              {view === 'login' && (
                <div className="relative group">
                  <div className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-blue-200/50 group-focus-within:text-blue-300 transition-colors z-20">
                    <Lock className="w-4 h-4 md:w-5 md:h-5" />
                  </div>
                  <div className="absolute inset-0 bg-white/[0.03] rounded-xl md:rounded-2xl border border-white/10 backdrop-blur-md transition-all duration-300 group-focus-within:bg-white/[0.07] group-focus-within:border-white/20 group-focus-within:shadow-[0_0_20px_rgba(59,130,246,0.15)] pointer-events-none" />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent rounded-xl md:rounded-2xl py-3 md:py-4 pl-10 md:pl-14 pr-4 text-sm md:text-base text-white placeholder:text-blue-200/20 focus:outline-none relative z-10 transition-all duration-300"
                    required
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button 
                type="button" 
                onClick={() => {
                  setView(view === 'login' ? 'forgot_password' : 'login');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="text-[10px] md:text-xs font-medium text-blue-300/60 hover:text-blue-300 transition-colors"
              >
                {view === 'login' ? 'Forgot Password?' : 'Back to Login'}
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full relative group overflow-hidden rounded-xl md:rounded-2xl transition-all duration-500 transform hover:-translate-y-1 hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.4),_inset_0_0_20px_rgba(255,255,255,0.05)] active:scale-[0.98] disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {/* Main Glass Body - Natural & Seamless */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent backdrop-blur-md border border-white/10 group-hover:border-white/20 transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] rounded-xl md:rounded-2xl" />
              
              {/* Top Gloss - Softer & Natural */}
              <div className="absolute top-0 inset-x-0 h-[40%] bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-t-xl md:rounded-t-2xl" />
              
              {/* Bottom Rim - Softer */}
              <div className="absolute bottom-0 inset-x-0 h-[30%] bg-gradient-to-t from-white/10 to-transparent opacity-50 rounded-b-xl md:rounded-b-2xl" />

              {/* Content */}
              <div className="relative z-10 py-3 md:py-4 flex items-center justify-center gap-2 text-white font-bold tracking-wide text-base md:text-lg drop-shadow-md">
                {isLoading ? (
                  <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" />
                ) : (
                  <>
                    {view === 'login' ? 'LOGIN' : 'SEND RESET LINK'}
                    <ArrowRight className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-1 transition-transform duration-300" />
                  </>
                )}
              </div>
              
              {/* Sweep Effect - Smoother & Contained */}
              <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out skew-x-[-20deg] pointer-events-none" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
