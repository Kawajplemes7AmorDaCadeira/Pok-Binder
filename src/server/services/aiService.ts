import { AIProvider } from '../providers/aiProvider.interface';
import { GeminiProvider } from '../providers/geminiProvider';
import { CardResolverService } from './cardResolverService';
import { CardLanguage } from '../../types';
import { BadRequestError } from '../errors/AppError';

export interface GenerateDeckPayload {
  prompt: string;
  format?: string;
  lang?: string;
}

export interface CoachChatPayload {
  deckName?: string;
  deckDescription?: string;
  cards: any[];
  message: string;
  chatHistory?: Array<{ role: 'user' | 'model'; message: string }>;
}

export class AIService {
  private provider: AIProvider;

  constructor(provider?: AIProvider) {
    this.provider = provider || new GeminiProvider();
  }

  public async generateDeck(payload: GenerateDeckPayload) {
    const { prompt, format, lang = 'pt' } = payload;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new BadRequestError('Prompt is required and cannot be empty');
    }

    let targetFormat: 'Standard' | 'Pocket' | 'Expanded' | 'Rotation' = 'Standard';
    if (format === 'Pocket') targetFormat = 'Pocket';
    else if (format === 'Expanded') targetFormat = 'Expanded';
    else if (format === 'Rotation') targetFormat = 'Rotation';

    const normalizedLang = (lang === 'en' ? 'en' : 'pt') as CardLanguage;

    // 1. Generate structured deck via AI Provider
    const rawDeck = await this.provider.generateDeck({
      prompt: prompt.trim(),
      format: targetFormat,
      lang: normalizedLang,
    });

    // 2. Resolve every card against canonical database
    const resolvedCards: any[] = [];
    const unresolvedNames: string[] = [];

    const cardsList = Array.isArray(rawDeck.cards) ? rawDeck.cards : [];

    for (const item of cardsList) {
      const resolution = await CardResolverService.resolveCard(item, targetFormat, normalizedLang);
      if (!resolution.resolved) {
        unresolvedNames.push(item.name);
      }
      resolvedCards.push({
        cardId: resolution.cardId,
        quantity: Math.max(1, Math.min(Number(item.quantity) || 1, 4)),
        meta: resolution.meta,
      });
    }

    return {
      success: true,
      name: rawDeck.name || 'Deck Customizado IA',
      description: rawDeck.description || '',
      format: targetFormat,
      cards: resolvedCards,
      unresolvedCount: unresolvedNames.length,
      unresolvedNames,
    };
  }

  public async chatWithCoach(payload: CoachChatPayload) {
    const { message, deckName, deckDescription, cards, chatHistory } = payload;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new BadRequestError('Message is required and cannot be empty');
    }

    const responseText = await this.provider.chatWithCoach({
      message: message.trim(),
      deckName,
      deckDescription,
      cards: Array.isArray(cards) ? cards : [],
      chatHistory: Array.isArray(chatHistory) ? chatHistory : [],
    });

    return {
      success: true,
      response: responseText,
    };
  }
}
