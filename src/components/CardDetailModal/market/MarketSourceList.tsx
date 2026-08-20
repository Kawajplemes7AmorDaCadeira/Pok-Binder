/**
 * MarketSourceList.tsx - Hybrid Pricing UI: Manual + Direct Links + On-Demand Update
 * for Liga Pokémon and MYPCards with Fail-Safe protection and domain validation.
 */

import React, { useState, useEffect } from 'react';
import { 
  Store, RefreshCw, ExternalLink, Link as LinkIcon, Edit3, Trash2, 
  CheckCircle2, AlertCircle, HelpCircle, Save, X, Plus, ShieldCheck
} from 'lucide-react';
import { AggregatedMarketPrice, CardCondition, CardVariant, PokemonCard } from '../../../types';
import { MarketSource, LinkedPriceRecord, CardMarketLink } from '../../../types/market';
import { LinkedMarketPriceService } from '../../../services/pricing/LinkedMarketPriceService';
import { BrazilianPriceParser } from '../../../services/pricing/BrazilianPriceParser';

interface MarketSourceListProps {
  card?: PokemonCard;
  marketData: AggregatedMarketPrice | null;
  isLoading: boolean;
  onRefresh: () => void;
  variantLabel: string;
  selectedVariant: CardVariant;
  selectedCondition: CardCondition;
  onMarketUpdated?: () => void;
}

export const MarketSourceList: React.FC<MarketSourceListProps> = ({
  card,
  marketData,
  isLoading: parentLoading,
  onRefresh,
  variantLabel,
  selectedVariant,
  selectedCondition,
  onMarketUpdated,
}) => {
  const formatBRL = BrazilianPriceParser.formatBRL;

  // Local state for linked prices and links
  const [ligaRecord, setLigaRecord] = useState<LinkedPriceRecord | null>(null);
  const [mypRecord, setMypRecord] = useState<LinkedPriceRecord | null>(null);
  const [ligaLink, setLigaLink] = useState<CardMarketLink | null>(null);
  const [mypLink, setMypLink] = useState<CardMarketLink | null>(null);
  const [aggregated, setAggregated] = useState<{ ligaPrice: number | null; mypPrice: number | null; marketPrice: number | null }>({ ligaPrice: null, mypPrice: null, marketPrice: null });

  // UI modal states
  const [updatingSource, setUpdatingSource] = useState<MarketSource | null>(null);
  const [updatingAll, setUpdatingAll] = useState(false);
  
  // Manual edit price modal/state
  const [editingPriceSource, setEditingPriceSource] = useState<MarketSource | null>(null);
  const [manualPriceInput, setManualPriceInput] = useState('');

  // Link Modal state
  const [linkingSource, setLinkingSource] = useState<MarketSource | null>(null);
  const [linkInput, setLinkInput] = useState('');
  const [linkError, setLinkError] = useState('');

  // Feedback message / toast
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = () => {
    if (!card) return;
    const agg = LinkedMarketPriceService.getAggregatedLinkedPrice(card.id, selectedVariant, selectedCondition);
    setAggregated({ ligaPrice: agg.ligaPrice, mypPrice: agg.mypPrice, marketPrice: agg.marketPrice });
    setLigaRecord(agg.ligaRecord);
    setMypRecord(agg.mypRecord);
    setLigaLink(agg.ligaLink);
    setMypLink(agg.mypLink);
  };

  useEffect(() => {
    loadData();
  }, [card?.id, selectedVariant, selectedCondition, marketData]);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Handle Manual Price Save
  const handleSaveManualPrice = (source: MarketSource) => {
    if (!card) return;
    const val = parseFloat(manualPriceInput.replace(',', '.'));
    if (isNaN(val) || val < 0) {
      showFeedback('error', 'Digite um valor numérico válido.');
      return;
    }
    LinkedMarketPriceService.setManualPrice(card.id, selectedVariant, selectedCondition, source, val);
    loadData();
    setEditingPriceSource(null);
    setManualPriceInput('');
    showFeedback('success', `Preço manual de ${source === 'LIGA_POKEMON' ? 'Liga Pokémon' : 'MYPCards'} atualizado para ${formatBRL(val)}.`);
    if (onMarketUpdated) onMarketUpdated();
  };

  // Handle Link Save
  const handleSaveLink = () => {
    if (!card || !linkingSource) return;
    const res = LinkedMarketPriceService.saveLink(card.id, selectedVariant, selectedCondition, linkingSource, linkInput);
    if (!res.success) {
      setLinkError(res.error || 'Erro ao salvar link.');
      return;
    }
    loadData();
    setLinkingSource(null);
    setLinkInput('');
    setLinkError('');
    showFeedback('success', `Link da ${linkingSource === 'LIGA_POKEMON' ? 'Liga Pokémon' : 'MYPCards'} vinculado com sucesso!`);
    if (onMarketUpdated) onMarketUpdated();
  };

  // Handle Remove Link
  const handleRemoveLink = (source: MarketSource) => {
    if (!card) return;
    if (window.confirm(`Deseja realmente remover o vínculo da ${source === 'LIGA_POKEMON' ? 'Liga Pokémon' : 'MYPCards'}? (O histórico de preços será mantido).`)) {
      LinkedMarketPriceService.removeLink(card.id, selectedVariant, selectedCondition, source);
      loadData();
      showFeedback('success', 'Vínculo removido com sucesso.');
      if (onMarketUpdated) onMarketUpdated();
    }
  };

  // Handle On-Demand Update for Single Source
  const handleUpdateSource = async (source: MarketSource) => {
    if (!card) return;
    setUpdatingSource(source);
    try {
      const result = await LinkedMarketPriceService.updateFromLink(card.id, selectedVariant, selectedCondition, source);
      loadData();
      if (result.success && result.price) {
        showFeedback('success', `Preço atualizado para ${formatBRL(result.price.amount)}.`);
      } else {
        showFeedback('error', result.errorMessage || 'Falha na atualização. Último valor válido mantido.');
      }
      if (onMarketUpdated) onMarketUpdated();
    } catch {
      showFeedback('error', 'Erro inesperado na atualização.');
    } finally {
      setUpdatingSource(null);
    }
  };

  // Handle Update All Links
  const handleUpdateAll = async () => {
    if (!card) return;
    setUpdatingAll(true);
    try {
      const res = await LinkedMarketPriceService.updateAllLinks(card.id, selectedVariant, selectedCondition);
      loadData();
      const updatedCount = [res.liga?.success, res.myp?.success].filter(Boolean).length;
      if (updatedCount > 0) {
        showFeedback('success', `${updatedCount} fonte(s) atualizada(s) com sucesso.`);
      } else {
        showFeedback('error', 'Nenhum link ativo ou falha ao atualizar fontes. Últimos valores válidos mantidos.');
      }
      if (onMarketUpdated) onMarketUpdated();
    } finally {
      setUpdatingAll(false);
    }
  };

  const getTimeAgo = (dateStr?: string | null) => {
    if (!dateStr) return 'Sem atualização recente';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 1) return 'Atualizado agora mesmo';
    if (diffMinutes === 1) return 'Atualizado há 1 minuto';
    if (diffMinutes < 60) return `Atualizado há ${diffMinutes} minutos`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours === 1) return 'Atualizado há 1 hora';
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Atualizado ontem';
    return `Atualizado em ${new Date(dateStr).toLocaleDateString('pt-BR')} às ${new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-4">
      {/* Header & Update All Button */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
          <Store className="w-4 h-4 text-emerald-400" />
          Fontes de Preço • Híbrido ({variantLabel})
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={handleUpdateAll}
            disabled={updatingAll || (!ligaLink && !mypLink)}
            className="text-xs text-emerald-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/50 border border-emerald-800/60 hover:bg-emerald-900/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed font-medium shadow-sm"
            title={!ligaLink && !mypLink ? 'Vincule pelo menos um link para usar a atualização automática' : 'Atualizar preços através dos links vinculados'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${updatingAll ? 'animate-spin text-emerald-400' : ''}`} />
            {updatingAll ? 'Atualizando todos...' : '↻ Atualizar todos'}
          </button>
        </div>
      </div>

      {/* Feedback Toast Banner */}
      {feedback && (
        <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border animate-fadeIn ${feedback.type === 'success' ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300' : 'bg-amber-950/40 border-amber-800 text-amber-300'}`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Liga Pokémon Source Section */}
      <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">Liga Pokémon</span>
            {ligaLink ? (
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-1.5 py-0.5 rounded-full flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Vinculado
              </span>
            ) : (
              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full font-mono">
                ○ Não vinculado
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {ligaLink ? (
              <>
                <a
                  href={ligaLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-[11px] flex items-center gap-1 transition-colors"
                  title="Abrir página vinculada na Liga Pokémon"
                >
                  ↗ Abrir
                </a>
                <button
                  onClick={() => { setLinkingSource('LIGA_POKEMON'); setLinkInput(ligaLink.url); setLinkError(''); }}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-[11px] transition-colors"
                  title="Editar link vinculado"
                >
                  Editar link
                </button>
                <button
                  onClick={() => handleRemoveLink('LIGA_POKEMON')}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-400 transition-colors"
                  title="Remover vínculo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => { setLinkingSource('LIGA_POKEMON'); setLinkInput(''); setLinkError(''); }}
                className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1 transition-all"
              >
                <Plus className="w-3 h-3" /> Vincular página
              </button>
            )}
          </div>
        </div>

        {/* Price display & actions */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span>Preço atual:</span>
              <span className="font-mono font-black text-sm text-white">
                {ligaRecord?.amount !== null && ligaRecord?.amount !== undefined ? formatBRL(ligaRecord.amount) : 'Sem cotação'}
              </span>
              <span className="text-[10px] bg-slate-800 text-emerald-400 px-1 py-0.5 rounded font-mono">BRL</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5">
              <span className={`px-1 rounded font-mono ${ligaRecord?.origin === 'LINK_UPDATE' ? 'bg-blue-950 text-blue-300' : 'bg-slate-800 text-slate-300'}`}>
                {ligaRecord?.origin === 'LINK_UPDATE' ? 'Atualizado pelo link' : ligaRecord?.origin === 'MANUAL' ? 'Valor manual' : 'Sem origem'}
              </span>
              <span>•</span>
              <span>{getTimeAgo(ligaRecord?.fetchedAt)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {editingPriceSource === 'LIGA_POKEMON' ? (
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700">
                <input
                  type="text"
                  value={manualPriceInput}
                  onChange={(e) => setManualPriceInput(e.target.value)}
                  placeholder="0,50"
                  className="w-16 bg-slate-950 text-white text-xs px-2 py-1 rounded-lg font-mono outline-none border border-slate-800"
                  autoFocus
                />
                <button
                  onClick={() => handleSaveManualPrice('LIGA_POKEMON')}
                  className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                  title="Salvar"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setEditingPriceSource(null)}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                  title="Cancelar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setEditingPriceSource('LIGA_POKEMON'); setManualPriceInput(ligaRecord?.amount?.toString() || ''); }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-[11px] font-medium transition-colors flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3 text-slate-400" /> Editar preço
              </button>
            )}

            {ligaLink && (
              <button
                onClick={() => handleUpdateSource('LIGA_POKEMON')}
                disabled={updatingSource === 'LIGA_POKEMON'}
                className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1 transition-all disabled:opacity-50"
                title="Consultar preço na página vinculada"
              >
                <RefreshCw className={`w-3 h-3 ${updatingSource === 'LIGA_POKEMON' ? 'animate-spin' : ''}`} />
                {updatingSource === 'LIGA_POKEMON' ? 'Atualizando...' : '↻ Atualizar'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* MYPCards Source Section */}
      <div className="bg-slate-900/60 border border-slate-800/60 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">MYPCards</span>
            {mypLink ? (
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-1.5 py-0.5 rounded-full flex items-center gap-1 font-mono">
                <ShieldCheck className="w-3 h-3 text-emerald-400" /> Vinculado
              </span>
            ) : (
              <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full font-mono">
                ○ Não vinculado
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {mypLink ? (
              <>
                <a
                  href={mypLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-[11px] flex items-center gap-1 transition-colors"
                  title="Abrir página vinculada no MYPCards"
                >
                  ↗ Abrir
                </a>
                <button
                  onClick={() => { setLinkingSource('MYPCARDS'); setLinkInput(mypLink.url); setLinkError(''); }}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-[11px] transition-colors"
                  title="Editar link vinculado"
                >
                  Editar link
                </button>
                <button
                  onClick={() => handleRemoveLink('MYPCARDS')}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-red-950/60 text-slate-400 hover:text-red-400 transition-colors"
                  title="Remover vínculo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => { setLinkingSource('MYPCARDS'); setLinkInput(''); setLinkError(''); }}
                className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1 transition-all"
              >
                <Plus className="w-3 h-3" /> Vincular página
              </button>
            )}
          </div>
        </div>

        {/* Price display & actions */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <span>Preço atual:</span>
              <span className="font-mono font-black text-sm text-white">
                {mypRecord?.amount !== null && mypRecord?.amount !== undefined ? formatBRL(mypRecord.amount) : 'Sem cotação'}
              </span>
              <span className="text-[10px] bg-slate-800 text-emerald-400 px-1 py-0.5 rounded font-mono">BRL</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5">
              <span className={`px-1 rounded font-mono ${mypRecord?.origin === 'LINK_UPDATE' ? 'bg-blue-950 text-blue-300' : 'bg-slate-800 text-slate-300'}`}>
                {mypRecord?.origin === 'LINK_UPDATE' ? 'Atualizado pelo link' : mypRecord?.origin === 'MANUAL' ? 'Valor manual' : 'Sem origem'}
              </span>
              <span>•</span>
              <span>{getTimeAgo(mypRecord?.fetchedAt)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {editingPriceSource === 'MYPCARDS' ? (
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700">
                <input
                  type="text"
                  value={manualPriceInput}
                  onChange={(e) => setManualPriceInput(e.target.value)}
                  placeholder="0,80"
                  className="w-16 bg-slate-950 text-white text-xs px-2 py-1 rounded-lg font-mono outline-none border border-slate-800"
                  autoFocus
                />
                <button
                  onClick={() => handleSaveManualPrice('MYPCARDS')}
                  className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                  title="Salvar"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setEditingPriceSource(null)}
                  className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                  title="Cancelar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setEditingPriceSource('MYPCARDS'); setManualPriceInput(mypRecord?.amount?.toString() || ''); }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-[11px] font-medium transition-colors flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3 text-slate-400" /> Editar preço
              </button>
            )}

            {mypLink && (
              <button
                onClick={() => handleUpdateSource('MYPCARDS')}
                disabled={updatingSource === 'MYPCARDS'}
                className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1 transition-all disabled:opacity-50"
                title="Consultar preço na página vinculada"
              >
                <RefreshCw className={`w-3 h-3 ${updatingSource === 'MYPCARDS' ? 'animate-spin' : ''}`} />
                {updatingSource === 'MYPCARDS' ? 'Atualizando...' : '↻ Atualizar'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mercado Brasil Summary Box */}
      <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-emerald-950/25 border border-emerald-800/40 text-emerald-300 font-semibold">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">Mercado Brasil (Menor Preço)</span>
          <span title="Menor preço válido entre as fontes cadastradas (Liga Pokémon ou MYPCards)">
            <HelpCircle className="w-3 h-3 text-emerald-400 cursor-help" />
          </span>
        </div>
        <div className="font-mono font-black text-sm text-emerald-400">
          {aggregated.marketPrice !== null ? formatBRL(aggregated.marketPrice) : 'Sem cotação'}
        </div>
      </div>

      {/* Link Binding Modal */}
      {linkingSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-emerald-400" />
                Vincular página da {linkingSource === 'LIGA_POKEMON' ? 'Liga Pokémon' : 'MYPCards'}
              </h3>
              <button onClick={() => setLinkingSource(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-300 block font-medium">
                Cole o link exato da carta ({linkingSource === 'LIGA_POKEMON' ? 'ligapokemon.com.br' : 'mypcards.com'}):
              </label>
              <input
                type="url"
                value={linkInput}
                onChange={(e) => { setLinkInput(e.target.value); setLinkError(''); }}
                placeholder={linkingSource === 'LIGA_POKEMON' ? 'https://www.ligapokemon.com.br/?view=cards/item&card=...' : 'https://mypcards.com/pokemon/produto/...'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-emerald-500"
                autoFocus
              />
              {linkError && (
                <p className="text-[11px] text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 shrink-0" /> {linkError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setLinkingSource(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveLink}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm"
              >
                Salvar link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
