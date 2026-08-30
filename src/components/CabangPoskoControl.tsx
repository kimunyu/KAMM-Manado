import React, { useState } from 'react';
import { Cabang, Posko } from '../types';
import { useAuth } from '../context/AuthContext';
import { DatabaseService } from '../services/storage';
import { 
  Building2, 
  Plus, 
  Trash2, 
  Edit3, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  X,
  Layers,
  Search
} from 'lucide-react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface CabangPoskoControlProps {
  onRefresh: () => void;
}

export const CabangPoskoControl: React.FC<CabangPoskoControlProps> = ({ onRefresh }) => {
  const { allCabang, allPosko, refreshData } = useAuth();

  // Tab: 'cabang' | 'posko'
  const [activeSubTab, setActiveSubTab] = useState<'cabang' | 'posko'>('cabang');
  const [searchTerm, setSearchTerm] = useState('');

  // Delete Confirm Modal State
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'cabang' | 'posko';
    code: string;
    name: string;
  } | null>(null);

  // Cabang Modal State
  const [isCabangModalOpen, setIsCabangModalOpen] = useState(false);
  const [editingCabang, setEditingCabang] = useState<Cabang | null>(null);
  const [kdCabang, setKdCabang] = useState('');
  const [namaCabang, setNamaCabang] = useState('');
  const [wilayah, setWilayah] = useState('');

  // Posko Modal State
  const [isPoskoModalOpen, setIsPoskoModalOpen] = useState(false);
  const [editingPosko, setEditingPosko] = useState<Posko | null>(null);
  const [kdPosko, setKdPosko] = useState('');
  const [namaPosko, setNamaPosko] = useState('');
  const [poskoCabang, setPoskoCabang] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // --- CABANG HANDLERS ---
  const handleOpenAddCabang = () => {
    setEditingCabang(null);
    setKdCabang('');
    setNamaCabang('');
    setWilayah('Wilayah 1');
    setFeedback(null);
    setIsCabangModalOpen(true);
  };

  const handleOpenEditCabang = (c: Cabang) => {
    setEditingCabang(c);
    setKdCabang(c.kd_cabang);
    setNamaCabang(c.nama_cabang);
    setWilayah(c.wilayah || 'Wilayah 1');
    setFeedback(null);
    setIsCabangModalOpen(true);
  };

  const handleSaveCabang = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kdCabang.trim() || !namaCabang.trim()) {
      setFeedback({ type: 'error', message: 'Kode Cabang dan Nama Cabang wajib diisi!' });
      return;
    }

    const res = await DatabaseService.saveCabang(
      {
        kd_cabang: kdCabang.trim().toUpperCase(),
        nama_cabang: namaCabang.trim(),
        wilayah: wilayah.trim() || 'Wilayah 1'
      },
      !!editingCabang,
      editingCabang?.kd_cabang
    );

    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      refreshData();
      onRefresh();
      setTimeout(() => {
        setIsCabangModalOpen(false);
      }, 700);
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  const handleDeleteCabang = (code: string, name: string) => {
    setItemToDelete({
      type: 'cabang',
      code,
      name
    });
  };

  // --- POSKO HANDLERS ---
  const handleOpenAddPosko = () => {
    setEditingPosko(null);
    setKdPosko('');
    setNamaPosko('');
    setPoskoCabang(allCabang[0]?.kd_cabang || 'CAB-JKT');
    setFeedback(null);
    setIsPoskoModalOpen(true);
  };

  const handleOpenEditPosko = (p: Posko) => {
    setEditingPosko(p);
    setKdPosko(p.kd_posko);
    setNamaPosko(p.nama_posko);
    setPoskoCabang(p.kd_cabang);
    setFeedback(null);
    setIsPoskoModalOpen(true);
  };

  const handleSavePosko = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kdPosko.trim() || !namaPosko.trim() || !poskoCabang.trim()) {
      setFeedback({ type: 'error', message: 'Kode Posko, Nama Posko, dan Cabang wajib diisi!' });
      return;
    }

    const res = await DatabaseService.savePosko(
      {
        kd_posko: kdPosko.trim().toUpperCase(),
        nama_posko: namaPosko.trim(),
        kd_cabang: poskoCabang.trim().toUpperCase()
      },
      !!editingPosko,
      editingPosko?.kd_posko
    );

    if (res.success) {
      setFeedback({ type: 'success', message: res.message });
      refreshData();
      onRefresh();
      setTimeout(() => {
        setIsPoskoModalOpen(false);
      }, 700);
    } else {
      setFeedback({ type: 'error', message: res.message });
    }
  };

  const handleDeletePosko = (code: string, name: string) => {
    setItemToDelete({
      type: 'posko',
      code,
      name
    });
  };

  // Filtered lists
  const filteredCabang = allCabang.filter(c => 
    c.kd_cabang.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.nama_cabang.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.wilayah && c.wilayah.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredPosko = allPosko.filter(p => 
    p.kd_posko.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.nama_posko.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.kd_cabang.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-[#13151c] rounded-2xl border border-[#232734] p-5 shadow-md space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#232734]">
        <div>
          <h2 className="text-base font-bold text-[#f1f3f7] flex items-center space-x-2">
            <Building2 className="h-4.5 w-4.5 text-blue-400" />
            <span>Master Data Cabang & Posko</span>
          </h2>
          <p className="text-xs text-[#8e96a8] mt-0.5">
            Kelola data struktur kode nama cabang dan titik posko operasional secara dinamis
          </p>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex items-center space-x-2">
          <div className="bg-[#0e1015] p-1 rounded-xl border border-[#272d3e] flex space-x-1">
            <button
              id="tab-btn-manage-cabang"
              type="button"
              onClick={() => { setActiveSubTab('cabang'); setSearchTerm(''); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeSubTab === 'cabang'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[#8e96a8] hover:text-[#f1f3f7]'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Cabang ({allCabang.length})</span>
            </button>

            <button
              id="tab-btn-manage-posko"
              type="button"
              onClick={() => { setActiveSubTab('posko'); setSearchTerm(''); }}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeSubTab === 'posko'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-[#8e96a8] hover:text-[#f1f3f7]'
              }`}
            >
              <MapPin className="h-3.5 w-3.5" />
              <span>Posko ({allPosko.length})</span>
            </button>
          </div>

          {activeSubTab === 'cabang' ? (
            <button
              id="btn-add-cabang"
              onClick={handleOpenAddCabang}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tambah Cabang</span>
            </button>
          ) : (
            <button
              id="btn-add-posko"
              onClick={handleOpenAddPosko}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Tambah Posko</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-sm">
        <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-[#6b7280]" />
        <input
          type="text"
          placeholder={activeSubTab === 'cabang' ? 'Cari kode / nama cabang...' : 'Cari kode / nama posko...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] placeholder-[#6b7280] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        />
      </div>

      {/* CABANG TABLE */}
      {activeSubTab === 'cabang' && (
        <div className="overflow-x-auto rounded-xl border border-[#232734]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0e1015] border-b border-[#232734] text-[11px] font-bold text-[#8e96a8] uppercase tracking-wider">
                <th className="py-2.5 px-3.5">Kode Cabang</th>
                <th className="py-2.5 px-3.5">Nama Cabang</th>
                <th className="py-2.5 px-3.5">Wilayah</th>
                <th className="py-2.5 px-3.5 text-center">Jml Posko</th>
                <th className="py-2.5 px-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2330] text-xs">
              {filteredCabang.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[#6b7280]">
                    Tidak ada data cabang yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredCabang.map((c) => {
                  const countPosko = allPosko.filter(p => p.kd_cabang === c.kd_cabang).length;
                  return (
                    <tr key={c.kd_cabang} className="hover:bg-[#181b24] transition-colors">
                      <td className="py-2.5 px-3.5 font-mono font-bold text-blue-400">
                        {c.kd_cabang}
                      </td>
                      <td className="py-2.5 px-3.5 font-bold text-[#f1f3f7]">
                        {c.nama_cabang}
                      </td>
                      <td className="py-2.5 px-3.5 text-[#a6adbb]">
                        {c.wilayah || 'Wilayah 1'}
                      </td>
                      <td className="py-2.5 px-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950/60 text-blue-300 border border-blue-800/60">
                          {countPosko} Posko
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            id={`btn-edit-cabang-${c.kd_cabang}`}
                            onClick={() => handleOpenEditCabang(c)}
                            className="p-1.5 text-amber-400 hover:bg-amber-950/50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Cabang"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            id={`btn-del-cabang-${c.kd_cabang}`}
                            onClick={() => handleDeleteCabang(c.kd_cabang, c.nama_cabang)}
                            className="p-1.5 text-rose-400 hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Cabang"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* POSKO TABLE */}
      {activeSubTab === 'posko' && (
        <div className="overflow-x-auto rounded-xl border border-[#232734]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0e1015] border-b border-[#232734] text-[11px] font-bold text-[#8e96a8] uppercase tracking-wider">
                <th className="py-2.5 px-3.5">Kode Posko</th>
                <th className="py-2.5 px-3.5">Nama Posko</th>
                <th className="py-2.5 px-3.5">Cabang Induk</th>
                <th className="py-2.5 px-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2330] text-xs">
              {filteredPosko.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[#6b7280]">
                    Tidak ada data posko yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredPosko.map((p) => {
                  const branchObj = allCabang.find(c => c.kd_cabang === p.kd_cabang);
                  return (
                    <tr key={p.kd_posko} className="hover:bg-[#181b24] transition-colors">
                      <td className="py-2.5 px-3.5 font-mono font-bold text-emerald-400">
                        {p.kd_posko}
                      </td>
                      <td className="py-2.5 px-3.5 font-bold text-[#f1f3f7]">
                        {p.nama_posko}
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span className="font-semibold text-blue-300 font-mono bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/60 text-[11px]">
                          {p.kd_cabang}
                        </span>
                        <span className="text-[11px] text-[#8e96a8] ml-1.5">
                          {branchObj?.nama_cabang || ''}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            id={`btn-edit-posko-${p.kd_posko}`}
                            onClick={() => handleOpenEditPosko(p)}
                            className="p-1.5 text-amber-400 hover:bg-amber-950/50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Posko"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            id={`btn-del-posko-${p.kd_posko}`}
                            onClick={() => handleDeletePosko(p.kd_posko, p.nama_posko)}
                            className="p-1.5 text-rose-400 hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Posko"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL ADD / EDIT CABANG */}
      {isCabangModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13151c] rounded-2xl max-w-md w-full p-5 shadow-2xl border border-[#232734] space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#232734]">
              <h3 className="text-sm font-bold text-[#f1f3f7] flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-blue-400" />
                <span>{editingCabang ? 'Edit Cabang' : 'Tambah Cabang Baru'}</span>
              </h3>
              <button
                onClick={() => setIsCabangModalOpen(false)}
                className="p-1.5 rounded-lg text-[#8e96a8] hover:text-[#f1f3f7] hover:bg-[#1f2330] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center space-x-2 border ${
                  feedback.type === 'success'
                    ? 'bg-emerald-950/60 text-emerald-200 border-emerald-800/70'
                    : 'bg-rose-950/60 text-rose-200 border-rose-800/70'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSaveCabang} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#c2c7d0] mb-1">
                  Kode Cabang (KD CABANG) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={kdCabang}
                  onChange={(e) => setKdCabang(e.target.value.toUpperCase())}
                  placeholder="Contoh: CAB-JKT, CAB-BDG, CAB-SBY"
                  className="w-full p-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] placeholder-[#6b7280] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-[#c2c7d0] mb-1">
                  Nama Cabang <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={namaCabang}
                  onChange={(e) => setNamaCabang(e.target.value)}
                  placeholder="Contoh: Jakarta Pusat, Bandung, Surabaya"
                  className="w-full p-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] placeholder-[#6b7280] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-[#c2c7d0] mb-1">Wilayah Operasional</label>
                <input
                  type="text"
                  value={wilayah}
                  onChange={(e) => setWilayah(e.target.value)}
                  placeholder="Contoh: Wilayah 1 (Jawa Barat & DKI)"
                  className="w-full p-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] placeholder-[#6b7280] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium"
                />
              </div>

              <div className="pt-3 border-t border-[#232734] flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCabangModalOpen(false)}
                  className="px-3.5 py-2 bg-[#181a24] hover:bg-[#202534] text-[#c2c7d0] hover:text-[#f1f3f7] border border-[#272d3e] rounded-xl font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="btn-save-cabang-submit"
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md shadow-blue-950/40 cursor-pointer"
                >
                  Simpan Cabang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADD / EDIT POSKO */}
      {isPoskoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#13151c] rounded-2xl max-w-md w-full p-5 shadow-2xl border border-[#232734] space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#232734]">
              <h3 className="text-sm font-bold text-[#f1f3f7] flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-emerald-400" />
                <span>{editingPosko ? 'Edit Posko' : 'Tambah Posko Baru'}</span>
              </h3>
              <button
                onClick={() => setIsPoskoModalOpen(false)}
                className="p-1.5 rounded-lg text-[#8e96a8] hover:text-[#f1f3f7] hover:bg-[#1f2330] cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center space-x-2 border ${
                  feedback.type === 'success'
                    ? 'bg-emerald-950/60 text-emerald-200 border-emerald-800/70'
                    : 'bg-rose-950/60 text-rose-200 border-rose-800/70'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSavePosko} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#c2c7d0] mb-1">
                  Cabang Induk <span className="text-rose-400">*</span>
                </label>
                <select
                  value={poskoCabang}
                  onChange={(e) => setPoskoCabang(e.target.value)}
                  className="w-full p-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-semibold"
                >
                  {allCabang.map((c) => (
                    <option key={c.kd_cabang} value={c.kd_cabang}>
                      {c.kd_cabang} - {c.nama_cabang}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#c2c7d0] mb-1">
                  Kode Posko (KD POSKO) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={kdPosko}
                  onChange={(e) => setKdPosko(e.target.value.toUpperCase())}
                  placeholder="Contoh: PSK-JKT-01, PSK-BDG-02"
                  className="w-full p-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] placeholder-[#6b7280] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-[#c2c7d0] mb-1">
                  Nama Posko <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={namaPosko}
                  onChange={(e) => setNamaPosko(e.target.value)}
                  placeholder="Contoh: Posko Kemayoran, Posko Dago"
                  className="w-full p-2.5 bg-[#0d0e12] border border-[#272d3e] text-[#e0e4eb] placeholder-[#6b7280] rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-medium"
                />
              </div>

              <div className="pt-3 border-t border-[#232734] flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPoskoModalOpen(false)}
                  className="px-3.5 py-2 bg-[#181a24] hover:bg-[#202534] text-[#c2c7d0] hover:text-[#f1f3f7] border border-[#272d3e] rounded-xl font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  id="btn-save-posko-submit"
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-md shadow-emerald-950/40 cursor-pointer"
                >
                  Simpan Posko
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={!!itemToDelete}
        title={itemToDelete?.type === 'cabang' ? 'Hapus Master Cabang' : 'Hapus Master Posko'}
        itemCode={itemToDelete?.code}
        itemName={itemToDelete?.name}
        description={
          itemToDelete?.type === 'cabang'
            ? `Apakah Anda yakin ingin menghapus Cabang "${itemToDelete.code} - ${itemToDelete.name}"? Menghapus cabang juga akan menghapus posko-posko yang terhubung dengannya.`
            : `Apakah Anda yakin ingin menghapus Posko "${itemToDelete?.code} - ${itemToDelete?.name}"? Data mediator di bawah posko ini akan memerlukan penyesuaian.`
        }
        confirmButtonText={itemToDelete?.type === 'cabang' ? 'Hapus Cabang' : 'Hapus Posko'}
        onConfirm={async () => {
          if (itemToDelete) {
            if (itemToDelete.type === 'cabang') {
              await DatabaseService.deleteCabang(itemToDelete.code);
            } else {
              await DatabaseService.deletePosko(itemToDelete.code);
            }
            refreshData();
            onRefresh();
            setItemToDelete(null);
          }
        }}
        onClose={() => setItemToDelete(null)}
      />
    </div>
  );
};
