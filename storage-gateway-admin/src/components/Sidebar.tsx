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
          "fixed inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-950/95 p-4 backdrop-blur-md transition-transform duration-200 ease-in-out md:static md:translate-x-0 md:bg-slate-950/70 shrink-0",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between px-3 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/30 text-white animate-pulse">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide">Antigravity</h1>
              <p className="text-xs text-slate-500">Discord Storage Site</p>
            </div>
          </div>

          {/* ปุ่มปิด Sidebar สำหรับ Mobile */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="md:hidden h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-900/60"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-2 py-6">
        <Button
          variant="ghost"
          onClick={() => {
            onViewChange('drive');
            onClose();
          }}
          className={cn(
            "w-full justify-start gap-3 px-4 py-6 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-900/60 transition-all duration-200",
            currentView === 'drive' && "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600/20 hover:text-indigo-300"
          )}
        >
          <HardDrive className="h-5 w-5" />
          ไดรฟ์ของฉัน (My Drive)
        </Button>

        <Button
          variant="ghost"
          onClick={() => {
            onViewChange('url-downloader');
            onClose();
          }}
          className={cn(
            "w-full justify-start gap-3 px-4 py-6 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-900/60 transition-all duration-200",
            currentView === 'url-downloader' && "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600/20 hover:text-indigo-300"
          )}
        >
          <Link className="h-5 w-5 text-indigo-400" />
          ดาวน์โหลดจากลิงก์ (URL)
        </Button>

        <Button
          variant="ghost"
          onClick={() => {
            onViewChange('settings');
            onClose();
          }}
          className={cn(
            "w-full justify-start gap-3 px-4 py-6 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-900/60 transition-all duration-200",
            currentView === 'settings' && "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600/20 hover:text-indigo-300"
          )}
        >
          <Settings className="h-5 w-5" />
          ตั้งค่า (Settings)
        </Button>
      </nav>

      {/* User Status & Log Out */}
      <div className="border-t border-slate-800 pt-4 flex flex-col gap-3">
        <div className="flex items-center gap-3 px-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-indigo-400 font-semibold ring-1 ring-slate-700">
            {username.substring(0, 2).toUpperCase()}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{username}</p>
            <p className="text-xs text-slate-500">สถานะ: ล็อกอินอยู่</p>
          </div>
        </div>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start gap-3 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-4 py-6 transition-all duration-200"
        >
          <LogOut className="h-5 w-5" />
          ออกจากระบบ (Log Out)
        </Button>
      </div>
    </aside>
    </>
  );
}
