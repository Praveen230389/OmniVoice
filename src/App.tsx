import { useState, useRef, ChangeEvent } from 'react';
import { Mic, Settings2, FileText, Code, PlaySquare, StopCircle, RefreshCw, Layers, Upload, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
interface GenerationSettings {
  speed: number;
  duration: string;
  steps: number;
  denoise: boolean;
  guidance: number;
  preprocess: boolean;
  postprocess: boolean;
}

interface DubbingSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
}

const DEFAULT_SETTINGS: GenerationSettings = {
  speed: 1.0,
  duration: '',
  steps: 32,
  denoise: true,
  guidance: 2.0,
  preprocess: true,
  postprocess: true,
};

const LANGUAGES = [
  "Auto", "Afrikaans", "Albanian", "Amharic", "Arabic", "Armenian", "Assamese", "Azerbaijani", "Basque", "Belarusian", "Bengali", "Bosnian", "Bulgarian", "Burmese", "Catalan", "Cebuano", "Chichewa", "Chinese (Mandarin)", "Chinese (Cantonese)", "Corsican", "Croatian", "Czech", "Danish", "Dutch", "English", "Esperanto", "Estonian", "Filipino", "Finnish", "French", "Frisian", "Galician", "Georgian", "German", "Greek", "Gujarati", "Haitian Creole", "Hausa", "Hawaiian", "Hebrew", "Hindi", "Hmong", "Hungarian", "Icelandic", "Igbo", "Indonesian", "Irish", "Italian", "Japanese", "Javanese", "Kannada", "Kazakh", "Khmer", "Kinyarwanda", "Korean", "Kurdish (Kurmanji)", "Kyrgyz", "Lao", "Latin", "Latvian", "Lithuanian", "Luxembourgish", "Macedonian", "Malagasy", "Malay", "Malayalam", "Maltese", "Maori", "Marathi", "Mongolian", "Myanmar (Burmese)", "Nepali", "Norwegian", "Odia (Oriya)", "Pashto", "Persian", "Polish", "Portuguese", "Punjabi", "Romanian", "Russian", "Samoan", "Scots Gaelic", "Serbian", "Sesotho", "Shona", "Sindhi", "Sinhala", "Slovak", "Slovenian", "Somali", "Spanish", "Sundanese", "Swahili", "Swedish", "Tajik", "Tamil", "Tatar", "Telugu", "Thai", "Turkish", "Turkmen", "Ukrainian", "Urdu", "Uyghur", "Uzbek", "Vietnamese", "Welsh", "Xhosa", "Yiddish", "Yoruba", "Zulu"
];

const CATEGORIES = {
  gender: { label: 'Gender / 性别', options: ["Auto", "Male / 男", "Female / 女"] },
  age: { label: 'Age / 年龄', options: ["Auto", "Child / 儿童", "Teenager / 少年", "Young Adult / 青年", "Middle-aged / 中年", "Elderly / 老年"] },
  pitch: { label: 'Pitch / 音调', options: ["Auto", "Very Low Pitch / 极低音调", "Low Pitch / 低音调", "Moderate Pitch / 中音调", "High Pitch / 高音调", "Very High Pitch / 极高音调"] },
  style: { label: 'Style / 风格', options: ["Auto", "Whisper / 耳语"] },
  englishAccent: { label: 'English Accent / 英文口音', options: ["Auto", "American Accent / 美式口音", "Australian Accent / 澳大利亚口音", "British Accent / 英国口音", "Chinese Accent / 中国口音", "Canadian Accent / 加拿大口音", "Indian Accent / 印度口音", "Korean Accent / 韩国口音", "Portuguese Accent / 葡萄牙口音", "Russian Accent / 俄罗斯口音", "Japanese Accent / 日本口音"] },
  chineseDialect: { label: 'Chinese Dialect / 中文方言', options: ["Auto", "Henan Dialect / 河南话", "Shaanxi Dialect / 陕西话", "Sichuan Dialect / 四川话", "Guizhou Dialect / 贵州话", "Yunnan Dialect / 云南话", "Guilin Dialect / 桂林话", "Jinan Dialect / 济南话", "Shijiazhuang Dialect / 石家庄话", "Gansu Dialect / 甘肃话", "Ningxia Dialect / 宁夏话", "Qingdao Dialect / 青岛话", "Northeast Dialect / 东北话"] }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'clone' | 'design' | 'dubbing'>('clone');
  const [backendUrl, setBackendUrl] = useState('');
  
  // Shared text
  const [textToSynthesize, setTextToSynthesize] = useState('');
  const [language, setLanguage] = useState('Auto');
  const [settings, setSettings] = useState<GenerationSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);

  // Voice Clone
  const [refAudio, setRefAudio] = useState<File | null>(null);
  const [refText, setRefText] = useState('');
  const [instruct, setInstruct] = useState('');
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Voice Design
  const [designSelections, setDesignSelections] = useState<Record<string, string>>({
    gender: 'Auto', age: 'Auto', pitch: 'Auto', style: 'Auto', englishAccent: 'Auto', chineseDialect: 'Auto'
  });

  // Dubbing (SRT) component state
  const [segments, setSegments] = useState<DubbingSegment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const handleGenerate = () => {
    if (!backendUrl) {
      alert("Please enter the Ngrok URL in the sidebar first.");
      return;
    }
    if (!textToSynthesize && activeTab !== 'dubbing') {
      alert("Please enter text to synthesize.");
      return;
    }
    alert(`Generation request prepared for: ${backendUrl}\nThis would send the data to your Google Colab OmniVoice backend.`);
  };

  const handleAudioUpload = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setRefAudio(e.target.files[0]);
  };

  const parseTime = (timeStr: string) => {
    const parts = timeStr.trim().split(':');
    let seconds = 0;
    if (parts.length === 3) {
      seconds += parseInt(parts[0], 10) * 3600;
      seconds += parseInt(parts[1], 10) * 60;
      seconds += parseFloat(parts[2].replace(',', '.'));
    } else if (parts.length === 2) {
      seconds += parseInt(parts[0], 10) * 60;
      seconds += parseFloat(parts[1].replace(',', '.'));
    }
    return seconds;
  };

  const parseSubtitles = (content: string) => {
    const blocks = content.trim().replace(/\r\n/g, '\n').split(/\n\s*\n/);
    const parsed: DubbingSegment[] = [];
    for (const block of blocks) {
      if (block.startsWith('WEBVTT')) continue;
      const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const timingLineIdx = lines.findIndex(l => l.includes('-->'));
      if (timingLineIdx === -1) continue;
      const timingStr = lines[timingLineIdx];
      const match = timingStr.split('-->');
      if (match.length >= 2) {
        parsed.push({
          id: Math.random().toString(36).substr(2, 9),
          text: lines.slice(timingLineIdx + 1).join(' '),
          startTime: parseTime(match[0]),
          endTime: parseTime(match[1])
        });
      }
    }
    setSegments(parsed.sort((a, b) => a.startTime - b.startTime));
  };

  const handleSrtUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        parseSubtitles(event.target.result as string);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const loadSampleSrt = () => {
    const sample = `1\n00:00:00,000 --> 00:00:02,500\nThis is the first sentence.\n\n2\n00:00:05,000 --> 00:00:07,500\nThere was a short pause before this.\n\n3\n00:00:09,000 --> 00:00:11,500\nAnd another pause here as a final test.`;
    parseSubtitles(sample);
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    window.speechSynthesis.cancel();
  };

  const handlePlayPreview = () => {
    if (segments.length === 0) return alert("Please upload an SRT/VTT file first.");
    stopPlayback();
    setIsPlaying(true);
    
    const startTimeMs = Date.now();
    timerRef.current = setInterval(() => {
      setCurrentTime((Date.now() - startTimeMs) / 1000);
    }, 100);

    let maxDuration = 10;
    if (segments.length > 0) {
      maxDuration = segments[segments.length - 1].endTime + 2;
    }

    segments.forEach(segment => {
      if (!segment.text.trim()) return;
      const t = setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(segment.text);
        window.speechSynthesis.speak(utterance);
      }, segment.startTime * 1000);
      timeoutsRef.current.push(t);
    });

    const stopT = setTimeout(() => {
      stopPlayback();
    }, maxDuration * 1000);
    timeoutsRef.current.push(stopT);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 flex flex-col md:flex-row font-sans">
      
      {/* Sidebar Configuration */}
      <aside className="w-full md:w-80 border-r border-neutral-800 bg-neutral-900/40 flex flex-col h-auto md:h-screen lg:sticky lg:top-0 scrollbar-hide">
        <div className="p-6 border-b border-neutral-800">
          <h1 className="text-xl font-medium tracking-tight text-white flex items-center gap-3">
            <Layers className="text-indigo-400" /> OmniVoice Demo
          </h1>
          <p className="text-neutral-400 mt-2 text-xs leading-relaxed">
            State-of-the-art TTS model for 600+ languages. Connect your backend Google Colab via Ngrok.
          </p>
        </div>

        <div className="p-6 space-y-8 flex-1 overflow-y-auto">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-widest flex items-center gap-2">
              <Code size={14} /> Connection
            </h2>
            <div className="space-y-2">
              <label className="text-xs text-neutral-400 font-medium">Ngrok Backend URL (If using this UI)</label>
              <input 
                type="text" 
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="https://xxxx-xxx.ngrok.io"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none transition-colors"
              />
              <div className="text-[10px] text-neutral-500 space-y-2 mt-2">
                <p><strong>To use this custom UI with Colab:</strong></p>
                <p>Copy and run this in a Colab block:</p>
                <pre className="bg-neutral-900 border border-neutral-800 p-2 rounded text-[9.5px] mt-1 overflow-x-auto text-neutral-300 select-all font-mono leading-relaxed">
{`# RUN THIS IN A GOOGLE COLAB BLOCK

# 1. Install OmniVoice and tools
!pip install -q omnivoice pyngrok
!npm install -q -g localtunnel

# 2. Clone YOUR uploaded React UI repo
!rm -rf /content/MyUI
!git clone https://github.com/Praveen230389/OmniVoice.git /content/MyUI
!cd /content/MyUI && npm install

import subprocess
import time
from pyngrok import ngrok

# 3. Setup Ngrok for the Backend API
ngrok.set_auth_token("YOUR_NGROK_TOKEN")
api_url = ngrok.connect(8000).public_url

print("\\n" + "="*50)
print("✅ YOUR BACKEND API URL IS:")
print(api_url)
print("(Copy this to paste into the 'Connection' tab in the UI)")
print("="*50 + "\\n")

# 4. Start Python Backend in background
subprocess.Popen(["omnivoice-demo", "--ip", "0.0.0.0", "--port", "8000"])

# 5. Start React Frontend in background (Vite)
subprocess.Popen(["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"], cwd="/content/MyUI")
time.sleep(5)

print("✅ CLICK THE LINK BELOW TO OPEN YOUR REACT UI:")
!lt --port 3000`}
                </pre>
                
                <p className="mt-3 text-indigo-400 border-t border-neutral-800 pt-2 mb-1"><strong>To run official UI directly without Ngrok:</strong></p>
                <pre className="bg-neutral-900 border border-neutral-800 p-2 rounded text-[9.5px] overflow-x-auto text-neutral-300 select-all font-mono leading-relaxed">
{`!pip install omnivoice

!omnivoice-demo --share`}
                </pre>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-widest flex items-center gap-2">
              <Settings2 size={14} /> Gen Settings
            </h2>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-left text-neutral-300 hover:border-neutral-600 transition-colors flex justify-between items-center"
            >
              Advanced Output Filters
              <span>{showSettings ? '▾' : '▸'}</span>
            </button>
            
            {showSettings && (
              <div className="space-y-4 p-4 border border-neutral-800 rounded-lg bg-neutral-950/50">
                <div className="space-y-1">
                  <label className="text-xs text-neutral-400">Speed (1.0 = normal)</label>
                  <input type="range" min="0.5" max="1.5" step="0.05" value={settings.speed} onChange={e => setSettings({...settings, speed: parseFloat(e.target.value)})} className="w-full accent-indigo-500" />
                  <div className="text-xs text-right text-neutral-500">{settings.speed}x</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-neutral-400">Inference Steps</label>
                  <input type="range" min="4" max="64" step="1" value={settings.steps} onChange={e => setSettings({...settings, steps: parseInt(e.target.value)})} className="w-full accent-indigo-500" />
                  <div className="text-xs text-right text-neutral-500">{settings.steps}</div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-neutral-400">Guidance Scale (CFG)</label>
                  <input type="range" min="0" max="4" step="0.1" value={settings.guidance} onChange={e => setSettings({...settings, guidance: parseFloat(e.target.value)})} className="w-full accent-indigo-500" />
                  <div className="text-xs text-right text-neutral-500">{settings.guidance}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="dn" checked={settings.denoise} onChange={e => setSettings({...settings, denoise: e.target.checked})} className="accent-indigo-500 rounded bg-neutral-800 border-neutral-700" />
                  <label htmlFor="dn" className="text-xs text-neutral-300 cursor-pointer">Denoise Output</label>
                </div>
              </div>
            )}
          </section>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col h-auto md:h-screen overflow-y-auto bg-neutral-950">
        <div className="p-6 lg:p-10 max-w-5xl mx-auto w-full space-y-6">
          
          <div className="flex gap-8 border-b border-neutral-800 pb-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
            <button onClick={() => setActiveTab('clone')} className={`pb-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'clone' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-neutral-200'}`}>Voice Clone</button>
            <button onClick={() => setActiveTab('design')} className={`pb-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'design' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-neutral-200'}`}>Voice Design</button>
            <button onClick={() => setActiveTab('dubbing')} className={`pb-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'dubbing' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-neutral-200'}`}>Video Dubbing (SRT)</button>
          </div>

          <AnimatePresence mode="wait">
            
            {/* VOICE CLONE TAB */}
            {activeTab === 'clone' && (
              <motion.div key="clone" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-neutral-300">Text to Synthesize / 待合成文本</label>
                    <textarea 
                      value={textToSynthesize} onChange={e => setTextToSynthesize(e.target.value)} 
                      placeholder="Enter the text you want to synthesize..."
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-sm focus:border-indigo-500 outline-none transition-colors min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-neutral-300">Reference Audio / 参考音频</label>
                    <div onClick={() => audioInputRef.current?.click()} className="border-2 border-dashed border-neutral-800 hover:border-indigo-500/50 bg-neutral-900/50 rounded-lg p-4 text-center cursor-pointer transition-colors group">
                      <Mic className="mx-auto text-neutral-500 group-hover:text-indigo-400 mb-2" size={20} />
                      <p className="text-xs text-neutral-300">{refAudio ? refAudio.name : "Click to upload reference audio (.wav, .mp3)"}</p>
                    </div>
                    <input type="file" ref={audioInputRef} accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-neutral-300">Reference Text (optional)</label>
                    <textarea 
                      value={refText} onChange={e => setRefText(e.target.value)} 
                      placeholder="Transcript of the reference audio."
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-sm focus:border-indigo-500 outline-none transition-colors" rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-neutral-300">Language</label>
                      <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-sm focus:border-indigo-500 outline-none">
                        {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-neutral-300">Instruct (optional)</label>
                      <input type="text" value={instruct} onChange={e => setInstruct(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-sm focus:border-indigo-500 outline-none" />
                    </div>
                  </div>

                  <button onClick={handleGenerate} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all">
                    Generate / 生成
                  </button>
                </div>
                
                <div className="bg-neutral-900/30 border border-neutral-800 rounded-xl p-6 flex flex-col items-center justify-center min-h-[300px]">
                  <p className="text-neutral-500 text-sm">Output Audio / 合成结果</p>
                  <div className="mt-4 w-full h-16 bg-neutral-900 rounded-full border border-neutral-800 flex items-center justify-center opacity-50">
                    <Play size={20} className="text-neutral-600" />
                  </div>
                  <p className="text-neutral-600 text-xs mt-4">Status / 状态: Ready.</p>
                </div>
              </motion.div>
            )}

            {/* VOICE DESIGN TAB */}
            {activeTab === 'design' && (
              <motion.div key="design" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-neutral-300">Text to Synthesize / 待合成文本</label>
                    <textarea 
                      value={textToSynthesize} onChange={e => setTextToSynthesize(e.target.value)} 
                      placeholder="Enter the text you want to synthesize..."
                      className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-sm focus:border-indigo-500 outline-none transition-colors min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-neutral-300">Language</label>
                    <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2.5 text-sm focus:border-indigo-500 outline-none">
                      {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(CATEGORIES).map(([key, cat]) => (
                      <div key={key} className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-400">{cat.label}</label>
                        <select 
                          value={designSelections[key] || "Auto"} 
                          onChange={(e) => setDesignSelections({...designSelections, [key]: e.target.value})}
                          className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-[11px] focus:border-indigo-500 outline-none truncate"
                        >
                          {cat.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>

                  <button onClick={handleGenerate} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all">
                    Generate / 生成
                  </button>
                </div>
                
                <div className="bg-neutral-900/30 border border-neutral-800 rounded-xl p-6 flex flex-col items-center justify-center min-h-[300px]">
                  <p className="text-neutral-500 text-sm">Output Audio / 合成结果</p>
                  <div className="mt-4 w-full h-16 bg-neutral-900 rounded-full border border-neutral-800 flex items-center justify-center opacity-50">
                    <Play size={20} className="text-neutral-600" />
                  </div>
                  <p className="text-neutral-600 text-xs mt-4">Status / 状态: Ready.</p>
                </div>
              </motion.div>
            )}

            {/* VIDEO DUBBING SRT TAB */}
            {activeTab === 'dubbing' && (
              <motion.div key="dubbing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6 max-w-3xl mx-auto">
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-8 text-center">
                  <FileText className="mx-auto text-indigo-400 mb-4" size={36} />
                  <h3 className="text-lg font-medium text-white mb-2">Upload SRT or VTT</h3>
                  <p className="text-sm text-indigo-200/60 mb-6 max-w-lg mx-auto">
                    Upload an .srt subtitle file. Send the timings to local OmniVoice (via Ngrok) to pad generated speech automatically, perfectly fitting the original video timing.
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-colors">
                      <Upload size={18} /> Browse File
                    </button>
                    <button onClick={loadSampleSrt} className="flex items-center gap-2 px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-bold border border-neutral-700 transition-colors">
                      <FileText size={18} /> Try Sample
                    </button>
                  </div>
                  <input type="file" ref={fileInputRef} accept=".srt,.vtt" className="hidden" onChange={handleSrtUpload} />
                </div>

                {segments.length > 0 && (
                  <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <PlaySquare size={16} className="text-neutral-400" /> Parsed Timings ({segments.length})
                      </span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setSegments([])} className="text-red-400 text-xs px-2 py-1.5 max-h-min hover:bg-red-500/10 rounded">Clear</button>
                        {isPlaying ? (
                          <button onClick={stopPlayback} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors">
                            <StopCircle size={14} /> Stop
                          </button>
                        ) : (
                          <button onClick={handlePlayPreview} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-neutral-800 text-white border border-neutral-700 rounded hover:bg-neutral-700 transition-colors">
                            <Play size={14} /> Preview Timing
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto p-4 space-y-3 bg-neutral-950">
                      {segments.map((seg, i) => (
                        <div key={seg.id} className={`p-3 rounded border transition-colors ${isPlaying && currentTime >= seg.startTime && currentTime <= seg.endTime ? 'border-indigo-500 bg-indigo-500/10' : 'border-neutral-800 bg-neutral-900'}`}>
                           <div className="flex justify-between text-xs font-mono text-neutral-500 mb-1">
                             <span>Seg #{i + 1}</span>
                             <span className="text-indigo-400">{seg.startTime.toFixed(1)}s → {seg.endTime.toFixed(1)}s</span>
                           </div>
                           <p className="text-sm text-neutral-200">{seg.text}</p>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 border-t border-neutral-800">
                      <button onClick={handleGenerate} className="w-full flex justify-center items-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg">
                        <RefreshCw size={18} /> Send to Backend for Synced Generation
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

    </div>
  );
}
