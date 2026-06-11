'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { generateThumbnail } from '@/lib/thumbnail';
import { api } from '@/lib/api';
import { UploadCloud, File, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderId: string | null;
  onUploadSuccess: () => void;
  initialFiles?: File[];
  tasks: UploadTask[];
  setTasks: React.Dispatch<React.SetStateAction<UploadTask[]>>;
}

interface UploadTask {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  errorMessage?: string;
}

const CHUNK_SIZE = 8 * 1024 * 1024; // ขนาดชิ้นละ 8 MB

export default function UploadModal({
  isOpen,
  onClose,
  folderId,
  onUploadSuccess,
  initialFiles,
  tasks,
  setTasks
}: UploadModalProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // สั่งทริกเกอร์คิวเริ่มต้น เมื่อมีไฟล์ถูกส่งต่อเข้ามา (เช่น จากการลากวางหน้าแรก)
  useEffect(() => {
    if (isOpen && initialFiles && initialFiles.length > 0) {
      addFilesToQueue(initialFiles);
    }
  }, [isOpen, initialFiles]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      addFilesToQueue(files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const files = Array.from(e.target.files);
      addFilesToQueue(files);
    }
  };

  const selectFiles = () => {
    fileInputRef.current?.click();
  };

  const addFilesToQueue = (files: File[]) => {
    const newTasks = files.map((file) => ({
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      progress: 0,
      status: 'pending' as const,
    }));

    setTasks((prev) => [...prev, ...newTasks]);

    // เริ่มทำงานอัปโหลดทีละไฟล์
    files.forEach((file, index) => {
      processFileUpload(file, newTasks[index].id);
    });
  };

  const processFileUpload = async (file: File, taskId: string) => {
    updateTaskStatus(taskId, { status: 'uploading', progress: 5 });

    try {
      // 1. ดึงภาพย่อ Thumbnail (Base64) บนฝั่ง Client
      const thumbnailBase64 = await generateThumbnail(file);

      // กำหนด mimetype โดยแปลง .mkv ให้เป็น video/x-matroska และ .mov เป็น video/quicktime
      let resolvedMimetype = file.type || 'application/octet-stream';
      if (file.name.toLowerCase().endsWith('.mkv') && (!file.type || file.type === 'application/octet-stream')) {
        resolvedMimetype = 'video/x-matroska';
      } else if (file.name.toLowerCase().endsWith('.mov') && (!file.type || file.type === 'application/octet-stream')) {
        resolvedMimetype = 'video/quicktime';
      }

      // 2. แจ้งขอเริ่มต้นการอัปโหลดไฟล์กับ backend
      const initResponse = await api.post('/storage/upload/initiate', {
        name: file.name,
        mimetype: resolvedMimetype,
        size: file.size,
        folderId,
      });

      const { fileId } = initResponse.data.data;
      const totalSize = file.size;
      const totalChunks = Math.max(1, Math.ceil(totalSize / CHUNK_SIZE));

      // 3. ทยอยหั่นสไลซ์และอัปโหลดไปทีละชิ้นส่วน (Chunk-by-Chunk)
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * CHUNK_SIZE;
        const end = Math.min(totalSize, start + CHUNK_SIZE);
        const chunkBlob = file.slice(start, end);
        const chunkSize = end - start;

        const formData = new FormData();
        formData.append('file', chunkBlob, file.name);

        // อัปโหลดขึ้นทีละชิ้นส่วน
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

        // อัปเดตความคืบหน้าของไฟล์
        const currentProgress = Math.round(((chunkIndex + 1) / totalChunks) * 90);
        updateTaskStatus(taskId, { progress: currentProgress });
      }

      // 4. บันทึกและสรุปความสมบูรณ์ส่งท้ายพร้อมส่ง thumbnail
      await api.post('/storage/upload/complete', {
        fileId,
        thumbnail: thumbnailBase64,
      });

      updateTaskStatus(taskId, { status: 'completed', progress: 100 });
      onUploadSuccess();
    } catch (err: any) {
      console.error(err);
      updateTaskStatus(taskId, {
        status: 'error',
        errorMessage: err.response?.data?.messageTh || err.message || 'เกิดข้อผิดพลาดในการอัปโหลดไฟล์ย่อย',
      });
    }
  };

  const updateTaskStatus = (id: string, updates: Partial<UploadTask>) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, ...updates } : task))
    );
  };

  const clearQueue = () => {
    setTasks([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[92vw] max-w-lg sm:w-full border-slate-800 bg-slate-900/95 text-slate-100 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white">อัปโหลดไฟล์ขึ้นระบบ (Upload Files)</DialogTitle>
          <DialogDescription className="text-slate-400">
            ลากและวางไฟล์หรือเลือกไฟล์ที่ต้องการเก็บขึ้นระบบ โดยไฟล์จะถูกแบ่งย่อยโดยอัตโนมัติ
          </DialogDescription>
        </DialogHeader>

        {/* Drag and Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={selectFiles}
          className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragActive
              ? 'border-indigo-500 bg-indigo-500/10'
              : 'border-slate-800 bg-slate-950/20 hover:border-slate-700 hover:bg-slate-950/40'
          }`}
        >
          <input
            type="file"
            multiple
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <UploadCloud className="mb-4 h-10 w-10 text-indigo-400 animate-bounce" />
          <p className="text-sm font-semibold text-white">ลากและวางไฟล์ที่นี่ หรือคลิกเพื่อค้นหาไฟล์</p>
          <p className="mt-1 text-xs text-slate-500">รองรับขนาดไฟล์ไม่จำกัด (ระบบแบ่งส่วน Chunk อัตโนมัติ)</p>
        </div>

        {/* Upload Tasks List */}
        {tasks.length > 0 && (
          <div className="mt-4 space-y-3 max-h-60 overflow-y-auto pr-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>ไฟล์ในคิวอัปโหลด ({tasks.length})</span>
              <button onClick={clearQueue} className="text-indigo-400 hover:underline">
                ล้างรายการสำเร็จ
              </button>
            </div>

            {tasks.map((task) => (
              <div
                key={task.id}
                className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <File className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="text-xs font-medium text-white truncate max-w-[260px]">
                      {task.name}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      ({(task.size / (1024 * 1024)).toFixed(2)} MB)
                    </span>
                  </div>

                  <div className="shrink-0">
                    {task.status === 'uploading' && (
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                    )}
                    {task.status === 'completed' && (
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                    )}
                    {task.status === 'error' && (
                      <AlertCircle className="h-4 w-4 text-rose-400" />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Progress value={task.progress} className="h-1.5 flex-1 bg-slate-800" />
                  <span className="text-[10px] font-semibold text-slate-400 w-8 text-right">
                    {task.progress}%
                  </span>
                </div>

                {task.status === 'error' && (
                  <p className="text-[10px] text-rose-400 font-medium truncate">
                    ข้อผิดพลาด: {task.errorMessage}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            ปิดหน้าต่าง
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
