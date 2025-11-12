-- Create table for allowed owners (emails authorized by super admin)
CREATE TABLE IF NOT EXISTS allowed_owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  added_by TEXT NOT NULL, -- Super admin who added this email
  status TEXT NOT NULL DEFAULT 'pending', -- pending, activated, disabled
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  activated_at TIMESTAMP WITH TIME ZONE,
  user_id TEXT -- Firebase UID after activation
);

-- Create index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_allowed_owners_email ON allowed_owners(email);
CREATE INDEX IF NOT EXISTS idx_allowed_owners_status ON allowed_owners(status);

-- Insert existing owners from Firebase (add your super admin email here)
-- You'll need to add emails manually for existing owners
-- Example:
-- INSERT INTO allowed_owners (email, added_by, status, notes) 
-- VALUES 
--   ('owner1@example.com', 'super_admin', 'pending', 'Existing owner - needs activation'),
--   ('owner2@example.com', 'super_admin', 'pending', 'Existing owner - needs activation');

-- For owners who already have Firebase accounts and kablans, mark them as activated
UPDATE allowed_owners ao
SET 
  status = 'activated',
  activated_at = NOW(),
  user_id = k.user_id
FROM kablans k
WHERE LOWER(ao.email) = LOWER(k.user_id) -- Assuming user_id contains email initially
  AND ao.status = 'pending';

-- Verify the table
SELECT * FROM allowed_owners ORDER BY created_at DESC;
