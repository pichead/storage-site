'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Breadcrumbs from '@/components/Breadcrumbs';
import FileGrid from '@/components/FileGrid';
import MoveItemModal from '@/components/MoveItemModal';
import { generateThumbnail } from '@/lib/thumbnail';
import SettingsPanel from '@/components/SettingsPanel';
import UrlDownloaderPanel from '@/components/UrlDownloaderPanel';
import FilePreviewModal from '@/components/FilePreviewModal';
import { api, API_URL } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Plus, FolderPlus, Upload, Loader2, Menu, UploadCloud, CheckCircle, AlertCircle, X, Download } from 'lucide-react';

interface FolderBreadcrumb {
  id: string;
  name: string;
}

interface UploadTask {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  errorMessage?: string;
}

interface DownloadTask {
  id: string;
  name: string;
  status: 'downloading' | 'completed' | 'error';
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const folderQueryId = searchParams.get('folder');

  const [user, setUser] = useState<{ id: string; username: string } | null>(null);
  const [currentView, setCurrentView] = useState<'drive' | 'settings' | 'url-downloader'>('drive');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(folderQueryId);
  const [folderPath, setFolderPath] = useState<FolderBreadcrumb[]>([]);

  // ข้อมูลไฟล์และโฟลเดอร์ปัจจุบัน
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  // สถานะ Modal ต่างๆ
  // สถานะ Modal ต่างๆ
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderCreating, setFolderCreating] = useState(false);

  // สถานะการเปลี่ยนชื่อ (Rename)
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string; type: 'folder' | 'file' } | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);

  // สถานะการพรีวิวไฟล์ (Preview)
  const [previewFile, setPreviewFile] = useState<any | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // สถานะการย้ายไฟล์/โฟลเดอร์ (Move)
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [moveTarget, setMoveTarget] = useState<{ id: string; name: string; type: 'file' | 'folder' } | null>(null);

  // สถานะการเปิด/ปิด Sidebar บน Mobile
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // สถานะคิวงานอัปโหลดและดาวน์โหลดหลัก
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);
  const [downloadTasks, setDownloadTasks] = useState<DownloadTask[]>([]);

  // อ้างอิงถึง input file สำหรับเลือกไฟล์
  const fileInputRef = useRef<HTMLInputElement>(null);
  const CHUNK_SIZE = 8 * 1024 * 1024; // 8 MB per chunk

  const updateUploadTaskStatus = (id: string, updates: Partial<UploadTask>) => {
    setUploadTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, ...updates } : task))
    );
  };

  const processFileUpload = async (file: File, taskId: string) => {
    updateUploadTaskStatus(taskId, { status: 'uploading', progress: 5 });

    try {
      // 1. ดึงภาพย่อ Thumbnail (Base64) บนฝั่ง Client
      const thumbnailBase64 = await generateThumbnail(file);

      // 2. แจ้งขอเริ่มต้นการอัปโหลดไฟล์กับ backend
      const initResponse = await api.post('/storage/upload/initiate', {
        name: file.name,
        mimetype: file.type || 'application/octet-stream',
        size: file.size,
        folderId: currentFolderId, // ใช้โฟลเดอร์ปัจจุบัน
      });

      const { fileId } = initResponse.data.data;
      const totalSize = file.size;
      const totalChunks = Math.max(1, Math.ceil(totalSize / CHUNK_SIZE));

      // 3. ทยอยสไลซ์และอัปโหลดไปทีละชิ้นส่วน
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(totalSize, start + CHUNK_SIZE);
        const chunkBlob = file.slice(start, end);
        const chunkSize = end - start;

        const formData = new FormData();
        formData.append('file', chunkBlob, file.name);

        await api.post(`/storage/upload/chunk`, formData, {
          params: {
            fileId,
            chunkIndex,
            size: chunkSize,
          },
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        const currentProgress = Math.round(((chunkIndex + 1) / totalChunks) * 90);
        updateUploadTaskStatus(taskId, { progress: currentProgress });
      }

      // 4. บันทึกและสรุปความสมบูรณ์ส่งท้ายพร้อมส่ง thumbnail
      await api.post('/storage/upload/complete', {
        fileId,
        thumbnail: thumbnailBase64,
      });

      updateUploadTaskStatus(taskId, { status: 'completed', progress: 100 });
      fetchContents();
    } catch (err: any) {
      console.error(err);
      updateUploadTaskStatus(taskId, {
        status: 'error',
        errorMessage: err.response?.data?.messageTh || err.message || 'เกิดข้อผิดพลาดในการอัปโหลด',
      });
    }
  };

  const addFilesToUploadQueue = (files: File[]) => {
    const newTasks = files.map((file) => ({
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'pending' as const,
    }));

    setUploadTasks((prev) => [...prev, ...newTasks]);

    files.forEach((file, index) => {
      processFileUpload(file, newTasks[index].id);
    });
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToUploadQueue(Array.from(e.target.files));
    }
  };

  // สถานะการลากไฟล์วางบนหน้าเว็บโดยตรง
  const [isPageDragActive, setIsPageDragActive] = useState(false);

  const handlePageDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsPageDragActive(true);
    }
  };

  const handlePageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPageDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      addFilesToUploadQueue(files);
    }
  };

  // ยืนยันตัวตนก่อนเข้าใช้งาน
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');

    if (!token || !storedUser) {
      router.push('/login');
    } else {
      setUser(JSON.parse(storedUser));
    }
  }, [router]);

  // ซิงค์ URL Query Parameter (folderId) เข้ากับ state
  useEffect(() => {
    setCurrentFolderId(folderQueryId);
  }, [folderQueryId]);

  // ฟังก์ชันโหลดข้อมูลในโฟลเดอร์
  const fetchContents = useCallback(async () => {
    if (!localStorage.getItem('accessToken')) return;
    setLoading(true);
    try {
      const response = await api.get('/storage/folders', {
        params: {
          parentId: currentFolderId || undefined,
        },
      });
      const resData = response.data;
      if (resData.statusCode === 200) {
        setFolders(resData.data.folders || []);
        setFiles(resData.data.files || []);
        setFolderPath(resData.data.path || []);
      }
    } catch (error) {
      console.error('Failed to load folder contents', error);
    } finally {
      setLoading(false);
    }
  }, [currentFolderId]);

  useEffect(() => {
    if (user) {
      fetchContents();
    }
  }, [user, currentFolderId, fetchContents]);

  // จัดการการเปลี่ยนระดับโฟลเดอร์ (Breadcrumb Navigation)
  const handleNavigate = (folderId: string | null) => {
    if (folderId === null) {
      router.push('/');
    } else {
      router.push(`/?folder=${folderId}`);
    }
  };

  // ดับเบิ้ลคลิกเพื่อเปิดโฟลเดอร์
  const handleFolderDoubleClick = (folderId: string, folderName: string) => {
    router.push(`/?folder=${folderId}`);
  };

  // จัดการสร้างโฟลเดอร์ใหม่
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setFolderCreating(true);
    try {
      const response = await api.post('/storage/folders', {
        name: newFolderName,
        parentId: currentFolderId,
      });
      if (response.data.statusCode === 201) {
        setNewFolderName('');
        setIsNewFolderOpen(false);
        fetchContents();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setFolderCreating(false);
    }
  };

  // ดึงหน้าต่างเปลี่ยนชื่อโฟลเดอร์
  const triggerRenameFolder = (id: string, currentName: string) => {
    setRenameTarget({ id, name: currentName, type: 'folder' });
    setRenameValue(currentName);
    setIsRenameOpen(true);
  };

  // ดึงหน้าต่างเปลี่ยนชื่อไฟล์
  const triggerRenameFile = (id: string, currentName: string) => {
    setRenameTarget({ id, name: currentName, type: 'file' });
    setRenameValue(currentName);
    setIsRenameOpen(true);
  };

  // ส่งคำขอเปลี่ยนชื่อ
  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget || !renameValue.trim()) return;

    setRenameLoading(true);
    try {
      const endpoint = renameTarget.type === 'folder' 
        ? `/storage/folders/${renameTarget.id}` 
        : `/storage/files/${renameTarget.id}`;

      const response = await api.patch(endpoint, { name: renameValue });
      if (response.data.statusCode === 200) {
        setIsRenameOpen(false);
        setRenameTarget(null);
        fetchContents();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setRenameLoading(false);
    }
  };

  // จัดการลบโฟลเดอร์
  const handleDeleteFolder = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบโฟลเดอร์นี้และข้อมูลย่อยทั้งหมด? ข้อมูลใน Discord จะถูกลบออกด้วย')) return;

    try {
      const response = await api.delete(`/storage/folders/${id}`);
      if (response.data.statusCode === 200) {
        fetchContents();
      }
    } catch (error) {
      console.error(error);
    }
  };

  // จัดการลบไฟล์
  const handleDeleteFile = async (id: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบไฟล์นี้? ชิ้นส่วนที่เก็บไว้บน Discord จะถูกลบออกด้วย')) return;

    try {
      const response = await api.delete(`/storage/files/${id}`);
      if (response.data.statusCode === 200) {
        fetchContents();
      }
    } catch (error) {
      console.error(error);
    }
  };

  // เปิด move modal สำหรับไฟล์
  const triggerMoveFile = (id: string, name: string) => {
    setMoveTarget({ id, name, type: 'file' });
    setIsMoveOpen(true);
  };

  // เปิด move modal สำหรับโฟลเดอร์
  const triggerMoveFolder = (id: string, name: string) => {
    setMoveTarget({ id, name, type: 'folder' });
    setIsMoveOpen(true);
  };

  // ส่งคำขอย้ายไฟล์หรือโฟลเดอร์
  const handleMoveConfirm = async (targetFolderId: string | null) => {
    if (!moveTarget) return;
    if (moveTarget.type === 'file') {
      await api.patch(`/storage/files/${moveTarget.id}/move`, { targetFolderId });
    } else {
      await api.patch(`/storage/folders/${moveTarget.id}/move`, { targetParentId: targetFolderId });
    }
    setMoveTarget(null);
    fetchContents();
  };


  // ดาวน์โหลดสตรีมไฟล์แบบ Chunk
  const handleDownloadFile = async (id: string, name: string) => {
    const downloadId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setDownloadTasks((prev) => [...prev, { id: downloadId, name, status: 'downloading' }]);

    try {
      const token = localStorage.getItem('accessToken');
      // ใช้ anchor element สั่งยิงดึงไฟล์เป็น Blob/Stream
      const link = document.createElement('a');
      link.href = `${API_URL}/storage/files/${id}/download`;
      
      const response = await fetch(`${API_URL}/storage/files/${id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        setDownloadTasks((prev) =>
          prev.map((t) => (t.id === downloadId ? { ...t, status: 'error' } : t))
        );
        alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์เพื่อสตรีมไฟล์');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      link.href = url;
      link.setAttribute('download', name);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setDownloadTasks((prev) =>
        prev.map((t) => (t.id === downloadId ? { ...t, status: 'completed' } : t))
      );

      // เคลียร์รายการดาวน์โหลดที่สำเร็จออกจากจอใน 4 วินาที
      setTimeout(() => {
        setDownloadTasks((prev) => prev.filter((t) => t.id !== downloadId));
      }, 4000);
    } catch (error) {
      console.error('Failed to download file', error);
      setDownloadTasks((prev) =>
        prev.map((t) => (t.id === downloadId ? { ...t, status: 'error' } : t))
      );
      alert('ดาวน์โหลดไฟล์ล้มเหลว');
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white font-sans">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar เมนูด้านซ้าย */}
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        username={user.username}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Panel เมนูควบคุมด้านขวา */}
      <main 
        onDragEnter={handlePageDrag}
        className="flex flex-1 flex-col overflow-hidden bg-slate-900/40 relative"
      >
        {isPageDragActive && (
          <div 
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDragLeave={() => setIsPageDragActive(false)}
            onDrop={handlePageDrop}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/85 backdrop-blur-md border-4 border-dashed border-indigo-500/50 m-4 rounded-2xl transition-all duration-300 pointer-events-auto"
          >
            <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm">
              <UploadCloud className="h-16 w-16 text-indigo-500 animate-bounce mb-4" />
              <h3 className="text-xl font-bold text-white">วางไฟล์ลงที่นี่เพื่ออัปโหลด</h3>
              <p className="text-sm text-slate-400 mt-2">
                ปล่อยไฟล์ของคุณเพื่อเริ่มการอัปโหลดแบบแยกส่วน Chunk ไปยังโฟลเดอร์นี้โดยตรง
              </p>
            </div>
          </div>
        )}

        {/* Mobile top-bar */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/40 px-6 py-4 md:hidden shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(true)}
              className="h-9 w-9 text-slate-400 hover:text-white hover:bg-slate-900/60"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="text-sm font-bold text-white tracking-wide">Antigravity</span>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-indigo-400 font-semibold ring-1 ring-slate-700 text-xs">
            {user.username.substring(0, 2).toUpperCase()}
          </div>
        </div>
        {currentView === 'drive' ? (
          <div className="flex flex-1 flex-col overflow-hidden p-4 md:p-6">
            {/* Header section */}
            <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-5 flex-wrap">
              <div>
                <h2 className="text-xl font-bold text-white tracking-wide">ไดรฟ์ส่วนตัว</h2>
                <p className="text-xs text-slate-500">จัดการโฟลเดอร์และอัปโหลดแบ่ง Chunk ไฟล์ฝากไว้บน Discord</p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setIsNewFolderOpen(true)}
                  variant="secondary"
                  className="bg-slate-900 border border-slate-800 hover:bg-slate-800/80 hover:border-slate-700 text-slate-200"
                >
                  <FolderPlus className="mr-2 h-4 w-4 text-amber-500" />
                  สร้างโฟลเดอร์
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  className="hidden"
                />
                <Button
                  onClick={triggerFileInput}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/10"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  อัปโหลดไฟล์
                </Button>
              </div>
            </div>

            {/* Breadcrumb path */}
            <Breadcrumbs path={folderPath} onNavigate={handleNavigate} />

            {/* Content area */}
            <div className="flex-1 overflow-y-auto py-2 pr-1">
              {loading ? (
                <div className="flex h-60 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                </div>
              ) : (
                <FileGrid
                  folders={folders}
                  files={files}
                  onFolderClick={handleFolderDoubleClick}
                  onRenameFolder={triggerRenameFolder}
                  onDeleteFolder={handleDeleteFolder}
                  onMoveFolder={triggerMoveFolder}
                  onRenameFile={triggerRenameFile}
                  onDeleteFile={handleDeleteFile}
                  onDownloadFile={handleDownloadFile}
                  onMoveFile={triggerMoveFile}
                  onPreviewFile={(file) => {
                    setPreviewFile(file);
                    setIsPreviewOpen(true);
                  }}
                />
              )}
            </div>
          </div>
        ) : currentView === 'url-downloader' ? (
          <div className="flex flex-1 flex-col overflow-hidden p-4 md:p-6">
            <UrlDownloaderPanel folderId={currentFolderId} />
          </div>
        ) : (
          <div className="flex flex-1 flex-col overflow-y-auto p-4 md:p-6">
            <SettingsPanel />
          </div>
        )}
      </main>



      {/* -------------------- New Folder Dialog -------------------- */}
      <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
        <DialogContent className="w-[92vw] max-w-md sm:w-full border-slate-800 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>สร้างโฟลเดอร์ใหม่</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateFolder}>
            <div className="py-4">
              <Input
                type="text"
                placeholder="ระบุชื่อโฟลเดอร์ของคุณ..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600 focus-visible:ring-indigo-500"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsNewFolderOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                disabled={folderCreating || !newFolderName.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {folderCreating ? 'กำลังสร้าง...' : 'สร้างโฟลเดอร์'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* -------------------- Rename Target Dialog -------------------- */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="w-[92vw] max-w-md sm:w-full border-slate-800 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>
              เปลี่ยนชื่อ{renameTarget?.type === 'folder' ? 'โฟลเดอร์' : 'ไฟล์'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRenameSubmit}>
            <div className="py-4">
              <Input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="bg-slate-950 border-slate-800 text-slate-100 focus-visible:ring-indigo-500"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsRenameOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                disabled={renameLoading || !renameValue.trim()}
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {renameLoading ? 'กำลังบันทึก...' : 'เปลี่ยนชื่อ'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* -------------------- File Preview Modal -------------------- */}
      <FilePreviewModal
        file={previewFile}
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewFile(null);
        }}
        onDownload={handleDownloadFile}
      />

      {/* -------------------- Move Item Modal -------------------- */}
      <MoveItemModal
        isOpen={isMoveOpen}
        onClose={() => { setIsMoveOpen(false); setMoveTarget(null); }}
        onConfirm={handleMoveConfirm}
        itemName={moveTarget?.name || ''}
        itemType={moveTarget?.type || 'file'}
        excludeFolderId={moveTarget?.type === 'folder' ? moveTarget.id : undefined}
        currentFolderId={currentFolderId}
      />

      {/* Floating Status Panel (Bottom Right) */}
      {(uploadTasks.length > 0 || downloadTasks.length > 0) && (
        <div className="fixed bottom-6 right-6 z-50 w-80 rounded-xl border border-slate-800 bg-slate-950/90 p-4 shadow-2xl backdrop-blur-md text-slate-100 animate-in slide-in-from-bottom-5 duration-300 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-semibold text-slate-300 tracking-wider">สถานะการส่งข้อมูล ({uploadTasks.length + downloadTasks.length})</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setUploadTasks([]);
                setDownloadTasks([]);
              }}
              className="h-6 w-6 text-slate-500 hover:text-slate-300 hover:bg-slate-900/60"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
            {/* Upload Tasks */}
            {uploadTasks.map((task) => (
              <div key={task.id} className="text-xs space-y-1.5 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/40">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate max-w-[170px] font-medium text-slate-200">{task.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {task.status === 'uploading' && (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />
                        <span className="text-[10px] text-indigo-400 font-semibold">{task.progress}%</span>
                      </>
                    )}
                    {task.status === 'completed' && (
                      <>
                        <CheckCircle className="h-3 w-3 text-emerald-400" />
                        <span className="text-[10px] text-emerald-400 font-semibold">เสร็จสิ้น</span>
                      </>
                    )}
                    {task.status === 'error' && (
                      <>
                        <AlertCircle className="h-3 w-3 text-rose-400" />
                        <span className="text-[10px] text-rose-400 font-semibold">ล้มเหลว</span>
                      </>
                    )}
                  </div>
                </div>
                {task.status === 'uploading' && (
                  <Progress value={task.progress} className="h-1 bg-slate-800" />
                )}
              </div>
            ))}

            {/* Download Tasks */}
            {downloadTasks.map((task) => (
              <div key={task.id} className="text-xs space-y-1.5 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/40">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate max-w-[170px] font-medium text-slate-200">{task.name}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {task.status === 'downloading' && (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin text-indigo-400" />
                        <span className="text-[10px] text-indigo-400 font-semibold">กำลังโหลด...</span>
                      </>
                    )}
                    {task.status === 'completed' && (
                      <>
                        <CheckCircle className="h-3 w-3 text-emerald-400" />
                        <span className="text-[10px] text-emerald-400 font-semibold">เสร็จสิ้น</span>
                      </>
                    )}
                    {task.status === 'error' && (
                      <>
                        <AlertCircle className="h-3 w-3 text-rose-400" />
                        <span className="text-[10px] text-rose-400 font-semibold">ล้มเหลว</span>
                      </>
                    )}
                  </div>
                </div>
                {task.status === 'downloading' && (
                  <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 animate-pulse w-2/3" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white font-sans">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
