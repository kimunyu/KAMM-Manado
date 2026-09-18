import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, AlertTriangle, ShieldCheck, LogOut } from 'lucide-react';

interface IdleTimeoutManagerProps {
  // Idle duration before showing warning (default: 20 minutes = 1200000 ms)
  idleTimeoutMs?: number;
  // Warning countdown duration before automatic logout (default: 60 seconds = 60000 ms)
  countdownDurationMs?: number;
}

export const IdleTimeoutManager: React.FC<IdleTimeoutManagerProps> = ({
  idleTimeoutMs = 20 * 60 * 1000, // 20 menit
  countdownDurationMs = 60 * 1000, // 60 detik peringatan
}) => {
  const { currentUser, logout } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(Math.round(countdownDurationMs / 1000));

  const lastActivityRef = useRef<number>(Date.now());
  const checkIntervalRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);

  // Reset timestamp when user interacts
  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (showWarning) {
      setShowWarning(false);
    }
  }, [showWarning]);

  // Keep session alive upon explicit user confirmation
  const handleStayLoggedIn = () => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    setRemainingSeconds(Math.round(countdownDurationMs / 1000));
  };

  const handleManualLogout = () => {
    setShowWarning(false);
    logout();
  };

  // Listen to comprehensive user activity events
  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'focus'
    ];

    // Throttle event listener to avoid unnecessary overhead
    let throttleTimeout: any = null;
    const handleUserActivity = () => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          throttleTimeout = null;
          // Only auto-reset if modal is not currently showing
          if (!showWarning) {
            lastActivityRef.current = Date.now();
          }
        }, 1000);
      }
    };

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    return () => {
      if (throttleTimeout) clearTimeout(throttleTimeout);
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
    };
  }, [currentUser, showWarning]);

  // Periodic heartbeat timer checking for inactivity
  useEffect(() => {
    if (!currentUser) return;

    checkIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityRef.current;

      if (!showWarning && timeSinceLastActivity >= idleTimeoutMs) {
        // Trigger warning popup
        setShowWarning(true);
        setRemainingSeconds(Math.round(countdownDurationMs / 1000));
      }
    }, 5000); // Check every 5 seconds

    return () => {
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
    };
  }, [currentUser, showWarning, idleTimeoutMs, countdownDurationMs]);

  // Countdown timer while warning is displayed
  useEffect(() => {
    if (!showWarning || !currentUser) {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      return;
    }

    countdownIntervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          // Defer logout to prevent "Cannot update a component (`AuthProvider`) while rendering a different component (`IdleTimeoutManager`)"
          setTimeout(() => {
            setShowWarning(false);
            logout();
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [showWarning, currentUser, logout]);

  if (!currentUser || !showWarning) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        id="modal-idle-timeout-warning"
        className="w-full max-w-md bg-[#12141c] border border-amber-500/40 rounded-2xl shadow-2xl shadow-amber-950/30 overflow-hidden text-[#e0e4eb]"
      >
        {/* Top Header Glow */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 animate-pulse" />

        <div className="p-6">
          <div className="flex items-center space-x-3.5 mb-4">
            <div className="h-12 w-12 rounded-xl bg-amber-950/70 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-950/50">
              <AlertTriangle className="h-6 w-6 animate-bounce" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                Peringatan Inaktivitas Sesi
              </h3>
              <p className="text-xs text-[#8e96a8]">
                Tidak ada aktivitas terdeteksi selama 20 menit
              </p>
            </div>
          </div>

          <div className="p-4 bg-amber-950/30 border border-amber-800/40 rounded-xl mb-5 space-y-2">
            <p className="text-xs text-amber-200/90 leading-relaxed">
              Demi keamanan data nasabah dan kredensial Anda, sesi akan otomatis ditutup dalam:
            </p>
            <div className="flex items-center justify-center gap-2 py-2">
              <Clock className="h-6 w-6 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
              <span className="font-mono text-3xl font-extrabold text-amber-300 tracking-wider">
                00:{remainingSeconds.toString().padStart(2, '0')}
              </span>
              <span className="text-xs font-semibold text-amber-400/80">detik</span>
            </div>
            <p className="text-[11px] text-amber-400/70 text-center">
              Klik <strong className="text-amber-200">"Lanjutkan Sesi"</strong> di bawah untuk tetap masuk dan melanjutkan pekerjaan Anda.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3">
            <button
              id="btn-idle-logout"
              type="button"
              onClick={handleManualLogout}
              className="px-4 py-2.5 bg-[#181a24] hover:bg-[#202330] text-[#8e96a8] hover:text-white rounded-xl text-xs font-semibold border border-[#2e3549] transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Keluar Sekarang</span>
            </button>
            <button
              id="btn-idle-continue"
              type="button"
              onClick={handleStayLoggedIn}
              autoFocus
              className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-950/40 transition-all flex items-center space-x-2 cursor-pointer ring-2 ring-amber-400/20"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Lanjutkan Sesi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
