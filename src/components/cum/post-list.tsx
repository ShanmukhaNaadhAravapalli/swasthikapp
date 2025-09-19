// src/components/cum/post-list.tsx
"use client";

import React from "react";
import PostCard, { Post } from "@/components/cum/post-card";

type PostListProps = {
  posts: Post[];
  // keep these optional on the page level (some callers may use them)
  onLike?: (id: string) => void | Promise<void>;
  onSupport?: (id: string) => void | Promise<void>;
  onOpenComments?: (postId: string) => void;
  clientUserId?: string | null;
  onSave?: (postId: string) => void;
  onNotificationsUpdated?: () => void;
};

export default function PostList({
  posts,
  onOpenComments,
  clientUserId,
  onSave,
  onNotificationsUpdated,
}: PostListProps) {
  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          // PostCard (your current implementation) expects these props:
          onOpenComments={onOpenComments}
          clientUserId={clientUserId}
          onSave={onSave}
          onNotificationsUpdated={onNotificationsUpdated}
        />
      ))}
    </div>
  );
}
