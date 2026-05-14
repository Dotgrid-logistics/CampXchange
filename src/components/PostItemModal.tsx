import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Upload, Loader2, Camera, Image as ImageIcon } from 'lucide-react';
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3';
import { generateItemDetails } from '../services/geminiService';
import { Category, UserProfile } from '../types';
import { cn } from '../lib/utils';
import { compressImage } from '../lib/image';

interface PostItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  user: any;
  userProfile: UserProfile | null;
}

export function PostItemModal({ isOpen, onClose, onSubmit, user, userProfile }: PostItemModalProps) {
  const [loading, setLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    description: '',
    category: 'Other' as Category,
    campus: userProfile?.campus || 'TASFUED',
    sellerPhone: userProfile?.phone || '',
    keywords: '',
    condition: 'Used' as 'Used' | 'New',
    exchangeLocation: 'School gate',
    customExchangeLocation: '',
    imageUrl: '',
    meetingTime: '09:00 AM'
  });

  const getListingFee = (price: string) => {
    const p = parseFloat(price);
    if (isNaN(p)) return 0;
    if (p < 5000) return 100;
    if (p < 20000) return 200;
    return 500;
  };

  const listingPrice = getListingFee(formData.price);

  const config = useMemo(() => ({
    public_key: (import.meta.env.VITE_FLUTTERWAVE_PUBLIC_KEY || '').trim(),
    tx_ref: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    amount: listingPrice,
    currency: 'NGN',
    payment_options: 'card,mobilemoney,ussd',
    customer: {
      email: user?.email || 'anonymous@campxchange.com',
      phone_number: formData.sellerPhone || '0000000000',
      name: user?.displayName || 'CampXchange User',
    },
    customizations: {
      title: 'CampXchange Listing',
      description: `Payment for listing: ${formData.title}`,
      logo: 'https://st2.depositphotos.com/4403291/7418/v/450/depositphotos_74189661-stock-illustration-abstract-logo-template.jpg',
    },
  }), [listingPrice, user, formData.sellerPhone, formData.title]);

  const handleFlutterPayment = useFlutterwave(config);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(10);
    try {
      const compressedBlob = await compressImage(file);
      const uploadFormData = new FormData();
      uploadFormData.append('image', compressedBlob, file.name);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Upload failed');
      
      setFormData(prev => ({ ...prev, imageUrl: result.url }));
      setUploadProgress(100);
    } catch (error: any) {
      console.error("Upload error:", error);
      alert("Upload failed: " + error.message);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  const handleAiAssist = async () => {
    if (!formData.keywords) return;
    setAiGenerating(true);
    try {
      const { title, description } = await generateItemDetails(formData.keywords);
      setFormData(prev => ({ ...prev, title, description }));
    } catch (e) {
      alert("AI Assistant failed. Try again.");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.imageUrl) {
      alert("Please upload an image.");
      return;
    }
    
    const key = config.public_key;
    if (!key) {
      alert("Payment system not configured. Please set VITE_FLUTTERWAVE_PUBLIC_KEY in Settings.");
      return;
    }

    if (!key.startsWith('FLWPUBK')) {
      alert("Invalid Public Key Format. It should start with 'FLWPUBK'. Please check your environment variables.");
      return;
    }

    console.log("Initializing Flutterwave with key snippet:", key.substring(0, 10) + "..." + key.substring(key.length - 4));
    setLoading(true);

    handleFlutterPayment({
      callback: async (response) => {
        closePaymentModal();
        
        if (response.status === "successful" || response.status === "completed") {
          try {
            const verifyRes = await fetch('/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                transaction_id: response.transaction_id,
                expected_amount: listingPrice
              })
            });

            const verifyData = await verifyRes.json();

            if (verifyData.status === 'success') {
              await onSubmit({
                ...formData,
                price: parseFloat(formData.price),
                listingPrice: listingPrice,
                sellerName: user?.displayName || 'Anonymous',
                userId: user?.uid,
                isVerified: true, // Marked as verified because payment was successful
                paymentRef: response.tx_ref,
                createdAt: new Date().toISOString()
              });
              onClose();
            } else {
              alert("Verification failed: " + verifyData.message);
            }
          } catch (err) {
            alert("Error confirming payment.");
          }
        } else {
          alert("Payment was not successful.");
        }
        setLoading(false);
      },
      onClose: () => {
        setLoading(false);
      },
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-white dark:bg-charcoal w-full max-w-xl border-4 border-charcoal dark:border-white/20 shadow-[12px_12px_0px_#2E5BFF] overflow-hidden overflow-y-auto max-h-[90vh] rounded-[2rem]"
      >
        <div className="p-6 border-b-4 border-charcoal dark:border-white/10 flex items-center justify-between sticky top-0 bg-white dark:bg-charcoal z-10">
          <h2 className="text-2xl font-display font-black uppercase tracking-tighter dark:text-white">Post <span className="text-brand-blue">New Listing</span></h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors border-2 border-charcoal dark:border-white/20 rounded-xl text-charcoal dark:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Image Upload Area */}
          <div className="space-y-4">
             <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Hero Image</label>
             <div 
              onClick={() => !uploading && fileInputRef.current?.click()}
              className="relative aspect-video bg-gray-50 dark:bg-white/5 border-4 border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center cursor-pointer hover:border-brand-blue hover:bg-brand-blue/5 transition-all overflow-hidden group rounded-3xl"
             >
                {formData.imageUrl ? (
                  <>
                    <img src={formData.imageUrl} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-charcoal/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                  </>
                ) : (
                  <>
                    {uploading ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="relative">
                          <Loader2 className="w-12 h-12 text-brand-blue animate-spin" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] font-black text-brand-blue">{uploadProgress}%</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-black text-brand-blue uppercase tracking-widest animate-pulse">Syncing Image...</span>
                          <span className="text-[8px] font-bold text-gray-400 uppercase mt-1">Don't close modal</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="w-10 h-10 text-gray-300 mb-2" />
                        <span className="text-xs font-black uppercase tracking-widest text-gray-400">Click to upload photo</span>
                      </>
                    )}
                  </>
                )}
             </div>
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          </div>

          {/* AI Helper Section */}
          <div className="p-6 bg-brand-blue border-4 border-charcoal dark:border-white/20 shadow-[4px_4px_0px_#121212] dark:shadow-[4px_4px_0px_#ffffff10] space-y-4 rounded-3xl">
            <label className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-3 h-3" />
              AI Description Assist
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g., fairly used OX fan, 3 months old..."
                className="flex-1 bg-white border-2 border-charcoal dark:border-white/20 px-4 py-3 text-xs font-bold uppercase tracking-widest outline-none focus:bg-gray-50 rounded-xl text-charcoal"
                value={formData.keywords}
                onChange={(e) => setFormData(p => ({ ...p, keywords: e.target.value }))}
              />
              <button
                type="button"
                disabled={aiGenerating || !formData.keywords}
                onClick={handleAiAssist}
                className="bg-charcoal dark:bg-white dark:text-charcoal text-white px-6 py-3 hover:bg-black transition-colors disabled:opacity-50 border-2 border-white dark:border-charcoal rounded-xl"
              >
                {aiGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-[9px] text-white/80 font-bold uppercase tracking-tighter">Enter keywords & let Gemini pitch it for you.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Title</label>
              <input
                required
                type="text"
                className="w-full bg-gray-50 dark:bg-white/5 border-2 border-charcoal dark:border-white/20 px-4 py-3 text-xs font-bold uppercase tracking-widest focus:bg-white dark:focus:bg-white/10 outline-none rounded-xl dark:text-white"
                value={formData.title}
                onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Price (₦)</label>
              <input
                required
                type="number"
                className="w-full bg-gray-50 dark:bg-white/5 border-2 border-charcoal dark:border-white/20 px-4 py-3 text-xs font-black uppercase tracking-widest focus:bg-white dark:focus:bg-white/10 outline-none rounded-xl dark:text-white"
                value={formData.price}
                onChange={(e) => setFormData(p => ({ ...p, price: e.target.value }))}
              />
              {formData.price && (
                <div className="flex flex-col px-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest italic">Tiered Listing Fee</span>
                    <span className="text-[10px] font-black text-brand-blue uppercase tracking-widest">₦{listingPrice.toLocaleString()}</span>
                  </div>
                  <p className="text-[7px] text-gray-400 uppercase mt-0.5">
                    {parseFloat(formData.price) < 10000 ? "Price < ₦10k: ₦200 Fee" : 
                     parseFloat(formData.price) <= 100000 ? "Price 10k-100k: ₦300 Fee" : 
                     "Price > 100k: ₦1000 Fee"}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Exchange Meeting Point</label>
              <div className="grid grid-cols-2 gap-2">
                {['School field', 'School gate', 'Aluta Market', 'Another location'].map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, exchangeLocation: loc }))}
                    className={cn(
                      "py-3 px-3 text-[9px] font-black uppercase tracking-widest border-2 transition-all rounded-xl text-center",
                      formData.exchangeLocation === loc 
                        ? "bg-brand-blue text-white border-charcoal shadow-[3px_3px_0px_#121212]" 
                        : "bg-gray-50 text-charcoal border-charcoal/5 hover:border-charcoal/20"
                    )}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {formData.exchangeLocation === 'Another location' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <label className="text-[10px] font-black uppercase tracking-widest text-brand-blue">Specify Location</label>
                  <input
                    required
                    placeholder="Enter your preferred meeting spot..."
                    type="text"
                    className="w-full bg-blue-50/30 border-2 border-brand-blue/30 px-4 py-3 text-xs font-bold uppercase tracking-widest focus:bg-white outline-none rounded-xl"
                    value={formData.customExchangeLocation}
                    onChange={(e) => setFormData(p => ({ ...p, customExchangeLocation: e.target.value }))}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Preferred Meeting Time (9am - 6pm)</label>
            <select
              className="w-full bg-gray-50 dark:bg-white/5 border-2 border-charcoal dark:border-white/20 px-4 py-3 text-xs font-bold uppercase tracking-widest focus:bg-white dark:focus:bg-white/10 outline-none rounded-xl dark:text-white dark:bg-charcoal"
              value={formData.meetingTime}
              onChange={(e) => setFormData(p => ({ ...p, meetingTime: e.target.value }))}
            >
              {[
                "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", 
                "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", 
                "05:00 PM", "06:00 PM", "Anytime (9am-6pm)"
              ].map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Description</label>
            <textarea
              required
              rows={4}
              className="w-full bg-gray-50 dark:bg-white/5 border-2 border-charcoal dark:border-white/20 px-4 py-3 text-xs font-bold uppercase tracking-widest focus:bg-white dark:focus:bg-white/10 outline-none resize-none rounded-xl dark:text-white"
              value={formData.description}
              onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Category</label>
              <select
                className="w-full bg-gray-50 dark:bg-white/5 border-2 border-charcoal dark:border-white/20 px-4 py-3 text-xs font-bold uppercase tracking-widest focus:bg-white dark:focus:bg-white/10 outline-none rounded-xl dark:text-white dark:bg-charcoal"
                value={formData.category}
                onChange={(e) => setFormData(p => ({ ...p, category: e.target.value as any }))}
              >
                {["Fans", "Electronics", "Textbooks", "Furniture", "Clothing", "Other"].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Condition</label>
              <div className="flex gap-2">
                {['Used', 'New'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, condition: type as any }))}
                    className={cn(
                      "flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-2 transition-all rounded-xl",
                      formData.condition === type 
                        ? "bg-charcoal dark:bg-white text-white dark:text-charcoal border-charcoal shadow-[4px_4px_0px_#2E5BFF]" 
                        : "bg-white dark:bg-white/5 text-charcoal dark:text-gray-400 border-charcoal/10 dark:border-white/10 hover:border-charcoal dark:hover:border-white/20"
                    )}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">TASFUED Location / Area</label>
              <input
                required
                placeholder="e.g., Ijagun, Main Campus"
                type="text"
                className="w-full bg-gray-50 dark:bg-white/5 border-2 border-charcoal dark:border-white/20 px-4 py-3 text-xs font-bold uppercase tracking-widest focus:bg-white dark:focus:bg-white/10 outline-none rounded-xl dark:text-white"
                value={formData.campus}
                onChange={(e) => setFormData(p => ({ ...p, campus: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">WhatsApp (From Profile)</label>
              <input
                required
                readOnly={!!userProfile?.phone}
                placeholder="Please set your phone number in Profile"
                type="tel"
                className={cn(
                  "w-full bg-gray-50 dark:bg-white/5 border-2 border-charcoal dark:border-white/20 px-4 py-3 text-xs font-bold uppercase tracking-widest focus:bg-white dark:focus:bg-white/10 outline-none rounded-xl dark:text-white",
                  userProfile?.phone ? "opacity-70 cursor-not-allowed" : "border-brand-blue"
                )}
                value={formData.sellerPhone}
                onChange={(e) => setFormData(p => ({ ...p, sellerPhone: e.target.value }))}
              />
              {!userProfile?.phone && (
                <p className="text-[9px] text-brand-blue font-black uppercase tracking-tight">Pro Tip: Save your phone in Profile to auto-fill every time.</p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || uploading}
            className="w-full py-5 bg-charcoal dark:bg-brand-blue text-white font-black uppercase tracking-[0.2em] text-xs hover:bg-brand-blue dark:hover:bg-brand-blue/80 transition-all active:translate-y-1 shadow-[8px_8px_0px_rgba(46,91,255,0.4)] disabled:opacity-50 flex items-center justify-center gap-3 rounded-2xl"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            Authenticate & Deploy Listing
          </button>
        </form>
      </motion.div>
    </div>
  );
}
