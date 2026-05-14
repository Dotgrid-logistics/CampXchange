import React, { useState, useRef } from 'react';
import { 
  ArrowLeft, 
  Camera, 
  Save, 
  LogOut, 
  User as UserIcon, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { UserProfile } from '../types';

interface ProfilePageProps {
  user: any;
  userProfile: UserProfile | null;
  onBack: () => void;
  onLogout: () => void;
  isDark: boolean;
}

export function ProfilePage({ user, userProfile, onBack, onLogout, isDark }: ProfilePageProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  
  const [name, setName] = useState(userProfile?.name || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [photoURL, setPhotoURL] = useState(userProfile?.photoURL || '');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    setUploadProgress(10); // Initial progress
    
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('image', file, file.name);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("Upload failed server-side:", result);
        throw new Error(result.message || result.details || 'Upload failed');
      }

      if (result.status === 'success') {
        setPhotoURL(result.url);
        setUploadProgress(100);
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error("Upload error details:", error);
      alert("Image Sync Failed: " + error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      // Update Firebase Auth Profile
      await updateProfile(user, {
        displayName: name,
        photoURL: photoURL
      });

      // Update Firestore User Doc
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        name,
        phone,
        photoURL,
        updatedAt: new Date().toISOString()
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Update failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-4xl mx-auto py-8 px-4"
    >
      {/* Header with Back Button */}
      <div className="flex items-center gap-6 mb-12">
        <button 
          onClick={onBack}
          className={cn(
            "p-4 border-4 transition-all active:translate-y-1 shadow-[4px_4px_0px_#121212] rounded-2xl",
            isDark ? "bg-white text-charcoal border-white" : "bg-charcoal text-white border-charcoal"
          )}
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter dark:text-white">Profile <span className="text-brand-blue">Settings</span></h1>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Manage your digital identity</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card Summary */}
        <div className="lg:col-span-1">
          <div className={cn(
            "p-8 border-4 border-charcoal dark:border-white/20 shadow-[12px_12px_0px_#2E5BFF] transition-all rounded-[2.5rem]",
            isDark ? "bg-white/5" : "bg-white"
          )}>
            <div className="flex flex-col items-center text-center">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="relative w-32 h-32 bg-gray-50 dark:bg-white/5 border-4 border-dashed border-charcoal/20 dark:border-white/10 rounded-full flex items-center justify-center cursor-pointer hover:border-brand-blue transition-all group overflow-hidden mb-6"
              >
                {photoURL ? (
                  <img src={photoURL} className="w-full h-full object-cover" alt="Profile" />
                ) : (
                  <UserIcon className="w-12 h-12 text-gray-300" />
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="text-[10px] font-black mt-2">{uploadProgress}%</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              </div>
              
              <h2 className="text-2xl font-black uppercase tracking-tighter mb-1 dark:text-white">{userProfile?.name}</h2>
              <div className="bg-brand-blue/10 px-3 py-1 rounded-full mb-4">
                <span className="text-[9px] font-black text-brand-blue uppercase tracking-widest">{userProfile?.accountType} Account</span>
              </div>
              
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8 break-all">{userProfile?.email}</p>
              
              <button 
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-3 py-4 border-2 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all font-black uppercase text-[10px] tracking-widest rounded-2xl"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSave} className={cn(
            "p-8 border-4 border-charcoal dark:border-white/20 shadow-[8px_8px_0px_#121212] dark:shadow-[8px_8px_0px_#ffffff10] transition-all rounded-[2.5rem]",
            isDark ? "bg-white/5" : "bg-white"
          )}>
            <div className="space-y-8">
              <div className="flex items-center gap-3 pb-4 border-b-2 border-charcoal/5 dark:border-white/5">
                <ShieldCheck className="w-5 h-5 text-green-500" />
                <h3 className="text-sm font-black uppercase tracking-widest dark:text-white">Verified Account Details</h3>
              </div>

              {/* Success Message */}
              <AnimatePresence>
                {success && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 bg-green-500 text-white rounded-2xl flex items-center gap-3 shadow-lg"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Profile updated successfully!</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Username / Display Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-white/5 border-2 border-charcoal/10 dark:border-white/10 px-12 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl focus:bg-white dark:focus:bg-white/10 focus:border-brand-blue transition-all outline-none dark:text-white"
                      placeholder="ENTER YOUR NAME"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Verified WhatsApp Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-white/5 border-2 border-charcoal/10 dark:border-white/10 px-12 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl focus:bg-white dark:focus:bg-white/10 focus:border-brand-blue transition-all outline-none dark:text-white"
                      placeholder="+234..."
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Email Address</label>
                <div className="relative opacity-50">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="email"
                    disabled
                    value={userProfile?.email || ''}
                    className="w-full bg-gray-100 dark:bg-white/5 border-2 border-charcoal/10 dark:border-white/10 px-12 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl outline-none cursor-not-allowed dark:text-gray-400"
                  />
                  <ShieldCheck className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-blue" />
                </div>
                <p className="text-[8px] font-bold text-gray-400 uppercase italic ml-1">Your registered email is used for identity verification.</p>
              </div>

              <button 
                type="submit"
                disabled={loading || uploading}
                className="w-full py-5 bg-charcoal dark:bg-brand-blue text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl shadow-[8px_8px_0px_rgba(46,91,255,0.4)] dark:shadow-[8px_8px_0px_rgba(0,0,0,0.2)] hover:bg-brand-blue dark:hover:bg-brand-blue/80 transition-all active:translate-y-1 active:shadow-none disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {loading ? 'DEPLOYING CHANGES...' : 'SAVE PROFILE UPDATES'}
              </button>
            </div>
          </form>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleImageUpload} 
          />
        </div>
      </div>
    </motion.div>
  );
}
