CREATE INDEX IF NOT EXISTS idx_community_likes_user_created_at ON community_likes (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_community_supports_user_created_at ON community_supports (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_community_comments_user_created_at ON community_comments (user_id, created_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uniq_likes_user_post'
  ) THEN
    ALTER TABLE community_likes ADD CONSTRAINT uniq_likes_user_post UNIQUE (user_id, post_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uniq_supports_user_post'
  ) THEN
    ALTER TABLE community_supports ADD CONSTRAINT uniq_supports_user_post UNIQUE (user_id, post_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uniq_saves_user_post'
  ) THEN
    ALTER TABLE community_saves ADD CONSTRAINT uniq_saves_user_post UNIQUE (user_id, post_id);
  END IF;
END
$$;
