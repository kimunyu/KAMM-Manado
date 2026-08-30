import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileText, 
  Download, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Building2, 
  MapPin, 
  Layers,
  ArrowRight,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import { parseCSVToMediators, generateCSVTemplate, ParsedMediatorRow } from '../utils/csvParser';
import { DatabaseService } from '../services/storage';
import { useAuth } from '../context/AuthContext';

interface ImportMediatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ImportMediatorModal: React.FC<ImportMediatorModalProps> = ({
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
  const [parsedRows, setParsedRows] = useState<ParsedMediatorRow[]>([]);
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
        const { rows, errors } = parseCSVToMediators(content);
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
      const { rows, errors } = parseCSVToMediators(text);
      setParsedRows(rows);
      setParseErrors(errors);
    } else {
      setParsedRows([]);
      setParseErrors([]);
    }
  };

  // Download sample CSV template
  const handleDownloadTemplate = () => {
    const csvContent = generateCSVTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_import_mediator.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Execute Import
  const handleExecuteImport = () => {
    if (currentUser?.role !== 'SUPER_ADMIN') {
      setParseErrors(['Akses Ditolak: Hanya Super Admin yang diizinkan melakukan import data.']);
      return;
    }
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      setParseErrors(['Tidak ada baris data valid yang siap diimpor. Silakan periksa format kolom.']);
      return;
    }

    const res = DatabaseService.importMediators(
      validRows.map(r => ({
        kd_med: r.kd_med,
        nama_mediator: r.nama_mediator,
        no_tlpn: r.no_tlpn,
        kd_cabang: r.kd_cabang,
        kd_posko: r.kd_posko,
        kd_ao: r.kd_ao,
        status: r.status,
        tgl_akhir_fu: r.tgl_akhir_fu,
        catatan_admin: r.catatan_admin
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
  const invalidCount = parsedRows.filter(r => !r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-[#13151c] rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-[#232734] overflow-hidden animate-in fade-in zoom-in duration-150">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#232734] flex items-center justify-between bg-[#0e1015]">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-950/80 text-blue-400 border border-blue-800/60">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#f1f3f7] tracking-tight">
                Import Data Mediator Real (CSV / Excel)
              </h2>
              <p className="text-xs text-[#8e96a8] mt-0.5">
                Unggah berkas data agen/mediator dari file CSV atau tempel teks data tabel
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="btn-download-template-csv"
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 bg-[#181a24] hover:bg-[#222736] text-blue-300 hover:text-blue-200 border border-blue-800/50 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Format CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#8e96a8] hover:text-[#f1f3f7] hover:bg-[#1f2330] cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Result Alert if just finished */}
          {importResult && (
            <div className="p-4 bg-emerald-950/70 border border-emerald-800/80 rounded-2xl text-emerald-200 text-xs flex items-start justify-between shadow-lg">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="font-bold text-emerald-100 text-sm">Import Data Berhasil!</p>
                  <p className="mt-0.5">{importResult.message}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold text-xs cursor-pointer"
              >
                Tutup & Lihat Data
              </button>
            </div>
          )}

          {/* Mode Switcher: Upload File or Paste Text */}
          <div className="flex items-center justify-between border-b border-[#232734] pb-2">
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'upload'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-[#8e96a8] hover:text-[#f1f3f7]'
                }`}
              >
                <UploadCloud className="h-3.5 w-3.5" />
                <span>Upload Berkas CSV</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('paste')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 ${
                  activeTab === 'paste'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-[#8e96a8] hover:text-[#f1f3f7]'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Copy-Paste Teks CSV</span>
              </button>
            </div>

            <div className="text-[11px] text-[#8e96a8]">
              Format kolom didukung: <span className="font-mono text-blue-300">KD_MED, NAMA, NO_HP, CABANG, POSKO, CMO, STATUS, TGL_FU</span>
            </div>
          </div>

          {/* Upload Dropzone */}
          {activeTab === 'upload' ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#2b3247] hover:border-blue-500/70 bg-[#0d0e12] rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.tsv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="p-3 rounded-2xl bg-blue-950/40 text-blue-400 group-hover:scale-110 transition-transform">
                <UploadCloud className="h-8 w-8" />
              </div>
              <div className="text-xs font-bold text-[#f1f3f7]">
                {fileName ? (
                  <span className="text-blue-400 font-mono text-sm">{fileName}</span>
                ) : (
                  'Klik atau seret file CSV/Excel ke sini'
                )}
              </div>
              <p className="text-[11px] text-[#6b7280]">
                Mendukung file teks dipisahkan koma (,), titik koma (;), atau tab (.tsv)
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-[#c2c7d0] mb-1.5">
                Tempelkan Baris Data CSV / Spreadsheet:
              </label>
              <textarea
                value={rawText}
                onChange={(e) => handleRawTextChange(e.target.value)}
                placeholder={`KD_MED,NAMA_MEDIATOR,NO_TELEPON,KD_CABANG,KD_POSKO,KD_AO,STATUS\nMED-001,Budi Santoso,08123456789,CAB-JKT,PSK-JKT-01,CMO-01,AKTIF\nMED-002,Hendra Gunawan,08198765432,CAB-BDG,PSK-BDG-01,CMO-02,AKTIF`}
                rows={5}
                className="w-full p-3 text-xs bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] placeholder-[#4f5666] font-mono rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
          )}

          {/* Import Settings */}
          {parsedRows.length > 0 && (
            <div className="bg-[#0e1015] p-3.5 rounded-xl border border-[#232734] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-[#c2c7d0] mb-1">Metode Penyimpanan:</label>
                <div className="flex items-center space-x-3 mt-1">
                  <label className="flex items-center space-x-1.5 cursor-pointer text-[#e0e4eb]">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="accent-blue-600"
                    />
                    <span>Tambahkan ke Data yang Ada (Append)</span>
                  </label>
                  <label className="flex items-center space-x-1.5 cursor-pointer text-[#e0e4eb]">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="accent-blue-600"
                    />
                    <span className="text-amber-400">Ganti Seluruh Data (Replace)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#c2c7d0] mb-1">Master Data Cabang & Posko:</label>
                <label className="flex items-center space-x-2 mt-1 cursor-pointer text-[#e0e4eb]">
                  <input
                    type="checkbox"
                    checked={autoCreateBranch}
                    onChange={(e) => setAutoCreateBranch(e.target.checked)}
                    className="accent-blue-600 rounded"
                  />
                  <span>Otomatis daftarkan Cabang/Posko baru jika belum ada</span>
                </label>
              </div>
            </div>
          )}

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="font-bold text-[#f1f3f7] flex items-center space-x-2">
                  <span>Pratinjau Data ({parsedRows.length} baris)</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                    {validCount} Valid
                  </span>
                  {invalidCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-bold">
                      {invalidCount} Invalid
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[#8e96a8]">
                  Menampilkan maksimal 10 baris pertama
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-[#232734] bg-[#0d0e12] max-h-56 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#13151c] border-b border-[#232734] text-[10px] font-bold text-[#8e96a8] uppercase tracking-wider sticky top-0">
                      <th className="py-2 px-3">KD MED</th>
                      <th className="py-2 px-3">Nama Mediator</th>
                      <th className="py-2 px-3">No. Telepon</th>
                      <th className="py-2 px-3">Cabang / Posko</th>
                      <th className="py-2 px-3">Kode AO</th>
                      <th className="py-2 px-3">Status</th>
                      <th className="py-2 px-3">Akhir FU</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1f2330]">
                    {parsedRows.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className={row.isValid ? 'hover:bg-[#181b24]' : 'bg-rose-950/20'}>
                        <td className="py-2 px-3 font-mono font-bold text-blue-400">
                          {row.kd_med}
                        </td>
                        <td className="py-2 px-3 font-medium text-[#f1f3f7]">
                          {row.nama_mediator || <span className="text-rose-400 italic">Kosong</span>}
                        </td>
                        <td className="py-2 px-3 font-mono text-[#c2c7d0]">
                          {row.no_tlpn || <span className="text-rose-400 italic">Kosong</span>}
                        </td>
                        <td className="py-2 px-3 text-[#a6adbb]">
                          <span className="font-semibold text-[#e0e4eb]">{row.kd_cabang}</span> / {row.kd_posko}
                        </td>
                        <td className="py-2 px-3 font-mono text-[#a6adbb]">
                          {row.kd_ao}
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            row.status === 'AKTIF'
                              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60'
                              : row.status === 'PENDING'
                              ? 'bg-amber-950/70 text-amber-300 border-amber-800/60'
                              : 'bg-rose-950/70 text-rose-300 border-rose-800/60'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-[#8e96a8] font-mono">
                          {row.tgl_akhir_fu || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[#232734] bg-[#0e1015] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#181a24] hover:bg-[#202534] text-[#c2c7d0] hover:text-[#f1f3f7] border border-[#272d3e] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Batal
          </button>

          <div className="flex items-center space-x-2">
            <button
              id="btn-confirm-import-mediators"
              type="button"
              disabled={validCount === 0 || isProcessing}
              onClick={handleExecuteImport}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg transition-all flex items-center space-x-2 ${
                validCount > 0 && !isProcessing
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-950/50 cursor-pointer'
                  : 'bg-[#1e2333] text-[#6b7280] cursor-not-allowed border border-[#272d3e]'
              }`}
            >
              <UploadCloud className="h-4 w-4" />
              <span>Simpan & Import ({validCount} Mediator)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
