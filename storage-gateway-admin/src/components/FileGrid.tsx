import React from 'react';
import {
  Folder,
  File,
  FileText,
  Video,
  Image as ImageIcon,
  MoreVertical,
  Download,
  Edit2,
  Trash2,
  FileArchive,
  FileAudio,
  Eye,
  FolderInput
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';

interface FolderItem {
  id: string;
  name: string;
}

interface FileItem {
  id: string;
  name: string;
  mimetype: string;
  size: number;
  thumbnail: string | null;
  createdAt: string;
}

interface FileGridProps {
  folders: FolderItem[];
  files: FileItem[];
  onFolderClick: (folderId: string, folderName: string) => void;
  onRenameFolder: (id: string, currentName: string) => void;
  onDeleteFolder: (id: string) => void;
  onMoveFolder: (id: string, name: string) => void;
  onRenameFile: (id: string, currentName: string) => void;
  onDeleteFile: (id: string) => void;
  onDownloadFile: (id: string, name: string) => void;
  onMoveFile: (id: string, name: string) => void;
  onPreviewFile?: (file: FileItem) => void;
}

// ฟังก์ชันสำหรับแสดง Preview ใน Card (รูปภาพ หรือ Icon)
const getFilePreview = (mimetype: string, thumbnail: string | null) => {
  if (thumbnail) {
    return (
      <div className="relative h-full w-full flex items-center justify-center bg-slate-950/20">
        <img
          src={thumbnail}
          alt="file preview"
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
    );
  }

  const iconClasses = "h-10 w-10 sm:h-12 sm:w-12 text-slate-400 transition-transform duration-200 group-hover:scale-110";
  if (mimetype.startsWith('image/')) {
    return <ImageIcon className={`${iconClasses} text-rose-400`} />;
  }
  if (mimetype.startsWith('video/')) {
    return <Video className={`${iconClasses} text-violet-400`} />;
  }
  if (mimetype.startsWith('audio/')) {
    return <FileAudio className={`${iconClasses} text-amber-400`} />;
  }
  if (mimetype.includes('zip') || mimetype.includes('tar') || mimetype.includes('rar')) {
    return <FileArchive className={`${iconClasses} text-yellow-400`} />;
  }
  if (mimetype.includes('pdf') || mimetype.includes('text') || mimetype.includes('doc')) {
    return <FileText className={`${iconClasses} text-blue-400`} />;
  }
  return <File className={`${iconClasses} text-slate-400`} />;
};


export default function FileGrid({
  folders,
  files,
  onFolderClick,
  onRenameFolder,
  onDeleteFolder,
  onMoveFolder,
  onRenameFile,
  onDeleteFile,
  onDownloadFile,
  onMoveFile,
  onPreviewFile,
}: FileGridProps) {

  return (
    <div className="space-y-8 font-sans">
      {/* -------------------- Folders Section -------------------- */}
      {folders.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-400 tracking-wider">โฟลเดอร์ (Folders)</h3>
          <div className="grid grid-cols-4 gap-2.5 sm:gap-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
            {folders.map((folder) => (
              <Card
                key={folder.id}
                onClick={() => onFolderClick(folder.id, folder.name)}
                className="group relative flex flex-col border border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-700 hover:shadow-lg transition-all duration-200 cursor-pointer select-none overflow-hidden rounded-xl"
              >
                {/* ส่วนรูปภาพ / Preview ด้านบน */}
                <div className="aspect-square w-full flex items-center justify-center bg-slate-950/40 relative border-b border-slate-800/50">
                  <Folder className="h-10 w-10 sm:h-12 sm:w-12 text-amber-500 fill-amber-500/10 group-hover:scale-110 group-hover:fill-amber-500/20 transition-all duration-200 shrink-0" />
                </div>

                {/* รายละเอียดด้านล่าง */}
                <div className="p-2 sm:p-2.5 flex flex-col justify-between flex-grow min-h-0 bg-slate-900/10">
                  <div className="flex items-start justify-between gap-1">
                    <div className="overflow-hidden flex-1">
                      <div className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                        <h4 className="text-[11px] sm:text-xs font-semibold text-slate-200 truncate" title={folder.name}>
                          {folder.name}
                        </h4>
                      </div>
                      <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">
                        โฟลเดอร์
                      </p>
                    </div>

                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="rounded-lg p-0.5 text-slate-500 hover:text-white hover:bg-slate-800/60 transition-colors focus:outline-none">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="border-slate-800 bg-slate-900 text-slate-200">
                          <DropdownMenuItem
                            onClick={() => onRenameFolder(folder.id, folder.name)}
                            className="gap-2 cursor-pointer hover:bg-slate-800 focus:bg-slate-800 focus:text-white text-xs"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                            เปลี่ยนชื่อ (Rename)
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onMoveFolder(folder.id, folder.name)}
                            className="gap-2 cursor-pointer hover:bg-slate-800 focus:bg-slate-800 focus:text-white text-xs"
                          >
                            <FolderInput className="h-3.5 w-3.5 text-slate-400" />
                            ย้ายไปยัง... (Move to)
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDeleteFolder(folder.id)}
                            className="gap-2 text-rose-400 focus:bg-rose-500/10 focus:text-rose-400 cursor-pointer text-xs"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            ลบโฟลเดอร์ (Delete)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* -------------------- Files Section -------------------- */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-400 tracking-wider">ไฟล์ (Files)</h3>
          <div className="grid grid-cols-4 gap-2.5 sm:gap-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
            {files.map((file) => (
              <Card
                key={file.id}
                onDoubleClick={() => onPreviewFile?.(file)}
                className="group relative flex flex-col border border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-700 hover:shadow-lg transition-all duration-200 select-none cursor-pointer overflow-hidden rounded-xl"
              >
                {/* ส่วนรูปภาพ / Preview ด้านบน */}
                <div 
                  className="aspect-square w-full flex items-center justify-center bg-slate-950/40 relative overflow-hidden border-b border-slate-800/50"
                  onClick={() => onPreviewFile?.(file)}
                >
                  {getFilePreview(file.mimetype, file.thumbnail)}
                </div>

                {/* รายละเอียดด้านล่าง */}
                <div className="p-2 sm:p-2.5 flex flex-col justify-between flex-grow min-h-0 bg-slate-900/10">
                  <div className="flex items-start justify-between gap-1">
                    <div className="overflow-hidden flex-1" onClick={() => onPreviewFile?.(file)}>
                      <div className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 shrink-0" />
                        <h4 className="text-[11px] sm:text-xs font-semibold text-slate-200 truncate" title={file.name}>
                          {file.name}
                        </h4>
                      </div>
                      <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 truncate">
                        {file.mimetype.split('/')[1]?.toUpperCase() || 'UNKNOWN'} • {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>

                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="rounded-lg p-0.5 text-slate-500 hover:text-white hover:bg-slate-800/60 transition-colors focus:outline-none">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="border-slate-800 bg-slate-900 text-slate-200">
                          <DropdownMenuItem
                            onClick={() => onPreviewFile?.(file)}
                            className="gap-2 cursor-pointer hover:bg-slate-800 focus:bg-slate-800 focus:text-white text-xs"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-400" />
                            ดูไฟล์ (Preview)
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDownloadFile(file.id, file.name)}
                            className="gap-2 cursor-pointer hover:bg-slate-800 focus:bg-slate-800 focus:text-white text-xs"
                          >
                            <Download className="h-3.5 w-3.5 text-slate-400" />
                            ดาวน์โหลด (Download)
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onRenameFile(file.id, file.name)}
                            className="gap-2 cursor-pointer hover:bg-slate-800 focus:bg-slate-800 focus:text-white text-xs"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                            เปลี่ยนชื่อ (Rename)
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onMoveFile(file.id, file.name)}
                            className="gap-2 cursor-pointer hover:bg-slate-800 focus:bg-slate-800 focus:text-white text-xs"
                          >
                            <FolderInput className="h-3.5 w-3.5 text-slate-400" />
                            ย้ายไปยัง... (Move to)
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDeleteFile(file.id)}
                            className="gap-2 text-rose-400 focus:bg-rose-500/10 focus:text-rose-400 cursor-pointer text-xs"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            ลบไฟล์ (Delete)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* วันที่ระบุล่างสุด */}
                  <div className="mt-1.5 flex items-center justify-between text-[8px] sm:text-[9px] text-slate-600 border-t border-slate-800/30 pt-1">
                    <span>{new Date(file.createdAt).toLocaleDateString('th-TH')}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* -------------------- Empty State -------------------- */}
      {folders.length === 0 && files.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Folder className="h-14 w-14 text-slate-700 animate-pulse mb-3" />
          <h4 className="text-base font-semibold text-slate-400">โฟลเดอร์นี้ว่างเปล่า</h4>
          <p className="text-xs text-slate-500 mt-1">
            กดปุ่ม &quot;สร้างโฟลเดอร์&quot; หรือลากวางไฟล์ที่ต้องการอัปโหลดลงที่นี่
          </p>
        </div>
      )}
    </div>
  );
}
