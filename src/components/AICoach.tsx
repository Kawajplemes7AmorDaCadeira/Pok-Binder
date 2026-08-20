import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Brain,
  Sword,
  Send,
  Save,
  Check,
  AlertCircle,
  Loader2,
  ChevronRight,
  MessageSquare,
  Zap,
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useGlobalState } from '../context/GlobalStateContext';
import { PokemonCard, Deck, CardLanguage, DeckCard } from '../types';
import Markdown from 'react-markdown';

interface AICoachProps {
  preferredLanguage: CardLanguage;
  onSelectCard: (card: PokemonCard) => void;
}

interface GeneratedCard {
  cardId: string;
  quantity: number;
  meta: PokemonCard;
}

interface GeneratedDeck {
  name: string;
  description: string;
  format: 'Standard' | 'Pocket' | 'Expanded' | 'Rotation';
  cards: GeneratedCard[];
}

interface ChatMessage {
  role: 'user' | 'model';
  message: string;
}

export const AICoach: React.FC<AICoachProps> = ({ preferredLanguage, onSelectCard }) => {
  const { theme, decks, saveDeck } = useGlobalState();
  const [activeSubTab, setActiveSubTab] = useState<'builder' | 'coach'>('builder');

  // Deck Builder State
  const [prompt, setPrompt] = useState('');
  const [format, setFormat] = useState<'Standard' | 'Pocket' | 'Expanded' | 'Rotation'>('Standard');
  const [generating, setGenerating] = useState(false);
  const [generatedDeck, setGeneratedDeck] = useState<GeneratedDeck | null>(null);
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Coach State
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');
  const [coachChat, setCoachChat] = useState<ChatMessage[]>([]);
  const [coachInput, setCoachInput] = useState('');
  const [coachLoading, setCoachLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [coachChat, coachLoading]);

  // Set initial selected deck in coach if decks change or are empty
  useEffect(() => {
    if (decks.length > 0 && !selectedDeckId) {
      setSelectedDeckId(decks[0].id);
    }
  }, [decks, selectedDeckId]);

  // Handle deck generation API call
  const handleGenerateDeck = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setBuilderError(null);
    setGeneratedDeck(null);
    setIsSaved(false);

    try {
      const response = await fetch('/api/gemini/generate-deck', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          format,
          lang: preferredLanguage,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Erro ao gerar o deck');
      }

      const data = await response.json();
      setGeneratedDeck(data);
    } catch (err: any) {
      setBuilderError(err.message || 'Houve um erro ao processar sua solicitação.');
    } finally {
      setGenerating(false);
    }
  };

  // Save generated deck to database
  const handleSaveDeck = async () => {
    if (!generatedDeck) return;

    try {
      const formattedCards: DeckCard[] = generatedDeck.cards.map((c) => ({
        cardId: c.cardId,
        quantity: c.quantity,
      }));

      const newDeck: Deck = {
        id: `deck_ai_${Date.now()}`,
        name: generatedDeck.name,
        description: generatedDeck.description,
        format: generatedDeck.format,
        coverCardId: generatedDeck.cards.find(c => c.meta.category === 'Pokemon')?.cardId || generatedDeck.cards[0]?.cardId,
        cards: formattedCards,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveDeck(newDeck);
      setIsSaved(true);
      
      // Update selected deck ID in Coach so they can train with it instantly
      setSelectedDeckId(newDeck.id);
    } catch (err) {
      console.error('Failed to save generated deck:', err);
    }
  };

  // Send message to AI Coach
  const handleSendCoachMessage = async (textToSend?: string) => {
    const msg = textToSend || coachInput;
    if (!msg.trim() || !selectedDeckId || coachLoading) return;

    const currentDeck = decks.find((d) => d.id === selectedDeckId);
    if (!currentDeck) return;

    // Load card meta descriptions
    const deckCardsMeta = currentDeck.cards.map(c => {
      return {
        quantity: c.quantity,
        name: c.cardId, // Fallback if meta is not fetched
        category: 'Carta'
      };
    });

    const userMsg: ChatMessage = { role: 'user', message: msg };
    setCoachChat((prev) => [...prev, userMsg]);
    if (!textToSend) setCoachInput('');
    setCoachLoading(true);

    try {
      const response = await fetch('/api/gemini/deck-coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deckName: currentDeck.name,
          deckDescription: currentDeck.description,
          cards: currentDeck.cards, // Backend will fetch metadata if needed
          message: msg,
          chatHistory: coachChat,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Erro ao conversar com o Coach');
      }

      const data = await response.json();
      setCoachChat((prev) => [...prev, { role: 'model', message: data.response }]);
    } catch (err: any) {
      setCoachChat((prev) => [
        ...prev,
        { role: 'model', message: `⚠️ Erro de conexão com o Coach: ${err.message || 'Erro desconhecido'}` }
      ]);
    } finally {
      setCoachLoading(false);
    }
  };

  const activeDeckForCoaching = decks.find(d => d.id === selectedDeckId);

  // Group generated cards by category
  const groupedGeneratedCards = generatedDeck
    ? generatedDeck.cards.reduce((acc, card) => {
        const cat = card.meta.category || 'Outros';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(card);
        return acc;
      }, {} as Record<string, GeneratedCard[]>)
    : {};

  const quickPrompts = [
    { label: 'Estratégia Geral', query: 'Qual é a principal estratégia de vitória e funcionamento desse deck?' },
    { label: 'Mão Inicial Ideal', query: 'Quais cartas eu devo procurar ter na minha mão inicial para um primeiro turno perfeito?' },
    { label: 'Combos & Sinergias', query: 'Quais são os principais combos, evoluções e sinergias de treinadores nesse deck?' },
    { label: 'Contra o Meta-Jogo', query: 'Como devo jogar com este deck contra os principais decks competitivos do formato?' }
  ];

  return (
    <div className="w-full space-y-6 z-10 relative">
      {/* Immersive AI Hub Intro Header */}
      <div className={`p-6 rounded-2xl border ${
        theme === 'dark'
          ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-red-950/20 border-slate-800'
          : 'bg-gradient-to-br from-white via-white to-red-50/30 border-slate-200'
      } shadow-md`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-red-500/10 text-red-500">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </span>
              <h2 className={`text-xl font-extrabold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                Laboratório de Inteligência TCG
              </h2>
            </div>
            <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
              Crie decks de elite com o Gerador IA e converse com o Professor Carvalho para dominar combos e estratégias de batalha.
            </p>
          </div>

          {/* Sub-tab Navigation */}
          <div className={`flex rounded-xl p-1 border ${
            theme === 'dark' ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setActiveSubTab('builder')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'builder'
                  ? 'bg-red-500 text-white shadow-sm'
                  : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Criar Deck IA
            </button>
            <button
              onClick={() => setActiveSubTab('coach')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'coach'
                  ? 'bg-red-500 text-white shadow-sm'
                  : theme === 'dark' ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              Treinador de Decks
            </button>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: AI DECK BUILDER */}
      {activeSubTab === 'builder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className={`p-6 rounded-2xl border space-y-4 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <h3 className={`text-sm font-bold tracking-tight uppercase ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                Parâmetros de Geração
              </h3>

              {/* Format selection */}
              <div className="space-y-1.5">
                <label className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Formato de Jogo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setFormat('Standard')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between min-h-24 transition-all ${
                      format === 'Standard'
                        ? 'border-red-500 bg-red-500/5 ring-1 ring-red-500/40'
                        : theme === 'dark' ? 'border-slate-800 bg-slate-950/50 hover:bg-slate-950' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`text-xs font-black ${format === 'Standard' ? 'text-red-500' : (theme === 'dark' ? 'text-slate-300' : 'text-slate-800')}`}>
                      Standard (Padrão)
                    </span>
                    <span className="text-[10px] text-slate-500 leading-snug mt-1">
                      Formato oficial de 60 cartas do Pokémon TCG físico.
                    </span>
                  </button>

                  <button
                    onClick={() => setFormat('Rotation')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between min-h-24 transition-all ${
                      format === 'Rotation'
                        ? 'border-red-500 bg-red-500/5 ring-1 ring-red-500/40'
                        : theme === 'dark' ? 'border-slate-800 bg-slate-950/50 hover:bg-slate-950' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`text-xs font-black ${format === 'Rotation' ? 'text-red-500' : (theme === 'dark' ? 'text-slate-300' : 'text-slate-800')}`}>
                      Rotação (Sem Proibições)
                    </span>
                    <span className="text-[10px] text-slate-500 leading-snug mt-1">
                      Apenas cartas válidas da rotação atual (sem cartas banidas).
                    </span>
                  </button>

                  <button
                    onClick={() => setFormat('Expanded')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between min-h-24 transition-all ${
                      format === 'Expanded'
                        ? 'border-red-500 bg-red-500/5 ring-1 ring-red-500/40'
                        : theme === 'dark' ? 'border-slate-800 bg-slate-950/50 hover:bg-slate-950' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`text-xs font-black ${format === 'Expanded' ? 'text-red-500' : (theme === 'dark' ? 'text-slate-300' : 'text-slate-800')}`}>
                      Expandido
                    </span>
                    <span className="text-[10px] text-slate-500 leading-snug mt-1">
                      Decks clássicos e poderosos usando cartas de coleções antigas.
                    </span>
                  </button>

                  <button
                    onClick={() => setFormat('Pocket')}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between min-h-24 transition-all ${
                      format === 'Pocket'
                        ? 'border-red-500 bg-red-500/5 ring-1 ring-red-500/40'
                        : theme === 'dark' ? 'border-slate-800 bg-slate-950/50 hover:bg-slate-950' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <span className={`text-xs font-black ${format === 'Pocket' ? 'text-red-500' : (theme === 'dark' ? 'text-slate-300' : 'text-slate-800')}`}>
                      Pokémon Pocket
                    </span>
                    <span className="text-[10px] text-slate-500 leading-snug mt-1">
                      Formato dinâmico de 20 cartas para o TCG Pocket mobile.
                    </span>
                  </button>
                </div>
              </div>

              {/* Deck prompt */}
              <div className="space-y-1.5">
                <label className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Descreva o seu Deck Ideal
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ex: Um deck focado no Charizard ex focado em dar muito dano rapidamente com aceleração de cartas de treinador como Arven e Patusca."
                  rows={4}
                  className={`w-full p-3 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 ${
                    theme === 'dark'
                      ? 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
                      : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                  }`}
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}>
                    Sugestões Rápidas:
                  </span>
                  {['Gyarados agressivo', 'Mewtwo controle', 'Venusaur Tanker'].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setPrompt(`Deck de ${tag} no formato ${format}`)}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors ${
                        theme === 'dark'
                          ? 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
                          : 'bg-slate-100 border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerateDeck}
                disabled={generating || !prompt.trim()}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-red-600/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando Sinergias...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Criar Deck com IA
                  </>
                )}
              </button>

              {builderError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{builderError}</span>
                </div>
              )}
            </div>

            {/* Informational Guidelines Card */}
            <div className={`p-5 rounded-2xl border space-y-3 ${
              theme === 'dark' ? 'bg-slate-900/50 border-slate-800/80 text-slate-400' : 'bg-slate-50 border-slate-200/80 text-slate-600'
            }`}>
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-red-500" />
                <span className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Como Funciona?</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Nossa IA analisa as cartas do banco de dados oficial, calculando a curva de evolução dos Pokémons, o custo de energia dos ataques, e os melhores suportes de Treinador para maximizar a consistência do seu deck no formato escolhido.
              </p>
            </div>
          </div>

          {/* Result Column */}
          <div className="lg:col-span-7">
            {generating ? (
              <div className={`p-12 rounded-2xl border flex flex-col items-center justify-center min-h-[400px] text-center space-y-6 ${
                theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                {/* Immersive Spinning Pokéball */}
                <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center border-4 border-white shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-spin">
                  <div className="w-4 h-4 rounded-full bg-white shadow-[0_0_5px_white]" />
                </div>
                <div className="space-y-2">
                  <h4 className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    Sincronizando Banco de Dados Pokémon TCG
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Aguarde enquanto a IA estrutura a estratégia do seu deck, calcula a proporção de energias e filtra os melhores itens de treinador...
                  </p>
                </div>
              </div>
            ) : generatedDeck ? (
              <div className={`rounded-2xl border overflow-hidden ${
                theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              } shadow-lg`}>
                {/* Header of Generated Deck */}
                <div className={`p-6 border-b ${
                  theme === 'dark' ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
                } flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`}>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-red-500 text-white">
                        {generatedDeck.format === 'Rotation' 
                          ? 'Rotação' 
                          : generatedDeck.format === 'Expanded' 
                            ? 'Expandido' 
                            : generatedDeck.format}
                      </span>
                      <h3 className={`text-base font-black ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {generatedDeck.name}
                      </h3>
                    </div>
                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      {generatedDeck.description}
                    </p>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleSaveDeck}
                      disabled={isSaved}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        isSaved
                          ? 'bg-emerald-600 text-white'
                          : 'bg-red-600 hover:bg-red-500 text-white'
                      }`}
                    >
                      {isSaved ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Salvo nos Meus Decks
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          Importar Deck
                        </>
                      )}
                    </button>

                    {isSaved && (
                      <button
                        onClick={() => setActiveSubTab('coach')}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex items-center gap-1.5 transition-all"
                      >
                        Treinar Deck
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Cards List Grouped */}
                <div className="p-6 space-y-6">
                  {Object.entries(groupedGeneratedCards).map(([category, cards]) => (
                    <div key={category} className="space-y-3">
                      <h4 className={`text-xs font-bold tracking-wider uppercase border-b pb-1 ${
                        theme === 'dark' ? 'text-slate-400 border-slate-800' : 'text-slate-500 border-slate-200'
                      }`}>
                        {category === 'Pokemon' ? 'Pokémon' : category === 'Trainer' ? 'Treinadores' : category === 'Energy' ? 'Energias' : category} ({cards.reduce((sum, c) => sum + c.quantity, 0)})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {cards.map((card) => (
                          <div
                            key={card.cardId}
                            onClick={() => {
                              if (card.meta && !card.meta.id.startsWith('temp-')) {
                                onSelectCard(card.meta);
                              }
                            }}
                            className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                              theme === 'dark'
                                ? 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                                : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Small card image or placeholder */}
                              {card.meta.image ? (
                                <img
                                  src={card.meta.image}
                                  alt={card.meta.name}
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const sibling = e.currentTarget.nextElementSibling;
                                    if (sibling) {
                                      sibling.classList.remove('hidden');
                                      sibling.classList.add('flex');
                                    }
                                  }}
                                  className="w-10 h-14 object-cover rounded shadow-sm shrink-0"
                                />
                              ) : null}
                              <div className={`w-10 h-14 rounded bg-slate-800 flex items-center justify-center shrink-0 ${card.meta.image ? 'hidden' : 'flex'}`}>
                                <Layers className="w-5 h-5 text-slate-600" />
                              </div>
                              <div className="min-w-0">
                                <p className={`text-xs font-bold truncate ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                                  {card.meta.name}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                  {card.meta.setName} • {card.meta.localId}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-red-500/10 text-red-500 font-mono">
                              {card.quantity}x
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={`p-8 rounded-2xl border border-dashed flex flex-col items-center justify-center min-h-[400px] text-center space-y-4 ${
                theme === 'dark' ? 'bg-slate-950/20 border-slate-800 text-slate-500' : 'bg-slate-50/50 border-slate-200 text-slate-400'
              }`}>
                <Sparkles className="w-10 h-10 text-slate-600" />
                <div className="space-y-1">
                  <h4 className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    Nenhum Deck Gerado
                  </h4>
                  <p className="text-[11px] max-w-xs leading-relaxed">
                    Escreva o que você gostaria no seu deck no painel esquerdo e clique em <b>Criar Deck com IA</b> para ver a mágica acontecer!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: AI DECK TRAINING COACH */}
      {activeSubTab === 'coach' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Deck selection sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className={`p-6 rounded-2xl border space-y-4 ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex items-center gap-2 border-b pb-2">
                <Brain className="w-4 h-4 text-red-500" />
                <h3 className={`text-xs font-bold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  Deck para Treinamento
                </h3>
              </div>

              {/* Deck selector dropdown */}
              <div className="space-y-1.5">
                <label className={`text-[10px] font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                  Selecione um Deck Salvo:
                </label>
                {decks.length === 0 ? (
                  <div className={`p-3 rounded-xl border text-center text-xs ${
                    theme === 'dark' ? 'bg-slate-950 border-slate-800 text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}>
                    Você não possui nenhum deck criado. Crie um deck na aba anterior ou no construtor de decks!
                  </div>
                ) : (
                  <select
                    value={selectedDeckId}
                    onChange={(e) => {
                      setSelectedDeckId(e.target.value);
                      setCoachChat([]); // Clear chat when switching deck
                    }}
                    className={`w-full p-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 ${
                      theme === 'dark'
                        ? 'bg-slate-950 border-slate-800 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    {decks.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.cards.reduce((sum, c) => sum + c.quantity, 0)} cartas)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Selected Deck Overview Info */}
              {activeDeckForCoaching && (
                <div className={`p-4 rounded-xl space-y-2 ${
                  theme === 'dark' ? 'bg-slate-950/60' : 'bg-slate-50'
                }`}>
                  <h4 className={`text-xs font-bold truncate ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                    {activeDeckForCoaching.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-snug line-clamp-3">
                    {activeDeckForCoaching.description || 'Deck sem descrição.'}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase pt-1 border-t border-slate-800/40">
                    <span>Formato: {activeDeckForCoaching.format || 'Standard'}</span>
                    <span>{activeDeckForCoaching.cards.reduce((sum, c) => sum + c.quantity, 0)} Cartas</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Coach Advice Widget */}
            <div className={`p-5 rounded-2xl border space-y-3 ${
              theme === 'dark' ? 'bg-slate-900/50 border-slate-800/80 text-slate-400' : 'bg-slate-50 border-slate-200/80 text-slate-600'
            }`}>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className={`text-xs font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>Dicas do Professor Oak</span>
              </div>
              <ul className="text-[10px] space-y-2 list-disc list-inside">
                <li>Sempre monte sua estratégia pensando na primeira e segunda mão inicial.</li>
                <li>Os suportes de treinadores (Trainer Cards) garantem a velocidade do seu deck.</li>
                <li>Consulte sinergias específicas usando as perguntas rápidas abaixo.</li>
              </ul>
            </div>
          </div>

          {/* Chat Interface Column */}
          <div className="lg:col-span-8 flex flex-col h-[520px] rounded-2xl border overflow-hidden shadow-lg"
               style={{ backgroundColor: theme === 'dark' ? '#0e1422' : '#ffffff', borderColor: theme === 'dark' ? '#1e293b' : '#e2e8f0' }}>
            {/* Coach Header */}
            <div className={`p-4 border-b flex items-center justify-between ${
              theme === 'dark' ? 'bg-slate-950/60 border-slate-800/60' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center font-bold text-amber-500 text-sm">
                  👴🏻
                </div>
                <div>
                  <h3 className={`text-xs font-black ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                    Professor Carvalho
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Elite TCG Coach & Mentor
                  </p>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Online
              </div>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Initial message */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0 text-xs">
                  👴🏻
                </div>
                <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                  theme === 'dark' ? 'bg-slate-900 text-slate-200' : 'bg-slate-100 text-slate-800'
                }`}>
                  Olá, meu caro treinador! Sou o Professor Carvalho, e estou aqui para guiá-lo no universo do Pokémon TCG.
                  <br />
                  <br />
                  Selecione um dos seus decks ao lado e utilize os <b>chips de sugestões rápidas</b> abaixo para entender a estratégia, combos ideais e como jogar! Ou simplesmente envie uma dúvida no chat.
                </div>
              </div>

              {/* Conversational log */}
              {coachChat.map((chat, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 ${chat.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs ${
                    chat.role === 'user'
                      ? 'bg-red-500/15 text-red-500'
                      : 'bg-amber-500/15 text-amber-500'
                  }`}>
                    {chat.role === 'user' ? '👤' : '👴🏻'}
                  </div>
                  <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    chat.role === 'user'
                      ? 'bg-red-600 text-white'
                      : (theme === 'dark' ? 'bg-slate-900 text-slate-200' : 'bg-slate-100 text-slate-800')
                  }`}>
                    {chat.role === 'user' ? (
                      <span className="whitespace-pre-line">{chat.message}</span>
                    ) : (
                      <div className="markdown-body space-y-2">
                        <Markdown>{chat.message}</Markdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {coachLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0 text-xs">
                    👴🏻
                  </div>
                  <div className={`p-3.5 rounded-2xl flex items-center gap-2 text-xs text-slate-400 ${
                    theme === 'dark' ? 'bg-slate-900' : 'bg-slate-100'
                  }`}>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Professor Carvalho está analisando o deck...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Prompts Panel */}
            {activeDeckForCoaching && (
              <div className={`p-3 border-t flex flex-wrap gap-2 overflow-x-auto select-none ${
                theme === 'dark' ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
              }`}>
                {quickPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    disabled={coachLoading}
                    onClick={() => handleSendCoachMessage(p.query)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold border transition-colors ${
                      theme === 'dark'
                        ? 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:text-white text-slate-300'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:text-slate-900 text-slate-600'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            {/* Chat Input Bar */}
            <div className={`p-3 border-t flex items-center gap-2 ${
              theme === 'dark' ? 'bg-slate-950/80 border-slate-800/80' : 'bg-white border-slate-200'
            }`}>
              <input
                type="text"
                value={coachInput}
                onChange={(e) => setCoachInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSendCoachMessage();
                }}
                disabled={!selectedDeckId || coachLoading}
                placeholder={selectedDeckId ? "Pergunte ao Professor Carvalho..." : "Selecione ou crie um deck para começar"}
                className={`flex-1 p-2.5 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 ${
                  theme === 'dark'
                    ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'
                }`}
              />
              <button
                onClick={() => handleSendCoachMessage()}
                disabled={!selectedDeckId || !coachInput.trim() || coachLoading}
                className="p-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white transition-all disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
