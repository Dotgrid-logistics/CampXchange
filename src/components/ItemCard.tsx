import React from 'react';
import { motion } from 'motion/react';
import { MapPin, MessageCircle, BadgeCheck, Sparkles } from 'lucide-react';
import { Item } from '../types';
import { formatPrice, cn } from '../lib/utils';

interface ItemCardProps {
  item: Item;
}

export function ItemCard({ item }: ItemCardProps) {
  const whatsappUrl = `https://wa.me/${item.sellerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
    `I'm interested in your ${item.title} on CampXchange`
  )}`;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group flex flex-col h-full bg-white dark:bg-charcoal transition-all duration-300"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-gray-100 dark:bg-white/5 rounded-3xl border-2 border-transparent dark:group-hover:border-white/10 transition-colors">
        <img
          src={item.imageUrl || 'https://via.placeholder.com/400x400?text=No+Image'}
          alt={item.title}
          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <span className="bg-white dark:bg-charcoal px-3 py-1 text-[10px] font-black border-2 border-charcoal dark:border-white/20 uppercase tracking-widest shadow-[3px_3px_0px_#121212] dark:shadow-[3px_3px_0px_#00000040] rounded-lg dark:text-white">
            {item.campus}
          </span>
          <span className={cn(
            "px-2 py-0.5 text-[8px] font-black border-2 border-charcoal dark:border-white/20 uppercase tracking-widest shadow-[2px_2px_0px_#121212] dark:shadow-[2px_2px_0px_#00000040] rounded-md self-start",
            item.condition === 'New' ? "bg-green-400 text-charcoal" : "bg-brand-blue text-white"
          )}>
            {item.condition}
          </span>
          {item.sellerType === 'Business' && (
            <span className="bg-yellow-400 text-charcoal px-2 py-0.5 text-[8px] font-black border-2 border-charcoal dark:border-white/20 uppercase tracking-widest shadow-[2px_2px_0px_#121212] dark:shadow-[2px_2px_0px_#00000040] rounded-md self-start">
              Business
            </span>
          )}
        </div>
        <div className="absolute bottom-4 left-4 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 bg-charcoal/80 backdrop-blur-md px-3 py-1.5 border border-white/20 rounded-xl shadow-lg">
            <MapPin className="w-3 h-3 text-brand-blue" />
            <span className="text-[9px] font-black text-white uppercase tracking-widest">
              {item.exchangeLocation === 'Another location' ? item.customExchangeLocation : item.exchangeLocation}
            </span>
          </div>
          {item.meetingTime && (
            <div className="flex items-center gap-1.5 bg-brand-blue/90 backdrop-blur-md px-3 py-1.5 border border-white/20 rounded-xl shadow-lg">
              <Sparkles className="w-3 h-3 text-white" />
              <span className="text-[9px] font-black text-white uppercase tracking-widest">
                Meet at {item.meetingTime}
              </span>
            </div>
          )}
        </div>
        {item.isVerified && (
          <div className="absolute top-4 right-4">
            <div className="w-8 h-8 bg-brand-blue border-2 border-charcoal dark:border-white/20 flex items-center justify-center shadow-[3px_3px_0px_#121212] dark:shadow-[3px_3px_0px_#00000040] rounded-lg" title="Verified Seller">
              <BadgeCheck className="w-4 h-4 text-white" />
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-1 gap-2">
          <h3 className="text-lg font-display font-black uppercase leading-[1.1] tracking-tighter line-clamp-2 dark:text-white">
            {item.title}
          </h3>
          <span className="text-xl font-black text-charcoal dark:text-white ml-2 shrink-0">
            {formatPrice(item.price)}
          </span>
        </div>

        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-tighter mb-2 line-clamp-1">
          {item.category} • {item.description}
        </p>

        <div className="mt-2 bg-[#F0F4FF] dark:bg-brand-blue/10 inline-block px-2 py-1 rounded-sm w-fit mb-4">
          <span className="text-[9px] text-brand-blue font-black uppercase tracking-widest flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Gemini Enhanced
          </span>
        </div>

        <div className="mt-auto">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center py-4 border-2 border-charcoal dark:border-white/10 text-[11px] font-black uppercase tracking-widest group-hover:bg-charcoal dark:group-hover:bg-white dark:group-hover:text-charcoal group-hover:text-white transition-all active:translate-y-0.5 shadow-[4px_4px_0px_#121212] dark:shadow-[4px_4px_0px_#ffffff10] group-hover:shadow-none rounded-2xl dark:text-white"
          >
            Contact Seller on WhatsApp
          </a>
        </div>
      </div>
    </motion.div>
  );
}
