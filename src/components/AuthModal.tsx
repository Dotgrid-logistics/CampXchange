import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Mail, Lock, User, Camera, Loader2, 
  Chrome, Apple, ArrowRight, ShieldCheck, 
  CheckCircle2, Briefcase, UserCircle2 
} from 'lucide-react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  OAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, storage } from '../lib/firebase';
import { cn } from '../lib/utils';
import { compressImage } from '../lib/image';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AuthMode = 'signin' | 'signup';
type AccountType = 'Individual' | 'Business';

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('Individual');
  const [photoURL, setPhotoURL] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSocialLogin = async (providerName: 'google' | 'apple') => {
    setLoading(true);
    setError(null);
    try {
      let provider;
      if (providerName === 'google') {
        provider = new GoogleAuthProvider();
      } else {
        provider = new OAuthProvider('apple.com');
      }

      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user exists in Firestore
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // Initial setup for social users
        await setDoc(userRef, {
          uid: user.uid,
          name: user.displayName || 'Anonymous',
          email: user.email,
          photoURL: user.photoURL,
          accountType: 'Individual', // Default for social
          createdAt: new Date().toISOString(),
          isVerified: false
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await updateProfile(user, {
          displayName: name,
          photoURL: photoURL || null
        });

        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name,
          email,
          photoURL,
          accountType,
          createdAt: new Date().toISOString(),
          isVerified: false
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const compressedBlob = await compressImage(file);
      const storageRef = ref(storage, `profiles/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, compressedBlob);

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        }, 
        (err: any) => {
          console.error("Profile upload failed:", err);
          setUploading(false);
          setUploadProgress(0);
          if (err.code === 'storage/retry-limit-exceeded') {
            setError("Upload timed out. Check your connection.");
          } else {
            setError("Photo sync failed. Try a smaller file.");
          }
        }, 
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setPhotoURL(url);
          setUploading(false);
          setUploadProgress(0);
        }
      );
    } catch (err: any) {
      console.error("Image processing error:", err);
      setError("Failed to process image.");
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-white dark:bg-charcoal w-full max-w-md border-4 border-charcoal dark:border-white/20 shadow-[12px_12px_0px_#2E5BFF] overflow-hidden rounded-[2.5rem]"
      >
        <div className="p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-3xl font-display font-black uppercase tracking-tighter leading-none mb-2 dark:text-white">
                {mode === 'signin' ? 'Welcome' : 'Join the'} <br />
                <span className="text-brand-blue">{mode === 'signin' ? 'Back' : 'T-Core Hub'}</span>
              </h2>
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-2 flex items-center gap-2">
                <ShieldCheck className="w-3 h-3 text-green-500" />
                TASFUED Verified Access
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors border-2 border-charcoal dark:border-white/20 rounded-xl shadow-[4px_4px_0px_#121212] dark:shadow-[4px_4px_0px_#ffffff10] active:translate-y-1 active:shadow-none text-charcoal dark:text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/10 border-2 border-red-500 rounded-2xl text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-widest">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Social Logins */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button
                onClick={() => handleSocialLogin('google')}
                className="flex items-center justify-center gap-3 py-4 border-2 border-charcoal dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-all rounded-2xl shadow-[4px_4px_0px_#121212] dark:shadow-[4px_4px_0px_#ffffff10] active:translate-y-1 active:shadow-none bg-white dark:bg-transparent dark:text-white"
              >
                <Chrome className="w-5 h-5 text-red-500" />
                <span className="text-[10px] font-black uppercase tracking-widest">Google</span>
              </button>
              <button
                onClick={() => handleSocialLogin('apple')}
                className="flex items-center justify-center gap-3 py-4 border-2 border-charcoal dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-all rounded-2xl shadow-[4px_4px_0px_#121212] dark:shadow-[4px_4px_0px_#ffffff10] active:translate-y-1 active:shadow-none bg-white dark:bg-transparent dark:text-white"
              >
                <Apple className="w-5 h-5" />
                <span className="text-[10px] font-black uppercase tracking-widest">Apple</span>
              </button>
            </div>

            <div className="relative flex items-center justify-center my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100 dark:border-white/5"></div>
              </div>
              <span className="relative px-4 bg-white dark:bg-charcoal text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.3em]">OR USE EMAIL</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <AnimatePresence mode="wait">
                {mode === 'signup' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    {/* Profile Photo Upload */}
                    <div className="flex items-center gap-6 mb-6">
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="relative w-20 h-20 bg-gray-50 dark:bg-white/5 border-2 border-dashed border-charcoal/20 dark:border-white/10 rounded-full flex items-center justify-center cursor-pointer hover:border-brand-blue transition-all group overflow-hidden"
                      >
                        {photoURL ? (
                          <img src={photoURL} className="w-full h-full object-cover" alt="Profile" />
                        ) : (
                          uploading ? (
                            <div className="flex flex-col items-center justify-center">
                              <Loader2 className="w-6 h-6 animate-spin text-brand-blue" />
                              <span className="text-[8px] font-black text-brand-blue mt-1">{uploadProgress}%</span>
                            </div>
                          ) : (
                            <Camera className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                          )
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="text-[8px] font-black text-white uppercase">Upload</span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">Account Type</label>
                        <div className="flex border-2 border-charcoal dark:border-white/20 rounded-xl overflow-hidden">
                          {(['Individual', 'Business'] as AccountType[]).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setAccountType(type)}
                              className={cn(
                                "flex-1 py-2 text-[8px] font-black uppercase tracking-widest transition-all",
                                accountType === type ? "bg-charcoal dark:bg-white text-white dark:text-charcoal" : "bg-white dark:bg-transparent text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5"
                              )}
                            >
                              {type === 'Business' ? <Briefcase className="w-3 h-3 inline mr-1 mb-0.5" /> : <UserCircle2 className="w-3 h-3 inline mr-1 mb-0.5" />}
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handlePhotoUpload} 
                        accept="image/*" 
                        className="hidden" 
                      />
                    </div>

                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        required
                        type="text"
                        placeholder="FULL NAME / BUSINESS NAME"
                        className="w-full bg-gray-50 dark:bg-white/5 border-2 border-charcoal/5 dark:border-white/10 px-12 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl focus:bg-white dark:focus:bg-white/10 focus:border-brand-blue transition-all outline-none dark:text-white"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  required
                  type="email"
                  placeholder="EMAIL ADDRESS"
                  className="w-full bg-gray-50 dark:bg-white/5 border-2 border-charcoal/5 dark:border-white/10 px-12 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl focus:bg-white dark:focus:bg-white/10 focus:border-brand-blue transition-all outline-none dark:text-white"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  required
                  type="password"
                  placeholder="PASSWORD"
                  className="w-full bg-gray-50 dark:bg-white/5 border-2 border-charcoal/5 dark:border-white/10 px-12 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl focus:bg-white dark:focus:bg-white/10 focus:border-brand-blue transition-all outline-none dark:text-white"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-charcoal dark:bg-brand-blue text-white font-black uppercase tracking-[0.2em] text-[11px] rounded-2xl shadow-[8px_8px_0px_rgba(46,91,255,0.4)] dark:shadow-[8px_8px_0px_rgba(0,0,0,0.4)] hover:bg-brand-blue dark:hover:bg-brand-blue/80 transition-all active:translate-y-1 active:shadow-none disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    {mode === 'signin' ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center px-4">
              <button
                onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-brand-blue dark:hover:text-white transition-colors underline underline-offset-4"
              >
                {mode === 'signin' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
              </button>
            </div>
            
            {mode === 'signup' && accountType === 'Business' && (
              <div className="mt-6 p-4 bg-blue-50 dark:bg-brand-blue/10 border-2 border-brand-blue/20 rounded-2xl">
                <p className="text-[9px] font-bold text-brand-blue uppercase tracking-widest leading-relaxed flex gap-2">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  Business accounts get a verified badge and priority listing in search.
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
