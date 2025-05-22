-- First add the column as nullable
ALTER TABLE green_lights ADD COLUMN name text;

-- Update any existing records (if any) to have a default name based on their description
UPDATE green_lights SET name = COALESCE(SUBSTRING(description, 1, 50), 'Unnamed Light') WHERE name IS NULL;

-- Now make the column required
ALTER TABLE green_lights ALTER COLUMN name SET NOT NULL; 