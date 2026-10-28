import React from 'react';
import { X, FileText, Download, ExternalLink } from 'lucide-react';
import { FileDetail } from '../types.ts';

interface PdfModalProps {
  file: FileDetail | null;
  onClose: () => void;
}

export const PdfModal: React.FC<PdfModalProps> = ({ file, onClose }) => {
  if (!file) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-[#0e0e13] border border-white/10 rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-white truncate">
                {file.title}
              </h3>
              <p className="text-xs text-neutral-400">Class Notes / Study Material</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {file.file_url && (
              <a
                href={file.file_url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Embedded Frame or Direct Link Fallback */}
        <div className="flex-1 w-full bg-[#121217] relative">
          <iframe
            src={`${file.file_url}#toolbar=0`}
            className="w-full h-full border-0"
            title={file.title}
          />
        </div>

        {/* Footer info & direct links */}
        <div className="p-3 bg-black/40 border-t border-white/5 flex items-center justify-between text-xs text-neutral-400">
          <span>Official Next Toppers Material</span>
          {file.file_url && (
            <a
              href={file.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-400 hover:underline font-medium"
            >
              Open in New Tab <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
