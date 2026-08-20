import { MarketplaceUrlService } from '../../services/pricing/MarketplaceUrlService';
import { PokemonCard } from '../../types';

export function runMarketplaceUrlTests() {
  const results: { name: string; passed: boolean; message?: string }[] = [];

  const testHoOh: PokemonCard = {
    id: 'sv04.5-010',
    localId: '10',
    name: 'Ho-Oh',
    setId: 'sv04.5',
    setName: 'Destinos de Paldea',
    setTotalCards: 86,
    language: 'pt',
  };

  const testBulbasaur: PokemonCard = {
    id: 'sv03.5-001',
    localId: '1',
    name: 'Bulbasaur',
    setId: 'sv03.5',
    setName: '151',
    setTotalCards: 165,
    language: 'pt',
  };

  const testCharizard: PokemonCard = {
    id: 'sv03.5-199',
    localId: '199',
    name: 'Charizard ex',
    setId: 'sv03.5',
    setName: '151',
    setTotalCards: 165,
    language: 'pt',
  };

  const testPikachuSlash: PokemonCard = {
    id: 'sv03.5-025',
    localId: '25/165',
    name: 'Pikachu',
    setId: 'sv03.5',
    setName: '151',
    setTotalCards: 165,
    language: 'pt',
  };

  // Test 1: Ho-Oh (010/086) - 3 digits on BOTH number and total
  const hoOhQuery = MarketplaceUrlService.formatLigaPokemonQuery(testHoOh);
  const hoOhExpected = 'Ho-Oh (010/086)';
  results.push({
    name: 'Ho-Oh query formats with 3 digits as "Ho-Oh (010/086)"',
    passed: hoOhQuery === hoOhExpected,
    message: `Expected "${hoOhExpected}", got "${hoOhQuery}"`,
  });

  // Test 2: Bulbasaur (001/165)
  const bulbaQuery = MarketplaceUrlService.formatLigaPokemonQuery(testBulbasaur);
  const bulbaExpected = 'Bulbasaur (001/165)';
  results.push({
    name: 'Bulbasaur query formats as "Bulbasaur (001/165)"',
    passed: bulbaQuery === bulbaExpected,
    message: `Expected "${bulbaExpected}", got "${bulbaQuery}"`,
  });

  // Test 3: Charizard ex (199/165)
  const charQuery = MarketplaceUrlService.formatLigaPokemonQuery(testCharizard);
  const charExpected = 'Charizard ex (199/165)';
  results.push({
    name: 'Charizard ex query formats as "Charizard ex (199/165)"',
    passed: charQuery === charExpected,
    message: `Expected "${charExpected}", got "${charQuery}"`,
  });

  // Test 4: Pikachu (025/165) with unpadded slash "25/165"
  const pikaQuery = MarketplaceUrlService.formatLigaPokemonQuery(testPikachuSlash);
  const pikaExpected = 'Pikachu (025/165)';
  results.push({
    name: 'Pikachu unpadded slash "25/165" formats as "Pikachu (025/165)"',
    passed: pikaQuery === pikaExpected,
    message: `Expected "${pikaExpected}", got "${pikaQuery}"`,
  });

  // Test 5: Liga Pokemon URL encoding for Ho-Oh
  const hoOhUrl = MarketplaceUrlService.getLigaPokemonUrl(testHoOh);
  results.push({
    name: 'Liga Pokémon URL contains encoded Ho-Oh (010/086)',
    passed: hoOhUrl.includes('Ho-Oh%20(010%2F086)') || hoOhUrl.includes('Ho-Oh%20(010/086)'),
    message: `URL was: ${hoOhUrl}`,
  });

  // Test 6: MYPCards URL product direct routing for Bulbasaur
  const bulbaMypUrl = MarketplaceUrlService.getMypCardsUrl(testBulbasaur);
  results.push({
    name: 'MYPCards URL contains direct product URL for Bulbasaur',
    passed: bulbaMypUrl === 'https://mypcards.com/pokemon/produto/205874/bulbasaur',
    message: `URL was: ${bulbaMypUrl}`,
  });

  return results;
}
