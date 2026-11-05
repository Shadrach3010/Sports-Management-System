-- Custom staff accounts are provisioned in public.users. The old manual Auth
-- metadata importer no longer matches the application-owned identity model.
drop function if exists private.provision_marked_staff();
