'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Link2, Copy, Check, Trash2, Calendar, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';

interface FileItem {
  id: string;
  name: string;
  shareToken?: string | null;
  shareExpiresAt?: string | null;
}

interface ShareModalProps {
  file: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
  onShareSuccess: () => void;
}

export default function ShareModal({
  file,
  isOpen,
  onClose,
  onShareSuccess,
}: ShareModalProps) {
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareData, setShareData] = useState<{
    token: string | null;
    expiresAt: string | null;
  }>({ token: null, expiresAt: null });

  useEffect(() => {
    if (isOpen && file) {
      setShareData({
        token: file.shareToken || null,
        expiresAt: file.shareExpiresAt || null,
      });
      setCopied(false);
    }
  }, [isOpen, file]);

  if (!file) return null;

  const shareUrl = typeof window !== 'undefined' && shareData.token
    ? `${window.location.origin}/share/${file.id}?token=${shareData.token}`
    : '';

  const handleGenerateShare = async () => {
    setLoading(true);
    try {
      const response = await api.post(`/storage/files/${file.id}/share`, {
        expiresInHours,
      });
      if (response.data.statusCode === 200) {
        const { shareToken, shareExpiresAt } = response.data.data;
        setShareData({ token: shareToken, expiresAt: shareExpiresAt });
        onShareSuccess();
      }
    } catch (err) {
      console.error('Failed to generate share link', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeShare = async () => {
    setLoading(true);
    try {
      const response = await api.delete(`/storage/files/${file.id}/share`);
      if (response.data.statusCode === 200) {
        setShareData({ token: null, expiresAt: null });
        onShareSuccess();
      }
    } catch (err) {
      console.error('Failed to revoke share link', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const formatExpiresDate = (isoString: string | null) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' น.';
  };

  // ตรวจสอบว่าแชร์หมดอายุแล้วหรือยัง
  const isExpired = shareData.expiresAt 
    ? new Date(shareData.expiresAt) < new Date() 
    : false;

  const hasActiveShare = shareData.token && !isExpired;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-[90vw] border-slate-800 bg-slate-950/95 text-slate-100 backdrop-blur-xl p-6 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
            <Link2 className="h-5 w-5 text-indigo-400" />
            แชร์ไฟล์สาธารณะ
          </DialogTitle>
          <p className="text-xs text-slate-500 text-left mt-1 line-clamp-1">
            {file.name}
          </p>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {!hasActiveShare ? (
            /* ส่วนเมื่อยังไม่ได้แชร์ */
            <div className="space-y-4">
              <div className="rounded-lg bg-indigo-500/5 border border-indigo-500/10 p-3 text-xs text-slate-400 flex items-start gap-2.5">
                <AlertCircle className="h-4.5 w-4.5 text-indigo-400 shrink-0 mt-0.5" />
                <span>
                  การสร้างลิงก์แชร์สาธารณะจะช่วยให้บุคคลอื่นดาวน์โหลดไฟล์นี้ได้โดยตรงโดยไม่ต้องล็อกอินเข้าระบบ ลิงก์ที่สร้างขึ้นจะมีอายุการใช้งานจำกัด
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400">
                  ระยะเวลาหมดอายุของลิงก์
                </label>
                <select
                  value={expiresInHours}
                  onChange={(e) => setExpiresInHours(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value={1}>1 ชั่วโมง</option>
                  <option value={6}>6 ชั่วโมง</option>
                  <option value={24}>24 ชั่วโมง (1 วัน)</option>
                  <option value={72}>72 ชั่วโมง (3 วัน)</option>
                  <option value={168}>168 ชั่วโมง (7 วัน)</option>
                </select>
              </div>

              <Button
                onClick={handleGenerateShare}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    กำลังสร้างลิงก์...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    สร้างลิงก์แชร์สาธารณะ
                  </>
                )}
              </Button>
            </div>
          ) : (
            /* ส่วนเมื่อสร้างลิงก์สำเร็จแล้ว */
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400">
                  ลิงก์สำหรับแชร์
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    onClick={handleCopy}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none cursor-pointer focus:border-indigo-500"
                  />
                  <Button
                    onClick={handleCopy}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl px-3.5 shrink-0"
                    title="คัดลอกลิงก์"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/50 border border-slate-800/40 p-3 rounded-xl">
                <Calendar className="h-4 w-4 text-indigo-400 shrink-0" />
                <span>
                  ลิงก์หมดอายุวันที่: <strong className="text-amber-400">{formatExpiresDate(shareData.expiresAt)}</strong>
                </span>
              </div>

              <div className="border-t border-slate-800/40 pt-4 flex gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 border-slate-800 hover:bg-slate-900 text-slate-300 font-medium rounded-xl"
                >
                  ปิดหน้าต่าง
                </Button>
                <Button
                  onClick={handleRevokeShare}
                  disabled={loading}
                  className="flex-1 bg-rose-600/10 hover:bg-rose-600 border border-rose-500/20 text-rose-400 hover:text-white font-medium rounded-xl gap-2 transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                  ยกเลิกลิงก์แชร์
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
