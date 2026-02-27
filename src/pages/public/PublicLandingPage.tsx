import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export default function PublicLandingPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: page, isLoading } = useQuery({
    queryKey: ['public-landing-page', slug],
    queryFn: async () => {
      if (!slug) return null;

      // Try to find by slug first, then by ID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

      if (isUuid) {
        const { data, error } = await supabase
          .from('landing_pages')
          .select('*')
          .eq('id', slug)
          .eq('status', 'published')
          .single();
        if (error) return null;
        return data;
      }

      // Try matching by slug
      const { data } = await supabase
        .from('landing_pages')
        .select('*')
        .eq('status', 'published');

      if (data) {
        const match = data.find((p: any) => {
          return p.slug === slug || p.id === slug || p.id.startsWith(slug);
        });
        return match || null;
      }
      return null;
    },
    enabled: !!slug,
  });

  // Set document title and meta tags
  useEffect(() => {
    if (page) {
      document.title = page.meta_title || page.name || 'Landing Page';

      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', page.meta_description || '');
      } else if (page.meta_description) {
        const meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = page.meta_description;
        document.head.appendChild(meta);
      }

      // OG Image
      if (page.og_image_url) {
        let ogImage = document.querySelector('meta[property="og:image"]') as HTMLMetaElement;
        if (!ogImage) {
          ogImage = document.createElement('meta');
          ogImage.setAttribute('property', 'og:image');
          document.head.appendChild(ogImage);
        }
        ogImage.content = page.og_image_url;
      }
    }
    return () => {
      document.title = '420 System';
    };
  }, [page]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse space-y-4 max-w-3xl w-full px-6">
          <div className="h-12 bg-gray-200 rounded w-3/4" />
          <div className="h-6 bg-gray-200 rounded w-1/2" />
          <div className="space-y-2 mt-8">
            {[...Array(4)].map((_, i) => <div key={i} className="h-4 bg-gray-200 rounded" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Page Not Found</h1>
          <p className="text-gray-600 mb-6">The page you're looking for doesn't exist or hasn't been published.</p>
          <Link to="/" className="text-blue-600 hover:underline">Go to homepage</Link>
        </div>
      </div>
    );
  }

  // Landing pages render their full HTML content directly
  // The html_content from the AI generator is a complete standalone page
  if (page.html_content) {
    return (
      <div className="min-h-screen">
        <div dangerouslySetInnerHTML={{ __html: page.html_content }} />
        {page.css_content && (
          <style dangerouslySetInnerHTML={{ __html: page.css_content }} />
        )}
      </div>
    );
  }

  // Fallback for pages without HTML content
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-lg font-semibold text-gray-900 hover:text-blue-600">
            Home
          </Link>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{page.name}</h1>
        {page.description && <p className="text-xl text-gray-600">{page.description}</p>}
        <p className="text-gray-400 mt-8">This landing page is under construction.</p>
      </div>
    </div>
  );
}
