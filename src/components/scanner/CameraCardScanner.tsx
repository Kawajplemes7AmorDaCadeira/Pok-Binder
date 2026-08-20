import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  X,
  Zap,
  ZapOff,
  RefreshCw,
  Upload,
  Check,
  Plus,
  Sparkles,
  Search,
  Layers,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  Volume2
} from 'lucide-react';
import { CardLanguage, CardVariant, PokemonCard } from '../../types';
import { CardProvider } from '../../services/cardProvider';
import { StorageService } from '../../services/storage';
import { CardImage } from '../CardImage';
import { PriceService } from '../../services/pricing/PriceService';
import { BrazilianPriceParser } from '../../services/pricing/BrazilianPriceParser';
import { createWorker } from 'tesseract.js';

interface CameraCardScannerProps {
  isOpen: boolean;
  onClose: () => void;
  preferredLanguage: CardLanguage;
  onCardAddedToCollection?: (card: PokemonCard, variant: CardVariant) => void;
  onSelectCardDetail?: (card: PokemonCard) => void;
}

export const CameraCardScanner: React.FC<CameraCardScannerProps> = ({
  isOpen,
  onClose,
  preferredLanguage,
  onCardAddedToCollection,
  onSelectCardDetail,
}) => {
  // Video and stream states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorchSupport, setHasTorchSupport] = useState(false);

  // Scanning & OCR states
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<string>('');
  const [detectedText, setDetectedText] = useState<string>('');
  const [manualQuery, setManualQuery] = useState<string>('');

  // Matched Card Results
  const [matchedCards, setMatchedCards] = useState<PokemonCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<PokemonCard | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<CardVariant>('normal');
  const [quantityToAdd, setQuantityToAdd] = useState(1);
  const [justAddedSuccess, setJustAddedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // OCR Worker ref
  const ocrWorkerRef = useRef<any>(null);

  // Initialize OCR Worker
  useEffect(() => {
    let isMounted = true;
    async function initOCR() {
      try {
        const worker = await createWorker('por+eng');
        if (isMounted) {
          ocrWorkerRef.current = worker;
        }
      } catch (e) {
        console.warn('OCR Worker initialization fallback to eng:', e);
        try {
          const fallback = await createWorker('eng');
          if (isMounted) ocrWorkerRef.current = fallback;
        } catch (err) {
          console.error('OCR Worker failed entirely:', err);
        }
      }
    }

    if (isOpen) {
      initOCR();
    }

    return () => {
      isMounted = false;
      if (ocrWorkerRef.current) {
        ocrWorkerRef.current.terminate().catch(() => {});
        ocrWorkerRef.current = null;
      }
    };
  }, [isOpen]);

  // Start Camera Stream
  const startCamera = useCallback(async (facing: 'environment' | 'user' = 'environment') => {
    try {
      setErrorMessage(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      setHasPermission(true);
      setCameraActive(true);

      // Check for torch capability
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities: any = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
        setHasTorchSupport(Boolean(capabilities.torch));
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setHasPermission(false);
      setCameraActive(false);
      setErrorMessage(
        'Não foi possível acessar a câmera. Verifique as permissões do navegador ou utilize o upload de foto.'
      );
    }
  }, []);

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  }, []);

  // Open & Close stream lifecycle
  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopCamera();
      setMatchedCards([]);
      setSelectedCard(null);
      setDetectedText('');
      setJustAddedSuccess(false);
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera, facingMode]);

  // Toggle Torch / Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      try {
        const nextState = !torchOn;
        await (videoTrack as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchOn(nextState);
      } catch (err) {
        console.warn('Failed to toggle torch:', err);
      }
    }
  };

  // Flip Camera
  const switchCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Extract clean keywords from text for matching Pokemon cards
  const extractSearchTokens = (text: string) => {
    // 1. Look for Card Numbers like "025/165", "151/165", "25/102", "199/165", "TG04/TG30"
    const numberRegex = /(\b\d{1,3}\s*\/\s*\d{1,3}\b)|(\b[A-Z]{1,3}\d{1,3}\s*\/\s*[A-Z]{0,3}\d{1,3}\b)/gi;
    const numberMatches = text.match(numberRegex);

    // 2. Normalize and split text words
    const clean = text
      .replace(/[^a-zA-Z0-9\s/]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = clean
      .split(' ')
      .map((w) => w.trim())
      .filter((w) => w.length >= 3 && !['BASIC', 'STAGE', 'POKEMON', 'TRAINER', 'ENERGY', 'ITEM', 'SUPPORTER', 'RULE', 'CARD', 'WEAKNESS', 'RESISTANCE', 'RETREAT', 'COST'].includes(w.toUpperCase()));

    return {
      numbers: numberMatches ? numberMatches.map((n) => n.replace(/\s+/g, '')) : [],
      words,
      raw: clean,
    };
  };

  // Search card database using recognized OCR tokens
  const matchCardsFromText = async (rawText: string) => {
    setOcrStatus('Cruzando dados com o catálogo PokéBinder...');
    const tokens = extractSearchTokens(rawText);
    const candidateResults: PokemonCard[] = [];
    const seenIds = new Set<string>();

    // 1. Prioritize direct card number search (e.g. "25/165" or "025")
    for (const numStr of tokens.numbers) {
      const parts = numStr.split('/');
      const localNum = parts[0].replace(/^0+/, '') || '0';
      const formattedNum = parts[0].padStart(3, '0');

      const { cards } = await CardProvider.searchCards(
        { searchQuery: localNum, sortBy: 'number' },
        preferredLanguage
      );

      for (const c of cards) {
        if (
          (c.localId === localNum || c.localId === formattedNum || c.localId.includes(localNum)) &&
          !seenIds.has(c.id)
        ) {
          candidateResults.push(c);
          seenIds.add(c.id);
        }
      }
    }

    // 2. Search by prominent Pokémon names in text
    for (const word of tokens.words.slice(0, 5)) {
      if (word.length >= 3) {
        const { cards } = await CardProvider.searchCards(
          { searchQuery: word },
          preferredLanguage
        );
        for (const c of cards.slice(0, 6)) {
          if (!seenIds.has(c.id)) {
            candidateResults.push(c);
            seenIds.add(c.id);
          }
        }
      }
    }

    if (candidateResults.length > 0) {
      setMatchedCards(candidateResults);
      setSelectedCard(candidateResults[0]);
      setOcrStatus(`Encontramos ${candidateResults.length} correspondência(s)!`);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate?.([40, 30, 40]);
      }
    } else {
      setOcrStatus('Nenhuma carta correspondente encontrada com precisão.');
      setErrorMessage('Não identificamos a carta automaticamente. Tente alinhar melhor ou digite o nome/número.');
    }
  };

  // Process captured image canvas with OCR
  const processImageCanvas = async (canvas: HTMLCanvasElement) => {
    setIsProcessing(true);
    setErrorMessage(null);
    setOcrStatus('Lendo imagem e identificando texto...');

    try {
      if (!ocrWorkerRef.current) {
        setOcrStatus('Inicializando motor OCR...');
        ocrWorkerRef.current = await createWorker('por+eng');
      }

      const { data } = await ocrWorkerRef.current.recognize(canvas);
      const recognizedText = data.text || '';
      setDetectedText(recognizedText);

      if (recognizedText.trim().length > 0) {
        await matchCardsFromText(recognizedText);
      } else {
        setOcrStatus('Nenhum texto visível na área de foco.');
        setErrorMessage('Tente aproximar a câmera ou aumentar a iluminação.');
      }
    } catch (err: any) {
      console.error('Scan processing error:', err);
      setErrorMessage('Erro no reconhecimento óptico. Tente novamente ou use a busca direta.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Capture current camera snapshot
  const captureAndScan = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw full video frame
    ctx.drawImage(video, 0, 0, width, height);

    // Apply slight contrast & sharpening for better OCR
    const imgData = ctx.getImageData(0, 0, width, height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const avg = (d[i] + d[i + 1] + d[i + 2]) / 3;
      // High contrast thresholding
      const contrast = avg > 120 ? Math.min(255, avg * 1.15) : Math.max(0, avg * 0.85);
      d[i] = contrast;
      d[i + 1] = contrast;
      d[i + 2] = contrast;
    }
    ctx.putImageData(imgData, 0, 0);

    processImageCanvas(canvas);
  };

  // Handle Photo File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          processImageCanvas(canvas);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Manual fallback search
  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQuery.trim()) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setOcrStatus(`Buscando por "${manualQuery}"...`);

    try {
      const { cards } = await CardProvider.searchCards(
        { searchQuery: manualQuery },
        preferredLanguage
      );

      if (cards.length > 0) {
        setMatchedCards(cards);
        setSelectedCard(cards[0]);
        setOcrStatus(`${cards.length} cartas encontradas!`);
      } else {
        setMatchedCards([]);
        setErrorMessage(`Nenhuma carta encontrada para "${manualQuery}".`);
      }
    } catch (err) {
      setErrorMessage('Erro ao buscar cartas.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Add recognized card to collection
  const handleAddToCollection = () => {
    if (!selectedCard) return;

    StorageService.updateCardQuantity(
      selectedCard.id,
      quantityToAdd,
      selectedVariant,
      preferredLanguage
    );

    setJustAddedSuccess(true);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate?.(60);
    }

    if (onCardAddedToCollection) {
      onCardAddedToCollection(selectedCard, selectedVariant);
    }

    setTimeout(() => {
      setJustAddedSuccess(false);
    }, 2500);
  };

  // Reset to scan next card
  const handleScanNext = () => {
    setSelectedCard(null);
    setMatchedCards([]);
    setDetectedText('');
    setManualQuery('');
    setErrorMessage(null);
    setOcrStatus('');
    setQuantityToAdd(1);
    setJustAddedSuccess(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col justify-between select-none animate-fadeIn overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-md shadow-red-500/20">
            <Camera className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-white text-sm font-black tracking-wide flex items-center gap-1.5">
              Scanner de Câmera
              <span className="text-[10px] bg-red-600/30 text-red-400 border border-red-500/40 px-1.5 py-0.2 rounded font-bold uppercase">
                IA & OCR
              </span>
            </h3>
            <p className="text-slate-400 text-[11px]">Aponte a câmera para a carta Pokémon</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasTorchSupport && (
            <button
              onClick={toggleTorch}
              className={`p-2 rounded-xl border transition-all ${
                torchOn
                  ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title="Lanterna / Flash"
            >
              {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={switchCamera}
            className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white transition-all"
            title="Alternar Câmera"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white transition-all"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div className="relative flex-1 flex flex-col items-center justify-center overflow-hidden bg-black">
        {/* Hidden Canvas for Frame Processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Live Video Stream Element */}
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Shaded Viewfinder Overlay with Card Frame */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
          {/* Card Target Reticle (Standard Card Proportion 63mm x 88mm) */}
          <div className="relative w-64 h-92 sm:w-72 sm:h-[400px] border-2 border-red-500/70 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] overflow-hidden transition-all">
            {/* Corner Markers */}
            <div className="absolute top-2 left-2 w-5 h-5 border-t-4 border-l-4 border-amber-400 rounded-tl-lg" />
            <div className="absolute top-2 right-2 w-5 h-5 border-t-4 border-r-4 border-amber-400 rounded-tr-lg" />
            <div className="absolute bottom-2 left-2 w-5 h-5 border-b-4 border-l-4 border-amber-400 rounded-bl-lg" />
            <div className="absolute bottom-2 right-2 w-5 h-5 border-b-4 border-r-4 border-amber-400 rounded-br-lg" />

            {/* Glowing Laser Scan Animation */}
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_15px_#ef4444] animate-[scanLaser_2.5s_ease-in-out_infinite]" />

            {/* Target Alignment Helper */}
            <div className="absolute inset-x-0 top-3 text-center">
              <span className="bg-black/60 backdrop-blur-md text-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30 shadow">
                Enquadre o Nome ou Número
              </span>
            </div>
          </div>
        </div>

        {/* Realtime Status Indicator Bar */}
        {(isProcessing || ocrStatus) && (
          <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-center">
            <div className="bg-slate-900/90 border border-slate-700/80 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2.5 max-w-sm text-center animate-pulse">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-200 truncate">
                {isProcessing ? 'Processando imagem...' : ocrStatus}
              </span>
            </div>
          </div>
        )}

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="absolute top-16 left-4 right-4 z-20 flex items-center justify-center">
            <div className="bg-red-950/90 border border-red-700/80 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2 max-w-md">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-xs font-medium text-red-200">{errorMessage}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Panel: Identification Result OR Capture Actions */}
      <div className="bg-[#080d1b] border-t border-slate-800 p-4 sm:p-5 z-30 max-h-[50vh] overflow-y-auto">
        {selectedCard ? (
          /* Identified Card Card & Quick Collection Add */
          <div className="max-w-xl mx-auto space-y-4 animate-slideUp">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                <h4 className="text-white text-xs font-black uppercase tracking-wider">
                  Carta Identificada
                </h4>
              </div>
              <button
                onClick={handleScanNext}
                className="text-xs text-slate-400 hover:text-white underline font-semibold flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Escanear Outra
              </button>
            </div>

            {/* Card Preview Details */}
            <div className="flex gap-4 items-center bg-slate-900/80 border border-slate-800 p-3 rounded-2xl">
              <div className="w-16 h-24 shrink-0 rounded-lg overflow-hidden border border-slate-700 shadow-md">
                <CardImage
                  card={selectedCard}
                  alt={selectedCard.name}
                  variant={selectedVariant}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-white font-black text-sm truncate">{selectedCard.name}</h3>
                <p className="text-slate-400 text-xs truncate">
                  {selectedCard.setName} • #{selectedCard.localId}
                </p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-800 text-amber-300 rounded border border-slate-700">
                    {selectedCard.rarity || 'Comum'}
                  </span>
                  <span className="text-[11px] font-extrabold text-emerald-400 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {(() => {
                      const agg = PriceService.getAggregatedMarketPrice(selectedCard, selectedVariant);
                      return agg.marketPrice ? BrazilianPriceParser.formatBRL(agg.marketPrice) : 'Sob Consulta';
                    })()}
                  </span>
                </div>
              </div>

              {/* View Full Card Button */}
              {onSelectCardDetail && (
                <button
                  onClick={() => onSelectCardDetail(selectedCard)}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all text-xs font-bold shrink-0"
                  title="Ver detalhes"
                >
                  Detalhes
                </button>
              )}
            </div>

            {/* Multi-match alternative selector */}
            {matchedCards.length > 1 && (
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400 font-semibold">
                  Outras cartas semelhantes encontradas ({matchedCards.length}):
                </span>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {matchedCards.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCard(c)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border transition-all ${
                        selectedCard.id === c.id
                          ? 'bg-red-600/30 border-red-500 text-white shadow'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {c.name} (#{c.localId})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Variant Selector & Quantity Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Variant Picker */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Variante:</label>
                <select
                  value={selectedVariant}
                  onChange={(e) => setSelectedVariant(e.target.value as CardVariant)}
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-red-500"
                >
                  <option value="normal">Normal / Regular</option>
                  <option value="holo">Foil / Holofote</option>
                  <option value="reverse">Reverse Holo</option>
                  <option value="first_edition">1ª Edição</option>
                  <option value="master_ball">Master Ball Holo</option>
                </select>
              </div>

              {/* Quantity Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400">Quantidade:</label>
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 justify-between">
                  <button
                    onClick={() => setQuantityToAdd(Math.max(1, quantityToAdd - 1))}
                    className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 font-black hover:bg-slate-700 flex items-center justify-center text-sm"
                  >
                    -
                  </button>
                  <span className="font-black text-white text-sm">{quantityToAdd}</span>
                  <button
                    onClick={() => setQuantityToAdd(quantityToAdd + 1)}
                    className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 font-black hover:bg-slate-700 flex items-center justify-center text-sm"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Add to Collection CTA Action */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleAddToCollection}
                className={`flex-1 py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                  justAddedSuccess
                    ? 'bg-emerald-600 text-white shadow-emerald-600/30 scale-102'
                    : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-red-600/30'
                }`}
              >
                {justAddedSuccess ? (
                  <>
                    <Check className="w-4 h-4" /> Adicionado com Sucesso!
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> Adicionar à Minha Coleção (+{quantityToAdd})
                  </>
                )}
              </button>

              <button
                onClick={handleScanNext}
                className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition-all shrink-0"
              >
                Próxima Carta
              </button>
            </div>
          </div>
        ) : (
          /* Camera Controls & Capture Button */
          <div className="max-w-md mx-auto space-y-4">
            {/* Shutter Action Button & Options */}
            <div className="flex items-center justify-around gap-4">
              {/* Photo Upload from Phone Gallery */}
              <label className="flex flex-col items-center gap-1 cursor-pointer group">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 group-hover:text-white group-hover:bg-slate-700 transition-all shadow-md">
                  <Upload className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-slate-400">Galeria</span>
              </label>

              {/* Main Camera Shutter Trigger */}
              <button
                onClick={captureAndScan}
                disabled={isProcessing}
                className="relative group w-18 h-18 rounded-full bg-gradient-to-br from-red-500 to-red-600 p-1.5 shadow-xl shadow-red-600/40 hover:scale-105 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
              >
                <div className="w-full h-full rounded-full border-2 border-white/60 flex items-center justify-center bg-red-600 group-hover:bg-red-500 transition-colors">
                  {isProcessing ? (
                    <RefreshCw className="w-7 h-7 text-white animate-spin" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-white shadow" />
                  )}
                </div>
              </button>

              {/* Switch Camera */}
              <button
                onClick={switchCamera}
                className="flex flex-col items-center gap-1 cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 group-hover:text-white group-hover:bg-slate-700 transition-all shadow-md">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-slate-400">Girar</span>
              </button>
            </div>

            {/* Quick Search Fallback Input */}
            <form onSubmit={handleManualSearch} className="relative pt-1">
              <input
                type="text"
                placeholder="Ou digite o nome ou número (ex: 151/165, Pikachu)..."
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-2 pl-9 pr-20 text-xs placeholder-slate-500 focus:outline-none focus:border-red-500 transition-all"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3.5 pointer-events-none" />
              <button
                type="submit"
                disabled={!manualQuery.trim()}
                className="absolute right-1.5 top-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
              >
                Buscar
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
