'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Download, FileText, AlertTriangle, Loader2, Play, Image as ImageIcon, FileDigit } from 'lucide-react';
import { API_URL } from '@/lib/api';
import axios from 'axios';

interface SharedFile {
  id: string;
  name: string;
  mimetype: string;
  size: number;
  shareExpiresAt: string | null;
}

export default function PublicSharePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const fileId = params.id as string;
  const token = searchParams.get('token');

  const [file, setFile] = useState<SharedFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fileId || !token) {
      setError('ลิงก์แชร์ไม่สมบูรณ์ หรือไม่มีสิทธิ์เข้าถึง');
      setLoading(false);
      return;
    }

    axios
      .get(`${API_URL}/storage/public/files/${fileId}/metadata?token=${token}`)
      .then((res) => {
        if (res.data.statusCode === 200) {
          setFile(res.data.data);
        } else {
          setError(res.data.messageTh || 'ไม่พบไฟล์หรือลิงก์แชร์หมดอายุ');
        }
      })
      .catch((err) => {
        console.error(err);
        setError(
          err.response?.data?.messageTh || 
          'ไม่สามารถดึงข้อมูลไฟล์ได้ ลิงก์แชร์อาจหมดอายุหรือถูกยกเลิกแล้ว'
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [fileId, token]);

  const handleDownload = () => {
    if (!fileId || !token) return;
    window.location.href = `${API_URL}/storage/public/files/${fileId}/download?token=${token}`;
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('video/')) return <Play className="h-12 w-12 text-violet-400" />;
    if (mimetype.startsWith('image/')) return <ImageIcon className="h-12 w-12 text-emerald-400" />;
    return <FileText className="h-12 w-12 text-indigo-400" />;
  };

  const formatSize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatExpiresDate = (isoString: string | null) => {
    if (!isoString) return 'ไม่มีวันหมดอายุ';
    const d = new Date(isoString);
    return d.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }) + ' น.';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 font-sans antialiased">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/40 border border-slate-800/80 backdrop-blur-2xl p-6 rounded-2xl shadow-2xl relative z-10">
        <div className="flex flex-col items-center text-center">
          <div className="text-sm font-semibold tracking-wider text-indigo-400 uppercase mb-6">
            Discord Cloud Storage
          </div>

          {loading && (
            <div className="py-12 flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-indigo-500" />
              <p className="text-sm text-slate-400">กำลังตรวจสอบข้อมูลลิงก์แชร์...</p>
            </div>
          )}

          {error && (
            <div className="py-8 flex flex-col items-center">
              <div className="h-16 w-16 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold text-slate-200">เข้าถึงไฟล์ไม่สำเร็จ</h3>
              <p className="text-xs text-slate-500 mt-2 max-w-xs">{error}</p>
            </div>
          )}

          {file && !loading && !error && (
            <div className="w-full flex flex-col items-center">
              {/* File Icon */}
              <div className="h-24 w-24 bg-slate-950/80 border border-slate-800/60 rounded-2xl flex items-center justify-center shadow-inner mb-6">
                {getFileIcon(file.mimetype)}
              </div>

              {/* File Details */}
              <h1 className="text-lg font-bold text-white max-w-full break-all line-clamp-2 px-2">
                {file.name}
              </h1>
              
              <div className="flex flex-col gap-1.5 mt-4 text-xs text-slate-400 w-full border-t border-slate-800/60 pt-4">
                <div className="flex justify-between">
                  <span>ขนาดไฟล์:</span>
                  <span className="font-semibold text-slate-200">{formatSize(file.size)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ประเภทไฟล์:</span>
                  <span className="font-semibold text-slate-200">{file.mimetype}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800/20 pt-1.5">
                  <span>ลิงก์หมดอายุ:</span>
                  <span className="font-semibold text-amber-400">{formatExpiresDate(file.shareExpiresAt)}</span>
                </div>
              </div>

              {/* Download Button */}
              <button
                onClick={handleDownload}
                className="w-full mt-6 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/15 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
              >
                <Download className="h-5 w-5" />
                <span>ดาวน์โหลดไฟล์</span>
              </button>
            </div>
          )}
        </div>
      </div>
      
      <p className="text-[10px] text-slate-600 mt-6 z-10">
        ไฟล์ทั้งหมดถูกเก็บแบบเข้ารหัสพาร์ทบน Discord CDN อย่างปลอดภัย
      </p>
    </div>
  );
}
