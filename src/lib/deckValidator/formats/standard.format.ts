import { FormatRuleset } from '../types';

export const STANDARD_LEGAL_REPRINTS = [
  'ultra ball', 'ultra bola',
  'nest ball', 'bola ninho',
  'super rod', 'supercana',
  'switch', 'substituição',
  'boss\'s orders', 'ordens do chefe', 'ordens do chefe (giovanni)',
  'professor\'s research', 'pesquisa de professores',
  'rare candy', 'doce raro',
  'pokégear 3.0', 'pokébola 3.0',
  'energy retrieval', 'recuperação de energia',
  'energy search', 'busca de energia',
  'lost vacuum', 'vácuo perdido',
  'iono', 'arven', 'super poção', 'super potion',
  'double turbo energy', 'energia turbo dupla',
  'buddy-buddy poffin', 'poffin amigo',
  'earthen vessel', 'recipiente terrestre',
  'counter catcher', 'pegador de contra-ataque',
  'town store', 'loja da cidade',
  'collapsed stadium', 'estádio colapsado',
  'artazon', 'mesagoza',
  'bravery charm', 'pingente de bravura',
  'tm: evolution', 'máquina técnica: evolução',
  'technical machine: evolution', 'máquina técnica: evolução',
  'pal pad', 'bloco de amigos',
  'crushing hammer', 'martelo esmagador',
  'potion', 'poção',
  'energy switch', 'substituição de energia',
  'judge', 'juiz',
  'jacq', 'jacques'
];

export const StandardFormat: FormatRuleset = {
  id: 'Standard',
  name: 'Standard (Padrão Oficial)',
  deckSize: 60,
  maxCopiesPerCard: 4,
  allowedRegulationMarks: ['F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'],
  allowedSeries: ['sv', 'me'],
  legalReprints: STANDARD_LEGAL_REPRINTS,
  maxAceSpec: 1,
  maxRadiant: 1,
  maxPrismStar: 1,
  requiresBasicPokemon: true,
};

export const RotationFormat: FormatRuleset = {
  ...StandardFormat,
  id: 'Rotation',
  name: 'Rotação Padrão (Scarlet & Violet)',
};

export const ExpandedFormat: FormatRuleset = {
  id: 'Expanded',
  name: 'Expanded (Expandido)',
  deckSize: 60,
  maxCopiesPerCard: 4,
  maxAceSpec: 1,
  maxRadiant: 1,
  maxPrismStar: 1,
  requiresBasicPokemon: true,
};

export const PocketFormat: FormatRuleset = {
  id: 'Pocket',
  name: 'Pokémon TCG Pocket',
  deckSize: 20,
  maxCopiesPerCard: 2,
  requiresBasicPokemon: true,
};
