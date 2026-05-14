import React from 'react';
import { Category } from '../types';
import { cn } from '../lib/utils';

interface CategoryFilterProps {
  selected: Category;
  onChange: (category: Category) => void;
}

const categories: Category[] = ["All", "Fans", "Electronics", "Textbooks", "Furniture", "Clothing", "Other"];

export function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-6 scrollbar-hide no-scrollbar px-1">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={cn(
            "px-5 py-2 text-[11px] font-black uppercase tracking-wider transition-all rounded-xl",
            selected === cat 
              ? "bg-brand-blue text-white shadow-[4px_4px_0px_#121212] dark:shadow-[4px_4px_0px_#ffffff20]" 
              : "bg-gray-100 dark:bg-white/5 text-charcoal dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
          )}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
