
import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  UploadCloud, 
  Image as ImageIcon, 
  FileText, 
  HardDrive, 
  Send,
  Download,
  Check,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { researchProduct, generateDetailImage } from './services/geminiService';
import { WorkflowStatus, ResearchResult, UploadedImage, LogEntry } from './types';
import WorkflowNode from './components/WorkflowNode';

const App: React.FC = () => {
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<WorkflowStatus>(WorkflowStatus.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [researchData, setResearchData] = useState<ResearchResult | null>(null);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [finalImageUrl, setFinalImageUrl] = useState<string | null>(null);
  const [needsApiKey, setNeedsApiKey] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkApiKey = async () => {
      if ((window as any).aistudio && (window as any).aistudio.hasSelectedApiKey) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
            setNeedsApiKey(true);
        }
      }
    };
    checkApiKey();
  }, []);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [{
      id: Math.random().toString(36).substring(7),
      timestamp: new Date(),
      step: status,
      message,
      type
    }, ...prev]);
  };

  const resetApp = () => {
    setInput('');
    setStatus(WorkflowStatus.IDLE);
    setLogs([]);
    setResearchData(null);
    setImages([]);
    setFinalImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || status !== WorkflowStatus.IDLE) return;

    const rawInput = input;
    setStatus(WorkflowStatus.RESEARCHING);
    addLog(`Workflow Triggered. Input: ${rawInput}`, 'system');
    addLog(`Analyzing product and cleaning technical codes...`, 'info');

    try {
      const result = await researchProduct(rawInput);
      setResearchData(result);
      addLog(`Research completed. Cleaned Name: "${result.marketingName}"`, 'success');
      setStatus(WorkflowStatus.AWAITING_IMAGES);
    } catch (error) {
      addLog(`Research failed: ${error}`, 'error');
      setStatus(WorkflowStatus.ERROR);
    }
  };

  const processFiles = (fileList: File[]) => {
    const files = fileList.slice(0, 4);
    const newImages: UploadedImage[] = [];
    let processedCount = 0;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        newImages.push({
          file,
          previewUrl: base64String,
          base64: base64Data,
          mimeType: file.type
        });
        processedCount++;
        if (processedCount === files.length) {
          setImages(newImages);
          addLog(`${newImages.length} images loaded. Ready for visual composition.`, 'info');
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(Array.from(e.target.files));
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) processFiles(Array.from(e.dataTransfer.files));
  };

  const startGeneration = async () => {
    if (!researchData || images.length === 0) return;
    setStatus(WorkflowStatus.GENERATING_IMAGE);
    addLog(`Generating 2K layout for "${researchData.marketingName}"...`, 'info');

    try {
      const apiImages = images.map(img => ({ base64: img.base64, mimeType: img.mimeType }));
      const generatedImage = await generateDetailImage(researchData, apiImages);
      setFinalImageUrl(generatedImage);
      
      addLog(`Detail page generated successfully.`, 'success');
      setStatus(WorkflowStatus.UPLOADING);
      
      setTimeout(() => {
        addLog(`Image saved to Google Drive: /DetailPages/${researchData.marketingName}.png`, 'success');
        setStatus(WorkflowStatus.COMPLETED);
      }, 2000);
    } catch (error) {
      addLog(`Generation failed: ${error}`, 'error');
      setStatus(WorkflowStatus.ERROR);
    }
  };

  const getNodeStatus = (target: WorkflowStatus) => {
    const order = [WorkflowStatus.IDLE, WorkflowStatus.RESEARCHING, WorkflowStatus.AWAITING_IMAGES, WorkflowStatus.GENERATING_IMAGE, WorkflowStatus.UPLOADING, WorkflowStatus.COMPLETED];
    const currentIndex = order.indexOf(status);
    const targetIndex = order.indexOf(target);
    if (status === WorkflowStatus.ERROR && targetIndex <= currentIndex) return 'error';
    if (status === target) return 'active';
    if (currentIndex > targetIndex) return 'completed';
    return 'pending';
  };

  if (needsApiKey) {
    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-200 p-6">
            <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 max-w-md text-center shadow-2xl">
                <AlertCircle className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-4">API Key Required</h2>
                <p className="mb-6 text-slate-400">
                    To use the Gemini 3.0 Pro Image models, you must select a paid API key from a valid Google Cloud Project.
                </p>
                <button 
                    onClick={async () => {
                         if ((window as any).aistudio?.openSelectKey) {
                             await (window as any).aistudio.openSelectKey();
                             setNeedsApiKey(false);
                         }
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-semibold transition w-full mb-4"
                >
                    Select API Key
                </button>
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline text-xs">
                    Read Billing Documentation
                </a>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 flex flex-col md:flex-row font-sans">
      <div className="w-full md:w-1/3 border-r border-slate-800 flex flex-col h-screen bg-slate-900/50">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              AutoDetailer <span className="text-xs font-mono text-slate-500">v1.1</span>
            </h1>
            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">Code-Free Marketing Engine</p>
          </div>
          {status === WorkflowStatus.COMPLETED && (
            <button onClick={resetApp} className="p-2 bg-slate-800 text-slate-400 rounded-lg hover:bg-slate-700 transition">
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-4">
            <div className="bg-slate-800 p-4 rounded-lg rounded-tl-none border border-slate-700 max-w-[90%] shadow-lg">
              <p className="text-sm">Enter a Product Name or Code. I will automatically clean technical SKUs and generate a pro detail page.</p>
            </div>
            {status !== WorkflowStatus.IDLE && (
              <div className="flex justify-end">
                 <div className="bg-blue-600 p-4 rounded-lg rounded-tr-none text-white max-w-[90%] shadow-lg">
                  <p className="text-sm font-medium">{input}</p>
                </div>
              </div>
            )}
          </div>

          {status === WorkflowStatus.AWAITING_IMAGES && (
             <div 
                className={`bg-slate-800/50 p-5 rounded-xl border border-dashed transition-all ${isDragging ? 'border-blue-400 bg-slate-800 scale-[1.02]' : 'border-slate-600'} animate-fade-in`}
                onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
             >
                <h3 className="text-xs font-bold mb-4 flex items-center text-slate-400 uppercase tracking-widest">
                  <UploadCloud className={`w-4 h-4 mr-2 ${isDragging ? 'text-blue-400' : 'text-cyan-400'}`} />
                  Step 2: Upload Assets (Max 4 - Only these are used)
                </h3>
                <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {images.map((img, idx) => (
                    <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-slate-700 shadow-inner bg-black/20">
                      <img src={img.previewUrl} className="w-full h-full object-cover" alt="preview" />
                    </div>
                  ))}
                  {images.length < 4 && (
                    <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-lg border border-slate-700 bg-slate-800 flex items-center justify-center hover:bg-slate-700 transition cursor-pointer group">
                      <span className="text-3xl text-slate-600 group-hover:text-blue-400 transition">+</span>
                    </button>
                  )}
                </div>
                <button onClick={startGeneration} disabled={images.length === 0} className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl text-xs font-bold uppercase tracking-widest disabled:opacity-30 hover:brightness-110 transition shadow-lg">
                  Generate Marketing Page
                </button>
             </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900/80">
           <form onSubmit={handleChatSubmit} className="relative">
             <input
               type="text" value={input} onChange={(e) => setInput(e.target.value)} disabled={status !== WorkflowStatus.IDLE}
               placeholder={status === WorkflowStatus.IDLE ? "Ex: Galaxy S24 Ultra SM-S928N" : "Processing..."}
               className="w-full bg-slate-800 border border-slate-700 rounded-full py-3.5 px-6 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 transition-all shadow-xl"
             />
             <button type="submit" disabled={status !== WorkflowStatus.IDLE || !input.trim()} className="absolute right-2.5 top-2.5 p-2 bg-blue-600 rounded-full text-white hover:bg-blue-500 disabled:bg-slate-700 transition shadow-lg">
               <Send className="w-4 h-4" />
             </button>
           </form>
        </div>
      </div>

      <div className="w-full md:w-1/3 border-r border-slate-800 bg-slate-900/30 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Pipeline Visualization</h2>
        </div>
        <div className="p-8 space-y-4 flex-1 overflow-y-auto">
          <WorkflowNode title="Input Analysis" icon={Bot} status={status === WorkflowStatus.IDLE ? 'pending' : 'completed'} description="Cleaning Technical Codes" />
          <div className="w-px h-8 bg-slate-800 mx-auto"></div>
          <WorkflowNode title="Fast Research" icon={FileText} status={getNodeStatus(WorkflowStatus.RESEARCHING)} description="Gemini 3 Flash" />
          <div className="w-px h-8 bg-slate-800 mx-auto"></div>
          <WorkflowNode title="Asset Mapping" icon={ImageIcon} status={getNodeStatus(WorkflowStatus.AWAITING_IMAGES)} description={`Gathered ${images.length}/4 Images`} />
          <div className="w-px h-8 bg-slate-800 mx-auto"></div>
          <WorkflowNode title="Visual Gen" icon={Bot} status={getNodeStatus(WorkflowStatus.GENERATING_IMAGE)} description="Nano Banana 2 Layout" />
          <div className="w-px h-8 bg-slate-800 mx-auto"></div>
          <WorkflowNode title="Fulfillment" icon={HardDrive} status={getNodeStatus(WorkflowStatus.UPLOADING)} description="Cloud Storage Upload" />
        </div>
        <div className="h-56 border-t border-slate-800 bg-black/20 p-5 overflow-y-auto font-mono text-[10px]">
          <h3 className="text-slate-600 mb-3 font-bold uppercase tracking-widest flex items-center">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 animate-pulse"></div> System Runtime Logs
          </h3>
          <div className="space-y-1.5 opacity-80">
            {logs.map(log => (
              <div key={log.id} className="flex gap-3 leading-relaxed">
                <span className="text-slate-600 shrink-0">{log.timestamp.toLocaleTimeString()}</span>
                <span className={log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-cyan-400' : log.type === 'system' ? 'text-blue-400' : 'text-slate-400'}>{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full md:w-1/3 bg-slate-950 flex flex-col h-screen overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
           <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Render Preview</h2>
           <div className="flex gap-2">
             {finalImageUrl && (
               <a href={finalImageUrl} download={`${researchData?.marketingName?.replace(/[^a-zA-Z0-9가-힣\s-]/g, '').trim().replace(/\s+/g, '_') || 'AutoDetailer_Result'}.png`} className="flex items-center gap-2 text-[10px] font-bold uppercase bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition shadow-lg tracking-wider">
                 <Download className="w-3.5 h-3.5" /> Download
               </a>
             )}
           </div>
        </div>

        <div className="flex-1 p-8 flex items-center justify-center overflow-auto bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-slate-950 to-slate-950">
          {finalImageUrl ? (
            <div className="relative shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden border border-slate-800 max-w-[340px] animate-fade-in group">
              <img src={finalImageUrl} alt="Generated Detail Page" className="w-full h-auto transition-transform duration-700 group-hover:scale-[1.02]" />
              <div className="absolute top-4 right-4 bg-cyan-500 text-black text-[9px] font-black px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xl">
                <Check className="w-3 h-3" /> CLOUD SAVED
              </div>
            </div>
          ) : status === WorkflowStatus.GENERATING_IMAGE ? (
            <div className="text-center">
              <div className="w-20 h-20 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-6"></div>
              <p className="text-xs font-bold text-blue-400 uppercase tracking-[0.2em] animate-pulse">Rendering Visuals...</p>
              <p className="text-[10px] text-slate-500 mt-2 font-mono">Applying cinematic lighting & masks</p>
            </div>
          ) : status === WorkflowStatus.RESEARCHING ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto animate-pulse-slow rotate-12">
                <Bot className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Gemini is Thinking...</p>
              <div className="flex justify-center gap-1">
                {[0, 1, 2].map(i => <div key={i} className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: `${i*0.2}s`}}></div>)}
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <ImageIcon className="w-16 h-16 mx-auto mb-2 opacity-5 text-slate-100" />
              <p className="text-[10px] text-slate-600 uppercase tracking-[0.3em] font-black">Waiting for Engine Startup</p>
            </div>
          )}
        </div>
        
        {!finalImageUrl && researchData && (
           <div className="h-64 border-t border-slate-800 bg-slate-900/90 p-6 overflow-y-auto backdrop-blur-xl">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Market Research Context</h3>
               <span className="text-[10px] px-2 py-0.5 bg-blue-500/20 rounded text-blue-300 border border-blue-500/30">Reasoning Active</span>
             </div>
             <div className="space-y-4">
               <div>
                  <h4 className="text-[9px] text-slate-500 uppercase font-bold mb-1">Cleaned Title</h4>
                  <p className="text-sm font-bold text-white leading-snug">{researchData.marketingName}</p>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-[9px] text-slate-500 uppercase font-bold mb-1">Features</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed">{researchData.features.split(':')[0]}</p>
                  </div>
                  <div>
                    <h4 className="text-[9px] text-slate-500 uppercase font-bold mb-1">Key Benefit</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed">{researchData.benefits.split(':')[0]}</p>
                  </div>
               </div>
             </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default App;
