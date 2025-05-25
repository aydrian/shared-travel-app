-- Custom SQL migration file, put your code below! --

-- Insert roles
INSERT INTO roles (id, name) VALUES ('org_role', 'organizer');
INSERT INTO roles (id, name) VALUES ('part_role', 'participant');
INSERT INTO roles (id, name) VALUES ('view_role', 'viewer');