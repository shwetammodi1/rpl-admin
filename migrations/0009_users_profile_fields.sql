-- Faculty self-service profile fields.
ALTER TABLE users ADD COLUMN photo TEXT;
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN phone TEXT;
ALTER TABLE users ADD COLUMN research_papers TEXT;
ALTER TABLE users ADD COLUMN books_authored TEXT;
ALTER TABLE users ADD COLUMN patents TEXT;
