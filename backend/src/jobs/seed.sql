-- seed.sql
-- Insert data into app_user table
INSERT INTO app_user (id, username, password, role, deleted) VALUES
(1, 'admin', '$2b$10$v5Qkcu4/3JCIbkvFt6H6de5OtjmkBQqD2j9opaZIO.ie2KKAeOL0i', 'admin', false),
(2, 'dainius', '$2b$10$15KANuxNHQzAKFy9syTJweOpj6TF4Kde81mkX/uKrsGfg0qoP5aiK', 'user', false),
(3, 'obama', '$2b$10$gRx5ZJZ9T4mSLWsHKnHDu.lxaH6smrJOBH0keJa2.BzJnrMYuU9Gm', 'user', false),
(4, 'jonas', '$2b$10$QbgpLpmgu.V6wSF8uTumeOTrZYMIt4naG9/7oqAC6zQocpc.126qe', 'user', false),
(5, 'tadas', '$2b$10$FW1joyTENR4SrWadqkYaSOFRaU6Fzy9YwI1HHg15Cc24et.HXEA.2', 'user', false),
(6, 'andrius', '$2b$10$436myqsKEm9NALOAmBM8v.s/MK1xwMvdsS5Xi.nCS0TZWMJP4HZXW', 'user', true);

-- Insert data into event table
INSERT INTO event (id, name, location, date) VALUES
(1, 'Summer Ball 2024', 'Grand Ballroom, New York', '2024-07-15'),
(2, 'Winter Dance Festival', 'Convention Center, Chicago', '2024-12-10'),
(3, 'Spring Swing Competition', 'Dance Hall, Los Angeles', '2024-04-20'),
(4, 'Autumn Tango Night', 'Royal Hotel, Miami', '2024-10-05');

-- Insert data into dance_move table
INSERT INTO dance_move (id, name, description, difficulty, start_position, end_position, parent_move_id) VALUES
-- Basic moves
(1, 'Basic Step', 'Fundamental forward and back step', 'easy', 'closed', 'closed', NULL),
(2, 'Underarm Turn', 'Simple right turn under raised arm', 'easy', 'closed', 'closed', NULL),
(3, 'Cross Body Lead', 'Lead follower across dancers path', 'medium', 'openLeftToRight', 'openRightToLeft', NULL),

-- Intermediate moves
(4, 'Double Spin', 'Two consecutive rotations', 'medium', 'openLeftToRight', 'openLeftToRight', 2),
(5, 'Sweetheart Wrap', 'Wrap from sweetheart position', 'medium', 'sweethearts', 'closed', NULL),
(6, 'Texas Tommy', 'Classic swing move with arm hook', 'hard', 'closed', 'openRightToRight', NULL),

-- Advanced moves
(7, 'Triple Spin', 'Three fast rotations', 'hard', 'openRightToLeft', 'openRightToLeft', 4),
(8, 'Death Spiral', 'Dramatic dip and spin', 'very_hard', 'openLeftToLeft', 'closed', NULL),
(9, 'Airplane', 'Aerial move with full extension', 'very_hard', 'sweethearts', 'openRightToLeft', NULL),

-- Variations
(10, 'Simple Sweetheart', 'Basic sweetheart variation', 'easy', 'sweethearts', 'closed', 5),
(11, 'Quick Spin', 'Faster single spin', 'easy', 'closed', 'closed', 2);

-- Insert data into dance_sequence table
INSERT INTO dance_sequence (id, user_id, event_id, name, description) VALUES
(1, 2, 1, 'Summer Routine', 'A fun summer dance sequence for beginners'),
(2, 3, 1, 'Advanced Performance', 'Complex routine for experienced dancers'),
(3, 4, 2, 'Winter Special', 'Seasonal routine with dramatic moves'),
(4, 2, 3, 'Spring Swing', 'Energetic swing sequence'),
(5, 3, 4, 'Tango Fusion', 'Modern take on classic tango'),
(6, 5, NULL, 'Practice Sequence', 'Personal practice routine not for any event'),
(7, 4, 3, 'Competition Piece', 'High-difficulty competition routine');

-- Insert data into move_of_sequence table
INSERT INTO move_of_sequence (sequence_id, move_id, order_index) VALUES
-- Sequence 1: Beginner summer routine
(1, 1, 0), (1, 2, 1), (1, 10, 2),

-- Sequence 2: Advanced performance
(2, 3, 0), (2, 6, 1), (2, 7, 2), (2, 8, 3),

-- Sequence 3: Winter special
(3, 1, 0), (3, 5, 1), (3, 8, 2), (3, 9, 3),

-- Sequence 4: Spring swing
(4, 1, 0), (4, 3, 1), (4, 6, 2), (4, 11, 3),

-- Sequence 5: Tango fusion
(5, 1, 0), (5, 5, 1), (5, 8, 2),

-- Sequence 6: Practice sequence
(6, 1, 0), (6, 2, 1), (6, 10, 2), (6, 11, 3),

-- Sequence 7: Competition piece
(7, 6, 0), (7, 7, 1), (7, 8, 2), (7, 9, 3);

-- Insert data into rating table
INSERT INTO rating (sequence_id, user_id, score) VALUES
-- Ratings for sequence 1
(1, 3, 8), (1, 4, 7), (1, 5, 9),

-- Ratings for sequence 2
(2, 2, 9), (2, 4, 10), (2, 5, 8),

-- Ratings for sequence 3
(3, 2, 10), (3, 3, 9), (3, 5, 7),

-- Ratings for sequence 4
(4, 3, 8), (4, 4, 8), (4, 5, 9),

-- Ratings for sequence 5
(5, 2, 7), (5, 4, 9), (5, 5, 8),

-- Ratings for sequence 6
(6, 2, 6), (6, 3, 7),

-- Ratings for sequence 7
(7, 2, 10), (7, 3, 10), (7, 5, 9);

-- Insert data into refresh_token table
INSERT INTO refresh_token (id, user_id, token, created_at, expires_at) VALUES
(1, 1, 'admin_refresh_token_123', NOW(), NOW() + INTERVAL '7 days'),
(2, 2, 'john_refresh_token_456', NOW(), NOW() + INTERVAL '7 days'),
(3, 3, 'sarah_refresh_token_789', NOW(), NOW() + INTERVAL '7 days');

-- Update sequences to start from higher numbers
SELECT setval('app_user_id_seq', (SELECT MAX(id) FROM app_user));
SELECT setval('event_id_seq', (SELECT MAX(id) FROM event));
SELECT setval('dance_move_id_seq', (SELECT MAX(id) FROM dance_move));
SELECT setval('dance_sequence_id_seq', (SELECT MAX(id) FROM dance_sequence));
SELECT setval('refresh_token_id_seq', (SELECT MAX(id) FROM refresh_token));