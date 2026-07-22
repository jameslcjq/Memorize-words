-- Adds backwards-compatible pet color customization.
ALTER TABLE pets ADD COLUMN color TEXT NOT NULL DEFAULT 'natural';
