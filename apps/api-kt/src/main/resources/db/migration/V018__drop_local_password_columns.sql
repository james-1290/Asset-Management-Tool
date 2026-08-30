-- Local accounts are gone: every user signs in with Microsoft Entra through
-- Azure App Service's built-in authentication. Nothing reads or writes these
-- columns any more.
--
-- password_hash held bcrypt hashes for accounts that can no longer authenticate
-- by any route, so keeping it would only preserve credential material with no
-- purpose. token_invalidated_at existed to revoke application-issued JWTs early;
-- there are no application-issued tokens now, and a role or access change takes
-- effect on the user's very next request because roles are re-read from the
-- Entra claims each time.
--
-- Existing rows are left in place: a LOCAL user simply has no way to sign in,
-- and is visible as such in the users list.

ALTER TABLE users DROP COLUMN password_hash;
ALTER TABLE users DROP COLUMN token_invalidated_at;
