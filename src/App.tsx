/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { INDICES, parseChain, buildupTag } from './lib/parser';
import { ChainSnapshot } from './lib/utils';
import { OptionChainTable } from './components/OptionChainTable';
import { ChartsPopup } from './components/ChartsPopup';
import { 
  BarChart2, Download, RefreshCw, Settings2, Moon, Sun, Clock
} from 'lucide-react';

const REFRESH_CHOICES = [15, 30, 60, 120, 300];

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [symbol, setSymbol] = useState(INDICES[0]);
  const [customSymbol, setCustomSymbol] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [strikeRange, setStrikeRange] = useState(10);
  
  const [snapshot, setSnapshot] = useState<ChainSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Not connected');
  const [errorMsg, setErrorMsg] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  
  const [showCharts, setShowCharts] = useState(false);
  
  const timerRef = useRef<number | null>(null);

  // Apply theme class to document element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const activeSymbol = symbol === 'CUSTOM' ? (customSymbol.trim().toUpperCase() || 'RELIANCE') : symbol;

  const fetchChain = useCallback(async () => {
    setLoading(true);
    setStatus(`Fetching ${activeSymbol} ...`);
    setErrorMsg('');
    try {
      // Step 1: get nearest expiry
      const expRes = await fetch(`/api/expiries?symbol=${activeSymbol}`);
      if (!expRes.ok) throw new Error(await expRes.text());
      const { expiries } = await expRes.json();
      const nearest = expiries[0];

      // Step 2: fetch chain and VIX
      setStatus(`Fetching chain for ${activeSymbol} (${nearest}) ...`);
      const chainRes = await fetch(`/api/chain?symbol=${activeSymbol}&expiry=${nearest}`);
      if (!chainRes.ok) throw new Error(await chainRes.text());
      const { chain, vix } = await chainRes.json();

      const parsed = parseChain(activeSymbol, chain, nearest, vix?.last, vix?.percentChange);
      setSnapshot(parsed);
      setStatus('Connected — live data');
      setLastUpdated(`Last updated ${new Date().toLocaleTimeString()}`);
    } catch (err: any) {
      setStatus(`Error fetching data`);
      setErrorMsg(err.message || 'Failed to fetch options chain');
    } finally {
      setLoading(false);
    }
  }, [activeSymbol]);

  // Initial Fetch
  useEffect(() => {
    fetchChain();
  }, [symbol, customSymbol]);

  // Auto Refresh Logic
  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = window.setInterval(() => {
        fetchChain();
      }, refreshInterval * 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefresh, refreshInterval, fetchChain]);

  const numFmt = new Intl.NumberFormat('en-IN');
  const formatNum = (v?: number) => (v !== undefined ? numFmt.format(Math.round(v)) : '—');
  const formatPct = (v?: number | null) => (v !== undefined && v !== null ? (v > 0 ? '+' : '') + v.toFixed(2) + '%' : '—');

  const handleExportCSV = () => {
    if (!snapshot || !snapshot.rows) return;
    const { rows, atm_index } = snapshot;
    const lo = Math.max(0, atm_index - strikeRange);
    const hi = Math.min(rows.length - 1, atm_index + strikeRange);
    const visible = rows.slice(lo, hi + 1);

    const headers = [
      "CE_Buildup", "CE_OI", "CE_OI_Chg", "CE_OI_Chg_%", "CE_LTP", "CE_LTP_Chg_%", "CE_Vol",
      "Strike",
      "PE_LTP", "PE_LTP_Chg_%", "PE_OI_Chg_%", "PE_OI_Chg", "PE_OI", "PE_Vol", "PE_Buildup"
    ];
    const csvRows = visible.map(r => [
      buildupTag(r.ce.p_change, r.ce.oi_change),
      r.ce.oi, r.ce.oi_change, r.ce.oi_change_pct.toFixed(2),
      r.ce.ltp, r.ce.p_change.toFixed(2), r.ce.volume,
      r.strike,
      r.pe.ltp, r.pe.p_change.toFixed(2), r.pe.oi_change_pct.toFixed(2),
      r.pe.oi_change, r.pe.oi, r.pe.volume,
      buildupTag(r.pe.p_change, r.pe.oi_change)
    ]);

    const csvContent = [headers.join(','), ...csvRows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${snapshot.symbol}_option_chain_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-[#0a0d0f] text-neutral-900 dark:text-neutral-100 font-sans selection:bg-amber-500/30">
      {showCharts && snapshot && (
        <ChartsPopup snapshot={snapshot} strikeRange={strikeRange} onClose={() => setShowCharts(false)} />
      )}

      {/* Header Area */}
      <div className="bg-white dark:bg-[#0a0d0f] border-b border-neutral-200 dark:border-neutral-800 px-6 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-amber-600 to-rose-600 dark:from-amber-400 dark:to-rose-400 bg-clip-text text-transparent">OPTIONCHAIN</h1>
            <div className="h-4 w-px bg-neutral-300 dark:bg-neutral-700"></div>
            <span className="text-sm font-medium text-neutral-500">NSE Derivatives Analyzer</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500 font-mono">
              <Clock className="w-4 h-4" />
              {new Date().toLocaleTimeString()} IST
            </div>
            <button 
              onClick={toggleTheme}
              className="p-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 rounded-full transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-blue-600" />}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
        
        {/* Top Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          
          <div className="md:col-span-8 bg-white dark:bg-[#10151a] shadow-sm border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 flex flex-wrap items-end gap-x-6 gap-y-4">
            <div>
              <label className="block text-[10px] font-bold text-neutral-500 mb-1.5 tracking-wider">SYMBOL</label>
              <select 
                value={symbol} onChange={e => setSymbol(e.target.value)}
                className="bg-neutral-50 dark:bg-[#141b21] border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-[#ffd24d] outline-none min-w-[140px]"
              >
                {INDICES.map(sym => <option key={sym} value={sym}>{sym}</option>)}
                <option value="CUSTOM">CUSTOM</option>
              </select>
            </div>

            {symbol === 'CUSTOM' && (
              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-1.5 tracking-wider">CUSTOM EQ</label>
                <input 
                  type="text" value={customSymbol} onChange={e => setCustomSymbol(e.target.value)}
                  placeholder="e.g. RELIANCE"
                  className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-amber-500 outline-none w-[120px]"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-neutral-500 mb-1.5 tracking-wider">AUTO REFRESH (S)</label>
              <select 
                value={refreshInterval} onChange={e => setRefreshInterval(Number(e.target.value))}
                className="bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-amber-500 outline-none w-[100px]"
              >
                {REFRESH_CHOICES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <button 
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-1.5 rounded-md text-sm font-bold flex items-center gap-2 transition-colors ${autoRefresh ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300'}`}
            >
              {autoRefresh ? '■ Stop' : '▶ Start'} Auto
            </button>
            
            <button 
              onClick={fetchChain} disabled={loading}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-bold flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>

            <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-700 hidden md:block mx-2"></div>

            <button onClick={handleExportCSV} className="px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-md text-sm font-medium flex items-center gap-2 transition-colors border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button onClick={() => setShowCharts(true)} className="px-3 py-1.5 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-md text-sm font-bold flex items-center gap-2 transition-colors border border-indigo-200 dark:border-indigo-800/50">
              <BarChart2 className="w-4 h-4" /> Charts
            </button>

          </div>

          {/* Settings area */}
          <div className="md:col-span-4 bg-white dark:bg-[#10151a] shadow-sm border border-neutral-200 dark:border-[#1f2a31] rounded-lg p-4 flex flex-col justify-center gap-2">
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-bold text-neutral-500 tracking-wider">STRIKE RANGE (± FROM ATM)</label>
              <span className="text-amber-600 dark:text-[#ffd24d] font-bold font-mono">{strikeRange}</span>
            </div>
            <input 
              type="range" min="2" max="25" value={strikeRange} onChange={e => setStrikeRange(Number(e.target.value))}
              className="w-full accent-[#ffd24d]"
            />
          </div>

        </div>

        {/* Dynamic Warning Alert */}
        {errorMsg && (
          <div className="bg-rose-50 dark:bg-rose-500/10 border-l-4 border-rose-500 p-4 rounded text-sm text-rose-800 dark:text-rose-300 flex items-center">
             <span className="font-bold mr-2">Error:</span> {errorMsg}
          </div>
        )}

        {/* Global Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
           <StatBox title="TOTAL CALL OI" value={formatNum(snapshot?.total_call_oi)} />
           <StatBox title="TOTAL PUT OI" value={formatNum(snapshot?.total_put_oi)} />
           <StatBox title="CALL OI CHG" value={`${snapshot?.total_call_oi_change! > 0 ? '+' : ''}${formatNum(snapshot?.total_call_oi_change)}`} 
                    color={snapshot?.total_call_oi_change! > 0 ? 'text-emerald-500' : 'text-rose-500'} />
           <StatBox title="PUT OI CHG" value={`${snapshot?.total_put_oi_change! > 0 ? '+' : ''}${formatNum(snapshot?.total_put_oi_change)}`}
                    color={snapshot?.total_put_oi_change! > 0 ? 'text-emerald-500' : 'text-rose-500'} />
           <StatBox title="PCR (OI)" value={snapshot?.pcr ? snapshot.pcr.toFixed(3) : '—'} color="text-amber-500 font-mono" />
           <StatBox title="ATM STRIKE" value={snapshot ? snapshot.rows[snapshot.atm_index]?.strike.toString() : '—'} />
        </div>

        {/* Meta Row */}
        {snapshot && (
          <div className="flex gap-4 md:gap-8 flex-wrap items-center bg-white dark:bg-[#141b21] border border-neutral-200 dark:border-[#1f2a31] rounded-lg p-3 px-5 shadow-sm text-sm">
            <MetaItem label="UNDERLYING" value={snapshot.underlying.toFixed(2)} valueColor="text-amber-600 dark:text-[#ffd24d]" />
            <MetaItem label="EXPIRY" value={snapshot.expiry} />
            <MetaItem label="INDIA VIX" value={`${snapshot.vix?.toFixed(2) || '—'} (${formatPct(snapshot.vix_change)})`} 
                      valueColor={snapshot.vix_change! < 0 ? 'text-emerald-500' : 'text-rose-500'} />
            <MetaItem label="DATA TIME" value={snapshot.timestamp || '—'} />
            
            <div className="flex-grow"></div>
            <div className={`font-mono font-medium text-xs ${status.includes('Connected') ? 'text-emerald-500' : 'text-neutral-500'}`}>
              <div className="flex items-center gap-2">
                {status.includes('Connected') && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}
                {status}
              </div>
            </div>
          </div>
        )}

        {/* Main Table */}
        <OptionChainTable snapshot={snapshot} strikeRange={strikeRange} />

      </div>
    </div>
  );
}

// Subcomponents

const StatBox = ({ title, value, color = "text-neutral-900 dark:text-[#dce6e8]" }: { title: string, value: string, color?: string }) => (
  <div className="bg-white dark:bg-[#10151a] border border-neutral-200 dark:border-[#1f2a31] rounded-lg p-4 shadow-sm flex flex-col justify-center">
    <div className="text-[10px] font-bold text-neutral-500 dark:text-[#6b7d85] tracking-wider mb-2">{title}</div>
    <div className={`text-xl font-bold truncate ${color}`}>{value}</div>
  </div>
);

const MetaItem = ({ label, value, valueColor = "text-neutral-800 dark:text-[#dce6e8]" }: { label: string, value: string, valueColor?: string }) => (
  <div className="flex flex-col">
    <span className="text-[9px] font-bold text-neutral-500 dark:text-[#6b7d85] tracking-wider mix-blend-luminosity mb-0.5">{label}</span>
    <span className={`font-bold font-mono tracking-tight ${valueColor}`}>{value || '—'}</span>
  </div>
);

