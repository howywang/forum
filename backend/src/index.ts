type Env = {
  DB: D1Database
  ALLOWED_ORIGIN?: string
}

type CaseRow = {
  id: number
  title: string
  body: string
  tags: string
  replies: number
  created_at: string
}

type CasePost = {
  id: number
  title: string
  body: string
  tags: string[]
  replies: number
  createdAt: string
}

function corsHeaders(env: Env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function json(data: unknown, env: Env, init: ResponseInit = {}) {
  return Response.json(data, {
    ...init,
    headers: {
      ...corsHeaders(env),
      'Content-Type': 'application/json; charset=utf-8',
      ...init.headers,
    },
  })
}

function parseTags(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : []
  } catch {
    return []
  }
}

function mapCase(row: CaseRow): CasePost {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    tags: parseTags(row.tags),
    replies: row.replies,
    createdAt: row.created_at,
  }
}

async function listCases(env: Env) {
  const { results } = await env.DB.prepare(
    'SELECT id, title, body, tags, replies, created_at FROM cases ORDER BY created_at DESC LIMIT 50',
  ).all<CaseRow>()

  return json({ cases: results.map(mapCase) }, env)
}

async function createCase(request: Request, env: Env) {
  const body = (await request.json().catch(() => null)) as Partial<CasePost> | null
  const title = body?.title?.trim()
  const content = body?.body?.trim()
  const tags = Array.isArray(body?.tags) ? body.tags.filter((tag) => typeof tag === 'string').slice(0, 8) : []

  if (!title || !content) {
    return json({ error: 'title and body are required' }, env, { status: 400 })
  }

  if (title.length > 120 || content.length > 2000) {
    return json({ error: 'case content is too long' }, env, { status: 400 })
  }

  const result = await env.DB.prepare(
    'INSERT INTO cases (title, body, tags, replies) VALUES (?1, ?2, ?3, 0)',
  )
    .bind(title, content, JSON.stringify(tags))
    .run()

  const id = result.meta.last_row_id
  const row = await env.DB.prepare(
    'SELECT id, title, body, tags, replies, created_at FROM cases WHERE id = ?1',
  )
    .bind(id)
    .first<CaseRow>()

  if (!row) {
    return json({ error: 'case was not found after insert' }, env, { status: 500 })
  }

  return json({ case: mapCase(row) }, env, { status: 201 })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env) })
    }

    if (url.pathname === '/health') {
      return json({ ok: true, service: 'petlens-api' }, env)
    }

    if (url.pathname === '/api/cases' && request.method === 'GET') {
      return listCases(env)
    }

    if (url.pathname === '/api/cases' && request.method === 'POST') {
      return createCase(request, env)
    }

    return json({ error: 'not found' }, env, { status: 404 })
  },
}
