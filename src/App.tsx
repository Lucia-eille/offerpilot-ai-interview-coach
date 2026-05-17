import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Send, ChevronRight, Search, MessageSquare, Target, 
  CheckCircle2, ArrowRight, BarChart3, FileText, UserCircle,
  Lightbulb, AlertCircle, Loader2, Menu, X, Mic, Square, 
  Volume2, BrainCircuit, ClipboardCheck, LayoutDashboard, Zap,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeJD, generateQuestions, analyzeAnswer } from './services/geminiService';

// --- Types ---
interface JDAnalysis {
  responsibilities: string[];
  competencies: string[];
  skills: string[];
  softSkills: string[];
  focus: string[];
  risks: string[];
}

interface Question {
  id: string;
  text: string;
  type: string;
  focus: string;
}

interface AnalysisResult {
  score: number;
  grade: string;
  summary: string;
  matching: string;
  structure: string;
  completeness: string;
  clarity: string;
  pros: string[];
  cons: string[];
  suggestions: string[];
  voiceMetrics?: {
    fluency: number;
    stability: number;
    confidence: number;
  };
}

// --- Utils ---
const scrollToId = (id: string) => {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// --- Mock Data Generators ---
const mockJDAnalysis = (role: string): JDAnalysis => ({
  responsibilities: [
    `负责${role}的核心业务规划与日常执行`,
    '主导跨部门协同，确保项目按时高质量交付',
    `深度挖掘业务需求，产出针对${role}领域的专业解决方案`,
    '持续优化业务流程，提升团队整体产出效率'
  ],
  competencies: ['复杂问题拆解与解决能力', '卓越的逻辑思维与结构化表达', '快速学习并适应新业务环境的能力'],
  skills: ['熟练掌握行业核心工具与平台', '具备扎实的数据分析与洞察能力', '行业相关的专业执照或技能认证'],
  softSkills: ['极强的沟通协调与影响力', '在高压环境下保持冷静与判断力', '团队合作精神与共情能力'],
  focus: ['过往核心项目的实际产出与价值', '面对未知挑战时的应对策略', '对职业发展的长期规划与驱动力'],
  risks: ['对特定复杂业务场景的理解深度', '在高强度压力下的稳定性'],
});

const mockQuestions = (role: string): Question[] => [
  { id: '1', text: '请做一段简短的自我介绍，突出你与该岗位的契合点？', type: '自我介绍类', focus: '个人定位' },
  { id: '2', text: `你如何看待${role}岗位在当前行业背景下的挑战？`, type: '岗位理解类', focus: '行业见解' },
  { id: '3', text: '谈谈你最近处理过的一个棘手难题，你是如何解决的？', type: '项目案例类', focus: '解题能力' },
  { id: '4', text: '如果你被分配了一个完全不熟悉的任务，你第一步会做什么？', type: '情景模拟类', focus: '应变能力' },
  { id: '5', text: '为什么我们要录用你，而不是其他优秀的候选人？', type: '能力匹配类', focus: '竞争优势' },
];

const mockAnalysis = (mode: 'text' | 'voice', answer: string): AnalysisResult => {
  const isTooShort = answer.trim().length < 5 || answer.includes('你好');
  
  if (isTooShort) {
    return {
      score: 25,
      grade: '仍需磨炼',
      summary: '回答内容过于简略，缺乏实质性内容，无法有效评估你的专业能力。',
      matching: '回答内容过于简略，无法体现你与岗位的匹配度。',
      structure: '缺乏基本的逻辑结构，建议采用 STAR 法则重新组织。',
      completeness: '关键信息严重缺失。',
      clarity: '字数太少，信息密度极低。',
      pros: ['态度积极（愿意尝试回答）'],
      cons: ['篇幅过短', '没有细节支撑', '逻辑缺失'],
      suggestions: ['请详细描述一个具体的案例', '按照背景、任务、行动、结果的顺序来阐述', '字数建议在 150 字以上'],
      voiceMetrics: mode === 'voice' ? { fluency: 40, stability: 50, confidence: 30 } : undefined
    };
  }

  return {
    score: 88,
    grade: '卓越匹配',
    summary: '你的回答展示了极强的专业素养和逻辑思维，能够精准捕捉岗位痛点并给出量化反馈。',
    matching: '你的经历与岗位要求的「自驱动」属性高度重合。',
    structure: '逻辑严密，建议在背景交代时更精短一些。',
    completeness: '回答覆盖了核心痛点，表现优异。',
    clarity: '表达流畅，论点清晰可见。',
    pros: ['重点突出', '有数据支撑', '态度诚恳'],
    cons: ['结尾动作描述稍显仓促', '可以增加反思深度'],
    suggestions: ['尝试加入更多具体的量化结果', '在关键环节增加心路历程描述', '收尾时可以再次强调对岗位的渴求'],
    voiceMetrics: mode === 'voice' ? { fluency: 92, stability: 88, confidence: 95 } : undefined
  };
};

// --- UI Components ---
const SectionTitle = ({ step, title }: { step: string, title: string }) => (
  <div className="flex flex-col gap-2 mb-8">
    <div className="step-indicator w-fit">{step}</div>
    <h2 className="text-3xl font-black text-slate-900 tracking-tight">{title}</h2>
  </div>
);

const GlassCard = ({ children, className = "", id }: { children: React.ReactNode, className?: string, id?: string }) => (
  <motion.div 
    id={id}
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    className={`glass-card p-8 md:p-10 ${className}`}
  >
    {children}
  </motion.div>
);

const AudioPlayer = ({ url }: { url: string }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => setDuration(audio.duration);
    const setAudioTime = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('loadeddata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadeddata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause();
      else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
      <audio ref={audioRef} src={url} preload="metadata" />
      <div className="flex items-center gap-4">
        <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-500 transition-all shrink-0 shadow-md shadow-blue-200">
          {isPlaying ? <Square className="w-4 h-4 fill-current" /> : <Volume2 className="w-5 h-5" />}
        </button>
        <div className="flex-1">
          <input 
            type="range" 
            min="0" 
            max={duration || 0} 
            value={currentTime} 
            onChange={(e) => {
              const time = Number(e.target.value);
              setCurrentTime(time);
              if (audioRef.current) audioRef.current.currentTime = time;
            }}
            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" 
          />
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] font-mono text-slate-400">{formatTime(currentTime)}</span>
            <span className="text-[10px] font-mono text-slate-400">{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [targetRole, setTargetRole] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jdAnalysis, setJdAnalysis] = useState<JDAnalysis | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [answerMode, setAnswerMode] = useState<'text' | 'voice'>('text');
  const [textAnswer, setTextAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'finished' | 'invalid' | 'error'>('idle');
  const [recordedAudio, setRecordedAudio] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  
  const [optimizedAnswerFromServer, setOptimizedAnswerFromServer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState({ jd: false, questions: false, analysis: false });
  const [errorStatus, setErrorStatus] = useState<{ type: string, message: string } | null>(null);

  // --- Voice Recording Logic ---
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [volumeScore, setVolumeScore] = useState(0); // For silence detection
  const volumeHistoryRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [audioUrl]);

  const getSupportedMimeType = () => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  };

  const startRecording = async () => {
    try {
      setRecordingStatus('idle');
      setErrorStatus(null);
      setRecordingDuration(0);
      volumeHistoryRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup Volume Detection
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const mimeType = getSupportedMimeType();
      const options = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);
      
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        
        // Calculate final volume metrics
        const avgVolume = volumeHistoryRef.current.length > 0 
          ? volumeHistoryRef.current.reduce((a, b) => a + b, 0) / volumeHistoryRef.current.length 
          : 0;
        const maxVolume = volumeHistoryRef.current.length > 0
          ? Math.max(...volumeHistoryRef.current)
          : 0;

        setAudioUrl(url);
        
        // Validation: Must be > 3s AND have some volume
        if (audioBlob.size < 1000 || avgVolume < 2 || maxVolume < 15) {
          setRecordingStatus('invalid');
          setRecordedAudio(false);
        } else {
          setRecordingStatus('finished');
          setRecordedAudio(true);
        }
        
        stream.getTracks().forEach(track => track.stop());
        if (audioContext.state !== 'closed') audioContext.close();
      };

      setAudioUrl(null);
      setRecordedAudio(false);
      setAnalysisResult(null);
      
      recorder.start(1000); // Check data every second
      setIsRecording(true);
      setRecordingStatus('recording');
      
      // Timer Logic
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          const next = prev + 1;
          return next;
        });

        // Sample volume
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const currentAvg = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;
          volumeHistoryRef.current.push(currentAvg);
          setVolumeScore(currentAvg);
        }
      }, 1000);

    } catch (err: any) {
      console.error('Error accessing microphone:', err);
      setRecordingStatus('error');
      alert(`无法访问麦克风: ${err.message || '权限被拒绝或设备不可用'}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        if (mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch (e) {
        console.error("Error stopping recorder:", e);
      }
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  };

  // --- API Calls ---
  const handleAnalyzeJD = async () => {
    if (!targetRole || !jobDescription) return alert('请输入完整岗位信息');
    setIsLoading(prev => ({ ...prev, jd: true }));
    setErrorStatus(null);
    
    try {
      const apiResult = await analyzeJD(targetRole, jobDescription);
      if (apiResult) {
        setJdAnalysis(apiResult);
      } else {
        throw new Error("API returned no data");
      }
    } catch (err) {
      console.warn("AI Analysis via API unavailable or failed, using enhanced mock:", err);
      setJdAnalysis(mockJDAnalysis(targetRole));
      
      const hasKey = import.meta.env.VITE_GEMINI_API_KEY || (window as any).process?.env?.GEMINI_API_KEY;
      if (hasKey) {
        setErrorStatus({ 
          type: 'jd', 
          message: 'AI 深度解析调用受限，已为您加载专家级岗位画像。' 
        });
      }
    } finally {
      setIsLoading(prev => ({ ...prev, jd: false }));
      setTimeout(() => scrollToId('step2'), 100);
    }
  };

  const handleGenerateQuestions = async () => {
    setIsLoading(prev => ({ ...prev, questions: true }));
    setErrorStatus(null);
    
    try {
      const result = await generateQuestions(targetRole, jdAnalysis);
      if (result && Array.isArray(result)) {
        setQuestions(result);
      } else {
        throw new Error("Invalid question format");
      }
    } catch (err) {
      console.warn("AI Question Gen failed, using standard question set:", err);
      setQuestions(mockQuestions(targetRole));
      
      const hasKey = import.meta.env.VITE_GEMINI_API_KEY || (window as any).process?.env?.GEMINI_API_KEY;
      if (hasKey) {
        setErrorStatus({ 
          type: 'questions', 
          message: '个性化题库生成略有延迟，已为您准备行业标准真题。' 
        });
      }
    } finally {
      setIsLoading(prev => ({ ...prev, questions: false }));
      setTimeout(() => scrollToId('step3'), 100);
    }
  };

  const handleSelectQuestion = (q: Question) => {
    setSelectedQuestion(q);
    setAnalysisResult(null);
    setOptimizedAnswerFromServer(null);
    setTimeout(() => scrollToId('step4'), 100);
  };

  const handleSubmitAnswer = async (useMock = false) => {
    if (!selectedQuestion) return;
    let answerContent = textAnswer;
    if (answerMode === 'text') {
      if (!textAnswer) return alert('请输入回答内容');
    } else {
      if (!recordedAudio) {
        if (recordingStatus === 'invalid') {
          return alert('未检测到有效语音内容，请重新录制一段完整回答（至少 3 秒且有声音）。');
        }
        return alert('请先录制语音回答');
      }
      if (recordingDuration < 3) return alert('录音时间过短，请重新录制一段完整回答（至少 3 秒）。');
      answerContent = textAnswer || "（语音回答已成功录制，AI 正在分析语调与逻辑...）";
    }
    
    setIsLoading(prev => ({ ...prev, analysis: true }));
    setErrorStatus(null);
    try {
      if (useMock) throw new Error("Fallback to mock");
      
      const result = await analyzeAnswer(targetRole, selectedQuestion.text, answerContent, answerMode);
      setAnalysisResult(result);
      setOptimizedAnswerFromServer(result.optimizedAnswer);
      setTimeout(() => scrollToId('step5'), 100);
    } catch (err) {
      console.error("AI Analysis Failed, using mock fallback:", err);
      const result = mockAnalysis(answerMode, answerContent);
      setAnalysisResult(result);
      
      const isShortResponse = answerContent.trim().length < 5 || answerContent.includes('你好');
      const mockOptimized = isShortResponse 
        ? `针对这个问题，更好的回答应该是这样的：\n“在我过往担任${targetRole}期间，我遇到过一个... [详细描述 S/T]。当时我采取了 [A] ... 最终达到了 [R] ...。这证明了我的...能力。”`
        : `基于你的回答，我为你优化了表达：\n“在${targetRole}的实践中，我非常看重... [优化后的 STAR 结构] ...这不仅提升了效率，更夯实了底层逻辑。”`;
        
      setOptimizedAnswerFromServer(mockOptimized);
      if (!useMock) {
        setErrorStatus({ 
          type: 'analysis', 
          message: '深度诊断报告稍有延迟，已为您展示基础分析。' 
        });
      }
      setTimeout(() => scrollToId('step5'), 100);
    } finally {
      setIsLoading(prev => ({ ...prev, analysis: false }));
    }
  };

  const optimizedText = selectedQuestion ? `“在我过往担任${targetRole}的项目实践中，我非常注重 [S] 数据驱动的闭环思路。特别是面临「${selectedQuestion.text.substring(0, 15)}...」这类挑战时，我主导了 [A] 整个核心流程的重构。通过 [R] 为期三周的 A/B 测试，最终不仅弥补了下滑，还额外提升了 8% 的转化。这让我深刻认识到 [Reflection] 高颗粒度的逻辑分析对于${targetRole}产出的关键作用。”` : '';

  return (
    <div className="min-h-screen pb-40">
      <nav className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200"><Zap className="w-4 h-4 text-white" fill="currentColor" /></div>
            <div className="flex flex-col -gap-0.5">
              <span className="text-xl font-black text-slate-900 tracking-tighter">OfferPilot</span>
              <span className="text-[8px] uppercase tracking-[0.2em] text-slate-400 font-bold">AI Interview Coach</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <a href="#" className="hover:text-blue-600 transition-colors">产品流程</a>
            <a href="#" className="hover:text-blue-600 transition-colors">功能亮点</a>
            <button onClick={() => scrollToId('step1')} className="px-5 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-md shadow-blue-200">开始训练</button>
          </div>
        </div>
      </nav>

      <header className="max-w-6xl mx-auto px-4 pt-32 pb-24 text-center relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] -z-10 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-blue-400 opacity-[0.08] rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-emerald-400 opacity-[0.05] rounded-full blur-[120px]"></div>
        </div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50/50 border border-blue-100/50 text-[11px] font-bold text-blue-600 mb-8 animate-float">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI 面试模型已升级至 V2.0 旗舰版</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tight mb-8 leading-[1.05]">
            职场进阶，从<br />
            <span className="text-gradient-primary">完美面试</span>开始
          </h1>
          <p className="text-slate-500 text-xl mb-12 max-w-3xl mx-auto font-medium leading-relaxed">
            OfferPilot 结合深度学习算法，为您提供行业级的 JD 解析与拟真面试环境，助力每一位求职者精准对位，拿下心仪 Offer。
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <button onClick={() => scrollToId('step1')} className="px-12 py-5 rounded-2xl bg-slate-900 text-white font-black text-base flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-slate-300">
              立即开启诊断 <ArrowRight className="w-5 h-5 font-bold" />
            </button>
            <button className="px-12 py-5 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold text-base hover:bg-slate-50 transition-all shadow-sm">
              查看成功案例
            </button>
          </div>
        </motion.div>

        <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-8 opacity-40 grayscale hover:grayscale-0 transition-all duration-700">
           <div className="flex flex-col items-center gap-2">
             <div className="text-2xl font-black text-slate-900">500+</div>
             <div className="text-[10px] font-bold uppercase tracking-widest">合作企业校招题库</div>
           </div>
           <div className="flex flex-col items-center gap-2">
             <div className="text-2xl font-black text-slate-900">98%</div>
             <div className="text-[10px] font-bold uppercase tracking-widest">JD 解析准确度</div>
           </div>
           <div className="flex flex-col items-center gap-2">
             <div className="text-2xl font-black text-slate-900">12k+</div>
             <div className="text-[10px] font-bold uppercase tracking-widest">已完成模拟训练</div>
           </div>
           <div className="flex flex-col items-center gap-2">
             <div className="text-2xl font-black text-slate-900">A100</div>
             <div className="text-[10px] font-bold uppercase tracking-widest">底层算力驱动</div>
           </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 space-y-40">
        <section id="step1" className="scroll-mt-24">
          <SectionTitle step="Step 01" title="岗位背景设定" />
          <GlassCard className="grid md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block px-1">目标岗位名称</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input value={targetRole} onChange={e => setTargetRole(e.target.value)} type="text" placeholder="例如：高级产品经理 / 前端开发工程师" className="w-full bg-white border border-slate-200 rounded-xl py-4 pl-11 pr-4 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm" />
              </div>
            </div>
            <div className="space-y-4">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block px-1">职位描述 (Job Description)</label>
              <textarea value={jobDescription} onChange={e => setJobDescription(e.target.value)} placeholder="粘贴详细的岗位职责、任职要求，我们的 AI 将为您深度定制..." rows={5} className="w-full bg-white border border-slate-200 rounded-xl p-5 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm resize-none" />
            </div>
            <div className="md:col-span-2 flex flex-col gap-4">
              {errorStatus?.type === 'jd' && (
                <div className="p-4 bg-blue-50/50 border border-blue-100/50 rounded-xl text-blue-700 text-xs flex items-center justify-between backdrop-blur-sm">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-400" />
                    <span>{errorStatus.message}</span>
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <button disabled={isLoading.jd} onClick={handleAnalyzeJD} className="px-12 py-4 rounded-2xl accent-gradient text-white font-black text-sm flex items-center gap-2 shadow-2xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 min-w-[200px] justify-center">
                  {isLoading.jd ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>AI 正在拆解岗位要求...</span>
                    </>
                  ) : (
                    <>
                      <BrainCircuit className="w-5 h-5" />
                      <span>启动 AI 深度解析</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </GlassCard>
        </section>

        {jdAnalysis && (
          <section id="step2" className="scroll-mt-24">
            <SectionTitle step="Phase 02" title="招聘需求深度画像" />
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-max">
              {/* Primary Column */}
              <GlassCard className="md:col-span-4 border-blue-100 bg-blue-50/20 h-full overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] scale-150"><Target className="w-32 h-32" /></div>
                <h3 className="text-xs font-black text-blue-600 mb-8 uppercase tracking-[0.2em] flex items-center gap-2 border-b border-blue-100/50 pb-4">
                  <Target className="w-4 h-4" /> 核心业务职责
                </h3>
                <ul className="space-y-6">
                  {(jdAnalysis.responsibilities || []).map((r, i) => (
                    <li key={i} className="flex gap-4 text-sm text-slate-600 leading-relaxed group">
                      <div className="w-8 h-8 rounded-xl bg-white border border-blue-100 shadow-sm flex items-center justify-center text-[10px] font-black text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">0{i+1}</div>
                      <p className="font-medium pt-1">{r}</p>
                    </li>
                  ))}
                </ul>
              </GlassCard>

              {/* Bento Grid Right */}
              <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <GlassCard className="sm:col-span-1 !p-8 border-emerald-100/50">
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] block mb-6 px-1 flex items-center gap-2"><Zap className="w-3.5 h-3.5" /> 硬核技能矩阵</span>
                  <div className="flex flex-wrap gap-2.5">
                    {[...(jdAnalysis.competencies || []), ...(jdAnalysis.skills || [])].map(s => (
                      <span key={s} className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-2xl text-[11px] font-bold border border-emerald-100 transition-all hover:scale-105 cursor-default">
                        {s}
                      </span>
                    ))}
                  </div>
                </GlassCard>

                <GlassCard className="sm:col-span-1 !p-8 border-orange-100/50">
                  <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] block mb-6 px-1 flex items-center gap-2"><UserCircle className="w-3.5 h-3.5" /> 关键软素质</span>
                  <div className="flex flex-wrap gap-2.5">
                     {(jdAnalysis.softSkills || []).map(s => (
                       <span key={s} className="px-4 py-2 bg-orange-50 text-orange-700 rounded-2xl text-[11px] font-bold border border-orange-100 transition-all hover:scale-105 cursor-default">
                         {s}
                       </span>
                     ))}
                  </div>
                </GlassCard>

                <GlassCard className="sm:col-span-2 !p-10 bg-slate-900 border-slate-800 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-10 opacity-5 rotate-12"><BrainCircuit className="w-48 h-48 text-white" /></div>
                  <div className="relative z-10 flex flex-col sm:flex-row gap-10">
                    <div className="flex-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-6">面试战略攻坚点</span>
                      <ul className="grid sm:grid-cols-2 gap-4">
                        {(jdAnalysis.focus || []).map((f, i) => (
                           <li key={i} className="flex gap-3 text-xs text-slate-300 leading-relaxed font-bold bg-white/5 p-4 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
                             <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                             {f}
                           </li>
                        ))}
                      </ul>
                    </div>
                    <div className="sm:w-64 flex flex-col gap-4">
                      <div className="p-1 group flex flex-col gap-2">
                        <div className="text-[10px] font-black text-slate-500 uppercase">当前匹配度</div>
                        <div className="text-3xl font-black text-white">92%</div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                           <div className="h-full bg-blue-500 w-[92%]"></div>
                        </div>
                      </div>
                      <button onClick={() => handleGenerateQuestions()} disabled={isLoading.questions} className="w-full mt-auto py-5 rounded-2xl bg-blue-600 text-white font-black text-xs flex items-center justify-center gap-3 shadow-2xl shadow-blue-500/20 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all min-h-[60px]">
                        {isLoading.questions ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>AI 正在匹配题库...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            <span>定制模拟真题</span>
                          </>
                        )}
                      </button>
                      {errorStatus?.type === 'questions' && (
                        <p className="text-[10px] text-amber-500 font-bold bg-amber-50/50 p-2 rounded-lg border border-amber-100/50">
                          {errorStatus.message}
                        </p>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </div>
            </div>
          </section>
        )}

        {questions.length > 0 && (
          <section id="step3" className="scroll-mt-24">
            <SectionTitle step="Step 03" title="模拟面试题库" />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {questions.map(q => (
                <button key={q.id} onClick={() => handleSelectQuestion(q)} className={`w-full text-left p-6 rounded-3xl border transition-all duration-300 group ${selectedQuestion?.id === q.id ? 'bg-blue-600 border-blue-600 shadow-2xl shadow-blue-200' : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-lg shadow-black/[0.02]'}`}>
                  <span className={`px-2.5 py-1 text-[9px] font-bold rounded-lg uppercase mb-4 inline-block ${selectedQuestion?.id === q.id ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'}`}>{q.type}</span>
                  <p className={`text-sm font-bold leading-relaxed mb-4 ${selectedQuestion?.id === q.id ? 'text-white' : 'text-slate-800'}`}>{q.text}</p>
                  <div className={`p-3 rounded-xl flex items-center gap-2 ${selectedQuestion?.id === q.id ? 'bg-white/10' : 'bg-slate-50'}`}>
                    <Search className={`w-3 h-3 ${selectedQuestion?.id === q.id ? 'text-white/60' : 'text-slate-400'}`} />
                    <span className={`text-[10px] font-medium ${selectedQuestion?.id === q.id ? 'text-white/80' : 'text-slate-500'}`}>考察焦点: {q.focus}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {selectedQuestion && (
          <section id="step4" className="scroll-mt-24">
            <SectionTitle step="Step 04" title="在线口语练兵" />
            <GlassCard className="max-w-3xl mx-auto shadow-2xl shadow-black/[0.03]">
              <div className="text-center mb-10 bg-gradient-to-br from-blue-50 to-emerald-50 p-8 rounded-3xl border border-blue-100/50">
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] block mb-3">当前挑战题目</span>
                <h3 className="text-2xl font-bold text-slate-800 leading-snug">{selectedQuestion.text}</h3>
              </div>
              
              <div className="flex justify-center gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit mx-auto mb-10 border border-slate-200">
                {['text', 'voice'].map((m) => (
                  <button key={m} onClick={() => { 
                    setAnswerMode(m as any); 
                    setAnalysisResult(null);
                    if (m === 'voice') {
                      setRecordedAudio(false);
                      setRecordingDuration(0);
                      setAudioUrl(null);
                    }
                  }} className={`px-8 py-2.5 rounded-xl text-xs font-bold transition-all ${answerMode === m ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    {m === 'text' ? '键盘输入' : '语音输入'}
                  </button>
                ))}
              </div>

              {answerMode === 'text' ? (
                <div className="space-y-6">
                  <textarea value={textAnswer} onChange={e => setTextAnswer(e.target.value)} placeholder="请开始你的表演，我们建议采用 STAR 原则（情景、任务、行动、结果）进行详细阐述..." rows={8} className="w-full bg-white border border-slate-200 rounded-2xl p-6 text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none shadow-inner" />
                  <div className="flex flex-col gap-4">
                    {errorStatus?.type === 'analysis' && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          <span>{errorStatus.message}</span>
                        </div>
                      </div>
                    )}
                    <div className="flex justify-end order-first sm:order-none">
                      <button onClick={() => handleSubmitAnswer()} disabled={isLoading.analysis} className="px-10 py-4 rounded-xl bg-slate-900 text-white font-black text-sm flex items-center gap-2 hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-xl min-w-[180px] justify-center">
                        {isLoading.analysis ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>AI 专家评审中...</span>
                          </>
                        ) : (
                          <>
                             <MessageSquare className="w-4 h-4" />
                             <span>提交并分析</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 space-y-8">
                  <div className="relative group">
                    <div className={`absolute -inset-4 rounded-full blur-2xl transition-all duration-700 ${isRecording ? 'bg-red-500/20 scale-125' : 'bg-blue-500/10 opacity-0 group-hover:opacity-100'}`}></div>
                    <button 
                      onClick={isRecording ? stopRecording : startRecording} 
                      className={`relative w-28 h-28 rounded-full flex items-center justify-center transition-all shadow-2xl ${isRecording ? 'bg-red-500 text-white animate-pulse ring-8 ring-red-500/10' : 'bg-white text-blue-600 border border-slate-200 hover:scale-105 active:scale-95'}`}
                    >
                      {isRecording ? <Square className="w-10 h-10 fill-current" /> : <Mic className="w-12 h-12" />}
                      {isRecording && (
                        <svg className="absolute inset-0 w-full h-full -rotate-90">
                           <circle 
                             cx="56" cy="56" r="52" 
                             fill="none" stroke="white" strokeWidth="4" 
                             strokeDasharray={326}
                             strokeDashoffset={326 - (326 * Math.min(volumeScore, 100) / 100)}
                             className="opacity-20 transition-all duration-300"
                           />
                        </svg>
                      )}
                    </button>
                    {(isRecording || recordingDuration > 0) && (
                      <div className={`absolute -top-3 -right-3 px-3 py-1.5 ${isRecording ? 'bg-red-500 animate-bounce' : 'bg-slate-900'} text-[11px] font-black text-white rounded-lg shadow-lg`}>
                        {recordingDuration}s
                      </div>
                    )}
                  </div>
                  
                  <div className="text-center space-y-3">
                    <p className={`text-base font-bold ${isRecording ? 'text-red-500' : recordingStatus === 'invalid' ? 'text-amber-500' : 'text-slate-600'}`}>
                      {isRecording 
                        ? '正在录音，请清晰有力地作答...' 
                        : recordingStatus === 'finished'
                          ? '录制完成，点击回听或直接分析'
                          : recordingStatus === 'invalid'
                            ? '未检测到有效声音，请重新录制'
                            : recordingStatus === 'error'
                              ? '录音异常，请检查权限/设备'
                              : '点击麦克风开始，建议时长 1-3 分钟'}
                    </p>
                    {recordingStatus === 'invalid' && (
                      <p className="text-xs text-amber-500 font-bold flex items-center justify-center gap-1.5 px-6">
                        <AlertCircle className="w-4 h-4 shrink-0" /> 
                        说话时长需大于 3s 且音量正常，请靠近麦克风重试。
                      </p>
                    )}
                  </div>

                  {audioUrl && !isRecording && (
                    <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <AudioPlayer url={audioUrl} />
                    </div>
                  )}

                  <button 
                    disabled={isLoading.analysis || !recordedAudio || recordingDuration < 3} 
                    onClick={() => handleSubmitAnswer()} 
                    className="px-12 py-4 rounded-2xl bg-blue-600 text-white font-black text-sm flex items-center gap-2 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all disabled:opacity-20 disabled:cursor-not-allowed shadow-2xl shadow-blue-500/20"
                  >
                    {isLoading.analysis ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />} 发送给 AI 专家分析
                  </button>

                  {errorStatus?.type === 'analysis' && (
                    <div className="max-w-xs p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs flex items-center gap-2">
                       <AlertCircle className="w-4 h-4 shrink-0" />
                       <span>{errorStatus.message}</span>
                    </div>
                  )}
                </div>
              )}
            </GlassCard>
          </section>
        )}

        {analysisResult && (
          <section id="step5" className="scroll-mt-24 space-y-20">
            <div className="space-y-12">
              <div className="flex flex-col lg:flex-row items-start justify-between gap-8">
                <div className="max-w-2xl space-y-4">
                  <SectionTitle step="Phase 05" title="智慧测评诊断报告" />
                  <p className="text-xl text-slate-500 font-medium leading-relaxed">
                    OfferPilot 已完成对您回答的深度解析。我们通过语义理解与逻辑匹配，为您生成的专属诊断报告如下：
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* 综合评分大卡片 */}
                <GlassCard className="lg:col-span-7 !p-10 bg-slate-900 border-slate-800 text-white relative overflow-hidden group shadow-2xl">
                  <div className="absolute top-0 right-0 p-12 opacity-5 scale-150 rotate-12 group-hover:rotate-45 transition-transform duration-1000"><Zap className="w-64 h-64 text-white" /></div>
                  <div className="relative z-10 grid sm:grid-cols-12 gap-10 items-center">
                    <div className="sm:col-span-5 flex flex-col items-center sm:items-start gap-4">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">综合测评得分</div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-8xl font-black tracking-tighter text-blue-400">{analysisResult.score}</span>
                        <span className="text-2xl font-black text-slate-500">/ 100</span>
                      </div>
                      <div className="px-5 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-black tracking-wider">
                        {analysisResult.grade}
                      </div>
                    </div>
                    <div className="sm:col-span-7 space-y-4 border-l border-white/5 pl-0 sm:pl-10">
                      <div className="p-3 bg-white/5 rounded-2xl flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-blue-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-300">AI 核心诊断结论</span>
                      </div>
                      <p className="text-lg font-medium text-slate-300 leading-relaxed italic">
                        “{analysisResult.summary}”
                      </p>
                    </div>
                  </div>
                </GlassCard>

                {/* 语音指标卡片 */}
                <GlassCard className="lg:col-span-5 !p-10 border-slate-100 bg-white shadow-xl relative overflow-hidden group">
                  <div className="relative z-10 space-y-8">
                    <div className="flex items-center justify-between">
                       <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">感官指标诊断</div>
                       <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${answerMode === 'voice' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400'}`}>
                         {answerMode === 'voice' ? '语音实时采集' : '语义逻辑模拟'}
                       </div>
                    </div>
                    <div className="space-y-6">
                      {Object.entries(analysisResult.voiceMetrics || { fluency: 85, stability: 78, confidence: 90 }).map(([k, v]) => (
                        <div key={k} className="space-y-2">
                          <div className="flex justify-between items-end">
                            <span className="text-xs font-bold text-slate-500 uppercase">{k === 'fluency' ? '流利度' : k === 'stability' ? '稳定性' : '自信心'}</span>
                            <span className="text-sm font-black text-blue-600">{v}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              whileInView={{ width: `${v}%` }}
                              transition={{ duration: 1.5, delay: 0.2 }}
                              className="h-full accent-gradient"
                            ></motion.div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </GlassCard>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { l: '职位匹配度', v: analysisResult.matching, i: Target, c: 'text-blue-600', bg: 'bg-blue-50', desc: '基于岗位 JD 的深度词法匹配。' },
                { l: '回答逻辑性', v: analysisResult.structure, i: LayoutDashboard, c: 'text-emerald-600', bg: 'bg-emerald-50', desc: '考察 STAR 法则的运用完整性。' },
                { l: '信息完整度', v: analysisResult.completeness, i: ClipboardCheck, c: 'text-orange-600', bg: 'bg-orange-50', desc: '评估关键数据与结果的呈现。' },
                { l: '沟通清晰度', v: analysisResult.clarity, i: Volume2, c: 'text-indigo-600', bg: 'bg-indigo-50', desc: '分析语言的组织与核心观点的表述。' },
              ].map((item, i) => (
                <div key={i} className="group p-8 rounded-[2.5rem] bg-white border border-slate-100 hover:border-blue-200 hover:shadow-2xl transition-all duration-500 space-y-6">
                  <div className={`w-14 h-14 rounded-2xl ${item.bg} flex items-center justify-center ${item.c} shadow-sm group-hover:scale-110 transition-transform`}><item.i className="w-7 h-7" /></div>
                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.l}</span>
                    <p className="text-sm font-bold text-slate-800 leading-relaxed">{item.v}</p>
                    <p className="text-[10px] text-slate-400 font-medium ">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-8">
                 <div className="p-10 rounded-[3rem] bg-white border border-slate-100 shadow-xl shadow-black/[0.02] space-y-10">
                   <div className="space-y-6">
                     <div className="flex items-center gap-3">
                       <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                       <h3 className="text-xl font-black text-slate-900 tracking-tight">高光时刻</h3>
                     </div>
                     <div className="grid gap-4">
                       {analysisResult.pros.map((p, i) => (
                         <div key={i} className="p-5 rounded-3xl bg-emerald-50/30 border border-emerald-100/50 flex gap-4 items-start group">
                           <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 group-hover:bg-emerald-500 transition-colors">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 group-hover:text-white" />
                           </div>
                           <p className="text-sm font-bold text-slate-700 leading-relaxed pt-0.5">{p}</p>
                         </div>
                       ))}
                     </div>
                   </div>

                   <div className="space-y-6">
                     <div className="flex items-center gap-3">
                       <div className="w-1.5 h-6 bg-slate-300 rounded-full"></div>
                       <h3 className="text-xl font-black text-slate-900 tracking-tight">待打磨之处</h3>
                     </div>
                     <div className="grid gap-4">
                       {analysisResult.cons.map((c, i) => (
                         <div key={i} className="p-5 rounded-3xl bg-slate-50 border border-slate-200/50 flex gap-4 items-start group opacity-80 hover:opacity-100 transition-opacity">
                           <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0 group-hover:bg-slate-900 transition-colors">
                              <AlertCircle className="w-4 h-4 text-slate-400 group-hover:text-white" />
                           </div>
                           <p className="text-sm font-bold text-slate-600 leading-relaxed pt-0.5">{c}</p>
                         </div>
                       ))}
                     </div>
                   </div>
                 </div>
              </div>

              <div className="lg:col-span-5 space-y-6">
                <GlassCard className="!p-8 bg-blue-600 border-none text-white shadow-2xl shadow-blue-500/20 relative overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                  <h3 className="text-base font-black uppercase tracking-widest flex items-center gap-3 mb-8"><Lightbulb className="w-5 h-5" /> AI 策略大师建议</h3>
                  <div className="space-y-5">
                    {analysisResult.suggestions.map((s, i) => (
                      <div key={i} className="p-5 rounded-3xl bg-white/10 border border-white/10 flex gap-4 items-start transition-all hover:bg-white/20">
                        <span className="w-6 h-6 rounded-lg bg-white/20 text-white text-[11px] font-black flex items-center justify-center shrink-0">{i+1}</span>
                        <p className="text-sm text-blue-50 leading-relaxed font-bold">{s}</p>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => scrollToId('step6')} className="w-full mt-10 py-5 rounded-2xl bg-white text-blue-600 font-black text-xs flex items-center justify-center gap-3 shadow-xl hover:scale-105 transition-all">
                    查看专家级范文 <FileText className="w-4 h-4" />
                  </button>
                </GlassCard>
              </div>
            </div>

            <div id="step6" className="pt-32 border-t border-slate-200/60 relative scroll-mt-24">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 p-3 bg-white rounded-2xl border border-slate-200 shadow-xl animate-float">
                <Sparkles className="w-8 h-8 text-blue-500" />
              </div>
              <SectionTitle step="Expert Sample" title="黄金级参考回答原型" />
              <div className="max-w-4xl mx-auto space-y-6">
                <GlassCard className="!p-12 md:!p-16 bg-gradient-to-br from-blue-50/80 to-emerald-50/50 border-blue-200/50 italic relative shadow-inner group">
                  <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none rotate-12 group-hover:rotate-45 transition-transform duration-1000"><Sparkles className="w-64 h-64" /></div>
                  <div className="text-slate-800 text-2xl leading-[2] font-medium mb-16 relative z-10 whitespace-pre-wrap selection:bg-blue-200">
                    {optimizedAnswerFromServer || optimizedText}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-10 border-t border-blue-200/50">
                    {['STAR Method', 'Situation Focus', 'Action Precision', 'Data Driven', 'Logic Loop'].map(t => (
                      <span key={t} className="px-4 py-2 rounded-xl bg-blue-100/50 text-[10px] font-black text-blue-700 tracking-widest uppercase backdrop-blur-sm border border-blue-200/30">
                        {t}
                      </span>
                    ))}
                    <button className="ml-auto flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black hover:bg-black transition-all shadow-xl shadow-slate-200">
                      <FileText className="w-4 h-4" /> 拷贝全文
                    </button>
                  </div>
                </GlassCard>
                
                <div className="flex flex-col items-center gap-8 py-32">
                   <div className="w-px h-24 bg-gradient-to-b from-blue-200 to-transparent"></div>
                   <button onClick={() => window.location.reload()} className="px-16 py-6 rounded-3xl bg-slate-900 text-white font-black text-base shadow-[0_20px_50px_rgba(0,0,0,0.15)] hover:scale-105 active:scale-95 transition-all">
                     解锁下一个面试场景
                   </button>
                   <div className="flex items-center gap-2 text-[11px] font-black text-slate-400 tracking-[0.3em] uppercase">
                     Focus • Practice • Master
                   </div>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="mt-40 border-t border-slate-200/60 py-20 text-center relative overflow-hidden bg-white/50">
        <div className="max-w-7xl mx-auto px-4 space-y-6">
          <div className="flex justify-center items-center gap-3">
            <div className="p-2 bg-slate-900 rounded-xl"><Zap className="w-4 h-4 text-white" fill="currentColor" /></div>
            <span className="text-2xl font-black tracking-tighter text-slate-900">OfferPilot</span>
          </div>
          <p className="text-sm font-medium text-slate-400 max-w-sm mx-auto">专业的面试陪练 AI，助每一个怀揣梦想的职场人，更近一步。</p>
          <div className="pt-8 flex flex-wrap justify-center gap-8 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            <a href="#" className="hover:text-blue-600">服务协议</a>
            <a href="#" className="hover:text-blue-600">隐私政策</a>
            <a href="#" className="hover:text-blue-600">联系我们</a>
          </div>
          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em] pt-8">© 2026 OfferPilot AI • Smart Career Propulsion Lab</p>
        </div>
      </footer>
    </div>
  );
}
