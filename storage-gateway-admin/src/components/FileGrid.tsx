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

// ฟังก์ชันเลือก Icon และสีตามประเภท mimetype
const getFileIcon = (mimetype: string, thumbnail: string | null) => {
  if (thumbnail) {
    return (
      <img
        src={thumbnail}
        alt="file preview"
        className="h-10 w-10 rounded object-cover border border-slate-700"
      />
    );
  }

  const classes = "h-10 w-10 p-2 rounded-lg";
  if (mimetype.startsWith('image/')) {
    return <ImageIcon className={`${classes} bg-rose-500/10 text-rose-400`} />;
  }
  if (mimetype.startsWith('video/')) {
    return <Video className={`${classes} bg-violet-500/10 text-violet-400`} />;
  }
  if (mimetype.startsWith('audio/')) {
    return <FileAudio className={`${classes} bg-amber-500/10 text-amber-400`} />;
  }
  if (mimetype.includes('zip') || mimetype.includes('tar') || mimetype.includes('rar')) {
    return <FileArchive className={`${classes} bg-yellow-500/10 text-yellow-400`} />;
  }
  if (mimetype.includes('pdf') || mimetype.includes('text') || mimetype.includes('doc')) {
    return <FileText className={`${classes} bg-blue-500/10 text-blue-400`} />;
  }
  return <File className={`${classes} bg-slate-500/10 text-slate-400`} />;
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {folders.map((folder) => (
              <Card
                key={folder.id}
                onClick={() => onFolderClick(folder.id, folder.name)}
                className="group relative flex items-center justify-between border-slate-800 bg-slate-900/40 p-4 hover:bg-slate-900/80 hover:border-slate-700 hover:shadow-lg transition-all duration-200 cursor-pointer select-none"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <Folder className="h-6 w-6 shrink-0 text-amber-500 fill-amber-500/10 group-hover:scale-110 transition-transform duration-200" />
                  <span className="text-sm font-medium text-slate-200 truncate pr-4 max-w-[150px] sm:max-w-[200px]">
                    {folder.name}
                  </span>
                </div>

                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded-lg p-1.5 text-slate-500 hover:text-white hover:bg-slate-800/60 transition-colors focus:outline-none">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="border-slate-800 bg-slate-900 text-slate-200">
                      <DropdownMenuItem
                        onClick={() => onRenameFolder(folder.id, folder.name)}
                        className="gap-2 cursor-pointer hover:bg-slate-800 focus:bg-slate-800 focus:text-white"
                      >
                        <Edit2 className="h-4 w-4 text-slate-400" />
                        เปลี่ยนชื่อ (Rename)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onMoveFolder(folder.id, folder.name)}
                        className="gap-2 cursor-pointer hover:bg-slate-800 focus:bg-slate-800 focus:text-white"
                      >
                        <FolderInput className="h-4 w-4 text-slate-400" />
                        ย้ายไปยัง... (Move to)
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDeleteFolder(folder.id)}
                        className="gap-2 text-rose-400 focus:bg-rose-500/10 focus:text-rose-400 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                        ลบโฟลเดอร์ (Delete)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {files.map((file) => (
              <Card
                key={file.id}
                onDoubleClick={() => onPreviewFile?.(file)}
                className="group relative flex flex-col justify-between border-slate-800 bg-slate-900/40 p-4 hover:bg-slate-900/80 hover:border-slate-700 hover:shadow-lg transition-all duration-200 select-none cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden" onClick={() => onPreviewFile?.(file)}>
                    {getFileIcon(file.mimetype, file.thumbnail)}
                    <div className="overflow-hidden">
                      <h4 className="text-sm font-semibold text-slate-200 truncate pr-6 max-w-[150px] sm:max-w-[200px]">
                        {file.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {file.mimetype.split('/')[1]?.toUpperCase() || 'UNKNOWN'} • {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>

                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="rounded-lg p-1.5 text-slate-500 hover:text-white hover:bg-slate-800/60 transition-colors focus:outline-none">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="border-slate-800 bg-slate-900 text-slate-200">
                        <DropdownMenuItem
                          onClick={() => onPreviewFile?.(file)}
                          className="gap-2 cursor-pointer hover:bg-slate-800 focus:bg-slate-800 focus:text-white"
                        >
                          <Eye className="h-4 w-4 text-slate-400" />
                          ดูไฟล์ (Preview)
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDownloadFile(file.id, file.name)}
                          className="gap-2 cursor-pointer hover:bg-slate-800 focus:bg-slate-800 focus:text-white"
                        >
                          <Download className="h-4 w-4 text-slate-400" />
                          ดาวน์โหลด (Download)
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onRenameFile(file.id, file.name)}
                          className="gap-2 cursor-pointer hover:bg-slate-800 focus:bg-slate-800 focus:text-white"
                        >
                          <Edit2 className="h-4 w-4 text-slate-400" />
                          เปลี่ยนชื่อ (Rename)
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onMoveFile(file.id, file.name)}
                          className="gap-2 cursor-pointer hover:bg-slate-800 focus:bg-slate-800 focus:text-white"
                        >
                          <FolderInput className="h-4 w-4 text-slate-400" />
                          ย้ายไปยัง... (Move to)
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDeleteFile(file.id)}
                          className="gap-2 text-rose-400 focus:bg-rose-500/10 focus:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                          ลบไฟล์ (Delete)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800/40 pt-2.5">
                  <span>{new Date(file.createdAt).toLocaleDateString('th-TH')}</span>
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
