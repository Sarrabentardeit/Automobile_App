-- Statut RDV : prevu | honore | annule | non_honore
ALTER TABLE "CalendarAssignment" ADD COLUMN IF NOT EXISTS "statut" TEXT NOT NULL DEFAULT 'prevu';
