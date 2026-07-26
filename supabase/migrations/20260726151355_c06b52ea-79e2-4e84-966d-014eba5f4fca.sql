UPDATE public.organizations
SET legal_name = 'MEATHUB Platform',
    display_name = 'MEATHUB Platform'
WHERE type = 'INTERNAL'
  AND legal_name = 'SBMEAT Platform';