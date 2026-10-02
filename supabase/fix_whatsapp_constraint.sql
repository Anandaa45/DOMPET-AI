-- Fix WhatsApp connection duplicate key error
-- Drop UNIQUE constraint and NOT NULL from whatsapp_number

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_whatsapp_number_key;
ALTER TABLE public.profiles ALTER COLUMN whatsapp_number DROP NOT NULL;
