import { DeckService } from '../services/deck/deckService';
import { DeckRepository } from '../database/repositories/DeckRepository';
import { CollectionRepository } from '../database/repositories/CollectionRepository';
import { CollectionService } from '../services/collection/collectionService';

async function runPhase4Tests() {
  console.log('=== RUNNING FASE 4 (DECKS & VALIDAÇÃO DE REGRAS) AUTOMATED TESTS ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // Test 1: Deck CRUD & Duplication
  try {
    await DeckRepository.bulkSave([]); // clear

    const deck1 = await DeckService.saveDeck({
      name: 'Charizard ex Turbo',
      description: 'Deck competitivo Standard',
      format: 'Standard',
      cards: [
        { cardPrintId: 'PKB:PRINT:pt:sv03.5:006', quantity: 4 },
        { cardPrintId: 'PKB:PRINT:pt:sv03.5:001', quantity: 4 },
        { cardPrintId: 'PKB:PRINT:pt:energy:fire', quantity: 10 },
      ],
    });
    assert(deck1.id !== undefined, `Deck created with ID: ${deck1.id}`);

    const dup = await DeckService.duplicateDeck(deck1.id);
    assert(dup !== null && dup.name.includes('(Cópia)'), `Deck duplicated: ${dup?.name}`);

    const allDecks = await DeckService.getDecks();
    assert(allDecks.length === 2, `Total active decks verified: ${allDecks.length}`);

    await DeckService.deleteDeck(dup!.id);
    const remainingDecks = await DeckService.getDecks();
    assert(remainingDecks.length === 1, 'Deleted duplicated deck successfully');
  } catch (err) {
    assert(false, `Deck CRUD test failed: ${err}`);
  }

  // Test 2: Validation Rules (4-copy limit, 60-card limit, ACE SPEC, Basic Energy exemption)
  try {
    const validDeck = {
      id: 'd1',
      name: 'Standard Deck',
      format: 'Standard',
      cards: [
        { cardPrintId: 'PKB:PRINT:pt:sv03.5:006', quantity: 4 }, // 4 copies max
        { cardPrintId: 'PKB:PRINT:pt:energy:fire', quantity: 15 }, // Basic energy exempted
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const validation1 = DeckService.validateDeck(validDeck, {
      'PKB:PRINT:pt:sv03.5:006': { name: 'Charizard ex' },
      'PKB:PRINT:pt:energy:fire': { name: 'Basic Fire Energy', isBasicEnergy: true },
    });

    assert(validation1.errors.length === 0, 'No errors for valid 4-copy Charizard + 15 Basic Energy');
    assert(validation1.warnings.length === 1, 'Warning logged for < 60 total cards (19 cards)');

    // Invalid deck exceeding 4 copies of a non-basic energy card
    const invalidDeck = {
      ...validDeck,
      cards: [{ cardPrintId: 'PKB:PRINT:pt:sv03.5:006', quantity: 5 }],
    };

    const validation2 = DeckService.validateDeck(invalidDeck, {
      'PKB:PRINT:pt:sv03.5:006': { name: 'Charizard ex' },
    });

    assert(validation2.errors.length === 1 && validation2.errors[0].includes('máximo permitido: 4'), 'Error caught when card has 5 copies');
  } catch (err) {
    assert(false, `Validation rules test failed: ${err}`);
  }

  // Test 3: Collection Availability Check
  try {
    await CollectionRepository.clearAll();

    // User owns 3 Charizards in collection
    await CollectionService.addItem({
      cardPrintId: 'PKB:PRINT:pt:sv03.5:006',
      quantity: 3,
    });

    const deckNeeded = {
      id: 'd2',
      name: 'Charizard Test',
      format: 'Standard',
      cards: [
        { cardPrintId: 'PKB:PRINT:pt:sv03.5:006', quantity: 4 }, // Deck needs 4 Charizards
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const availability = await DeckService.checkCollectionAvailability(deckNeeded);
    assert(availability.isFullyOwned === false, 'Deck recognized as not fully owned');
    assert(availability.missingCards.length === 1 && availability.missingCards[0].missingQuantity === 1, 'Missing 1 copy identified');
  } catch (err) {
    assert(false, `Collection availability test failed: ${err}`);
  }

  // Test 4: Deck Statistics (Categories & Pokémon Types)
  try {
    const deckStatsTest = {
      id: 'd3',
      name: 'Stats Test',
      format: 'Standard',
      cards: [
        { cardPrintId: 'PKB:PRINT:pt:pika', quantity: 2 },
        { cardPrintId: 'PKB:PRINT:pt:nestball', quantity: 4 },
        { cardPrintId: 'PKB:PRINT:pt:energy', quantity: 10 },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const stats = DeckService.calculateDeckStats(deckStatsTest, {
      'PKB:PRINT:pt:pika': { supertype: 'Pokémon', types: ['Lightning'] },
      'PKB:PRINT:pt:nestball': { supertype: 'Trainer' },
      'PKB:PRINT:pt:energy': { supertype: 'Energy' },
    });

    assert(stats.pokemonCount === 2, `Pokémon count verified: ${stats.pokemonCount}`);
    assert(stats.trainerCount === 4, `Trainer count verified: ${stats.trainerCount}`);
    assert(stats.energyCount === 10, `Energy count verified: ${stats.energyCount}`);
    assert(stats.typeDistribution['Lightning'] === 2, `Lightning type distribution verified: ${stats.typeDistribution['Lightning']}`);
  } catch (err) {
    assert(false, `Deck statistics test failed: ${err}`);
  }

  console.log(`\n=== FASE 4 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED ===`);
  if (failed > 0) process.exit(1);
}

runPhase4Tests();
