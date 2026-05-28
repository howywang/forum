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
  LogIn,
  LogOut,
  MessageCircle,
  PawPrint,
  Plus,
  Reply,
  Search,
  Send,
  Shield,
  Stethoscope,
  Tags,
  Upload,
  User,
  UserPlus,
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
  memberId?: number
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
  assistant?: AssistantAdvice
  pinned?: boolean
}

type ThreadReply = {
  id: number
  threadId: number
  author: string
  avatar: string
  memberId?: number
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
  assistant?: AssistantAdvice
}

type AssistantAdvice = {
  category: string
  urgency: '一般' | '注意' | '建議就醫' | '緊急'
  boardId: BoardId
  tags: string[]
  reply: string
  disclaimer: string
}

type UploadState = {
  progress: number
  status: string
  busy: boolean
}

type Member = {
  id: number
  name: string
  password: string
  avatar: string
  xp: number
  joinedAt: string
  demo?: boolean
}

type AuthForm = {
  name: string
  password: string
  avatar: string
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
const assistantDisclaimer = '此為規則式寵物知識庫建議，不能取代獸醫診斷；若症狀嚴重或快速惡化，請直接聯絡獸醫。'

const seedMembers: Member[] = [
  { id: 1, name: 'Howy', password: 'demo', avatar: 'H', xp: 160, joinedAt: '今天', demo: true },
  { id: 2, name: 'Mia', password: 'demo', avatar: 'M', xp: 110, joinedAt: '今天', demo: true },
  { id: 3, name: '阿哲', password: 'demo', avatar: '哲', xp: 80, joinedAt: '昨天', demo: true },
  { id: 4, name: '小雨中途', password: 'demo', avatar: '雨', xp: 220, joinedAt: '昨天', demo: true },
]

const emptyDraft: Draft = {
  boardId: 'identify',
  title: '',
  body: '',
  tags: '',
}

const emptyAuthForm: AuthForm = {
  name: '',
  password: '',
  avatar: '',
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

function memberLevel(xp: number) {
  if (xp >= 300) return { name: '教授', next: 500 }
  if (xp >= 150) return { name: '研究生', next: 300 }
  if (xp >= 60) return { name: '助教', next: 150 }
  return { name: '新生', next: 60 }
}

function avatarLabel(name: string) {
  return name.trim().slice(0, 1) || '訪'
}

function isImageAvatar(avatar: string) {
  return avatar.startsWith('data:image/') || avatar.startsWith('http')
}

function Avatar({ avatar, name, size = 34 }: { avatar: string; name: string; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size }}>
      {isImageAvatar(avatar) ? <img src={avatar} alt="" /> : avatar || avatarLabel(name)}
    </span>
  )
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

function createAssistantAdvice(input: string, recognition?: Thread['recognition']): AssistantAdvice {
  const text = input.toLowerCase()
  const has = (patterns: RegExp[]) => patterns.some((pattern) => pattern.test(text))
  const tags = new Set<string>()
  let category = '一般照護'
  let urgency: AssistantAdvice['urgency'] = '一般'
  let boardId: BoardId = recognition ? 'identify' : 'daily'
  let reply = '建議補充寵物年齡、品種、體重、症狀開始時間、食慾、精神、排便排尿與最近是否換食或外出，方便其他飼主協助判斷。'

  if (recognition) {
    tags.add('照片辨識')
    tags.add(recognition.species)
    category = '照片辨識與品種確認'
    boardId = 'identify'
    reply = `照片 AI 初判為「${recognition.guess}」，信心分數 ${percent(
      recognition.confidence,
    )}。建議再補正面、側面、全身照，讓大家比對耳型、尾巴、毛色與體型。`
  }

  if (has([/不吃|沒食慾|食慾差|嘔吐|吐|拉肚子|血便|抽搐|呼吸|癱|無力|發燒|中毒|誤食/])) {
    category = '健康症狀'
    boardId = 'clinic'
    urgency = '建議就醫'
    tags.add('健康照護')
    tags.add('症狀觀察')
    reply =
      '請先記錄症狀開始時間、嘔吐/腹瀉次數、是否喝水、精神狀態、排尿排便與是否誤食。若完全不吃超過 24 小時、呼吸異常、抽搐、血便、持續嘔吐或精神明顯變差，建議直接就醫。'
  }

  if (has([/急診|抽搐|呼吸困難|中毒|誤食.*藥|休克|昏倒|大量出血|癱瘓/])) {
    urgency = '緊急'
    tags.add('急診')
    reply =
      '這類描述可能需要立即處理。請優先聯絡急診獸醫，並準備照片、影片、誤食物包裝、症狀時間線與疫苗/用藥紀錄。'
  }

  if (has([/領養|送養|認養|中途|找家/])) {
    category = '領養送養'
    boardId = 'adoption'
    urgency = '一般'
    tags.add('領養')
    reply = '建議補充年齡、性別、結紮/疫苗/驅蟲狀態、個性、是否親人親狗貓、所在地與認養條件。'
  }

  if (has([/走失|協尋|不見|跑走|目擊/])) {
    category = '走失協尋'
    boardId = 'lost'
    urgency = '注意'
    tags.add('協尋')
    reply = '請補上最後目擊時間地點、項圈/晶片資訊、明顯特徵、聯絡方式與清楚照片。建議同步通知附近獸醫院、動保處與社群。'
  }

  if (has([/吠叫|咬|分離焦慮|訓練|尿尿|社會化|攻擊|怕人/])) {
    category = '行為訓練'
    boardId = 'training'
    urgency = '一般'
    tags.add('行為訓練')
    reply = '建議描述觸發情境、頻率、持續時間、已嘗試方法與是否有影片。行為問題通常需要分階段訓練，避免用處罰加劇焦慮。'
  }

  return {
    category,
    urgency,
    boardId,
    tags: [...tags],
    reply,
    disclaimer: assistantDisclaimer,
  }
}

function loadState() {
  if (typeof window === 'undefined') {
    return { threads: seedThreads, replies: seedReplies, members: seedMembers, currentMemberId: null as number | null }
  }

  const stored = window.localStorage.getItem(storageKey)
  if (!stored) return { threads: seedThreads, replies: seedReplies, members: seedMembers, currentMemberId: null as number | null }

  try {
    const parsed = JSON.parse(stored) as Partial<{
      threads: Thread[]
      replies: ThreadReply[]
      members: Member[]
      currentMemberId: number | null
      userName: string
    }>
    return {
      threads: parsed.threads?.length ? parsed.threads : seedThreads,
      replies: parsed.replies?.length ? parsed.replies : seedReplies,
      members: parsed.members?.length ? parsed.members : seedMembers,
      currentMemberId: parsed.currentMemberId ?? null,
    }
  } catch {
    window.localStorage.removeItem(storageKey)
    return { threads: seedThreads, replies: seedReplies, members: seedMembers, currentMemberId: null as number | null }
  }
}

function App() {
  const initialState = useMemo(() => loadState(), [])
  const [threads, setThreads] = useState<Thread[]>(() => initialState.threads)
  const [replies, setReplies] = useState<ThreadReply[]>(() => initialState.replies)
  const [members, setMembers] = useState<Member[]>(() => initialState.members)
  const [currentMemberId, setCurrentMemberId] = useState<number | null>(() => initialState.currentMemberId)
  const [activeBoard, setActiveBoard] = useState<BoardId | 'all'>('all')
  const [selectedThreadId, setSelectedThreadId] = useState(initialState.threads[0]?.id ?? 101)
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [replyDraft, setReplyDraft] = useState('')
  const [composerOpen, setComposerOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authForm, setAuthForm] = useState<AuthForm>(emptyAuthForm)
  const [authError, setAuthError] = useState('')
  const [uploadState, setUploadState] = useState<UploadState>({
    progress: 0,
    status: '可選擇、拖放或貼上照片',
    busy: false,
  })
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const modelRef = useRef<MobileNet | null>(null)

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ threads, replies, members, currentMemberId }))
  }, [currentMemberId, members, replies, threads])

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
      const recognition = {
        species: pet.species,
        guess: main?.label ?? '未確認',
        confidence: main?.probability ?? 0,
        predictions,
      }
      const assistant = createAssistantAdvice('', recognition)

      setDraft((current) => ({
        ...current,
        boardId: 'identify',
        image: imageData,
        tags: [...new Set([...current.tags.split(/[,\s，]+/).filter(Boolean), ...autoTags, ...assistant.tags])].join(', '),
        title: current.title || `請協助確認：這張照片可能是${pet.species}`,
        body:
          current.body ||
          `AI 初步判斷為「${main?.label ?? '未確認'}」，信心分數 ${percent(
            main?.probability ?? 0,
          )}。想請大家協助確認品種、特徵或照護注意事項。`,
        recognition,
        assistant,
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
  const draftAssistant = createAssistantAdvice(`${draft.title} ${draft.body} ${draft.tags}`, draft.recognition)
  const currentMember = members.find((member) => member.id === currentMemberId) ?? null
  const displayName = currentMember?.name ?? '訪客飼主'
  const displayAvatar = currentMember?.avatar ?? avatarLabel(displayName)
  const displayLevel = memberLevel(currentMember?.xp ?? 0)
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

  function addMemberXp(amount: number) {
    if (!currentMemberId) return
    setMembers((current) =>
      current.map((member) => (member.id === currentMemberId ? { ...member, xp: member.xp + amount } : member)),
    )
  }

  async function uploadAuthAvatar(file: File) {
    if (!file.type.startsWith('image/')) return
    const avatar = await readFileAsDataUrl(file)
    setAuthForm((current) => ({ ...current, avatar }))
  }

  function openAuth(mode: 'login' | 'register') {
    setAuthMode(mode)
    setAuthError('')
    setAuthForm(emptyAuthForm)
    setAuthOpen(true)
  }

  function submitAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = authForm.name.trim()
    const password = authForm.password.trim()
    if (!name || !password) {
      setAuthError('請輸入帳號與密碼')
      return
    }

    if (authMode === 'login') {
      const member = members.find((item) => item.name === name && item.password === password)
      if (!member) {
        setAuthError('帳號或密碼不正確')
        return
      }
      setCurrentMemberId(member.id)
      setAuthOpen(false)
      return
    }

    const existingMember = members.find((member) => member.name === name)
    if (existingMember && !existingMember.demo) {
      setAuthError('這個暱稱已被註冊')
      return
    }

    const member: Member = {
      id: Date.now(),
      name,
      password,
      avatar: authForm.avatar || avatarLabel(name),
      xp: 0,
      joinedAt: '剛剛',
    }
    setMembers((current) => [member, ...current.filter((item) => item.name !== name)])
    setCurrentMemberId(member.id)
    setAuthOpen(false)
  }

  function resetLocalMembers() {
    setMembers(seedMembers)
    setCurrentMemberId(null)
    setAuthForm(emptyAuthForm)
    setAuthError('已重置本機會員資料')
  }

  function submitThread(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.title.trim() || !draft.body.trim()) return
    const assistant = createAssistantAdvice(`${draft.title} ${draft.body} ${draft.tags}`, draft.recognition)

    const thread: Thread = {
      id: Date.now(),
      boardId: draft.boardId === emptyDraft.boardId && !draft.recognition ? assistant.boardId : draft.boardId,
      title: draft.title.trim(),
      body: draft.body.trim(),
      author: displayName,
      avatar: displayAvatar,
      memberId: currentMemberId ?? undefined,
      createdAt: '剛剛',
      views: 1,
      likes: 0,
      tags: [...new Set([...draft.tags.split(/[,\s，]+/).filter(Boolean), ...assistant.tags])].slice(0, 8),
      image: draft.image,
      recognition: draft.recognition,
      assistant,
    }

    setThreads((current) => [thread, ...current])
    setSelectedThreadId(thread.id)
    setActiveBoard(thread.boardId)
    setDraft(emptyDraft)
    setUploadState({ progress: 0, status: '可選擇、拖放或貼上照片', busy: false })
    setComposerOpen(false)
    addMemberXp(20)
  }

  function submitReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedThread || !replyDraft.trim()) return

    const reply: ThreadReply = {
      id: Date.now(),
      threadId: selectedThread.id,
      author: displayName,
      avatar: displayAvatar,
      memberId: currentMemberId ?? undefined,
      body: replyDraft.trim(),
      createdAt: '剛剛',
      likes: 0,
    }

    setReplies((current) => [...current, reply])
    setReplyDraft('')
    addMemberXp(8)
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
          {currentMember ? (
            <div className="member-chip">
              <Avatar avatar={currentMember.avatar} name={currentMember.name} size={30} />
              <span>
                <strong>{currentMember.name}</strong>
                <small>{displayLevel.name} · {currentMember.xp} XP</small>
              </span>
            </div>
          ) : (
            <button type="button" className="secondary-button" onClick={() => openAuth('login')}>
              <LogIn size={17} />
              登入
            </button>
          )}
          {!currentMember ? (
            <button type="button" className="secondary-button" onClick={() => openAuth('register')}>
              <UserPlus size={17} />
              註冊
            </button>
          ) : (
            <button type="button" className="icon-button" aria-label="登出" onClick={() => setCurrentMemberId(null)}>
              <LogOut size={18} />
            </button>
          )}
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
            <strong>{members.length}</strong>
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
                  <span className="thread-thumb">
                    {thread.image ? <img src={thread.image} alt="" /> : <PawPrint size={30} />}
                  </span>
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
                    <Avatar avatar={selectedThread.avatar} name={selectedThread.author} />
                    <div>
                      <strong>{selectedThread.author}</strong>
                      <small>
                        {selectedThread.createdAt} · {memberLevel(members.find((member) => member.id === selectedThread.memberId)?.xp ?? 0).name}
                      </small>
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

                {selectedThread.assistant && (
                  <div className={`assistant-box urgency-${selectedThread.assistant.urgency}`}>
                    <div className="section-title">
                      <Stethoscope size={16} />
                      寵物知識庫助理
                    </div>
                    <div className="assistant-summary">
                      <span>{selectedThread.assistant.category}</span>
                      <strong>{selectedThread.assistant.urgency}</strong>
                    </div>
                    <p>{selectedThread.assistant.reply}</p>
                    <small>{selectedThread.assistant.disclaimer}</small>
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
                    <Avatar avatar={reply.avatar} name={reply.author} />
                    <div>
                      <div className="reply-meta">
                        <strong>{reply.author}</strong>
                        <small>
                          {reply.createdAt} · {memberLevel(members.find((member) => member.id === reply.memberId)?.xp ?? 0).name}
                        </small>
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
              {members.map((member) => (
                <span key={member.id}>
                  <Avatar avatar={member.avatar} name={member.name} size={28} />
                  <span>
                    <strong>{member.name}</strong>
                    <small>{memberLevel(member.xp).name} · {member.xp} XP</small>
                  </span>
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

            <div className={`assistant-box urgency-${draftAssistant.urgency}`}>
              <div className="section-title">
                <Stethoscope size={16} />
                規則式寵物助理建議
              </div>
              <div className="assistant-summary">
                <span>{draftAssistant.category}</span>
                <strong>{draftAssistant.urgency}</strong>
              </div>
              <p>{draftAssistant.reply}</p>
              <small>{draftAssistant.disclaimer}</small>
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

      {authOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={authMode === 'login' ? '會員登入' : '會員註冊'}>
          <form className="auth-modal" onSubmit={submitAuth}>
            <div className="modal-head">
              <div>
                <span className="eyebrow">
                  <User size={15} />
                  會員系統
                </span>
                <h2>{authMode === 'login' ? '會員登入' : '註冊會員'}</h2>
              </div>
              <button type="button" className="icon-button" aria-label="關閉" onClick={() => setAuthOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <label>
              暱稱
              <input
                value={authForm.name}
                onChange={(event) => setAuthForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="輸入會員暱稱"
              />
            </label>
            <label>
              密碼
              <input
                type="password"
                value={authForm.password}
                onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="輸入密碼"
              />
            </label>

            {authMode === 'register' && (
              <label className="avatar-uploader">
                大頭貼
                <span>
                  <Avatar avatar={authForm.avatar || avatarLabel(authForm.name)} name={authForm.name || '新'} size={56} />
                  <small>可上傳自己的大頭貼；沒有上傳會使用暱稱首字。</small>
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void uploadAuthAvatar(file)
                  }}
                />
              </label>
            )}

            {authError && <p className="auth-error">{authError}</p>}

            <button type="submit" className="primary-button">
              {authMode === 'login' ? <LogIn size={17} /> : <UserPlus size={17} />}
              {authMode === 'login' ? '登入' : '完成註冊'}
            </button>
            <button type="button" className="secondary-button" onClick={resetLocalMembers}>
              重置本機會員資料
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login')
                setAuthError('')
              }}
            >
              {authMode === 'login' ? '建立新帳號' : '已有帳號，前往登入'}
            </button>
          </form>
        </div>
      )}
    </main>
  )
}

export default App
