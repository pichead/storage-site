'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Link2, CloudDownload, CheckCircle2, AlertCircle, Loader2, Play, Trash2, RefreshCw } from 'lucide-react';

interface DownloadTask {
  id: string;
  url: string;
  name: string;
  progress: number;
  status: 'fetching_info' | 'downloading' | 'uploading_discord' | 'completed' | 'error';
  errorMessage?: string;
}

interface UrlDownloaderPanelProps {
  folderId: string | null;
}

export default function UrlDownloaderPanel({ folderId }: UrlDownloaderPanelProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tasks, setTasks] = useState<DownloadTask[]>([]);

  // ฟังก์ชันเริ่มการดาวน์โหลด
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post('/storage/url-download', {
        url: url.trim(),
        folderId,
      });

      if (response.data.statusCode === 200) {
        setSuccess('ระบบรับคำขอและเริ่มต้นการดาวน์โหลดในเบื้องหลังเรียบร้อยแล้ว!');
        setUrl('');
        fetchTasks();
      } else {
        setError(response.data.messageTh || 'ไม่สามารถดาวน์โหลดวิดีโอได้');
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.messageTh ||
        err.response?.data?.messageEn ||
        'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์หลังบ้าน'
      );
    } finally {
      setLoading(false);
    }
  };

  // ดึงรายการประวัติงานดาวน์โหลดเบื้องหลัง
  const fetchTasks = async () => {
    try {
      const response = await api.get('/storage/url-download/tasks');
      if (response.data.statusCode === 200) {
        setTasks(response.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch download tasks', err);
    }
  };

  // ทำ Polling อัปเดตความคืบหน้าทุกๆ 2 วินาที
  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 2000);
    return () => clearInterval(interval);
  }, []);

  // ลบประวัติงานดาวน์โหลดรายชิ้น
  const handleDeleteTask = async (taskId: string) => {
    try {
      await api.delete(`/storage/url-download/tasks/${taskId}`);
      fetchTasks();
    } catch (err) {
      console.error('Failed to delete task', err);
    }
  };

  // ล้างประวัติงานดาวน์โหลดที่ทำเสร็จแล้วหรือล้มเหลวทั้งหมด
  const handleClearHistory = async () => {
    try {
      await api.delete('/storage/url-download/tasks');
      fetchTasks();
    } catch (err) {
      console.error('Failed to clear history', err);
    }
  };

  // เริ่มต้นดาวน์โหลดอีกครั้งเมื่อเกิดข้อผิดพลาด
  const handleRetryTask = async (taskId: string) => {
    try {
      await api.post(`/storage/url-download/tasks/${taskId}/retry`);
      fetchTasks();
    } catch (err) {
      console.error('Failed to retry task', err);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'fetching_info':
        return 'กำลังแกะวิเคราะห์ข้อมูลลิงก์...';
      case 'downloading':
        return 'กำลังดาวน์โหลดไฟล์วิดีโอเข้าสู่ระบบหลังบ้าน...';
      case 'uploading_discord':
        return 'กำลังหั่นแบ่งชิ้นส่วนและส่งขึ้น Discord CDN...';
      case 'completed':
        return 'ดาวน์โหลดและจัดเก็บเสร็จสมบูรณ์!';
      case 'error':
        return 'การดาวน์โหลดขัดข้อง/ล้มเหลว';
      default:
        return 'กำลังดำเนินงาน...';
    }
  };

  return (
    <div className="flex flex-col gap-6 overflow-y-auto h-full p-1 font-sans">
      {/* ส่วนหัวหน้าจอ */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-wide">ระบบดาวน์โหลดวิดีโอผ่าน URL (URL Downloader)</h2>
        <p className="text-xs text-slate-500 mt-1">วางลิงก์วิดีโอที่คุณต้องการเพื่อโหลดและอัปโหลดแบ่งพาร์ทเก็บเข้าคลัง Discord ทันทีแบบเบื้องหลัง</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ฟอร์มกรอกลิงก์ (ฝั่งซ้าย/บน) */}
        <div className="lg:col-span-1">
          <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-200">สร้างงานดาวน์โหลดใหม่</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                รองรับการดาวน์โหลดจาก YouTube ในเฟสแรก (และระบบตรวจลิงก์ทั่วไปอัตโนมัติ)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400">ลิงก์วิดีโอ (Video URL)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                      <Link2 className="h-4 w-4" />
                    </span>
                    <Input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="pl-10 bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 text-sm"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-400 flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{success}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/10 gap-2 text-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      กำลังส่งขอข้อมูล...
                    </>
                  ) : (
                    <>
                      <CloudDownload className="h-4 w-4" />
                      เริ่มดาวน์โหลด
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* ตารางคิวแสดงผลการทำงานเบื้องหลัง (ฝั่งขวา/ล่าง) */}
        <div className="lg:col-span-2">
          <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-xl h-full flex flex-col">
            <CardHeader className="border-b border-slate-800/60 flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-200">ประวัติและสถานะงานเบื้องหลัง (Background Tasks)</CardTitle>
                <CardDescription className="text-xs text-slate-500">สถานะการทำงานปัจจุบันและการจัดส่วน Chunk บน Discord</CardDescription>
              </div>
              {tasks.some(t => t.status === 'completed' || t.status === 'error') && (
                <Button
                  variant="ghost"
                  onClick={handleClearHistory}
                  className="text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 px-2.5 py-1 h-auto"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  ล้างประวัติ
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <CloudDownload className="h-12 w-12 text-slate-800 animate-pulse mb-3" />
                  <h4 className="text-sm font-semibold text-slate-500">ไม่มีงานดาวน์โหลดที่กำลังดำเนินงานอยู่</h4>
                  <p className="text-xs text-slate-600 mt-1">วางลิงก์วิดีโอทางฝั่งซ้ายเพื่อสั่งให้ระบบดาวน์โหลดในเบื้องหลัง</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="border border-slate-800/80 bg-slate-950/20 p-4 rounded-xl flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex gap-3 overflow-hidden">
                          <Play className="h-8 w-8 shrink-0 p-2 bg-indigo-500/10 text-indigo-400 rounded-lg" />
                          <div className="overflow-hidden">
                            <h4 className="text-sm font-medium text-slate-200 truncate pr-6">
                              {task.name}
                            </h4>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5 max-w-[320px] sm:max-w-md">
                              แหล่งข้อมูล: {task.url}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2">
                          <div className="shrink-0 flex items-center gap-1.5">
                            {task.status === 'fetching_info' && (
                              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                <Loader2 className="h-2.5 w-2.5 animate-spin" /> วิเคราะห์ลิงก์
                              </span>
                            )}
                            {task.status === 'downloading' && (
                              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                <Loader2 className="h-2.5 w-2.5 animate-spin" /> กำลังโหลด
                              </span>
                            )}
                            {task.status === 'uploading_discord' && (
                              <span className="text-[10px] bg-indigo-500/15 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                <Loader2 className="h-2.5 w-2.5 animate-spin" /> อัปโหลดพาร์ท
                              </span>
                            )}
                            {task.status === 'completed' && (
                              <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                <CheckCircle2 className="h-2.5 w-2.5" /> สำเร็จ
                              </span>
                            )}
                            {task.status === 'error' && (
                              <span className="text-[10px] bg-rose-500/15 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                <AlertCircle className="h-2.5 w-2.5" /> ล้มเหลว
                              </span>
                            )}
                          </div>
                          {task.status === 'error' && (
                            <button
                              type="button"
                              onClick={() => handleRetryTask(task.id)}
                              className="p-1 hover:bg-slate-800 text-slate-500 hover:text-indigo-400 rounded transition-colors"
                              title="ลองใหม่อีกครั้ง"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {(task.status === 'completed' || task.status === 'error') && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-1 hover:bg-slate-800 text-slate-500 hover:text-rose-400 rounded transition-colors"
                              title="ลบรายการนี้"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>{getStatusText(task.status)}</span>
                          <span className="font-semibold">{task.progress}%</span>
                        </div>
                        <Progress value={task.progress} className="h-1.5 bg-slate-800" />
                      </div>

                      {task.status === 'error' && task.errorMessage && (
                        <p className="text-[10px] text-rose-400 bg-rose-500/5 border border-rose-500/10 p-2 rounded-lg truncate">
                          ข้อผิดพลาด: {task.errorMessage}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
