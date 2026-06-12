'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, FileText, AlertTriangle } from 'lucide-react';
import { API_URL } from '@/lib/api';

interface FileItem {
  id: string;
  name: string;
  mimetype: string;
  size: number;
  thumbnail: string | null;
  createdAt: string;
}

interface FilePreviewModalProps {
  file: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (id: string, name: string) => void;
}

export default function FilePreviewModal({
  file,
  isOpen,
  onClose,
  onDownload,
}: FilePreviewModalProps) {
  const [textPreview, setTextPreview] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const previewUrl = file
    ? `${API_URL}/storage/files/${file.id}/download?token=${token}&preview=true`
    : '';

  const isImage = file?.mimetype.startsWith('image/');
  const isVideo = file?.mimetype.startsWith('video/');
  const isMkv = file?.mimetype === 'video/x-matroska' || file?.name.toLowerCase().endsWith('.mkv');
  const isMov = file?.mimetype === 'video/quicktime' || file?.name.toLowerCase().endsWith('.mov');
  const isPdf = file?.mimetype === 'application/pdf';
  const isText =
    file?.mimetype.startsWith('text/') ||
    file?.mimetype === 'application/json' ||
    file?.name.endsWith('.txt') ||
    file?.name.endsWith('.js') ||
    file?.name.endsWith('.ts') ||
    file?.name.endsWith('.json') ||
    file?.name.endsWith('.html') ||
    file?.name.endsWith('.css') ||
    file?.name.endsWith('.md');

  // โหลดพรีวิวข้อความกรณีไฟล์ประเภท Text/Code
  useEffect(() => {
    if (isOpen && file && isText && token) {
      setLoadingText(true);
      setTextPreview(null);
      setTextError(null);

      fetch(`${API_URL}/storage/files/${file.id}/download?token=${token}&preview=true`)
        .then(async (res) => {
          if (!res.ok) {
            throw new Error(`Failed to load: ${res.statusText}`);
          }
          return res.text();
        })
        .then((text) => {
          // ถ้าขนาดข้อความใหญ่มาก ให้ดึงมาแสดงเฉพาะส่วนต้น
          if (text.length > 100000) {
            setTextPreview(text.substring(0, 100000) + '\n\n...[ข้อความถูกตัดเนื่องจากมีขนาดใหญ่เกินไป]');
          } else {
            setTextPreview(text);
          }
        })
        .catch((err) => {
          console.error(err);
          setTextError('ไม่สามารถโหลดข้อมูลเนื้อหาข้อความได้');
        })
        .finally(() => {
          setLoadingText(false);
        });
    }
  }, [isOpen, file, isText, token]);

  useEffect(() => {
    if (isOpen) {
      setVideoError(false);
    }
  }, [isOpen, file]);

  if (!file) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[90vw] max-h-[85vh] h-[80vh] flex flex-col border-slate-800 bg-slate-950/95 text-slate-100 backdrop-blur-xl p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b border-slate-800 shrink-0 flex flex-row items-center justify-between gap-4">
          <div className="overflow-hidden">
            <DialogTitle className="text-base font-bold text-white truncate pr-6">
              {file.name}
            </DialogTitle>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {file.mimetype} • {(file.size / (1024 * 1024)).toFixed(2)} MB
            </p>
          </div>
          <Button
            onClick={() => onDownload(file.id, file.name)}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 mr-6"
          >
            <Download className="mr-1.5 h-4 w-4" />
          </Button>
        </DialogHeader>

        {/* Content Viewer */}
        <div className="flex-1 overflow-auto bg-slate-950/50 p-4 flex items-center justify-center">
          {isImage && (
            <div className="relative max-w-full max-h-full flex items-center justify-center">
              <img
                src={previewUrl}
                alt={file.name}
                className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg border border-slate-800"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
          )}

          {isVideo && (
            <div className="w-full max-w-2xl flex flex-col gap-3">
              <div className="w-full aspect-video rounded-lg overflow-hidden border border-slate-800 bg-black shadow-lg">
                <video
                  src={previewUrl}
                  controls
                  autoPlay
                  muted
                  className="w-full h-full"
                  onError={(e) => {
                    console.error('Video playing error');
                    setVideoError(true);
                  }}
                />
              </div>
              {videoError && (
                <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    ไม่สามารถเล่นวิดีโอนี้ได้ อุปกรณ์หรือเบราว์เซอร์ของคุณอาจไม่รองรับ Codec ของวิดีโอนี้ (เช่น AV1/VP9 บน iPhone) แนะนำให้กดดาวน์โหลดไปรับชมด้วยเครื่องเล่นแอปพลิเคชัน (เช่น VLC) แทนครับ
                  </span>
                </div>
              )}
              {(isMkv || isMov) && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    ไฟล์นี้เป็นวิดีโอรูปแบบ {isMkv ? 'MKV' : 'MOV'} ซึ่งเบราว์เซอร์ของคุณอาจไม่รองรับการเล่นโดยตรง หากเล่นไม่ได้แนะนำให้ดาวน์โหลดไปรับชมบนเครื่องครับ
                  </span>
                </div>
              )}
            </div>
          )}

          {isPdf && (
            <iframe
              src={previewUrl}
              className="w-full h-full rounded-lg border border-slate-800 bg-white"
              title={file.name}
            />
          )}

          {isText && (
            <div className="w-full h-full rounded-lg border border-slate-800 bg-slate-950 p-4 font-mono text-xs overflow-auto whitespace-pre-wrap text-slate-300">
              {loadingText && (
                <div className="w-full h-full flex items-center justify-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                  <span>กำลังดึงเนื้อหาไฟล์...</span>
                </div>
              )}
              {textError && (
                <div className="w-full h-full flex flex-col items-center justify-center text-rose-400 gap-2">
                  <AlertTriangle className="h-8 w-8" />
                  <span>{textError}</span>
                </div>
              )}
              {textPreview !== null && (
                <code className="block">{textPreview}</code>
              )}
            </div>
          )}

          {!isImage && !isVideo && !isPdf && !isText && (
            <div className="text-center py-12 flex flex-col items-center gap-3">
              <FileText className="h-16 w-16 text-slate-600" />
              <h4 className="text-base font-bold text-slate-300">ไม่สามารถพรีวิวไฟล์ประเภทนี้ได้</h4>
              <p className="text-xs text-slate-500 max-w-xs">
                บราวเซอร์ไม่รองรับการแสดงผลไฟล์สกุลนี้บนหน้าเว็บโดยตรง คุณสามารถกดปุ่มดาวน์โหลดเพื่อเซฟลงเครื่องแทนได้ครับ
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
