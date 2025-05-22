-- Insert dummy users
INSERT INTO auth.users (id, email)
VALUES 
  (uuid_generate_v4(), 'sarah.parker@example.com'),
  (uuid_generate_v4(), 'michael.chen@example.com'),
  (uuid_generate_v4(), 'emma.rodriguez@example.com'),
  (uuid_generate_v4(), 'james.wilson@example.com'),
  (uuid_generate_v4(), 'olivia.brown@example.com'),
  (uuid_generate_v4(), 'noah.garcia@example.com'),
  (uuid_generate_v4(), 'sophia.miller@example.com'),
  (uuid_generate_v4(), 'lucas.taylor@example.com'),
  (uuid_generate_v4(), 'ava.martinez@example.com'),
  (uuid_generate_v4(), 'ethan.anderson@example.com'),
  (uuid_generate_v4(), 'isabella.thomas@example.com'),
  (uuid_generate_v4(), 'mason.jackson@example.com'),
  (uuid_generate_v4(), 'mia.white@example.com'),
  (uuid_generate_v4(), 'liam.harris@example.com'),
  (uuid_generate_v4(), 'charlotte.lee@example.com');

-- Insert corresponding user profiles with full names as usernames
INSERT INTO public.users (id, email, username, created_at)
SELECT 
  id,
  email,
  CASE 
    WHEN email LIKE 'sarah%' THEN 'Sarah Parker'
    WHEN email LIKE 'michael%' THEN 'Michael Chen'
    WHEN email LIKE 'emma%' THEN 'Emma Rodriguez'
    WHEN email LIKE 'james%' THEN 'James Wilson'
    WHEN email LIKE 'olivia%' THEN 'Olivia Brown'
    WHEN email LIKE 'noah%' THEN 'Noah Garcia'
    WHEN email LIKE 'sophia%' THEN 'Sophia Miller'
    WHEN email LIKE 'lucas%' THEN 'Lucas Taylor'
    WHEN email LIKE 'ava%' THEN 'Ava Martinez'
    WHEN email LIKE 'ethan%' THEN 'Ethan Anderson'
    WHEN email LIKE 'isabella%' THEN 'Isabella Thomas'
    WHEN email LIKE 'mason%' THEN 'Mason Jackson'
    WHEN email LIKE 'mia%' THEN 'Mia White'
    WHEN email LIKE 'liam%' THEN 'Liam Harris'
    WHEN email LIKE 'charlotte%' THEN 'Charlotte Lee'
  END,
  NOW()
FROM auth.users
WHERE email LIKE '%@example.com'
ON CONFLICT (id) DO NOTHING; 