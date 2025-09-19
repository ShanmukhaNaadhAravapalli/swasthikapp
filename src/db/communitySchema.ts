// src/db/communitySchema.ts
import {
  pgTable,
  text,
  uuid,
  timestamp,
  boolean as dBoolean,
  integer,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * communitySchema - Drizzle pg-core table definitions
 * Make sure extension is installed: CREATE EXTENSION IF NOT EXISTS "pgcrypto";
 */

export const community_users = pgTable("community_users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: text("provider").notNull(),
  provider_user_id: text("provider_user_id"),
  display_name: text("display_name"),
  created_at: timestamp("created_at").default(sql`now()`).notNull(),
  last_seen: timestamp("last_seen").default(sql`now()`).notNull(),
});

export const community_posts = pgTable("community_posts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid("user_id").references(() => community_users.id, { onDelete: "set null" }),
  content: text("content").notNull(),
  enhanced_content: text("enhanced_content"),
  is_anonymous: dBoolean("is_anonymous").default(true),
  moderation_status: text("moderation_status").default("pending"),
  created_at: timestamp("created_at").default(sql`now()`).notNull(),
});

export const community_attachments = pgTable("community_attachments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  post_id: uuid("post_id").references(() => community_posts.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  filename: text("filename"),
  mime_type: text("mime_type"),
  size_bytes: integer("size_bytes"),
  uploaded_at: timestamp("uploaded_at").default(sql`now()`).notNull(),
});

export const community_comments = pgTable("community_comments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  post_id: uuid("post_id").references(() => community_posts.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").references(() => community_users.id, { onDelete: "set null" }),
  content: text("content").notNull(),
  created_at: timestamp("created_at").default(sql`now()`).notNull(),
});

export const community_likes = pgTable("community_likes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  post_id: uuid("post_id").references(() => community_posts.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").references(() => community_users.id, { onDelete: "cascade" }),
  created_at: timestamp("created_at").default(sql`now()`).notNull(),
});

export const community_supports = pgTable("community_supports", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  post_id: uuid("post_id").references(() => community_posts.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").references(() => community_users.id, { onDelete: "cascade" }),
  created_at: timestamp("created_at").default(sql`now()`).notNull(),
});

export const community_saves = pgTable("community_saves", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  post_id: uuid("post_id").references(() => community_posts.id, { onDelete: "cascade" }),
  user_id: uuid("user_id").references(() => community_users.id, { onDelete: "cascade" }),
  created_at: timestamp("created_at").default(sql`now()`).notNull(),
});

export const community_hashtags = pgTable("community_hashtags", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tag: text("tag").notNull(),
});

export const community_post_tags = pgTable("community_post_tags", {
  post_id: uuid("post_id").references(() => community_posts.id, { onDelete: "cascade" }),
  tag_id: uuid("tag_id").references(() => community_hashtags.id, { onDelete: "cascade" }),
});

export const community_notifications = pgTable("community_notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: uuid("user_id").references(() => community_users.id, { onDelete: "cascade" }), // recipient
  actor_user_id: uuid("actor_user_id").references(() => community_users.id, { onDelete: "set null" }), // actor
  type: text("type").notNull(), // 'like' | 'support' | 'comment'
  post_id: uuid("post_id").references(() => community_posts.id, { onDelete: "cascade" }),
  comment_id: uuid("comment_id").references(() => community_comments.id, { onDelete: "cascade" }),
  read: dBoolean("read").default(false),
  created_at: timestamp("created_at").default(sql`now()`).notNull(),
});
