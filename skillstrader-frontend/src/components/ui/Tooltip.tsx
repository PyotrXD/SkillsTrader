import React from 'react';
import { Icon } from '@iconify/react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export default function Tooltip({ content, children }: TooltipProps) {
  return (
    <div className="relative inline-block group">
      {children}
      <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 w-64 p-3 bg-[var(--navy)] text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity duration-200 z-10 shadow-lg">
        {content}
        <div className="absolute left-1/2 bottom-0 translate-x-[-50%] translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-[var(--navy)]"></div>
      </div>
    </div>
  );
}
