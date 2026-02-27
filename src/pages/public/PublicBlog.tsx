import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function PublicBlog() {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['public-blog', slug],
    queryFn: async () => {
      if (!slug) return null;

      // Try to find by slug first, then by ID
      let query = supabase
        .from('blog_posts')
        .select('*')
        .eq('status', 'published');

      // Check if slug looks like a UUID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

      if (isUuid) {
        query = query.eq('id', slug);
      } else {
        // Try matching by title slugified or by ID prefix
        const { data } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('status', 'published');

        if (data) {
          const match = data.find((p: any) => {
            const titleSlug = (p.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
            return titleSlug === slug || p.id === slug || p.id.startsWith(slug);
          });
          return match || null;
        }
        return null;
      }

      const { data, error: queryError } = await query.single();
      if (queryError) return null;
      return data;
    },
    enabled: !!slug,
  });

  // Set document title and meta tags
  useEffect(() => {
    if (post) {
      document.title = post.meta_title || post.title || 'Blog Post';

      // Set meta description
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', post.meta_description || post.excerpt || '');
      } else {
        const meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = post.meta_description || post.excerpt || '';
        document.head.appendChild(meta);
      }
    }
    return () => {
      document.title = '420 System';
    };
  }, [post]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse space-y-4 max-w-3xl w-full px-6">
          <div className="h-8 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="space-y-2 mt-8">
            {[...Array(6)].map((_, i) => <div key={i} className="h-4 bg-gray-200 rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Post Not Found</h1>
          <p className="text-gray-600 mb-6">The blog post you're looking for doesn't exist or hasn't been published.</p>
          <Link to="/" className="text-blue-600 hover:underline">Go to homepage</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-lg font-semibold text-gray-900 hover:text-blue-600">
            Blog
          </Link>
          <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700">
            Dashboard
          </Link>
        </div>
      </header>

      {/* Article */}
      <article className="max-w-4xl mx-auto px-6 py-12">
        {/* Title */}
        <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
          {post.title}
        </h1>

        {/* Meta */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-8">
          {post.published_at && (
            <time dateTime={post.published_at}>
              {new Date(post.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </time>
          )}
          {post.primary_keyword && (
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
              {post.primary_keyword}
            </span>
          )}
          {post.word_count && (
            <span>{post.word_count} words</span>
          )}
        </div>

        {/* Featured Image */}
        {post.featured_image_url && (
          <img
            src={post.featured_image_url}
            alt={post.title}
            className="w-full rounded-lg mb-8 object-cover max-h-96"
          />
        )}

        {/* Excerpt */}
        {post.excerpt && (
          <p className="text-xl text-gray-600 mb-8 leading-relaxed border-l-4 border-blue-500 pl-4">
            {post.excerpt}
          </p>
        )}

        {/* Content */}
        {post.content_html ? (
          <div
            className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-a:text-blue-600"
            dangerouslySetInnerHTML={{ __html: post.content_html }}
          />
        ) : post.content_markdown ? (
          <div className="prose prose-lg max-w-none whitespace-pre-wrap text-gray-800">
            {post.content_markdown}
          </div>
        ) : (
          <p className="text-gray-600">No content available.</p>
        )}

        {/* Tags */}
        {post.tags && Array.isArray(post.tags) && post.tags.length > 0 && (
          <div className="mt-12 pt-6 border-t">
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag: string) => (
                <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </article>

      {/* Footer */}
      <footer className="border-t bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-gray-500">
          <p>Powered by 420 System</p>
        </div>
      </footer>
    </div>
  );
}
