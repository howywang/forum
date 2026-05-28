import { useEffect, useMemo, useRef, useState } from 'react'
import type { MobileNet } from '@tensorflow-models/mobilenet'
import {
  BarChart3,
  Bell,
  Bookmark,
  Camera,
  Cat,
  Dog,
  Eye,
  Flame,
  Heart,
  Home,
  ImageUp,
  Loader,
  MessageCircle,
  PawPrint,
  Plus,
  Reply,
  Search,
  Send,
  Shield,
  Tags,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react'
import './App.css'

type BoardId = 'identify' | 'clinic' | 'daily' | 'adoption' | 'training' | 'lost'

type Board = {
  id: BoardId
  name: string
  description: string
  icon: typeof PawPrint
  accent: string
}

type Prediction = {
  label: string
  probability: number
}

type Thread = {
  id: number
  boardId: BoardId
  title: string
  body: string
  author: string
  avatar: string
  createdAt: string
  views: number
  likes: number
  tags: string[]
  image?: string
  recognition?: {
    species: string
    guess: string
    confidence: number
    predictions: Prediction[]
  }
  pinned?: boolean
}

type ThreadReply = {
  id: number
  threadId: number
  author: string
  avatar: string
  body: string
  createdAt: string
  likes: number
}

type Draft = {
  boardId: BoardId
  title: string
  body: string
  tags: string
  image?: string
  recognition?: Thread['recognition']
}

type UploadState = {
  progress: number
  status: string
  busy: boolean
}

const storageKey = 'pet-discuz-forum-v1'

const boards: Board[] = [
  {
    id: 'identify',
    name: '照片辨識',
    description: '上傳照片判斷寵物類型，再讓大家一起確認',
    icon: Camera,
    accent: '#24786f',
  },
  {
    id: 'clinic',
    name: '健康照護',
    description: '症狀、就醫、用藥與照護經驗',
    icon: Shield,
    accent: '#315c96',
  },
  {
    id: 'daily',
    name: '日常曬寵',
    description: '生活紀錄、用品心得、照片分享',
    icon: PawPrint,
    accent: '#d95738',
  },
  {
    id: 'adoption',
    name: '領養送養',
    description: '認養條件、中途募集、送養資訊',
    icon: Home,
    accent: '#7d6b1f',
  },
  {
    id: 'training',
    name: '行為訓練',
    description: '社會化、分離焦慮、口令與習慣',
    icon: Dog,
    accent: '#774c9f',
  },
  {
    id: 'lost',
    name: '走失協尋',
    description: '通報、目擊線索、地點追蹤',
    icon: Cat,
    accent: '#8b3e62',
  },
]

const seedThreads: Thread[] = [
  {
    id: 101,
    boardId: 'identify',
    title: '這張照片 AI 判斷像柴犬，大家覺得有混到米克斯嗎？',
    body: '剛領養回來，想先整理可能品種與照護方向。耳朵、尾巴和毛色看起來像柴犬，但體型比較細。',
    author: 'Howy',
    avatar: 'H',
    createdAt: '今天 14:20',
    views: 1280,
    likes: 42,
    tags: ['狗', '照片辨識', '犬種確認'],
    image:
      'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=900&q=80',
    recognition: {
      species: '狗狗',
      guess: 'Shiba inu, chow',
      confidence: 0.72,
      predictions: [
        { label: 'Shiba inu, chow', probability: 0.72 },
        { label: 'Eskimo dog, husky', probability: 0.18 },
        { label: 'kelpie', probability: 0.06 },
      ],
    },
    pinned: true,
  },
  {
    id: 102,
    boardId: 'clinic',
    title: '貓咪突然不吃飯一天，該直接急診嗎？',
    body: '昨天晚餐開始只聞不吃，精神比平常差一點，水有喝。想整理急診前需要觀察的指標。',
    author: 'Mia',
    avatar: 'M',
    createdAt: '今天 10:32',
    views: 982,
    likes: 48,
    tags: ['貓', '食慾', '急診'],
    pinned: true,
  },
  {
    id: 103,
    boardId: 'adoption',
    title: '新北三個月米克斯兄妹找家，已驅蟲會定點尿布',
    body: '個性穩定，親人親狗，適合願意持續社會化的家庭。會安排家訪與簽認養切結。',
    author: '小雨中途',
    avatar: '雨',
    createdAt: '昨天 21:02',
    views: 2103,
    likes: 206,
    tags: ['領養', '幼犬', '新北'],
    image:
      'https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?auto=format&fit=crop&w=900&q=80',
  },
  {
    id: 104,
    boardId: 'training',
    title: '分離焦慮訓練紀錄：從 30 秒到 25 分鐘',
    body: '分享我用攝影機記錄吠叫、逐步延長出門時間、搭配舔食墊的流程。',
    author: 'Noah',
    avatar: 'N',
    createdAt: '昨天 16:47',
    views: 735,
    likes: 67,
    tags: ['分離焦慮', '訓練', '狗'],
  },
]

const seedReplies: ThreadReply[] = [
  {
    id: 501,
    threadId: 101,
    author: '阿哲',
    avatar: '哲',
    body: '看嘴吻和尾巴確實有柴犬感，但骨架比較像米克斯。建議再放一張側面全身照會更好判斷。',
    createdAt: '今天 14:36',
    likes: 8,
  },
  {
    id: 502,
    threadId: 102,
    author: '獸醫助理 Sam',
    avatar: 'S',
    body: '若完全不吃超過一天、精神下降或嘔吐，建議直接就醫。可以先記錄食量、喝水、排尿排便。',
    createdAt: '今天 10:45',
    likes: 22,
  },
]

const hotTags = ['照片辨識', '犬種確認', '急診', '領養', '走失', '分離焦慮', '貓砂', '幼犬']
const onlineMembers = ['Howy', 'Mia', '阿哲', '小雨中途', 'Neko', 'Sam', 'Noah']

const emptyDraft: Draft = {
  boardId: 'identify',
  title: '',
  body: '',
  tags: '',
}

function readFileAsDataUrl(file: File, onProgress?: (progress: number) => void) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 45))
    }
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('圖片無法讀取'))
    image.src = src
  })
}

function imageFileFromClipboard(event: ClipboardEvent) {
  const items = Array.from(event.clipboardData?.items ?? [])
  const imageItem = items.find((item) => item.kind === 'file' && item.type.startsWith('image/'))
  const file = imageItem?.getAsFile()

  if (!file) return null

  const extension = file.type.split('/')[1] || 'png'
  return new File([file], `pasted-pet-photo.${extension}`, { type: file.type })
}

function formatNumber(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(1)}萬`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return String(value)
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`
}

function petTagsFromPredictions(predictions: Prediction[]) {
  const labels = predictions.map((item) => item.label.toLowerCase()).join(' ')
  if (/cat|tabby|siamese|persian/.test(labels)) return { species: '貓咪', tags: ['貓', '貓種確認'] }
  if (/dog|terrier|retriever|poodle|chihuahua|husky|shiba|hound|spaniel|shepherd|corgi/.test(labels)) {
    return { species: '狗狗', tags: ['狗', '犬種確認'] }
  }
  if (/rabbit|hare/.test(labels)) return { species: '兔子', tags: ['兔', '小寵'] }
  if (/bird|parrot|macaw|cockatoo/.test(labels)) return { species: '鳥類', tags: ['鳥', '鳥類辨識'] }
  return { species: '未確認寵物', tags: ['照片辨識', '需人工確認'] }
}

function loadState() {
  if (typeof window === 'undefined') {
    return { threads: seedThreads, replies: seedReplies, userName: '訪客飼主' }
  }

  const stored = window.localStorage.getItem(storageKey)
  if (!stored) return { threads: seedThreads, replies: seedReplies, userName: '訪客飼主' }

  try {
    const parsed = JSON.parse(stored) as Partial<{
      threads: Thread[]
      replies: ThreadReply[]
      userName: string
    }>
    return {
      threads: parsed.threads?.length ? parsed.threads : seedThreads,
      replies: parsed.replies?.length ? parsed.replies : seedReplies,
      userName: parsed.userName ?? '訪客飼主',
    }
  } catch {
    window.localStorage.removeItem(storageKey)
    return { threads: seedThreads, replies: seedReplies, userName: '訪客飼主' }
  }
}

function App() {
  const initialState = useMemo(() => loadState(), [])
  const [threads, setThreads] = useState<Thread[]>(() => initialState.threads)
  const [replies, setReplies] = useState<ThreadReply[]>(() => initialState.replies)
  const [userName, setUserName] = useState(() => initialState.userName)
  const [activeBoard, setActiveBoard] = useState<BoardId | 'all'>('all')
  const [selectedThreadId, setSelectedThreadId] = useState(initialState.threads[0]?.id ?? 101)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [replyDraft, setReplyDraft] = useState('')
  const [composerOpen, setComposerOpen] = useState(false)
  const [uploadState, setUploadState] = useState<UploadState>({
    progress: 0,
    status: '可選擇、拖放或貼上照片',
    busy: false,
  })
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const modelRef = useRef<MobileNet | null>(null)

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ threads, replies, userName }))
  }, [replies, threads, userName])

  async function analyzeFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setUploadState({ progress: 0, status: '請使用圖片檔', busy: false })
      return
    }

    setUploadState({ progress: 1, status: '正在讀取照片', busy: true })

    try {
      const imageData = await readFileAsDataUrl(file, (progress) => {
        setUploadState({ progress, status: '正在讀取照片', busy: true })
      })
      setUploadState({ progress: 55, status: '正在載入 AI 模型', busy: true })
      const image = await loadImage(imageData)
      await import('@tensorflow/tfjs')
      const mobilenetModel = await import('@tensorflow-models/mobilenet')
      modelRef.current ??= await mobilenetModel.load()

      setUploadState({ progress: 78, status: '正在辨識寵物照片', busy: true })
      const predictions = (await modelRef.current.classify(image, 5)).map((prediction) => ({
        label: prediction.className,
        probability: prediction.probability,
      }))
      const main = predictions[0]
      const pet = petTagsFromPredictions(predictions)
      const autoTags = [...new Set(['照片辨識', ...pet.tags])]

      setDraft((current) => ({
        ...current,
        boardId: 'identify',
        image: imageData,
        tags: [...new Set([...current.tags.split(/[,\s，]+/).filter(Boolean), ...autoTags])].join(', '),
        title: current.title || `請協助確認：這張照片可能是${pet.species}`,
        body:
          current.body ||
          `AI 初步判斷為「${main?.label ?? '未確認'}」，信心分數 ${percent(
            main?.probability ?? 0,
          )}。想請大家協助確認品種、特徵或照護注意事項。`,
        recognition: {
          species: pet.species,
          guess: main?.label ?? '未確認',
          confidence: main?.probability ?? 0,
          predictions,
        },
      }))
      setUploadState({ progress: 100, status: '辨識完成，可直接發帖討論', busy: false })
    } catch {
      setUploadState({ progress: 0, status: '辨識失敗，請換一張照片再試', busy: false })
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  useEffect(() => {
    function handlePaste(event: ClipboardEvent) {
      const file = imageFileFromClipboard(event)
      if (!file) return

      event.preventDefault()
      setComposerOpen(true)
      void analyzeFile(file)
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [])

  const selectedThread = threads.find((thread) => thread.id === selectedThreadId) ?? threads[0]
  const selectedBoard = boards.find((board) => board.id === selectedThread?.boardId) ?? boards[0]
  const SelectedBoardIcon = selectedBoard.icon
  const threadReplies = replies.filter((reply) => reply.threadId === selectedThread?.id)
  const visibleThreads = threads
    .filter((thread) => activeBoard === 'all' || thread.boardId === activeBoard)
    .filter((thread) => {
      const keyword = query.trim().toLowerCase()
      if (!keyword) return true
      return [thread.title, thread.body, thread.author, ...thread.tags].join(' ').toLowerCase().includes(keyword)
    })
    .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.id - a.id)

  function boardThreadCount(boardId: BoardId) {
    return threads.filter((thread) => thread.boardId === boardId).length
  }

  function submitThread(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.title.trim() || !draft.body.trim()) return

    const thread: Thread = {
      id: Date.now(),
      boardId: draft.boardId,
      title: draft.title.trim(),
      body: draft.body.trim(),
      author: userName.trim() || '訪客飼主',
      avatar: (userName.trim() || '訪').slice(0, 1),
      createdAt: '剛剛',
      views: 1,
      likes: 0,
      tags: draft.tags.split(/[,\s，]+/).filter(Boolean).slice(0, 8),
      image: draft.image,
      recognition: draft.recognition,
    }

    setThreads((current) => [thread, ...current])
    setSelectedThreadId(thread.id)
    setActiveBoard(thread.boardId)
    setDraft(emptyDraft)
    setUploadState({ progress: 0, status: '可選擇、拖放或貼上照片', busy: false })
    setComposerOpen(false)
  }

  function submitReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedThread || !replyDraft.trim()) return

    const reply: ThreadReply = {
      id: Date.now(),
      threadId: selectedThread.id,
      author: userName.trim() || '訪客飼主',
      avatar: (userName.trim() || '訪').slice(0, 1),
      body: replyDraft.trim(),
      createdAt: '剛剛',
      likes: 0,
    }

    setReplies((current) => [...current, reply])
    setReplyDraft('')
  }

  return (
    <main className="forum-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <PawPrint size={22} />
          </span>
          <div>
            <strong>PetTalk 寵物論壇</strong>
            <span>米格魯寵物大學 AI 進化版</span>
          </div>
        </div>
        <label className="search-box">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋帖子、標籤、作者" />
        </label>
        <div className="top-actions">
          <button type="button" className="icon-button" aria-label="通知">
            <Bell size={18} />
          </button>
          <label className="user-chip">
            <User size={16} />
            <input value={userName} onChange={(event) => setUserName(event.target.value)} />
          </label>
          <button type="button" className="primary-button" onClick={() => setComposerOpen(true)}>
            <Plus size={18} />
            發帖
          </button>
        </div>
      </header>

      <section className="forum-hero">
        <div>
          <span className="eyebrow">
            <Flame size={15} />
            寵物飼主交流站
          </span>
          <h1>發帖、回覆、看版塊，也能把寵物照片辨識結果帶進討論。</h1>
        </div>
        <div className="forum-stats">
          <span>
            <strong>{threads.length}</strong>
            主題
          </span>
          <span>
            <strong>{replies.length}</strong>
            回覆
          </span>
          <span>
            <strong>{onlineMembers.length}</strong>
            在線
          </span>
        </div>
      </section>

      <section className="forum-grid">
        <aside className="board-list">
          <button className={activeBoard === 'all' ? 'is-active' : ''} type="button" onClick={() => setActiveBoard('all')}>
            <Flame size={18} />
            <span>
              <strong>全部版塊</strong>
              <small>{threads.length} 主題</small>
            </span>
          </button>
          {boards.map((board) => {
            const Icon = board.icon
            return (
              <button
                key={board.id}
                className={activeBoard === board.id ? 'is-active' : ''}
                type="button"
                style={{ '--board-accent': board.accent } as React.CSSProperties}
                onClick={() => setActiveBoard(board.id)}
              >
                <Icon size={18} />
                <span>
                  <strong>{board.name}</strong>
                  <small>{boardThreadCount(board.id)} 主題 · {board.description}</small>
                </span>
              </button>
            )
          })}
        </aside>

        <section className="thread-list-panel">
          <div className="panel-head">
            <div>
              <span className="eyebrow">
                <MessageCircle size={15} />
                討論列表
              </span>
              <h2>{activeBoard === 'all' ? '全部主題' : boards.find((board) => board.id === activeBoard)?.name}</h2>
            </div>
            <button type="button" className="secondary-button" onClick={() => setComposerOpen(true)}>
              <Plus size={17} />
              新主題
            </button>
          </div>
          <div className="thread-list">
            {visibleThreads.map((thread) => {
              const board = boards.find((item) => item.id === thread.boardId) ?? boards[0]
              const replyCount = replies.filter((reply) => reply.threadId === thread.id).length
              return (
                <button
                  type="button"
                  className={`thread-row ${selectedThread?.id === thread.id ? 'is-selected' : ''}`}
                  key={thread.id}
                  onClick={() => setSelectedThreadId(thread.id)}
                >
                  {thread.image && <img src={thread.image} alt="" />}
                  <span className="thread-main">
                    <span className="thread-meta" style={{ color: board.accent }}>
                      {board.name}
                      {thread.pinned && <em>置頂</em>}
                      {thread.recognition && <em>AI辨識</em>}
                    </span>
                    <strong>{thread.title}</strong>
                    <small>{thread.body}</small>
                    <span className="tag-row">
                      {thread.tags.map((tag) => (
                        <i key={tag}>#{tag}</i>
                      ))}
                    </span>
                  </span>
                  <span className="thread-counts">
                    <span>
                      <Reply size={14} />
                      {replyCount}
                    </span>
                    <span>
                      <Eye size={14} />
                      {formatNumber(thread.views)}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="thread-detail-panel">
          {selectedThread && (
            <>
              <article className="thread-detail">
                <div className="detail-head">
                  <span className="eyebrow" style={{ color: selectedBoard.accent }}>
                    <SelectedBoardIcon size={15} />
                    {selectedBoard.name}
                  </span>
                  <h2>{selectedThread.title}</h2>
                  <div className="author-row">
                    <span className="avatar">{selectedThread.avatar}</span>
                    <div>
                      <strong>{selectedThread.author}</strong>
                      <small>{selectedThread.createdAt}</small>
                    </div>
                    <button type="button" className="icon-button" aria-label="收藏">
                      <Bookmark size={18} />
                    </button>
                  </div>
                </div>

                {selectedThread.image && <img className="thread-photo" src={selectedThread.image} alt="" />}
                <p>{selectedThread.body}</p>

                {selectedThread.recognition && (
                  <div className="recognition-box">
                    <div className="section-title">
                      <BarChart3 size={16} />
                      AI 照片辨識結果
                    </div>
                    <strong>
                      {selectedThread.recognition.species} · {selectedThread.recognition.guess} ·{' '}
                      {percent(selectedThread.recognition.confidence)}
                    </strong>
                    {selectedThread.recognition.predictions.map((prediction) => (
                      <div className="prediction-row" key={prediction.label}>
                        <span>{prediction.label}</span>
                        <meter min={0} max={1} value={prediction.probability} />
                        <b>{percent(prediction.probability)}</b>
                      </div>
                    ))}
                  </div>
                )}

                <div className="action-row">
                  <button type="button" onClick={() => setThreads((current) => current.map((item) => item.id === selectedThread.id ? { ...item, likes: item.likes + 1 } : item))}>
                    <Heart size={17} />
                    {selectedThread.likes}
                  </button>
                  <button type="button">
                    <MessageCircle size={17} />
                    {threadReplies.length}
                  </button>
                </div>
              </article>

              <div className="reply-list">
                <h3>回覆</h3>
                {threadReplies.length === 0 && <p className="muted">還沒有回覆，先回一樓。</p>}
                {threadReplies.map((reply) => (
                  <article className="reply-card" key={reply.id}>
                    <span className="avatar">{reply.avatar}</span>
                    <div>
                      <div className="reply-meta">
                        <strong>{reply.author}</strong>
                        <small>{reply.createdAt}</small>
                      </div>
                      <p>{reply.body}</p>
                    </div>
                  </article>
                ))}
              </div>

              <form className="reply-form" onSubmit={submitReply}>
                <textarea
                  value={replyDraft}
                  onChange={(event) => setReplyDraft(event.target.value)}
                  placeholder="參與討論，輸入你的回覆"
                />
                <button type="submit" className="primary-button">
                  <Send size={17} />
                  送出回覆
                </button>
              </form>
            </>
          )}
        </section>

        <aside className="right-rail">
          <section className="side-panel">
            <div className="section-title">
              <Camera size={16} />
              照片辨識發帖
            </div>
            <p>AI 使用瀏覽器端 MobileNet，不需要 token。可選檔、拖放或 Cmd/Ctrl+V 貼上圖片，辨識後自動帶入發帖內容。</p>
            <button type="button" className="primary-button" onClick={() => setComposerOpen(true)}>
              <Upload size={17} />
              上傳並發帖
            </button>
          </section>
          <section className="side-panel">
            <div className="section-title">
              <Tags size={16} />
              熱門標籤
            </div>
            <div className="tag-cloud">
              {hotTags.map((tag) => (
                <button key={tag} type="button" onClick={() => setQuery(tag)}>
                  #{tag}
                </button>
              ))}
            </div>
          </section>
          <section className="side-panel">
            <div className="section-title">
              <Users size={16} />
              在線會員
            </div>
            <div className="member-list">
              {onlineMembers.map((member) => (
                <span key={member}>
                  <span className="avatar">{member.slice(0, 1)}</span>
                  {member}
                </span>
              ))}
            </div>
          </section>
        </aside>
      </section>

      {composerOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="發表新主題">
          <form className="composer" onSubmit={submitThread}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">
                  <Plus size={15} />
                  發表主題
                </span>
                <h2>發新帖</h2>
              </div>
              <button type="button" className="icon-button" aria-label="關閉" onClick={() => setComposerOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <label
              className={`upload-zone ${draft.image ? 'has-image' : ''}`}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                const file = event.dataTransfer.files[0]
                if (file) void analyzeFile(file)
              }}
            >
              {draft.image ? (
                <img src={draft.image} alt="上傳照片預覽" />
              ) : (
                <span>
                  <ImageUp size={34} />
                  選擇、拖放或貼上寵物照片
                </span>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void analyzeFile(file)
                }}
              />
            </label>
            <div className="progress-panel">
              <div>
                {uploadState.busy && <Loader className="spin" size={15} />}
                <span>{uploadState.status}</span>
                <strong>{uploadState.progress}%</strong>
              </div>
              <progress max={100} value={uploadState.progress} />
            </div>

            <div className="form-grid">
              <label>
                版塊
                <select
                  value={draft.boardId}
                  onChange={(event) => setDraft((current) => ({ ...current, boardId: event.target.value as BoardId }))}
                >
                  {boards.map((board) => (
                    <option value={board.id} key={board.id}>
                      {board.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                標籤
                <input
                  value={draft.tags}
                  onChange={(event) => setDraft((current) => ({ ...current, tags: event.target.value }))}
                  placeholder="照片辨識, 狗, 犬種確認"
                />
              </label>
            </div>
            <label>
              標題
              <input
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="請輸入主題標題"
                required
              />
            </label>
            <label>
              內容
              <textarea
                value={draft.body}
                onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}
                placeholder="輸入問題、補充資訊或想討論的內容"
                required
              />
            </label>
            <button type="submit" className="primary-button">
              <Send size={17} />
              發佈主題
            </button>
          </form>
        </div>
      )}
    </main>
  )
}

export default App
