'use client';

import React from 'react';
import { HardDrive, Settings, LogOut, Cloud, X, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SidebarProps {
  currentView: 'drive' | 'settings' | 'url-downloader';
  onViewChange: (view: 'drive' | 'settings' | 'url-downloader') => void;
  username: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ currentView, onViewChange, username, isOpen, onClose }: SidebarProps) {
  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <>
      {/* Backdrop สำหรับ Mobile เมื่อเปิด Sidebar */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-200"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-screen flex-col border-r border-slate-800 bg-slate-950/95 p-4 backdrop-blur-md transition-all duration-300 ease-in-out shrink-0",
          isOpen 
            ? "translate-x-0 w-64 md:static md:translate-x-0 md:bg-slate-950/70" 
            : "-translate-x-full w-64 md:static md:translate-x-0 md:w-20 md:p-3 md:items-center md:bg-slate-950/70"
        )}
      >
        {/* Brand Header */}
        <div className={cn("flex items-center justify-between py-5 w-full", isOpen ? "px-3" : "px-0 justify-center")}>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/30 text-white animate-pulse shrink-0">
              <Cloud className="h-5 w-5" />
            </div>
            {isOpen && (
              <div className="animate-in fade-in duration-300">
                <h1 className="text-lg font-bold text-white tracking-wide">Antigravity</h1>
                <p className="text-xs text-slate-500">Discord Storage Site</p>
              </div>
            )}
          </div>

          {/* ปุ่มปิด Sidebar สำหรับ Mobile */}
          {isOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="md:hidden h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-900/60"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-2 py-6 w-full flex flex-col items-center">
          <Button
            variant="ghost"
            onClick={() => {
              onViewChange('drive');
              if (window.innerWidth < 768) onClose();
            }}
            className={cn(
              "w-full gap-3 py-6 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-900/60 transition-all duration-200",
              isOpen ? "justify-start px-4" : "justify-center px-0 md:h-12 md:w-12 md:rounded-xl",
              currentView === 'drive' && "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600/20 hover:text-indigo-300"
            )}
            title="ไดรฟ์ของฉัน (My Drive)"
          >
            <HardDrive className="h-5 w-5 shrink-0" />
            {isOpen && <span>ไดรฟ์ของฉัน (My Drive)</span>}
          </Button>

          <Button
            variant="ghost"
            onClick={() => {
              onViewChange('url-downloader');
              if (window.innerWidth < 768) onClose();
            }}
            className={cn(
              "w-full gap-3 py-6 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-900/60 transition-all duration-200",
              isOpen ? "justify-start px-4" : "justify-center px-0 md:h-12 md:w-12 md:rounded-xl",
              currentView === 'url-downloader' && "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600/20 hover:text-indigo-300"
            )}
            title="ดาวน์โหลดจากลิงก์ (URL)"
          >
            <Link className="h-5 w-5 text-indigo-400 shrink-0" />
            {isOpen && <span>ดาวน์โหลดจากลิงก์ (URL)</span>}
          </Button>

          <Button
            variant="ghost"
            onClick={() => {
              onViewChange('settings');
              if (window.innerWidth < 768) onClose();
            }}
            className={cn(
              "w-full gap-3 py-6 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-900/60 transition-all duration-200",
              isOpen ? "justify-start px-4" : "justify-center px-0 md:h-12 md:w-12 md:rounded-xl",
              currentView === 'settings' && "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600/20 hover:text-indigo-300"
            )}
            title="ตั้งค่า (Settings)"
          >
            <Settings className="h-5 w-5 shrink-0" />
            {isOpen && <span>ตั้งค่า (Settings)</span>}
          </Button>
        </nav>

        {/* User Status & Log Out */}
        <div className="border-t border-slate-800 pt-4 flex flex-col gap-3 w-full">
          <div className={cn("flex items-center gap-3 w-full", isOpen ? "px-3" : "px-0 justify-center")}>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-indigo-400 font-semibold ring-1 ring-slate-700 shrink-0">
              {username.substring(0, 2).toUpperCase()}
            </div>
            {isOpen && (
              <div className="overflow-hidden animate-in fade-in duration-300">
                <p className="text-sm font-medium text-white truncate">{username}</p>
                <p className="text-xs text-slate-500">สถานะ: ล็อกอินอยู่</p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className={cn(
              "w-full gap-3 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 py-6 transition-all duration-200",
              isOpen ? "justify-start px-4" : "justify-center px-0 md:h-12 md:w-12 md:rounded-xl"
            )}
            title="ออกจากระบบ (Log Out)"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {isOpen && <span>ออกจากระบบ (Log Out)</span>}
          </Button>
        </div>
      </aside>
    </>
  );
}

