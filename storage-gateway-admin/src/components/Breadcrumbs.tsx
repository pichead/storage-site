'use client';

import React from 'react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { FolderOpen } from 'lucide-react';

interface FolderBreadcrumb {
  id: string;
  name: string;
}

interface BreadcrumbsProps {
  path: FolderBreadcrumb[];
  onNavigate: (folderId: string | null) => void;
}

export default function Breadcrumbs({ path, onNavigate }: BreadcrumbsProps) {
  return (
    <div className="flex items-center gap-2 py-3 px-1 text-slate-400">
      <Breadcrumb>
        <BreadcrumbList className="flex-wrap">
          {/* Root Link */}
          <BreadcrumbItem>
            <button
              onClick={() => onNavigate(null)}
              className="flex items-center gap-2 hover:text-white transition-colors focus:outline-none text-sm font-medium"
            >
              <FolderOpen className="h-4 w-4 text-indigo-400" />
              ไดรฟ์ของฉัน (My Drive)
            </button>
          </BreadcrumbItem>

          {path.map((folder, index) => {
            const isLast = index === path.length - 1;

            return (
              <React.Fragment key={folder.id}>
                <BreadcrumbSeparator className="text-slate-600" />
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage className="text-white font-semibold text-sm max-w-[150px] truncate">
                      {folder.name}
                    </BreadcrumbPage>
                  ) : (
                    <button
                      onClick={() => onNavigate(folder.id)}
                      className="hover:text-white transition-colors focus:outline-none text-sm font-medium max-w-[150px] truncate"
                    >
                      {folder.name}
                    </button>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
