import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { CatalogDiagnosticData, ExpansionSyncStatus, SetSyncService } from '../services/setSyncService';
import { CardLanguage } from '../types';

interface CatalogValidationModalProps {
  onClose: () => void;
  preferredLanguage: CardLanguage;
}

export const CatalogValidationModal: React.FC<CatalogValidationModalProps> = ({
  onClose,
  preferredLanguage,
}) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<CatalogDiagnosticData | null>(null);

  const handleRunDiagnostic = async () => {
    setLoading(true);
    try {
      const data = await SetSyncService.getDiagnosticReport(preferredLanguage);
      setReport(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    handleRunDiagnostic();
  }, [preferredLanguage]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full space-y-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Diagnóstico do Catálogo</h2>
            <p className="text-xs text-slate-400">Verificação de integridade e sincronização das expansões</p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 space-y-2">
            <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Analisando catálogo e verificando integridade...</p>
          </div>
        ) : report ? (
          <div className="space-y-6 overflow-y-auto pr-1 flex-1">
            {/* Overview Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs font-mono">
              <div className="space-y-0.5">
                <span className="text-slate-500 text-[10px] block font-sans">EXPANSÕES</span>
                <span className="text-lg font-black text-white">
                  {report.totalSetsSynced} / {report.totalSetsFound}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-500 text-[10px] block font-sans">CARTAS TOTAIS</span>
                <span className="text-lg font-black text-amber-400">{report.totalCardsFound}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-500 text-[10px] block font-sans">COM IMAGEM</span>
                <span className="text-lg font-black text-emerald-400">{report.cardsWithImages}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-slate-500 text-[10px] block font-sans">SEM IMAGEM / ERRO</span>
                <span className="text-lg font-black text-red-400">
                  {report.cardsMissingImages + report.cardsWithErrors}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 font-mono bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span>
                Última atualização: <strong className="text-slate-200">{report.lastUpdatedTimestamp}</strong>
              </span>
              <button
                onClick={handleRunDiagnostic}
                className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-bold hover:bg-amber-400"
              >
                Re-Executar Testes
              </button>
            </div>

            {/* List of Expansions and Statuses */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Status por Expansão ({report.setStatuses.length})
              </h3>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {report.setStatuses.map((st) => (
                  <div
                    key={st.setId}
                    className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">{st.setName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        ID: {st.setId} • Sincronizadas: {st.totalCardsSynced} / {st.totalCardsApi}
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full font-bold text-[11px] border ${
                        st.status === 'synced'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : st.status === 'syncing'
                          ? 'bg-blue-950 text-blue-400 border-blue-800 animate-pulse'
                          : st.status === 'incomplete'
                          ? 'bg-amber-950 text-amber-400 border-amber-800'
                          : 'bg-red-950 text-red-400 border-red-800'
                      }`}
                    >
                      {st.statusLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
