import { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import type { RequestWithRelations } from '../types/database';
import { parseRequisitionDescription } from '../lib/parseRequisitionDescription';
import RequisitionDocumentView from './RequisitionDocumentView';

type Props = {
  request: RequestWithRelations | null;
  onClose: () => void;
};

export default function RequisitionViewModal({ request, onClose }: Props) {
  const parsed = useMemo(
    () => (request ? parseRequisitionDescription(request.description) : null),
    [request?.description, request?.id]
  );

  useEffect(() => {
    if (!request) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [request, onClose]);

  if (!request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 pt-8 sm:pt-12">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="requisition-dialog-title"
        className="relative z-10 w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-xl bg-white shadow-2xl border border-gray-200"
      >
        <div className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur-sm sm:px-6">
          <h2 id="requisition-dialog-title" className="text-lg font-semibold text-gray-900 truncate pr-2">
            Requisition — {request.item_name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-4 py-6 sm:px-8 sm:pb-10">
          <RequisitionDocumentView request={request} parsed={parsed} />
        </div>
      </div>
    </div>
  );
}
