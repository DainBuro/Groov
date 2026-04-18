-- seed.sql
-- Insert data into app_user table
INSERT INTO app_user (id, username, password, role, deleted) VALUES
(1, 'admin', '$2b$10$v5Qkcu4/3JCIbkvFt6H6de5OtjmkBQqD2j9opaZIO.ie2KKAeOL0i', 'admin', false);

SELECT setval('app_user_id_seq', (SELECT MAX(id) FROM app_user));
