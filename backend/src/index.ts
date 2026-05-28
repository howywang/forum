type Env = {
  DB: D1Database
  ALLOWED_ORIGIN?: string
}

type MemberRow = {
  id: number
  name: string
  password_hash: string
  avatar: string
  xp: number
  role: 'admin' | 'member'
  created_at: string
}

type BoardRow = {
  id: string
  name: string
  description: string
  accent: string
}

type ThreadRow = {
  id: number
  board_id: string
  member_id: number | null
  author: string
  avatar: string
  title: string
  body: string
  tags: string
  image: string | null
  recognition: string | null
  assistant: string | null
  views: number
  likes: number
  pinned: number
  created_at: string
}

type ReplyRow = {
  id: number
  thread_id: number
  member_id: number | null
  author: string
  avatar: string
  body: string
  likes: number
  created_at: string
}

type PublicMember = {
  id: number
  name: string
  avatar: string
  xp: number
  role: 'admin' | 'member'
  joinedAt: string
  giftsReceived: number
}

type SessionPayload = {
  token: string
  member: PublicMember
}

function corsHeaders(env: Env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function toPublicMember(row: MemberRow, giftsReceived = 0): PublicMember {
  return {
    id: row.id,
    name: row.name,
    avatar: row.avatar,
    xp: row.xp,
    role: row.role,
    joinedAt: row.created_at,
    giftsReceived,
  }
}

function tokenFor(row: MemberRow): string {
  return btoa(JSON.stringify({ id: row.id, role: row.role }))
}

function mapBoard(row: BoardRow) {
  return { id: row.id, name: row.name, description: row.description, accent: row.accent }
}

function mapThread(row: ThreadRow) {
  return {
    id: row.id,
    boardId: row.board_id,
    memberId: row.member_id ?? undefined,
    author: row.author,
    avatar: row.avatar,
    title: row.title,
    body: row.body,
    tags: parseJson<string[]>(row.tags, []),
    image: row.image ?? undefined,
    recognition: parseJson(row.recognition, undefined),
    assistant: parseJson(row.assistant, undefined),
    views: row.views,
    likes: row.likes,
    pinned: Boolean(row.pinned),
    createdAt: row.created_at,
  }
}

function mapReply(row: ReplyRow) {
  return {
    id: row.id,
    threadId: row.thread_id,
    memberId: row.member_id ?? undefined,
    author: row.author,
    avatar: row.avatar,
    body: row.body,
    likes: row.likes,
    createdAt: row.created_at,
  }
}

async function currentMember(request: Request, env: Env) {
  const header = request.headers.get('Authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return null

  try {
    const payload = JSON.parse(atob(token)) as { id: number }
    return env.DB.prepare('SELECT id, name, password_hash, avatar, xp, role, created_at FROM members WHERE id = ?1')
      .bind(payload.id)
      .first<MemberRow>()
  } catch {
    return null
  }
}

async function getState(env: Env) {
  const [members, giftCounts, boards, threads, replies] = await Promise.all([
    env.DB.prepare('SELECT id, name, password_hash, avatar, xp, role, created_at FROM members ORDER BY xp DESC LIMIT 100').all<MemberRow>(),
    env.DB.prepare('SELECT receiver_id, COUNT(*) AS total FROM gifts GROUP BY receiver_id').all<{ receiver_id: number; total: number }>(),
    env.DB.prepare('SELECT id, name, description, accent FROM boards ORDER BY created_at ASC').all<BoardRow>(),
    env.DB.prepare('SELECT * FROM threads ORDER BY pinned DESC, created_at DESC LIMIT 100').all<ThreadRow>(),
    env.DB.prepare('SELECT * FROM replies ORDER BY created_at ASC LIMIT 300').all<ReplyRow>(),
  ])
  const giftsByMember = new Map(giftCounts.results.map((row) => [row.receiver_id, row.total]))

  return json(
    {
      members: members.results.map((member) => toPublicMember(member, giftsByMember.get(member.id) ?? 0)),
      boards: boards.results.map(mapBoard),
      threads: threads.results.map(mapThread),
      replies: replies.results.map(mapReply),
    },
    env,
  )
}

async function register(request: Request, env: Env) {
  const body = (await request.json().catch(() => null)) as Partial<{ name: string; password: string; avatar: string }> | null
  const name = body?.name?.trim()
  const password = body?.password?.trim()
  if (!name || !password) return json({ error: 'name and password are required' }, env, { status: 400 })

  const role = name === 'HowyWang' ? 'admin' : 'member'
  const passwordHash = await sha256(password)
  const avatar = body?.avatar || name.slice(0, 1)

  try {
    await env.DB.prepare('INSERT INTO members (name, password_hash, avatar, role) VALUES (?1, ?2, ?3, ?4)')
      .bind(name, passwordHash, avatar, role)
      .run()
  } catch {
    return json({ error: 'name is already registered' }, env, { status: 409 })
  }

  const row = await env.DB.prepare('SELECT id, name, password_hash, avatar, xp, role, created_at FROM members WHERE name = ?1')
    .bind(name)
    .first<MemberRow>()

  if (!row) return json({ error: 'member not found after register' }, env, { status: 500 })
  return json({ token: tokenFor(row), member: toPublicMember(row) } satisfies SessionPayload, env, { status: 201 })
}

async function login(request: Request, env: Env) {
  const body = (await request.json().catch(() => null)) as Partial<{ name: string; password: string }> | null
  const name = body?.name?.trim()
  const password = body?.password?.trim()
  if (!name || !password) return json({ error: 'name and password are required' }, env, { status: 400 })

  const row = await env.DB.prepare('SELECT id, name, password_hash, avatar, xp, role, created_at FROM members WHERE name = ?1')
    .bind(name)
    .first<MemberRow>()
  if (!row || row.password_hash !== (await sha256(password))) {
    return json({ error: 'invalid credentials' }, env, { status: 401 })
  }

  return json({ token: tokenFor(row), member: toPublicMember(row) } satisfies SessionPayload, env)
}

async function updateMember(request: Request, env: Env, id: string) {
  const member = await currentMember(request, env)
  const memberId = Number(id)
  if (!member || member.id !== memberId) return json({ error: 'self only' }, env, { status: 403 })

  const body = (await request.json().catch(() => null)) as Partial<{ name: string; password: string; avatar: string }> | null
  const name = body?.name?.trim()
  const password = body?.password?.trim()
  const avatar = body?.avatar?.trim()

  if (!name && !password && !avatar) return json({ error: 'nothing to update' }, env, { status: 400 })

  const nextName = name || member.name
  const nextAvatar = avatar || member.avatar
  const nextPasswordHash = password ? await sha256(password) : member.password_hash

  try {
    await env.DB.prepare('UPDATE members SET name = ?1, avatar = ?2, password_hash = ?3 WHERE id = ?4')
      .bind(nextName, nextAvatar, nextPasswordHash, member.id)
      .run()
  } catch {
    return json({ error: 'name is already registered' }, env, { status: 409 })
  }

  await Promise.all([
    env.DB.prepare('UPDATE threads SET author = ?1, avatar = ?2 WHERE member_id = ?3').bind(nextName, nextAvatar, member.id).run(),
    env.DB.prepare('UPDATE replies SET author = ?1, avatar = ?2 WHERE member_id = ?3').bind(nextName, nextAvatar, member.id).run(),
  ])

  const row = await env.DB.prepare('SELECT id, name, password_hash, avatar, xp, role, created_at FROM members WHERE id = ?1')
    .bind(member.id)
    .first<MemberRow>()
  if (!row) return json({ error: 'member not found' }, env, { status: 404 })
  return json({ token: tokenFor(row), member: toPublicMember(row) } satisfies SessionPayload, env)
}

async function sendGift(request: Request, env: Env, id: string) {
  const sender = await currentMember(request, env)
  const receiverId = Number(id)
  if (!sender) return json({ error: 'login required' }, env, { status: 401 })
  if (!receiverId || sender.id === receiverId) return json({ error: 'invalid receiver' }, env, { status: 400 })

  const body = (await request.json().catch(() => null)) as Partial<{ message: string }> | null
  const receiver = await env.DB.prepare('SELECT id FROM members WHERE id = ?1').bind(receiverId).first<{ id: number }>()
  if (!receiver) return json({ error: 'receiver not found' }, env, { status: 404 })

  await env.DB.prepare('INSERT INTO gifts (sender_id, receiver_id, message) VALUES (?1, ?2, ?3)')
    .bind(sender.id, receiverId, body?.message?.trim().slice(0, 120) || '送你一個寵物大學禮物')
    .run()
  await Promise.all([
    env.DB.prepare('UPDATE members SET xp = xp + 10 WHERE id = ?1').bind(receiverId).run(),
    env.DB.prepare('UPDATE members SET xp = xp + 2 WHERE id = ?1').bind(sender.id).run(),
  ])

  return json({ ok: true }, env, { status: 201 })
}

async function createBoard(request: Request, env: Env) {
  const member = await currentMember(request, env)
  if (member?.role !== 'admin') return json({ error: 'admin only' }, env, { status: 403 })

  const body = (await request.json().catch(() => null)) as Partial<{ name: string; description: string }> | null
  const name = body?.name?.trim()
  if (!name) return json({ error: 'name is required' }, env, { status: 400 })

  const id = `custom-${Date.now()}`
  const description = body?.description?.trim() || '自訂討論區'
  await env.DB.prepare('INSERT INTO boards (id, name, description, accent) VALUES (?1, ?2, ?3, ?4)')
    .bind(id, name, description, '#24786f')
    .run()
  return json({ board: { id, name, description, accent: '#24786f' } }, env, { status: 201 })
}

async function createThread(request: Request, env: Env) {
  const member = await currentMember(request, env)
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body?.title || !body?.body || !body?.boardId) {
    return json({ error: 'boardId, title and body are required' }, env, { status: 400 })
  }

  const title = String(body.title).slice(0, 160)
  const content = String(body.body).slice(0, 4000)
  const tags = Array.isArray(body.tags) ? body.tags.filter((tag) => typeof tag === 'string').slice(0, 8) : []
  const author = member?.name || String(body.author || '訪客飼主')
  const avatar = member?.avatar || String(body.avatar || author.slice(0, 1))

  const result = await env.DB.prepare(
    `INSERT INTO threads
      (board_id, member_id, author, avatar, title, body, tags, image, recognition, assistant)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
  )
    .bind(
      String(body.boardId),
      member?.id ?? null,
      author,
      avatar,
      title,
      content,
      JSON.stringify(tags),
      typeof body.image === 'string' ? body.image : null,
      body.recognition ? JSON.stringify(body.recognition) : null,
      body.assistant ? JSON.stringify(body.assistant) : null,
    )
    .run()

  if (member) await env.DB.prepare('UPDATE members SET xp = xp + 20 WHERE id = ?1').bind(member.id).run()
  return json({ id: result.meta.last_row_id }, env, { status: 201 })
}

async function deleteThread(request: Request, env: Env, id: string) {
  const member = await currentMember(request, env)
  if (member?.role !== 'admin') return json({ error: 'admin only' }, env, { status: 403 })

  await env.DB.prepare('DELETE FROM replies WHERE thread_id = ?1').bind(id).run()
  await env.DB.prepare('DELETE FROM threads WHERE id = ?1').bind(id).run()
  return json({ ok: true }, env)
}

async function createReply(request: Request, env: Env) {
  const member = await currentMember(request, env)
  const body = (await request.json().catch(() => null)) as Partial<{ threadId: number; body: string; author: string; avatar: string }> | null
  if (!body?.threadId || !body?.body?.trim()) {
    return json({ error: 'threadId and body are required' }, env, { status: 400 })
  }
  const author = member?.name || body.author || '訪客飼主'
  const avatar = member?.avatar || body.avatar || author.slice(0, 1)
  await env.DB.prepare('INSERT INTO replies (thread_id, member_id, author, avatar, body) VALUES (?1, ?2, ?3, ?4, ?5)')
    .bind(body.threadId, member?.id ?? null, author, avatar, body.body.trim().slice(0, 2000))
    .run()
  if (member) await env.DB.prepare('UPDATE members SET xp = xp + 8 WHERE id = ?1').bind(member.id).run()
  return json({ ok: true }, env, { status: 201 })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders(env) })
    if (url.pathname === '/health') return json({ ok: true, service: 'petlens-api' }, env)
    if (url.pathname === '/api/state' && request.method === 'GET') return getState(env)
    if (url.pathname === '/api/auth/register' && request.method === 'POST') return register(request, env)
    if (url.pathname === '/api/auth/login' && request.method === 'POST') return login(request, env)
    if (url.pathname.startsWith('/api/members/') && url.pathname.endsWith('/gift') && request.method === 'POST') {
      return sendGift(request, env, url.pathname.split('/').at(-2) || '')
    }
    if (url.pathname.startsWith('/api/members/') && request.method === 'PATCH') {
      return updateMember(request, env, url.pathname.split('/').pop() || '')
    }
    if (url.pathname === '/api/boards' && request.method === 'POST') return createBoard(request, env)
    if (url.pathname === '/api/threads' && request.method === 'POST') return createThread(request, env)
    if (url.pathname.startsWith('/api/threads/') && request.method === 'DELETE') {
      return deleteThread(request, env, url.pathname.split('/').pop() || '')
    }
    if (url.pathname === '/api/replies' && request.method === 'POST') return createReply(request, env)

    return json({ error: 'not found' }, env, { status: 404 })
  },
}
