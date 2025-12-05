// app/blog/[slug]/page.tsx
import { Client, Databases, Query } from "node-appwrite";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
const apiKey = process.env.APPWRITE_API_KEY!;

const DB_ID =
  process.env.APPWRITE_PLATES_DATABASE_ID ||
  process.env.NEXT_PUBLIC_APPWRITE_PLATES_DATABASE_ID!;
const BLOG_COLLECTION_ID =
  process.env.APPWRITE_BLOG_COLLECTION_ID || "blog_posts";

type BlogPost = {
  $id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content?: string;
  status?: string;
  publishedAt?: string;
  imageUrl?: string;
};

async function getPostBySlug(slug?: string | null): Promise<BlogPost | null> {
  // Guard: don't query Appwrite with undefined
  if (!slug) {
    return null;
  }

  try {
    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const databases = new Databases(client);

    const res = await databases.listDocuments(DB_ID, BLOG_COLLECTION_ID, [
      Query.equal("slug", slug),
      Query.equal("status", "published"),
    ]);

    if (!res.documents.length) return null;
    return res.documents[0] as unknown as BlogPost;
  } catch (err) {
    console.error("Error loading blog post by slug:", slug, err);
    return null;
  }
}

// -----------------------------
// Metadata (Next 16: params is a Promise)
// -----------------------------
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post not found | AuctionMyPlate",
      description: "This blog post could not be found.",
    };
  }

  const description =
    post.excerpt ||
    (post.content ? post.content.slice(0, 150) + "…" : undefined);

  return {
    title: `${post.title} | AuctionMyPlate Blog`,
    description,
  };
}

// -----------------------------
// Page component (Next 16: params is a Promise)
// -----------------------------
export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const dateLabel = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : null;

  const paragraphs =
    post.content
      ?.split(/\n{2,}/)
      .map((chunk) => chunk.trim())
      .filter(Boolean) || [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <p className="text-xs text-gray-500 mb-3">
        <a href="/blog" className="hover:underline">
          ← Back to blog
        </a>
      </p>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        {post.title}
      </h1>

      {dateLabel && (
        <p className="text-xs text-gray-500 mb-4">{dateLabel}</p>
      )}

      {post.imageUrl && (
        <div className="w-full h-56 mb-6 rounded-xl overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.imageUrl}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="prose prose-sm max-w-none">
        {paragraphs.length === 0 ? (
          <p className="text-gray-600 text-sm">
            No content yet for this article.
          </p>
        ) : (
          paragraphs.map((p, idx) => (
            <p key={idx} className="text-sm text-gray-800 mb-4">
              {p.split("\n").map((line, i) => (
                <span key={i}>
                  {line}
                  {i < p.split("\n").length - 1 && <br />}
                </span>
              ))}
            </p>
          ))
        )}
      </div>
    </div>
  );
}
