import { GoogleGenAI, Type } from '@google/genai';
import { AIProvider, GenerateDeckOptions, CoachChatOptions } from './aiProvider.interface';
import { AIProviderError } from '../errors/AppError';

export class GeminiProvider implements AIProvider {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in environment');
    }

    this.ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  private async generateWithFallback(params: { contents: any; config: any }, primaryModel = 'gemini-3.7-flash') {
    const modelsToTry = [primaryModel, 'gemini-3.1-flash-lite', 'gemini-3.7-flash'];
    let lastError: any = null;

    for (let attempt = 0; attempt < modelsToTry.length; attempt++) {
      const modelName = modelsToTry[attempt];
      try {
        console.log(`[GeminiProvider] Attempt ${attempt + 1}: Generating with model '${modelName}'`);
        const response = await this.ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (err: any) {
        console.warn(`[GeminiProvider] Model '${modelName}' failed. Error:`, err.message || err);
        lastError = err;
        // Exponential backoff
        const delay = 600 * Math.pow(1.5, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new AIProviderError(lastError?.message || 'All Gemini model generation attempts failed');
  }

  public async generateDeck(options: GenerateDeckOptions): Promise<any> {
    const { prompt, format, lang } = options;

    const systemInstruction = `You are a legendary master Pokémon TCG Deck Builder.
Generate a cohesive and highly competitive deck based on the user's request.
You must adhere strictly to the format: Standard (exactly 60 cards), Expanded (exactly 60 cards), Rotation (exactly 60 cards, standard-legal rotation with no banned/prohibited cards), or Pocket (exactly 20 cards).

Standard format rules (CRITICAL - READ CAREFULLY):
- Exactly 60 cards.
- Usually around 12-20 Pokémons, 30-40 Trainers, and 10-15 Energies.
- Max 4 copies of any card with the same name (except basic energies).
- MANDATORY ROTATION RULE: You are STRICTLY FORBIDDEN from using any cards from old Sword & Shield (ShSh), Sun & Moon, XY, Black & White, or older eras. The current format ONLY allows cards with Regulation Marks F, G, H, I, J or newer (from Scarlet & Violet series). 
- Legacy mechanics like EX (old uppercase, e.g. Mewtwo-EX), Mega Evolution, GX, Tag Team, V, VMAX, VSTAR, and Radiant cards that DO NOT have Regulation Mark F/G/H/I/J are COMPLETELY BANNED.
- DO NOT use Quick Ball (Bola Rápida), Evolution Incense (Incenso de Evolução), Marnie, Escape Rope (Corda de Fuga), Path to the Peak (Caminho para o Pico), Scoop Up Net, or Professor's Letter in Standard format. Instead, use Nest Ball (Bola Ninho), Ultra Ball (Ultra Bola), Iono, Switch (Substituição), Town Store (Loja da Cidade), or Earthen Vessel (Recipiente Terrestre).

Expanded (Expandido) format rules:
- Exactly 60 cards.
- Allowed cards are standard rotation cards plus many classic/expanded cards from Black & White up to current series. This format has a very high power level and complex combos.
- Max 4 copies of any card with the same name (except basic energies).

Rotation (Rotação / Standard Regulation) format rules:
- Exactly 60 cards.
- Cards must only be current standard rotation cards (Scarlet & Violet series / Regulation marks F, G, H onwards) with NO banned, illegal, or prohibited legacy cards whatsoever. Highly consistent.
- Max 4 copies of any card with the same name (except basic energies).
- Follow all Standard format rotation rules above. Do not include old, out-of-rotation cards. All cards MUST be Standard-legal.

Pocket format rules:
- Exactly 20 cards.
- Usually around 8-12 Pokémons and 8-12 Trainers.
- Max 2 copies of any card with the same name.
- Standard basic energies are NOT needed in the list because of the energy zone.

LANGUAGE RULE:
The user's preferred language is: "${lang === 'pt' ? 'Portuguese (pt)' : 'English (en)'}".
You MUST generate the deck's name, description, and ALL card names in this exact language!
For example, if the language is 'pt' (Portuguese), you MUST use Portuguese card names from the official Portuguese card database.
Here are common translations you MUST use if the language is 'pt':
- "Professor's Research" -> "Pesquisa de Professores"
- "Boss's Orders" -> "Ordens do Chefe"
- "Iono" -> "Iono"
- "Ultra Ball" -> "Ultra Bola"
- "Nest Ball" -> "Bola Ninho"
- "Buddy-Buddy Poffin" -> "Poffin Amigo"
- "Switch" -> "Substituição"
- "Super Rod" -> "Supercana"
- "Earthen Vessel" -> "Recipiente Terrestre"
- "Technical Machine: Evolution" -> "Máquina Técnica: Evolução"
- "Arven" -> "Arven"
- "Rare Candy" -> "Doce Raro"
- "Super Scoop Up" -> "Super Recolhida"
- "Super Potion" -> "Super Poção"
- "Basic Grass Energy" -> "Energia de Planta Básica"
- "Basic Fire Energy" -> "Energia de Fogo Básica"
- "Basic Water Energy" -> "Energia de Água Básica"
- "Basic Lightning Energy" -> "Energia de Raio Básica"
- "Basic Psychic Energy" -> "Energia de Psíquica Básica"
- "Basic Fighting Energy" -> "Energia de Luta Básica"
- "Basic Darkness Energy" -> "Energia de Sombria Básica"
- "Basic Metal Energy" -> "Energia de Metal Básica"
- "Basic Dragon Energy" -> "Energia de Dragão Básica"

If the card name is a Pokémon, use its localized name (e.g., 'Scyther', 'Charizard ex', 'Blastoise ex', 'Gyarados', 'Mewtwo ex').

CRITICAL USER REQUEST CAPTURE:
If the user's prompt requests a specific card with certain characteristics (for example: "Lunatone with 110 HP", "Lunatone from set 074/132", "Solrock type Fighting/Guerreiro/Luta", or specific set names/numbers), you MUST design the deck around that card and fill out the 'specificNumber', 'specificType', 'specificHp', and/or 'specificSet' fields in the cards array JSON for that particular card. This ensures our search resolver locates the exact card print.

Do not invent fake card names. Return ONLY real, existing cards from the specified format. You must respond with a JSON object containing the deck's name, description, format, and the cards array.`;

    const response = await this.generateWithFallback({
      contents: `Create a deck based on: "${prompt}". Format: "${format}"`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: 'A thematic name for the deck.'
            },
            description: {
              type: Type.STRING,
              description: 'An analysis explaining how the deck works, its main win conditions, and basic strategy.'
            },
            format: {
              type: Type.STRING,
              description: "Format of the deck: 'Standard', 'Pocket', 'Expanded', or 'Rotation'"
            },
            cards: {
              type: Type.ARRAY,
              description: 'The list of cards in the deck.',
              items: {
                type: Type.OBJECT,
                properties: {
                  name: {
                    type: Type.STRING,
                    description: "Exact card name, e.g., 'Charizard ex' or 'Ultra Ball' or 'Research' or 'Grass Energy'."
                  },
                  quantity: {
                    type: Type.INTEGER,
                    description: 'Quantity in deck (1 to 4).'
                  },
                  category: {
                    type: Type.STRING,
                    description: "The category of the card: 'Pokemon', 'Trainer', or 'Energy'."
                  },
                  specificNumber: {
                    type: Type.STRING,
                    description: "Optional. If the user requested a specific card number or set fraction (e.g. '074/132' or '074' or '74'), extract it here."
                  },
                  specificType: {
                    type: Type.STRING,
                    description: "Optional. If the user requested a specific type or element (e.g. 'Fighting', 'Psychic', 'Luta', 'Guerreiro'), extract it here."
                  },
                  specificHp: {
                    type: Type.STRING,
                    description: "Optional. If the user specified a specific HP value for this card (e.g. '110', '90'), extract it here."
                  },
                  specificSet: {
                    type: Type.STRING,
                    description: "Optional. If the user specified a specific set name or ID (e.g. 'Astral Radiance', 'Crown Zenith', 'Obsidian Flames'), extract it here."
                  }
                },
                required: ['name', 'quantity', 'category']
              }
            }
          },
          required: ['name', 'description', 'format', 'cards']
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new AIProviderError('AI returned an empty response');
    }

    return JSON.parse(responseText.trim());
  }

  public async chatWithCoach(options: CoachChatOptions): Promise<string> {
    const { deckName, deckDescription, cards, message, chatHistory = [] } = options;

    const systemInstruction = `You are Professor Oak, a world-class Pokémon TCG Elite Coach and Mentor.
Your mission is to help players learn how to play their decks at a competitive level, master key matchups, and understand advanced combos.

Be encouraging, educational, and highly detailed. Use clear formatting, lists, and bullet points. You must talk in Portuguese since the user's interface is Portuguese.`;

    const deckContext = `Você está treinando o jogador com o seguinte Deck:
Nome do Deck: ${deckName || 'Deck Customizado'}
Descrição do Deck: ${deckDescription || 'Sem descrição.'}

Lista de Cartas do Deck:
${(cards || []).map((c: any) => `- ${c.quantity}x ${c.meta?.name || c.name} (${c.meta?.category || c.category || 'Carta'})`).join('\n')}

Por favor, use essa lista de cartas como o contexto absoluto do deck do jogador. Quando o jogador perguntar sobre estratégias, combos ou turnos de abertura, analise as cartas deste deck exato e responda de forma ultra-específica com as sinergias possíveis entre elas!`;

    const contents = [
      { role: 'user', parts: [{ text: deckContext }] },
      { role: 'model', parts: [{ text: "Entendido! Sou o Professor Carvalho, seu Coach Elite de Pokémon TCG. Analisei as cartas do seu deck e estou pronto para lhe ensinar todas as estratégias, turnos ideais, combos e como vencer o meta-jogo atual. O que gostaria de aprender primeiro sobre este deck?" }] },
      ...chatHistory.map((h: any) => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.message }]
      })),
      { role: 'user', parts: [{ text: message }] }
    ];

    const response = await this.generateWithFallback({
      contents,
      config: {
        systemInstruction
      }
    });

    return response.text || '';
  }
}
