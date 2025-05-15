-- Custom SQL migration file, put your code below! --

-- Insert roles
INSERT INTO roles (id, name) VALUES ('org_role', 'Organizer');
INSERT INTO roles (id, name) VALUES ('part_role', 'Participant');
INSERT INTO roles (id, name) VALUES ('view_role', 'Viewer');