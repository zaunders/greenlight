-- Add updated_at column to green_lights table
ALTER TABLE green_lights ADD COLUMN updated_at TIMESTAMPTZ;

-- Set default value for existing rows
UPDATE green_lights SET updated_at = created_at WHERE updated_at IS NULL;

-- Add trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_green_lights_updated_at
    BEFORE UPDATE ON green_lights
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 