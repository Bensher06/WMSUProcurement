import { Download, Printer, X } from 'lucide-react';

type Line = { label: string; value: string };

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  lines: Line[];
  filenameBase?: string;
};

export default function DashboardSummaryModal({
  open,
  onClose,
  title,
  lines,
  filenameBase = 'dashboard-summary',
}: Props) {
  if (!open) return null;

  const bodyText = [`${title}`, `${'='.repeat(Math.min(50, title.length + 10))}`, '', ...lines.map((l) => `${l.label}: ${l.value}`), ''].join(
    '\n'
  );

  const handleDownload = () => {
    const blob = new Blob([bodyText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filenameBase}-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24">
      <button
        type="button"
        className="print-hide absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-summary-title"
        className="print-document-root relative z-10 w-full max-w-lg rounded-xl bg-white shadow-2xl border border-gray-200"
      >
        <div className="print-hide flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3 sm:px-5">
          <h2 id="dashboard-summary-title" className="text-lg font-semibold text-gray-900 truncate pr-2">
            {title}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="print-document-content px-5 py-4 space-y-3 text-sm text-gray-800">
          {lines.map((row) => (
            <div key={row.label} className="flex flex-col sm:flex-row sm:justify-between sm:gap-4 border-b border-gray-100 pb-2 last:border-0">
              <span className="text-gray-500 shrink-0">{row.label}</span>
              <span className="font-medium text-gray-900 text-right sm:text-right break-words">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
