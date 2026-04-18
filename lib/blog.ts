import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export interface PostMeta {
  slug: string
  title: string
  description: string
  date: string
}

export interface Post extends PostMeta {
  content: string
}

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog')

export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) return []
  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.mdx'))
  return files
    .map((filename) => {
      const slug = filename.replace(/\.mdx$/, '')
      const raw = fs.readFileSync(path.join(BLOG_DIR, filename), 'utf-8')
      const { data } = matter(raw)
      return {
        slug,
        title: data.title as string,
        description: data.description as string,
        date: data.date as string,
      }
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function getPostBySlug(slug: string): Post | null {
  const filepath = path.join(BLOG_DIR, `${slug}.mdx`)
  if (!fs.existsSync(filepath)) return null
  const raw = fs.readFileSync(filepath, 'utf-8')
  const { data, content } = matter(raw)
  return {
    slug,
    title: data.title as string,
    description: data.description as string,
    date: data.date as string,
    content,
  }
}
