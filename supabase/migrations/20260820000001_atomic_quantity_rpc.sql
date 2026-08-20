-- ==============================================================================
-- POKÉBINDER TCG - ATOMIC QUANTITY INCREMENT & DECREMENT RPC FUNCTIONS
-- Migration Version: 20260820000001_atomic_quantity_rpc.sql
-- ==============================================================================

-- Atomic Increment Collection Quantity RPC
create or replace function public.increment_collection_quantity(
  p_card_id text,
  p_variant text default 'normal',
  p_condition text default 'near_mint',
  p_language text default 'pt',
  p_delta integer default 1,
  p_notes text default null,
  p_item_id uuid default null
)
returns public.collection_items as $$
declare
  v_user_id uuid;
  v_result public.collection_items;
  v_new_id uuid;
begin
  -- Secure auth check
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: must be logged in to increment quantity';
  end if;

  v_new_id := coalesce(p_item_id, gen_random_uuid());

  -- Upsert with atomic increment and reviving soft-deleted items if any
  insert into public.collection_items (
    id,
    user_id,
    card_id,
    variant,
    condition,
    language,
    quantity,
    notes,
    deleted_at,
    updated_at
  ) values (
    v_new_id,
    v_user_id,
    p_card_id,
    coalesce(p_variant, 'normal'),
    coalesce(p_condition, 'near_mint'),
    coalesce(p_language, 'pt'),
    greatest(1, p_delta),
    p_notes,
    null,
    now()
  )
  on conflict (user_id, card_id, variant, condition, language)
  do update set
    quantity = public.collection_items.quantity + excluded.quantity,
    notes = coalesce(excluded.notes, public.collection_items.notes),
    deleted_at = null,
    updated_at = now()
  returning * into v_result;

  return v_result;
end;
$$ language plpgsql security definer;

-- Atomic Decrement Collection Quantity RPC (soft deletes when reaches 0)
create or replace function public.decrement_collection_quantity(
  p_card_id text,
  p_variant text default 'normal',
  p_condition text default 'near_mint',
  p_language text default 'pt',
  p_delta integer default 1
)
returns public.collection_items as $$
declare
  v_user_id uuid;
  v_result public.collection_items;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Unauthorized: must be logged in to decrement quantity';
  end if;

  update public.collection_items
  set
    quantity = greatest(0, quantity - coalesce(p_delta, 1)),
    deleted_at = case when quantity - coalesce(p_delta, 1) <= 0 then now() else null end,
    updated_at = now()
  where
    user_id = v_user_id
    and card_id = p_card_id
    and variant = coalesce(p_variant, 'normal')
    and condition = coalesce(p_condition, 'near_mint')
    and language = coalesce(p_language, 'pt')
  returning * into v_result;

  return v_result;
end;
$$ language plpgsql security definer;
