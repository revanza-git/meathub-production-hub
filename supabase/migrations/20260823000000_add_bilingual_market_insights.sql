-- Preserve title/body as the Bahasa Indonesia default while adding an explicit
-- English version. Columns remain nullable so legacy published notes continue
-- to render; the MCP and admin UI require both languages for new drafts.
ALTER TABLE public.market_insights
  ADD COLUMN title_en text,
  ADD COLUMN body_en text;

-- Keep legacy published rows readable, while requiring every future publish
-- operation to have complete copy in both languages.
ALTER TABLE public.market_insights
  ADD CONSTRAINT market_insights_published_bilingual_chk
  CHECK (
    status <> 'published'
    OR (
      NULLIF(btrim(title), '') IS NOT NULL
      AND NULLIF(btrim(body), '') IS NOT NULL
      AND NULLIF(btrim(title_en), '') IS NOT NULL
      AND NULLIF(btrim(body_en), '') IS NOT NULL
    )
  ) NOT VALID;

COMMENT ON COLUMN public.market_insights.title IS
  'Bahasa Indonesia insight title (default public language).';
COMMENT ON COLUMN public.market_insights.body IS
  'Bahasa Indonesia insight body (default public language).';
COMMENT ON COLUMN public.market_insights.title_en IS
  'English translation of the insight title.';
COMMENT ON COLUMN public.market_insights.body_en IS
  'English translation of the insight body.';
