import { useState } from 'react';
import api from '@/lib/api';

interface Post {
  id: number;
  author: {
    id: number;
    username: string;
  } | string;
  content: string;
  image?: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
}

interface Comment {
  id: number;
  author: {
    id: number;
    username: string;
  } | string;
  content: string;
  created_at: string;
  likes_count: number;
  is_liked: boolean;
}

interface PostCardProps {
  post: Post;
  currentUsername: string;
  onPostUpdated: () => void;
}

export default function PostCard({ post, currentUsername, onPostUpdated }: PostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentContent, setCommentContent] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  // Handle author as either object or string
  const getAuthorUsername = (author: any): string => {
    if (typeof author === 'string') return author;
    return author?.username || 'Unknown';
  };

  const authorUsername = getAuthorUsername(post.author);

  const handleLike = async () => {
    try {
      await api.post(`/posts/${post.id}/like/`);
      onPostUpdated();
    } catch (error) {
      console.error('Failed to like/unlike post:', error);
    }
  };

  const loadComments = async () => {
    setLoadingComments(true);
    try {
      const response = await api.get(`/posts/${post.id}/comments/`);
      setComments(response.data.results || response.data);
      setShowComments(true);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const toggleComments = () => {
    if (showComments) {
      setShowComments(false);
    } else {
      loadComments();
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim()) return;

    try {
      await api.post(`/posts/${post.id}/comments/`, {
        content: commentContent,
      });
      setCommentContent('');
      await loadComments();
      onPostUpdated();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleCommentLike = async (commentId: number) => {
    try {
      await api.post(`/comments/${commentId}/like/`);
      await loadComments();
    } catch (error) {
      console.error('Failed to like comment:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (hours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4">
      {/* Post Header */}
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
          {authorUsername.charAt(0).toUpperCase()}
        </div>
        <div className="ml-3">
          <h3 className="font-semibold text-gray-900">{authorUsername}</h3>
          <p className="text-sm text-gray-500">{formatDate(post.created_at)}</p>
        </div>
      </div>

      {/* Post Content */}
      <p className="text-gray-800 mb-4 whitespace-pre-wrap">{post.content}</p>

      {/* Post Image */}
      {post.image && (
        <img
          src={post.image}
          alt="Post"
          className="w-full rounded-lg mb-4 max-h-96 object-cover"
        />
      )}

      {/* Post Stats */}
      <div className="flex items-center justify-between text-sm text-gray-500 pb-3 border-b border-gray-200">
        <span>{post.likes_count} likes</span>
        <span>{post.comments_count} comments</span>
      </div>

      {/* Post Actions */}
      <div className="flex items-center justify-around pt-3">
        <button
          onClick={handleLike}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
            post.is_liked
              ? 'text-blue-600 hover:bg-blue-50'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <svg className="w-6 h-6" fill={post.is_liked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          <span>Like</span>
        </button>

        <button
          onClick={toggleComments}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span>Comment</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {/* Add Comment */}
          <form onSubmit={handleComment} className="mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm font-bold">
                {currentUsername.charAt(0).toUpperCase()}
              </div>
              <input
                type="text"
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!commentContent.trim()}
                className="text-blue-600 hover:text-blue-700 disabled:text-gray-400"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>

          {/* Comments List */}
          {loadingComments ? (
            <p className="text-center text-gray-500">Loading comments...</p>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => {
                const commentAuthorUsername = getAuthorUsername(comment.author);
                return (
                  <div key={comment.id} className="flex space-x-3">
                    <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {commentAuthorUsername.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-100 rounded-lg px-4 py-2">
                        <h4 className="font-semibold text-sm text-gray-900">{commentAuthorUsername}</h4>
                        <p className="text-gray-800 text-sm">{comment.content}</p>
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                        <button
                          onClick={() => handleCommentLike(comment.id)}
                          className="hover:text-blue-600"
                        >
                          {comment.is_liked ? '👍' : '👍'} {comment.likes_count > 0 && comment.likes_count}
                        </button>
                        <span>{formatDate(comment.created_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
