import { useEffect, useMemo, useRef, useState } from 'react'
import type { MobileNet } from '@tensorflow-models/mobilenet'
import {
  AlertTriangle,
  BarChart3,
  Camera,
  Cat,
  CheckCircle,
  Clock,
  Dog,
  FileText,
  HeartPulse,
  History,
  ImageUp,
  Info,
  Loader,
  MessageCircle,
  PawPrint,
  RefreshCw,
  SearchCheck,
  Send,
  Shield,
  Sparkles,
  Tags,
  Upload,
  X,
} from 'lucide-react'
import './App.css'

type Prediction = {
  label: string
  probability: number
}

type PetSpecies = 'dog' | 'cat' | 'rabbit' | 'bird' | 'fish' | 'reptile' | 'small-pet' | 'unknown'

type Analysis = {
  id: number
  image: string
  fileName: string
  createdAt: string
  species: PetSpecies
  speciesName: string
  confidence: number
  breedGuess: string
  predictions: Prediction[]
  tags: string[]
}

type CasePost = {
  id: number
  title: string
  body: string
  image?: string
  tags: string[]
  replies: number
  createdAt: string
}

const storageKey = 'pet-lens-state-v1'
const apiBase = import.meta.env.VITE_API_BASE?.replace(/\/$/, '')

const petRules: Array<{
  species: PetSpecies
  name: string
  icon: typeof Dog
  keywords: string[]
  tags: string[]
}> = [
  {
    species: 'dog',
    name: '狗狗',
    icon: Dog,
    keywords: [
      'dog',
      'terrier',
      'retriever',
      'poodle',
      'chihuahua',
      'corgi',
      'husky',
      'malamute',
      'beagle',
      'spaniel',
      'collie',
      'shepherd',
      'mastiff',
      'hound',
      'boxer',
      'pug',
      'samoyed',
      'dalmatian',
      'shih-tzu',
      'schnauzer',
      'doberman',
      'rottweiler',
    ],
    tags: ['狗', '犬種辨識', '行為照護'],
  },
  {
    species: 'cat',
    name: '貓咪',
    icon: Cat,
    keywords: ['cat', 'tabby', 'tiger cat', 'persian', 'siamese', 'egyptian cat', 'lynx'],
    tags: ['貓', '貓種辨識', '健康觀察'],
  },
  {
    species: 'rabbit',
    name: '兔子',
    icon: PawPrint,
    keywords: ['rabbit', 'hare', 'bunny'],
    tags: ['兔', '草食寵物', '照護'],
  },
  {
    species: 'bird',
    name: '鳥類',
    icon: PawPrint,
    keywords: ['bird', 'parrot', 'macaw', 'cockatoo', 'lorikeet', 'finch', 'canary'],
    tags: ['鳥', '鳥類辨識', '籠舍'],
  },
  {
    species: 'fish',
    name: '魚類',
    icon: PawPrint,
    keywords: ['fish', 'goldfish', 'guppy', 'aquarium'],
    tags: ['魚', '水族', '魚種辨識'],
  },
  {
    species: 'reptile',
    name: '爬蟲',
    icon: PawPrint,
    keywords: ['turtle', 'lizard', 'gecko', 'iguana', 'snake', 'chameleon'],
    tags: ['爬蟲', '環境溫控', '品種辨識'],
  },
  {
    species: 'small-pet',
    name: '小型寵物',
    icon: PawPrint,
    keywords: ['hamster', 'guinea pig', 'mouse', 'squirrel', 'ferret'],
    tags: ['小寵', '籠舍', '照護'],
  },
]

const fallbackCases: CasePost[] = [
  {
    id: 1,
    title: '辨識結果像柴犬，但耳朵和毛色不太確定',
    body: '模型判斷為 spitz 類型，想請大家幫忙看是否有混到米克斯。',
    tags: ['狗', '犬種辨識'],
    replies: 12,
    createdAt: '今天',
  },
  {
    id: 2,
    title: '照片辨識為 tabby cat，想確認是不是虎斑',
    body: '背部花紋很明顯，但臉部顏色偏淡，想整理領養資料。',
    tags: ['貓', '貓種辨識'],
    replies: 8,
    createdAt: '昨天',
  },
]

const emptyAnalysis: Analysis | null = null

function loadState() {
  if (typeof window === 'undefined') {
    return { history: [] as Analysis[], cases: fallbackCases }
  }

  const stored = window.localStorage.getItem(storageKey)
  if (!stored) return { history: [] as Analysis[], cases: fallbackCases }

  try {
    const parsed = JSON.parse(stored) as Partial<{ history: Analysis[]; cases: CasePost[] }>
    return {
      history: parsed.history ?? [],
      cases: parsed.cases?.length ? parsed.cases : fallbackCases,
    }
  } catch {
    window.localStorage.removeItem(storageKey)
    return { history: [] as Analysis[], cases: fallbackCases }
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
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

function normalizeLabel(label: string) {
  return label.toLowerCase()
}

function classifyPet(predictions: Prediction[]) {
  const ranked = predictions
    .map((prediction) => {
      const normalized = normalizeLabel(prediction.label)
      const rule = petRules.find((item) => item.keywords.some((keyword) => normalized.includes(keyword)))
      return { prediction, rule }
    })
    .find((item) => item.rule)

  if (!ranked?.rule) {
    return {
      species: 'unknown' as PetSpecies,
      speciesName: '未確認寵物',
      confidence: predictions[0]?.probability ?? 0,
      breedGuess: predictions[0]?.label ?? '無法辨識',
      tags: ['需人工確認', '照片辨識'],
    }
  }

  return {
    species: ranked.rule.species,
    speciesName: ranked.rule.name,
    confidence: ranked.prediction.probability,
    breedGuess: ranked.prediction.label,
    tags: ranked.rule.tags,
  }
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`
}

function createPostFromAnalysis(analysis: Analysis): CasePost {
  return {
    id: Date.now(),
    title: `請協助確認：這張照片可能是${analysis.speciesName}`,
    body: `系統最高判斷為「${analysis.breedGuess}」，信心分數 ${percent(
      analysis.confidence,
    )}。想請大家協助確認品種、外觀特徵或照護注意事項。`,
    image: analysis.image,
    tags: analysis.tags,
    replies: 0,
    createdAt: '剛剛',
  }
}

function sanitizeCasePost(post: CasePost): CasePost {
  return {
    ...post,
    tags: Array.isArray(post.tags) ? post.tags : [],
    replies: Number.isFinite(post.replies) ? post.replies : 0,
  }
}

function App() {
  const initialState = useMemo(() => loadState(), [])
  const [analysis, setAnalysis] = useState<Analysis | null>(emptyAnalysis)
  const [history, setHistory] = useState<Analysis[]>(() => initialState.history)
  const [cases, setCases] = useState<CasePost[]>(() => initialState.cases)
  const [status, setStatus] = useState('上傳一張寵物照片開始辨識')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [caseDraft, setCaseDraft] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const modelRef = useRef<MobileNet | null>(null)

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ history, cases }))
  }, [cases, history])

  useEffect(() => {
    if (!apiBase) return

    const controller = new AbortController()

    fetch(`${apiBase}/api/cases`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('cases request failed')
        return response.json() as Promise<{ cases?: CasePost[] }>
      })
      .then((payload) => {
        if (payload.cases?.length) {
          setCases(payload.cases.map(sanitizeCasePost))
          setStatus('已連線後端案例庫')
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          console.warn(error)
          setStatus('後端暫時無法連線，已切換本機紀錄')
        }
      })

    return () => controller.abort()
  }, [])

  async function analyzeFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setStatus('請選擇 JPG、PNG、WebP 等圖片檔')
      return
    }

    setIsAnalyzing(true)
    setStatus('正在讀取照片')

    try {
      const imageData = await readFileAsDataUrl(file)
      const image = await loadImage(imageData)

      setStatus('正在載入照片辨識模型')
      await import('@tensorflow/tfjs')
      const mobilenetModel = await import('@tensorflow-models/mobilenet')
      modelRef.current ??= await mobilenetModel.load()

      setStatus('正在分析寵物特徵')
      const predictions = (await modelRef.current.classify(image, 5)).map((prediction) => ({
        label: prediction.className,
        probability: prediction.probability,
      }))
      const petResult = classifyPet(predictions)
      const nextAnalysis: Analysis = {
        id: Date.now(),
        image: imageData,
        fileName: file.name,
        createdAt: new Intl.DateTimeFormat('zh-TW', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date()),
        predictions,
        ...petResult,
      }

      setAnalysis(nextAnalysis)
      setHistory((current) => [nextAnalysis, ...current].slice(0, 8))
      setCaseDraft(
        `系統判斷：${nextAnalysis.speciesName} / ${nextAnalysis.breedGuess}（${percent(
          nextAnalysis.confidence,
        )}）`,
      )
      setStatus('辨識完成')
    } catch {
      setStatus('辨識失敗，請換一張清楚的照片再試一次')
    } finally {
      setIsAnalyzing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) void analyzeFile(file)
  }

  async function publishCase() {
    if (!analysis) return
    const basePost = createPostFromAnalysis(analysis)
    const post = {
      ...basePost,
      body: caseDraft.trim() ? `${basePost.body}\n\n補充：${caseDraft.trim()}` : basePost.body,
    }

    setCases((current) => [post, ...current])

    if (!apiBase) {
      setStatus('已建立本機辨識討論案例')
      return
    }

    try {
      const response = await fetch(`${apiBase}/api/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...post, image: undefined }),
      })
      if (!response.ok) throw new Error('case publish failed')

      const payload = (await response.json()) as { case?: CasePost }
      if (payload.case) {
        setCases((current) => [
          sanitizeCasePost({ ...payload.case, image: post.image } as CasePost),
          ...current.filter((item) => item.id !== post.id),
        ])
      }
      setStatus('已同步到後端案例庫')
    } catch (error) {
      console.warn(error)
      setStatus('後端同步失敗，案例已保存在本機')
    }
  }

  const currentRule = analysis ? petRules.find((rule) => rule.species === analysis.species) : undefined
  const SpeciesIcon = currentRule?.icon ?? PawPrint

  return (
    <main className="petlens">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <SearchCheck size={22} />
          </span>
          <div>
            <strong>PetLens 寵物照片辨識</strong>
            <span>上傳照片，快速判斷寵物類型與可能品種</span>
          </div>
        </div>
        <div className="topbar-status">
          {isAnalyzing ? <Loader size={16} className="spin" /> : <Shield size={16} />}
          {status}
        </div>
      </header>

      <section className="recognition-workbench">
        <div className="upload-panel">
          <div className="panel-heading">
            <span className="eyebrow">
              <Camera size={15} />
              照片辨識
            </span>
            <h1>上傳寵物照片，立即辨識可能的寵物種類。</h1>
            <p>適合辨識貓、狗、兔、鳥、魚、爬蟲與小型寵物。模型在你的瀏覽器執行，照片不會送到伺服器。</p>
          </div>

          <label
            className={`drop-zone ${isDragging ? 'is-dragging' : ''} ${analysis ? 'has-image' : ''}`}
            onDragOver={(event) => {
              event.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            {analysis ? (
              <img src={analysis.image} alt="目前辨識的寵物照片" />
            ) : (
              <span className="drop-placeholder">
                <ImageUp size={44} />
                <strong>拖放照片到這裡</strong>
                <small>或點擊選擇檔案</small>
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

          <div className="upload-actions">
            <button type="button" className="primary-button" onClick={() => fileInputRef.current?.click()}>
              <Upload size={18} />
              選擇照片
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={isAnalyzing}
              onClick={() => fileInputRef.current?.click()}
            >
              <RefreshCw size={18} />
              重新選擇
            </button>
          </div>
        </div>

        <section className="result-panel" aria-label="辨識結果">
          {!analysis ? (
            <div className="empty-result">
              <Sparkles size={36} />
              <h2>等待照片</h2>
              <p>辨識完成後會顯示寵物類型、可能品種、信心分數、AI 原始分類與可帶入論壇的標籤。</p>
            </div>
          ) : (
            <>
              <div className="result-summary">
                <span className="species-icon">
                  <SpeciesIcon size={30} />
                </span>
                <div>
                  <span className="eyebrow">
                    <CheckCircle size={15} />
                    主要判斷
                  </span>
                  <h2>{analysis.speciesName}</h2>
                  <p>{analysis.breedGuess}</p>
                </div>
                <strong className="confidence">{percent(analysis.confidence)}</strong>
              </div>

              <div className="result-grid">
                <div>
                  <span>檔名</span>
                  <strong>{analysis.fileName}</strong>
                </div>
                <div>
                  <span>辨識時間</span>
                  <strong>{analysis.createdAt}</strong>
                </div>
              </div>

              <div className="prediction-list">
                <div className="section-title">
                  <BarChart3 size={16} />
                  AI 原始分類
                </div>
                {analysis.predictions.map((prediction) => (
                  <div className="prediction-row" key={prediction.label}>
                    <div>
                      <span>{prediction.label}</span>
                      <strong>{percent(prediction.probability)}</strong>
                    </div>
                    <meter min={0} max={1} value={prediction.probability} />
                  </div>
                ))}
              </div>

              <div className="tag-box">
                <div className="section-title">
                  <Tags size={16} />
                  建議標籤
                </div>
                <div className="tag-row">
                  {analysis.tags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
              </div>

              <div className="notice">
                <Info size={17} />
                <p>照片辨識只適合做外觀與品種初判；健康、年齡、品種純度與醫療問題仍需要獸醫或專業人士確認。</p>
              </div>
            </>
          )}
        </section>
      </section>

      <section className="support-grid">
        <aside className="history-panel">
          <div className="section-title">
            <History size={16} />
            最近辨識
          </div>
          {history.length === 0 ? (
            <p className="muted">尚無辨識紀錄。</p>
          ) : (
            <div className="history-list">
              {history.map((item) => (
                <button type="button" key={item.id} onClick={() => setAnalysis(item)}>
                  <img src={item.image} alt="" />
                  <span>
                    <strong>{item.speciesName}</strong>
                    <small>{item.breedGuess}</small>
                  </span>
                  <em>{percent(item.confidence)}</em>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="case-panel">
          <div className="case-composer">
            <div>
              <span className="eyebrow">
                <MessageCircle size={15} />
                辨識後討論
              </span>
              <h2>把辨識結果發成案例</h2>
              <p>辨識不確定時，可以把結果轉成論壇案例，讓其他飼主協助確認外觀特徵。</p>
            </div>
            <textarea
              value={caseDraft}
              onChange={(event) => setCaseDraft(event.target.value)}
              placeholder="上傳照片後可補充年齡、體型、地點或你想確認的問題"
            />
            <button type="button" className="primary-button" disabled={!analysis} onClick={() => void publishCase()}>
              <Send size={18} />
              建立討論案例
            </button>
          </div>

          <div className="case-list">
            {cases.map((item) => (
              <article key={item.id} className="case-card">
                {item.image && <img src={item.image} alt="" />}
                <div>
                  <div className="case-meta">
                    <span>
                      <Clock size={14} />
                      {item.createdAt}
                    </span>
                    <span>
                      <MessageCircle size={14} />
                      {item.replies}
                    </span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                  <div className="tag-row">
                    {item.tags.map((tag) => (
                      <span key={tag}>#{tag}</span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="guide-panel">
          <div className="section-title">
            <HeartPulse size={16} />
            拍照建議
          </div>
          <ul>
            <li>照片保持明亮，避免過度裁切臉部或身體。</li>
            <li>同一隻寵物可拍正面、側面、全身各一張。</li>
            <li>若要判斷品種，請避開衣服、牽繩或背景物遮擋。</li>
            <li>走失協尋建議保留項圈、毛色、體型與明顯花紋。</li>
          </ul>
          <div className="warning-box">
            <AlertTriangle size={17} />
            <span>醫療判斷請不要只依賴照片辨識。</span>
          </div>
          <button
            type="button"
            className="clear-button"
            onClick={() => {
              setAnalysis(null)
              setHistory([])
              setStatus('已清除辨識紀錄')
            }}
          >
            <X size={16} />
            清除紀錄
          </button>
        </aside>
      </section>

      <footer>
        <FileText size={15} />
        PetLens 使用瀏覽器端 AI 模型進行寵物照片初步辨識。
      </footer>
    </main>
  )
}

export default App
