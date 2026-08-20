import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  X,
  Zap,
  ZapOff,
  RefreshCw,
  Upload,
  Search,
  Sliders,
  Sparkles,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { CardCondition, CardLanguage, CardVariant, PokemonCard } from '../../types';
import { StorageService } from '../../services/storage';
import { CardProvider } from '../../services/cardProvider';
import { ImagePreprocessor } from '../../services/scanner/ImagePreprocessor';
import { OCRService } from '../../services/scanner/OCRService';
import { CardTextExtractor } from '../../services/scanner/CardTextExtractor';
import { ScannerCardMatcher } from '../../services/scanner/ScannerCardMatcher';
import { RecognitionConfidenceService } from '../../services/scanner/RecognitionConfidenceService';
import { ScanHistoryService } from '../../services/scanner/ScanHistoryService';
import { ScannerAudioHaptic } from '../../services/scanner/ScannerAudioHaptic';
import {
  CardCandidate,
  ImageQualityAssessment,
  ScanHistoryEntry,
  ScanRecognitionResult,
  ScannerSettings,
} from '../../services/scanner/types';
import { ScannerOverlay } from './ScannerOverlay';
import { ScannerResult } from './ScannerResult';
import { ScannerCandidateList } from './ScannerCandidateList';
import { ScannerBatchSession } from './ScannerBatchSession';
import { ScannerDevPanel } from './ScannerDevPanel';
import { ScannerSettingsModal } from './ScannerSettingsModal';

interface CardScannerProps {
  isOpen: boolean;
  onClose: () => void;
  preferredLanguage: CardLanguage;
  onCardAddedToCollection?: (card: PokemonCard, variant: CardVariant) => void;
  onSelectCardDetail?: (card: PokemonCard) => void;
}

export const CardScanner: React.FC<CardScannerProps> = ({
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

  // Settings
  const [settings, setSettings] = useState<ScannerSettings>(() => ScanHistoryService.getSettings());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Camera capabilities & state
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorchSupport, setHasTorchSupport] = useState(false);

  // Real-time Computer Vision & Quality Assessment
  const [qualityAssessment, setQualityAssessment] = useState<ImageQualityAssessment | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('Aponte a câmera para a carta');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-capture debounce timer
  const stableFrameCountRef = useRef(0);
  const isAnalyzingRef = useRef(false);

  // Recognition Results
  const [recognitionResult, setRecognitionResult] = useState<ScanRecognitionResult | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CardCandidate | null>(null);
  const [manualQuery, setManualQuery] = useState('');
  const [showCandidatePicker, setShowCandidatePicker] = useState(false);

  // Card Add Form parameters
  const [selectedVariant, setSelectedVariant] = useState<CardVariant>(settings.defaultVariant);
  const [selectedCondition, setSelectedCondition] = useState<CardCondition>(settings.defaultCondition);
  const [quantityToAdd, setQuantityToAdd] = useState<number>(settings.defaultQuantity);
  const [acquiredPrice, setAcquiredPrice] = useState<string>('');
  const [isJustAdded, setIsJustAdded] = useState(false);

  // Batch Session tracking
  const [sessionEntries, setSessionEntries] = useState<ScanHistoryEntry[]>([]);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  // Start Camera Stream
  const startCamera = useCallback(
    async (facing: 'environment' | 'user' = 'environment') => {
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

        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const capabilities: any = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
          setHasTorchSupport(Boolean(capabilities.torch));
        }
      } catch (err: any) {
        setHasPermission(false);
        setCameraActive(false);
        setErrorMessage(
          'Não foi possível acessar a câmera. Verifique as permissões ou utilize o upload de foto da galeria.'
        );
      }
    },
    []
  );

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  }, []);

  // Initialize Session & Lifecycle
  useEffect(() => {
    if (isOpen) {
      ScanHistoryService.startNewSession();
      setSessionEntries([]);
      startCamera(facingMode);
    } else {
      stopCamera();
      OCRService.terminate().catch(() => {});
      setRecognitionResult(null);
      setSelectedCandidate(null);
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera, facingMode]);

  // Real-time frame loop for quality assessment & auto-capture trigger
  useEffect(() => {
    if (!isOpen || !cameraActive || isProcessing || recognitionResult) return;

    const interval = setInterval(() => {
      if (!videoRef.current || !canvasRef.current || isAnalyzingRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video.readyState < 2) return;

      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, width, height);

      // Assess image quality (lighting, blur, glare)
      const assessment = ImagePreprocessor.assessQuality(canvas);
      setQualityAssessment(assessment);

      // Auto-capture detection
      if (settings.autoCapture && assessment.isAcceptable) {
        stableFrameCountRef.current += 1;
        // If image has been stable for ~3 consecutive checks (~600ms)
        if (stableFrameCountRef.current >= 3) {
          stableFrameCountRef.current = 0;
          executeScanPipeline(canvas);
        }
      } else {
        stableFrameCountRef.current = 0;
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isOpen, cameraActive, isProcessing, recognitionResult, settings.autoCapture]);

  // Toggle Torch
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
        console.warn('Torch toggle failed', err);
      }
    }
  };

  // Flip Camera
  const switchCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Execute Complete Recognition Pipeline
  const executeScanPipeline = async (sourceCanvas: HTMLCanvasElement) => {
    if (isAnalyzingRef.current) return;
    isAnalyzingRef.current = true;
    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage('Lendo texto e identificando regiões...');

    try {
      // 1. Image Preprocessing & Region Cropping
      const { topCanvas, bottomCanvas, fullCardCanvas } =
        ImagePreprocessor.cropCardRegions(sourceCanvas);

      // 2. OCR Execution on Regions
      setStatusMessage('Processando OCR de alta precisão...');
      const [topOcr, bottomOcr] = await Promise.all([
        OCRService.recognize(topCanvas, preferredLanguage).catch(() => ({
          text: '',
          confidence: 0,
          lines: [],
        })),
        OCRService.recognize(bottomCanvas, preferredLanguage).catch(() => ({
          text: '',
          confidence: 0,
          lines: [],
        })),
      ]);

      // If bottom region is faint, run full card fallback
      let fullOcrText = `${topOcr.text}\n${bottomOcr.text}`;
      if (bottomOcr.text.trim().length === 0) {
        const fallbackFull = await OCRService.recognize(fullCardCanvas, preferredLanguage).catch(
          () => ({ text: '' })
        );
        fullOcrText = fallbackFull.text;
      }

      // 3. Extract Tokens & Parse Numbers
      setStatusMessage('Extraindo números de colecionador e dados...');
      const extractedTokens = CardTextExtractor.extractTokens(
        topOcr.text,
        bottomOcr.text,
        fullOcrText
      );

      // 4. Score & Match Cards against Database
      setStatusMessage('Cruzando com o banco de cartas...');
      const candidates = await ScannerCardMatcher.findCardCandidates(
        extractedTokens,
        preferredLanguage
      );

      // 5. Calculate Confidence Level & Gap
      const evaluatedResult = RecognitionConfidenceService.evaluateCandidates(
        candidates,
        extractedTokens,
        preferredLanguage
      );

      setRecognitionResult(evaluatedResult);

      if (evaluatedResult.candidates.length > 0) {
        const topCandidate = evaluatedResult.candidates[0];
        setSelectedCandidate(topCandidate);

        // Pre-select variant suggestion if available
        if (evaluatedResult.suggestedVariant) {
          setSelectedVariant(evaluatedResult.suggestedVariant);
        }

        // Handle confidence level routing
        if (evaluatedResult.level === 'HIGH') {
          setStatusMessage(`Identificado: ${topCandidate.card.name}!`);
          setShowCandidatePicker(false);
          if (settings.soundFeedback) ScannerAudioHaptic.playRecognizedSound();
          if (settings.hapticFeedback) ScannerAudioHaptic.triggerHaptic('recognized');
        } else if (evaluatedResult.level === 'MEDIUM') {
          setStatusMessage('Possíveis cartas encontradas. Escolha a sua:');
          setShowCandidatePicker(true);
          if (settings.soundFeedback) ScannerAudioHaptic.playRecognizedSound();
        } else {
          // LOW Confidence
          setStatusMessage('Não foi possível identificar com certeza.');
          setShowCandidatePicker(false);
          if (settings.soundFeedback) ScannerAudioHaptic.playWarningSound();
          if (settings.hapticFeedback) ScannerAudioHaptic.triggerHaptic('warning');
        }
      } else {
        setStatusMessage('Nenhuma carta correspondente encontrada.');
        setErrorMessage('Não identificamos a carta automaticamente. Digite o número ou nome.');
        if (settings.soundFeedback) ScannerAudioHaptic.playWarningSound();
      }
    } catch (err: any) {
      console.error('Scan pipeline error:', err);
      setErrorMessage('Ocorreu um erro no processamento. Tente novamente.');
    } finally {
      setIsProcessing(false);
      isAnalyzingRef.current = false;
    }
  };

  // Manual Trigger Capture
  const handleManualCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    executeScanPipeline(canvas);
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
          executeScanPipeline(canvas);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Manual search fallback
  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQuery.trim()) return;

    setIsProcessing(true);
    setErrorMessage(null);
    setStatusMessage(`Buscando por "${manualQuery}"...`);

    try {
      const { cards } = await CardProvider.searchCards(
        { searchQuery: manualQuery },
        preferredLanguage
      );

      if (cards.length > 0) {
        const dummyTokens = CardTextExtractor.extractTokens('', '', manualQuery);
        const candidates = cards.map((c) => {
          const { breakdown, reasons } = ScannerCardMatcher.scoreCard(
            c,
            dummyTokens,
            preferredLanguage
          );
          return {
            card: c,
            confidence: Math.max(60, breakdown.total),
            matchBreakdown: breakdown,
            reasons: ['Busca manual direta'],
          };
        });

        const evaluated = RecognitionConfidenceService.evaluateCandidates(
          candidates,
          dummyTokens,
          preferredLanguage
        );

        setRecognitionResult(evaluated);
        setSelectedCandidate(candidates[0]);
        setShowCandidatePicker(candidates.length > 1);
        setStatusMessage(`${cards.length} cartas encontradas`);
      } else {
        setErrorMessage(`Nenhuma carta encontrada para "${manualQuery}".`);
      }
    } catch (err) {
      setErrorMessage('Erro ao buscar cartas.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirm and Add Card to Collection
  const handleConfirmAdd = () => {
    if (!selectedCandidate) return;

    const card = selectedCandidate.card;
    const existingQty = StorageService.getCardTotalQuantity(card.id);
    const isDuplicate = existingQty > 0;

    // Update collection
    StorageService.updateCardQuantity(
      card.id,
      quantityToAdd,
      selectedVariant,
      preferredLanguage,
      selectedCondition
    );

    // Record in batch session history
    const entry = ScanHistoryService.recordConfirmedScan({
      cardId: card.id,
      cardName: card.name,
      collectorNumber: card.localId,
      setName: card.setName,
      variant: selectedVariant,
      condition: selectedCondition,
      quantity: quantityToAdd,
      recognizedText: recognitionResult?.extractedTokens.collectorNumbers || [card.localId],
      confidence: selectedCandidate.confidence,
      isDuplicate,
      previousQuantity: existingQty,
      newQuantity: existingQty + quantityToAdd,
    });

    setSessionEntries(ScanHistoryService.getSessionEntries());
    setIsJustAdded(true);

    if (settings.soundFeedback) ScannerAudioHaptic.playAddedSuccessSound();
    if (settings.hapticFeedback) ScannerAudioHaptic.triggerHaptic('added');

    if (onCardAddedToCollection) {
      onCardAddedToCollection(card, selectedVariant);
    }

    // Auto reset for next card after brief confirmation
    setTimeout(() => {
      setIsJustAdded(false);
      handleScanNext();
    }, 1800);
  };

  // Reset to scan next card
  const handleScanNext = () => {
    setRecognitionResult(null);
    setSelectedCandidate(null);
    setShowCandidatePicker(false);
    setManualQuery('');
    setErrorMessage(null);
    setStatusMessage('Aponte a câmera para a próxima carta');
    setQuantityToAdd(settings.defaultQuantity);
    setSelectedVariant(settings.defaultVariant);
    setSelectedCondition(settings.defaultCondition);
    setAcquiredPrice('');
    setIsJustAdded(false);
  };

  // Undo Last Addition
  const handleUndoLast = () => {
    const res = ScanHistoryService.undoLastScan(preferredLanguage);
    if (res.success) {
      setSessionEntries(ScanHistoryService.getSessionEntries());
      if (settings.soundFeedback) ScannerAudioHaptic.playWarningSound();
      if (settings.hapticFeedback) ScannerAudioHaptic.triggerHaptic('undo');
    }
  };

  // Handle Close with Session Summary Check
  const handleRequestClose = () => {
    const entries = ScanHistoryService.getSessionEntries();
    if (entries.length > 0) {
      setIsSummaryOpen(true);
    } else {
      onClose();
    }
  };

  const handleFinishSession = () => {
    setIsSummaryOpen(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col justify-between select-none animate-fadeIn overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-md shadow-red-500/20">
            <Camera className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-white text-sm font-black tracking-wide flex items-center gap-1.5">
              Scanner Pro TCG
              <span className="text-[10px] bg-red-600/30 text-red-400 border border-red-500/40 px-1.5 py-0.2 rounded font-bold uppercase">
                IA & OCR
              </span>
            </h3>
            <p className="text-slate-400 text-[11px]">Enquadre nome ou número de colecionador</p>
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
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white transition-all"
            title="Configurações do Scanner"
          >
            <Sliders className="w-4 h-4" />
          </button>

          <button
            onClick={handleRequestClose}
            className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white transition-all"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Batch Session Stats Bar */}
      <ScannerBatchSession
        entries={sessionEntries}
        stats={ScanHistoryService.getSessionStats()}
        onUndoLast={handleUndoLast}
        isSummaryOpen={isSummaryOpen}
        onCloseSummary={handleFinishSession}
      />

      {/* Camera Viewport & Live Stream Area */}
      <div className="relative flex-1 flex flex-col items-center justify-center overflow-hidden bg-black">
        <canvas ref={canvasRef} className="hidden" />

        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Live Overlay with Vision Feedback */}
        <ScannerOverlay
          isProcessing={isProcessing}
          qualityAssessment={qualityAssessment}
          statusMessage={statusMessage}
        />

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-center">
            <div className="bg-red-950/90 border border-red-700/80 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2 max-w-md">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-xs font-medium text-red-200">{errorMessage}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Panel */}
      <div className="bg-[#080d1b] border-t border-slate-800 p-4 sm:p-5 z-30 max-h-[55vh] overflow-y-auto safe-area-pb">
        {selectedCandidate && !showCandidatePicker ? (
          /* Card Identified - Confirmation and Configuration */
          <ScannerResult
            card={selectedCandidate.card}
            recognitionResult={recognitionResult!}
            preferredLanguage={preferredLanguage}
            selectedVariant={selectedVariant}
            onChangeVariant={setSelectedVariant}
            selectedCondition={selectedCondition}
            onChangeCondition={setSelectedCondition}
            quantity={quantityToAdd}
            onChangeQuantity={setQuantityToAdd}
            acquiredPrice={acquiredPrice}
            onChangeAcquiredPrice={setAcquiredPrice}
            onConfirmAdd={handleConfirmAdd}
            onScanNext={handleScanNext}
            onShowOtherCandidates={() => setShowCandidatePicker(true)}
            isJustAdded={isJustAdded}
            onOpenCardDetail={onSelectCardDetail}
          />
        ) : showCandidatePicker && recognitionResult ? (
          /* Multi-candidate Selection Mode (MEDIUM Confidence) */
          <ScannerCandidateList
            candidates={recognitionResult.candidates}
            selectedCard={selectedCandidate?.card || null}
            onSelectCandidate={(cand) => {
              setSelectedCandidate(cand);
              setShowCandidatePicker(false);
            }}
            preferredLanguage={preferredLanguage}
            onManualSearchFallback={() => {
              setShowCandidatePicker(false);
              setSelectedCandidate(null);
            }}
          />
        ) : (
          /* Camera Controls & Shutter Actions */
          <div className="max-w-md mx-auto space-y-4">
            <div className="flex items-center justify-around gap-4">
              {/* Photo Upload from Gallery */}
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

              {/* Main Shutter Button */}
              <button
                onClick={handleManualCapture}
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
                placeholder="Ou digite número / nome (ex: 010/086, Ho-Oh, Pikachu)..."
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

      {/* Developer Debug Panel */}
      <ScannerDevPanel recognitionResult={recognitionResult} />

      {/* Settings Modal */}
      <ScannerSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(newSettings) => {
          const updated = ScanHistoryService.saveSettings(newSettings);
          setSettings(updated);
        }}
      />
    </div>
  );
};
