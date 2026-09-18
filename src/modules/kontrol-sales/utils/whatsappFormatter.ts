import { SalesControlRecord } from '../types';
import { checkHoldDanaSla, getWitaToday, formatToDDMMYYYY } from './slaUtils';
import { Posko } from '../../../types';

export interface LaporanCabangParams {
  kdCabang: string;
  namaCabang: string;
  records: SalesControlRecord[];
  allPosko: Posko[];
}

/**
 * Format laporan pending & kendala pencairan KONTROL SALES per CABANG.
 * Merangkum seluruh posko di bawah cabang yang memiliki nasabah berstatus
 * SELAIN ACCEPT (SUBMISS, BELUM SELESAI, HOLD DANA).
 * 
 * PENTING: Sesuai spesifikasi, Nomor WA konsumen (no_wa) TIDAK DISERTAKAN.
 */
export function formatLaporanCabangWA({
  kdCabang,
  namaCabang,
  records,
  allPosko,
}: LaporanCabangParams): { text: string; pendingCount: number } {
  // 1. Filter hanya data cabang ini dan berstatus SELAIN ACCEPT
  const branchRecords = records.filter(
    r => r.cabang_id === kdCabang || (r as any).kd_cabang === kdCabang
  );
  const pendingRecords = branchRecords.filter(r => r.status !== 'ACCEPT');

  const todayStr = formatToDDMMYYYY(getWitaToday());
  const cleanCabangName = (namaCabang || kdCabang).toUpperCase();

  // Jika nihil pending
  if (pendingRecords.length === 0) {
    const cleanText = 
`*REKAP PENDING & KENDALA PENCAIRAN*
🏢 *CABANG: ${cleanCabangName}*
📅 Tanggal: ${todayStr}

✅ Tidak ada pending/kendala pencairan di Cabang ini. Seluruh data berstatus ACCEPT.
----------------------------------
Total Pending/Kendala: 0 Konsumen
Terima kasih.`;
    return { text: cleanText, pendingCount: 0 };
  }

  // 2. Kelompokkan pending records per Posko
  // Ambil daftar posko di bawah cabang ini
  const branchPoskos = allPosko.filter(p => p.kd_cabang === kdCabang);
  const poskoMap = new Map<string, string>();
  branchPoskos.forEach(p => poskoMap.set(p.kd_posko, p.nama_posko));

  // Kumpulkan posko yang memiliki pending records
  const pendingByPosko = new Map<string, SalesControlRecord[]>();
  pendingRecords.forEach(item => {
    const poskoKey = item.posko_id || (item as any).kd_posko || 'POSKO_LAIN';
    if (!pendingByPosko.has(poskoKey)) {
      pendingByPosko.set(poskoKey, []);
    }
    pendingByPosko.get(poskoKey)!.push(item);
  });

  // 3. Rangkai Teks Laporan
  let text = `*REKAP PENDING & KENDALA PENCAIRAN*\n`;
  text += `🏢 *CABANG: ${cleanCabangName}*\n`;
  text += `📅 Tanggal: ${todayStr}\n\n`;

  // Iterasi per Posko
  let poskoIndex = 0;
  pendingByPosko.forEach((itemsInPosko, poskoId) => {
    const poskoName = (poskoMap.get(poskoId) || poskoId).toUpperCase();
    text += `📌 *POSKO: ${poskoName}*\n`;

    itemsInPosko.forEach((item, idx) => {
      const sla = checkHoldDanaSla(item.tgl_cair, item.status);
      let statusStr: string = item.status;
      if (item.status === 'SUBMISS') {
        if (sla.isHoldDana) {
          statusStr = `SUBMISS (⚠️ HOLD DANA)`;
        } else {
          statusStr = `SUBMISS`;
        }
      } else if (item.status === 'BELUM SELESAI') {
        if (sla.isHoldDana) {
          statusStr = `BELUM SELESAI (⚠️ HOLD DANA)`;
        } else {
          statusStr = `BELUM SELESAI`;
        }
      }

      // Format baris utama: 1. *[DD/MM/YYYY] [NO_PSB] NAMA KONSUMEN*
      const consumerName = (item.nama_konsumen || '').toUpperCase();
      text += `${idx + 1}. *[${item.tgl_cair}] [${item.no_psb}] ${consumerName}*\n`;
      text += `   Status: ${statusStr}\n`;

      // Keterangan
      const rawKet = (item.keterangan || '').trim();
      if (!rawKet) {
        text += `   Keterangan: Menunggu kelengkapan dokumen\n`;
      } else if (rawKet.includes('\n')) {
        // Multiline keterangan
        text += `   Keterangan:\n`;
        const lines = rawKet.split('\n');
        lines.forEach((line) => {
          if (line.trim()) {
            text += `   ${line.trim()}\n`;
          }
        });
      } else {
        text += `   Keterangan: ${rawKet}\n`;
      }

      // Jarak antar konsumen
      if (idx < itemsInPosko.length - 1) {
        text += `\n`;
      }
    });

    poskoIndex++;
    text += `\n`;
  });

  text += `----------------------------------\n`;
  text += `Total Pending/Kendala: ${pendingRecords.length} Konsumen\n`;
  text += `Mohon segera dilengkapi/ditindaklanjuti. Terima kasih.`;

  return { text, pendingCount: pendingRecords.length };
}

/**
 * Menyalin teks ke clipboard secara asinkron dengan fallback textarea
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      textArea.remove();
      return successful;
    }
  } catch (err) {
    console.error('Gagal menyalin ke clipboard:', err);
    return false;
  }
}
