import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Layers,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet
} from 'lucide-react';
import { parseCSVToExCustomers, generateBpkbCSVTemplate, ParsedExCustomerRow } from '../utils/csvParser';
import { DatabaseService } from '../services/storage';
import { useAuth } from '../context/AuthContext';

interface ImportBpkbModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportBpkbModal: React.FC<ImportBpkbModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { currentUser, refreshData } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedExCustomerRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [autoCreateBranch, setAutoCreateBranch] = useState(true);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    count: number;
    updatedCount: number;
    message: string;
  } | null>(null);

  if (!isOpen || currentUser?.role !== 'SUPER_ADMIN') return null;

  // Handle CSV file selected
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    setIsProcessing(true);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawText(content);
        const { rows, errors } = parseCSVToExCustomers(content);
        setParsedRows(rows);
        setParseErrors(errors);
      }
      setIsProcessing(false);
    };
    reader.onerror = () => {
      setParseErrors(['Gagal membaca file']);
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  // Handle Raw Text change (Paste Mode)
  const handleRawTextChange = (text: string) => {
    setRawText(text);
    setImportResult(null);
    if (text.trim()) {
      const { rows, errors } = parseCSVToExCustomers(text);
      setParsedRows(rows);
      setParseErrors(errors);
    } else {
      setParsedRows([]);
      setParseErrors([]);
    }
  };

  // Download sample CSV template
  const handleDownloadTemplate = () => {
    const csvContent = generateBpkbCSVTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_import_bpkb.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Execute Import
  const handleExecuteImport = () => {
    if (currentUser?.role !== 'SUPER_ADMIN') {
      setParseErrors(['Akses Ditolak: Hanya Super Admin yang diizinkan melakukan import data BPKB.']);
      return;
    }
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      setParseErrors(['Tidak ada baris data valid yang siap diimpor. Silakan periksa format kolom.']);
      return;
    }

    const res = DatabaseService.importExCustomers(
      validRows.map(r => ({
        no_psb: r.no_psb,
        kd_cab: r.kd_cab,
        kd_pos: r.kd_pos,
        nama_konsumen: r.nama_konsumen,
        no_telepon: r.no_telepon,
        tgl_bpkb_sdk: r.tgl_bpkb_sdk,
        status_kredit_lunas: r.status_kredit_lunas
      })),
      {
        mode: importMode,
        autoCreateCabangPosko: autoCreateBranch,
        importedBy: currentUser?.nama || 'Super Admin'
      }
    );

    setImportResult(res);
    refreshData();
    onSuccess();
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-[#13151c] w-full max-w-4xl max-h-[92vh] rounded-2xl border border-[#272d3e] shadow-2xl flex flex-col overflow-hidden text-[#e0e4eb]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#232734] flex items-center justify-between bg-[#0e1015]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-orange-950/80 border border-orange-800/60 rounded-xl text-orange-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#f1f3f7] flex items-center gap-2">
                <span>Import Data Jaminan BPKB (CSV / Excel)</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-950/80 text-orange-300 border border-orange-800/60">
                  SUPER ADMIN
                </span>
              </h2>
              <p className="text-xs text-[#8e96a8]">
                Unggah berkas CSV atau tempel teks data penyerahan BPKB nasabah ex-customer secara massal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8e96a8] hover:text-[#f1f3f7] hover:bg-[#1c1f2a] rounded-lg transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Download Template Banner */}
          <div className="bg-gradient-to-r from-orange-950/40 to-[#181a24] p-4 rounded-xl border border-orange-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <FileSpreadsheet className="h-8 w-8 text-orange-400 shrink-0" />
              <div>
                <h3 className="text-xs font-bold text-[#f1f3f7]">Gunakan Template Standar BPKB</h3>
                <p className="text-[11px] text-[#8e96a8] mt-0.5">
                  Format kolom: <code className="text-orange-300 font-mono">NO_PSB, KD_CAB, KD_POS, NAMA_KONSUMEN, NO_TELEPON, TGL_BPKB_SDK, STATUS_KREDIT_LUNAS</code>
                </p>
              </div>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 bg-orange-600/30 hover:bg-orange-600/50 text-orange-200 border border-orange-500/50 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5 self-start sm:self-auto cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Unduh Template CSV</span>
            </button>
          </div>

          {/* Tab Switcher: Upload File vs Paste Text */}
          <div className="flex items-center space-x-2 border-b border-[#232734] pb-2">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-[#181a24] text-[#8e96a8] hover:text-[#f1f3f7]'
              }`}
            >
              <UploadCloud className="h-4 w-4" />
              <span>Unggah File CSV</span>
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'paste'
                  ? 'bg-orange-600 text-white shadow-md'
                  : 'bg-[#181a24] text-[#8e96a8] hover:text-[#f1f3f7]'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Tempel Teks (Paste Raw CSV)</span>
            </button>
          </div>

          {/* TAB 1: FILE UPLOADER */}
          {activeTab === 'upload' && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#2d3345] hover:border-orange-500/80 bg-[#0e1015]/60 hover:bg-[#151720] transition-all rounded-2xl p-8 text-center cursor-pointer space-y-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,application/vnd.ms-excel"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-orange-950/60 border border-orange-800/60 flex items-center justify-center mx-auto text-orange-400">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#f1f3f7]">
                  {fileName ? `File Terpilih: ${fileName}` : 'Klik untuk memilih file CSV atau seret ke area ini'}
                </p>
                <p className="text-[11px] text-[#8e96a8] mt-1">
                  Mendukung separator koma (,), titik koma (;), atau tab.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: PASTE RAW TEXT */}
          {activeTab === 'paste' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#8e96a8]">
                Tempel Data CSV / Excel (Baris pertama sebagai Header)
              </label>
              <textarea
                value={rawText}
                onChange={(e) => handleRawTextChange(e.target.value)}
                placeholder={`NO_PSB,KD_CAB,KD_POS,NAMA_KONSUMEN,NO_TELEPON,TGL_BPKB_SDK,STATUS_KREDIT_LUNAS\nPSB-16-9901,C16,QJ0,Ahmad Fauzi,081234567890,2026-08-25,Lebih Awal`}
                rows={6}
                className="w-full p-3 bg-[#0d0e12] border border-[#272d3e] rounded-xl text-xs font-mono text-[#e0e4eb] focus:outline-none focus:border-orange-500 placeholder-[#555e70]"
              />
            </div>
          )}

          {/* Parse Errors if any */}
          {parseErrors.length > 0 && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 space-y-1">
              <div className="flex items-center space-x-1.5 font-bold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Peringatan Format Data ({parseErrors.length})</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-300/90 pl-1">
                {parseErrors.slice(0, 4).map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Success Message Banner */}
          {importResult && (
            <div className={`p-4 rounded-xl border flex items-center space-x-3 text-xs ${
              importResult.success
                ? 'bg-emerald-950/50 border-emerald-800/70 text-emerald-300'
                : 'bg-rose-950/50 border-rose-800/70 text-rose-300'
            }`}>
              {importResult.success ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
              )}
              <div>
                <p className="font-bold">{importResult.message}</p>
                {importResult.success && (
                  <p className="text-[11px] text-emerald-300/80 mt-0.5">
                    Data BPKB telah disinkronkan ke database sistem dan antrean drip posko.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Data Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-[#f1f3f7]">Pratinjau Data ({parsedRows.length} baris)</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                    {validCount} Siap Impor
                  </span>
                  {invalidCount > 0 && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-800/60">
                      {invalidCount} Tidak Valid
                    </span>
                  )}
                </div>
              </div>

              <div className="max-h-56 overflow-y-auto rounded-xl border border-[#232734] bg-[#0e1015]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-[#14161f] border-b border-[#232734] text-[11px] font-bold text-[#8e96a8] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">No. PSB</th>
                      <th className="py-2.5 px-3">Cabang / Posko</th>
                      <th className="py-2.5 px-3">Nama Konsumen</th>
                      <th className="py-2.5 px-3">No. Telepon</th>
                      <th className="py-2.5 px-3">Tgl BPKB</th>
                      <th className="py-2.5 px-3">Status Lunas</th>
                      <th className="py-2.5 px-3 text-right">Status Baris</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f2330]">
                    {parsedRows.slice(0, 50).map((r, i) => (
                      <tr key={i} className={`hover:bg-[#181b26] ${!r.isValid ? 'bg-rose-950/20' : ''}`}>
                        <td className="py-2 px-3 font-mono font-bold text-[#f1f3f7]">
                          {r.no_psb}
                        </td>
                        <td className="py-2 px-3 text-[#8e96a8]">
                          {r.kd_cab} • {r.kd_pos}
                        </td>
                        <td className="py-2 px-3 font-semibold text-[#f1f3f7]">
                          {r.nama_konsumen}
                        </td>
                        <td className="py-2 px-3 font-mono text-[#c2c7d0]">
                          {r.no_telepon}
                        </td>
                        <td className="py-2 px-3 text-[#8e96a8]">
                          {r.tgl_bpkb_sdk}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            r.status_kredit_lunas === 'Lebih Awal' ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60' :
                            r.status_kredit_lunas === 'Tepat Waktu' ? 'bg-blue-950/70 text-blue-300 border-blue-800/60' :
                            'bg-amber-950/70 text-amber-300 border-amber-800/60'
                          }`}>
                            {r.status_kredit_lunas}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          {r.isValid ? (
                            <span className="text-[10px] font-bold text-emerald-400">Valid</span>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-400" title={r.validationError}>
                              {r.validationError || 'Format Salah'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Configurations */}
          <div className="bg-[#0e1015] p-4 rounded-xl border border-[#232734] space-y-3 text-xs">
            <h4 className="font-bold text-[#f1f3f7] flex items-center space-x-2">
              <Layers className="h-4 w-4 text-orange-400" />
              <span>Opsi & Mode Pengimporan Data</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#8e96a8] mb-1">
                  Metode Penanganan Data Duplikat
                </label>
                <div className="space-y-1.5">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="importModeBpkb"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-orange-500 focus:ring-orange-500 bg-[#0d0e12]"
                    />
                    <span className="text-[#c2c7d0]">
                      <strong>Append & Update:</strong> Tambah baru dan perbarui PSB yang sudah ada
                    </span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="importModeBpkb"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-rose-500 focus:ring-rose-500 bg-[#0d0e12]"
                    />
                    <span className="text-rose-300">
                      <strong>Replace:</strong> Hapus data lama dan gantikan penuh dengan file ini
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#8e96a8] mb-1">
                  Otomatisasi Cabang & Posko
                </label>
                <label className="flex items-start space-x-2 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={autoCreateBranch}
                    onChange={(e) => setAutoCreateBranch(e.target.checked)}
                    className="mt-0.5 text-orange-500 rounded bg-[#0d0e12] focus:ring-orange-500"
                  />
                  <span className="text-[#c2c7d0] leading-snug">
                    Otomatis daftarkan Cabang & Posko baru ke master data jika kode cabang/posko belum ada di sistem
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#232734] bg-[#0e1015] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#181a24] hover:bg-[#202534] text-[#c2c7d0] hover:text-[#f1f3f7] text-xs font-semibold rounded-xl border border-[#272d3e] transition-colors cursor-pointer"
          >
            Tutup
          </button>

          <button
            type="button"
            disabled={validCount === 0 || isProcessing}
            onClick={handleExecuteImport}
            className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center space-x-2 cursor-pointer shadow-lg ${
              validCount > 0 && !isProcessing
                ? 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white shadow-orange-950/50'
                : 'bg-[#1c1f2a] text-[#555e70] cursor-not-allowed border border-[#272d3e]'
            }`}
          >
            <span>Eksekusi Import ({validCount} Data)</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
