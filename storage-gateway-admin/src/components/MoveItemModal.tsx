'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Folder, FolderOpen, ChevronRight, Home, Loader2, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';

interface FolderNode {
  id: string;
  name: string;
}

interface MoveItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (targetFolderId: string | null) => Promise<void>;
  itemName: string;
  itemType: 'file' | 'folder';
  excludeFolderId?: string; // ซ่อนโฟลเดอร์ตัวเองออก (กรณีย้ายโฟลเดอร์)
  currentFolderId?: string | null; // โฟลเดอร์ปัจจุบันที่ไฟล์อยู่ (เพื่อ highlight)
}

interface BreadcrumbNode {
  id: string | null;
  name: string;
}

export default function MoveItemModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType,
  excludeFolderId,
  currentFolderId,
}: MoveItemModalProps) {
  const [browseFolderId, setBrowseFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<FolderNode[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbNode[]>([{ id: null, name: 'ไดรฟ์' }]);
  const [loading, setLoading] = useState(false);
  const [moving, setMoving] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null | undefined>(undefined);

  // โหลดโฟลเดอร์เมื่อ browseFolderId เปลี่ยน
  useEffect(() => {
    if (!isOpen) return;
    const fetchFolders = async () => {
      setLoading(true);
      try {
        const res = await api.get('/storage/folders', {
          params: { parentId: browseFolderId || undefined },
        });
        if (res.data.statusCode === 200) {
          const allFolders: FolderNode[] = res.data.data.folders || [];
          // กรองโฟลเดอร์ตัวเองออก (กันย้ายเข้าตัวเอง)
          setFolders(allFolders.filter((f) => f.id !== excludeFolderId));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchFolders();
  }, [browseFolderId, isOpen, excludeFolderId]);

  // reset state เมื่อ modal เปิดใหม่
  useEffect(() => {
    if (isOpen) {
      setBrowseFolderId(null);
      setBreadcrumbs([{ id: null, name: 'ไดรฟ์' }]);
      setSelectedFolderId(undefined);
      setMoving(false);
    }
  }, [isOpen]);

  const handleOpenFolder = (folder: FolderNode) => {
    setBrowseFolderId(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setSelectedFolderId(undefined);
  };

  const handleBreadcrumbClick = (node: BreadcrumbNode, index: number) => {
    setBrowseFolderId(node.id);
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
    setSelectedFolderId(undefined);
  };

  const handleSelectCurrentLocation = () => {
    setSelectedFolderId(browseFolderId);
  };

  const handleConfirm = async () => {
    // selectedFolderId: undefined = ยังไม่เลือก, null = root, string = โฟลเดอร์
    const target = selectedFolderId === undefined ? browseFolderId : selectedFolderId;
    setMoving(true);
    try {
      await onConfirm(target);
      onClose();
    } finally {
      setMoving(false);
    }
  };

  const isAtCurrentLocation =
    selectedFolderId === undefined && browseFolderId === currentFolderId;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[92vw] max-w-md sm:w-full border-slate-800 bg-slate-900 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            ย้าย{itemType === 'folder' ? 'โฟลเดอร์' : 'ไฟล์'}: <span className="text-indigo-400 truncate">{itemName}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Breadcrumb navigation */}
        <div className="flex items-center gap-1 text-xs text-slate-400 flex-wrap px-1">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="h-3 w-3 text-slate-600 shrink-0" />}
              <button
                onClick={() => handleBreadcrumbClick(crumb, idx)}
                className={`hover:text-white transition-colors truncate max-w-[120px] ${
                  idx === breadcrumbs.length - 1 ? 'text-slate-200 font-medium' : 'hover:text-white'
                }`}
              >
                {idx === 0 ? <Home className="h-3 w-3 inline-block" /> : crumb.name}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Folder list */}
        <div className="min-h-[180px] max-h-64 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/60 p-1.5 space-y-0.5">
          {/* "วางที่นี่" option (current browse location) */}
          <button
            onClick={handleSelectCurrentLocation}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors text-left ${
              selectedFolderId === browseFolderId || (selectedFolderId === undefined && !isAtCurrentLocation)
                ? 'bg-indigo-600/20 text-indigo-300 ring-1 ring-indigo-500/40'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            } ${isAtCurrentLocation ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            disabled={isAtCurrentLocation}
          >
            <FolderOpen className="h-4 w-4 shrink-0 text-amber-500/60" />
            <span className="truncate font-medium">
              {breadcrumbs.length === 1 ? 'ไดรฟ์ (Root)' : breadcrumbs[breadcrumbs.length - 1].name}
            </span>
            {isAtCurrentLocation && (
              <span className="ml-auto text-[10px] text-slate-600 shrink-0">ที่อยู่เดิม</span>
            )}
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            </div>
          ) : folders.length === 0 ? (
            <p className="text-center text-xs text-slate-600 py-8">ไม่มีโฟลเดอร์ย่อยใน{breadcrumbs.length === 1 ? 'ไดรฟ์' : 'โฟลเดอร์นี้'}</p>
          ) : (
            folders.map((folder) => (
              <div key={folder.id} className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedFolderId(folder.id)}
                  className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-left transition-colors ${
                    selectedFolderId === folder.id
                      ? 'bg-indigo-600/20 text-indigo-300 ring-1 ring-indigo-500/40'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <Folder className="h-4 w-4 shrink-0 text-amber-500 fill-amber-500/10" />
                  <span className="truncate">{folder.name}</span>
                </button>
                <button
                  onClick={() => handleOpenFolder(folder)}
                  title="เปิดโฟลเดอร์นี้"
                  className="p-2 rounded-md text-slate-500 hover:text-white hover:bg-slate-800/60 transition-colors shrink-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <p className="text-[11px] text-slate-600 px-1">
          💡 คลิกเพื่อเลือกโฟลเดอร์ปลายทาง หรือกด <ChevronRight className="h-3 w-3 inline" /> เพื่อเปิดดูโฟลเดอร์ย่อย
        </p>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
            disabled={moving}
          >
            ยกเลิก
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={moving || isAtCurrentLocation}
            className="bg-indigo-600 hover:bg-indigo-500 text-white min-w-[100px]"
          >
            {moving ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />กำลังย้าย...</>
            ) : (
              'ย้ายมาที่นี่'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
