REVOKE ALL ON FUNCTION public.ml_public_catalog_analysis(text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ml_public_catalog_analysis(text, text, text, text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.ml_public_catalog_analysis(text, text, text, text) IS 'Public privacy-safe catalog price, stock, and 90-day RFQ demand aggregates by cut, grade, or origin.';