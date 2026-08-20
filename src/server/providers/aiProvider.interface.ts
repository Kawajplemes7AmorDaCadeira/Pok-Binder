import { CardLanguage } from '../../types';

export interface GenerateDeckOptions {
  prompt: string;
  format: 'Standard' | 'Expanded' | 'Rotation' | 'Pocket';
  lang: CardLanguage;
}

export interface CoachChatOptions {
  deckName?: string;
  deckDescription?: string;
  cards: any[];
  message: string;
  chatHistory?: Array<{ role: 'user' | 'model'; message: string }>;
}

export interface AIProvider {
  generateDeck(options: GenerateDeckOptions): Promise<any>;
  chatWithCoach(options: CoachChatOptions): Promise<string>;
}
