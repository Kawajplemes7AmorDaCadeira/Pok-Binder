# Pokémon TCG Catalog Checklist

## Expansões
- [x] API retorna múltiplas expansões
- [x] Expansões 2025 aparecem
- [x] Expansões 2026 aparecem
- [x] Série Megaevolução aparece (Megaevolução, Fogo Fantasmagórico, Heróis Excelsos, Equilíbrio Perfeito, Caos Ascendente)
- [x] Expansões são ordenadas corretamente (padrão: mais recentes primeiro)
- [x] Novas expansões podem ser adicionadas sem alterar código manualmente

## Cartas
- [x] Cada carta possui ID único
- [x] Número correto (preservando formato e ordenação numérica)
- [x] Expansão correta
- [x] Imagem correta
- [x] Tipo correto
- [x] Raridade correta quando disponível
- [x] Idioma identificado

## Fichário
- [x] Todas as cartas da expansão aparecem
- [x] Cartas secretas aparecem
- [x] Ordem numérica correta (001, 002, 003... 182, 183...)
- [x] Cartas possuídas aparecem com quantidade
- [x] Cartas faltantes aparecem com slot no fichário
- [x] Progresso funciona em porcentagem real

## Decks
- [x] Busca utiliza catálogo completo de todas as expansões
- [x] É possível utilizar cartas de expansões diferentes no mesmo deck
- [x] Deck utiliza a impressão correta (diferenciando por ID e expansão)
- [x] Quantidade possuída funciona
- [x] Quantidade faltante funciona

## Sincronização
- [x] Detecta novas expansões
- [x] Atualiza expansões existentes
- [x] Não apaga coleção do usuário (`collection_items`)
- [x] Não apaga decks (`decks`)
- [x] Registra data da última atualização (ex: 05/08/2026 14:32)
- [x] Possui tratamento de erro e status por expansão

---

## Checklist Específico 2025 / 2026
- [x] **2025**
  - [x] Rivais Predestinados (`sv09.5`)
  - [x] Megaevolução (`sv09` / `me01`)
  - [x] Megaevolução — Fogo Fantasmagórico (`me02`)
  - [x] Evoluções Prismáticas (`sv08.5`)
  - [x] Amigos de Jornada (`sv10`)
- [x] **2026**
  - [x] Megaevolução — Heróis Excelsos (`me03`)
  - [x] Megaevolução — Equilíbrio Perfeito (`me04`)
  - [x] Megaevolução — Caos Ascendente (`me05`)
