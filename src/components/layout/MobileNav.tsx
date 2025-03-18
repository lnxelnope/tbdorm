"use client";

import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleItemClick = () => {
    setIsOpen(false);
  };

  return (
    <div className="md:hidden">
      {/* Hamburger Button */}
      <button
        onClick={handleToggle}
        className="p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
        aria-label="เปิดเมนู"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Mobile Sidebar */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="relative w-64 max-w-[80%] bg-white h-full overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-1 text-gray-600 hover:text-gray-900 focus:outline-none"
              aria-label="ปิดเมนู"
            >
              <X className="h-5 w-5" />
            </button>
            
            <Sidebar onMobileItemClick={handleItemClick} />
          </div>
        </div>
      )}
    </div>
  );
} 