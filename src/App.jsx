import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, serverTimestamp } from 'firebase/firestore';
import { 
  Cpu, 
  Layers, 
  Palette, 
  Zap, 
  Maximize2, 
  PenTool, 
  Settings2, 
  Save, 
  Image as ImageIcon,
  MousePointer2,
  Wind,
  Sun,
  Layout,
  Terminal,
  Activity,
  ChevronRight,
  Database,
  BarChart3,
  ShieldCheck,
  History,
  X,
  RefreshCw,
  Eye,
  AlertTriangle
} from 'lucide-react';

/**
 * NEO-ARCH | v3.0.7 [DIAGNOSTIC_UPGRADE]
 * Feature: Real-time Runtime Error Reporting in UI
 */

// --- 1. CONFIGURATION & FALLBACKS ---
const getFirebaseConfig = () => {
  try {
    if (typeof __firebase_config !== 'undefined' && __firebase_config) return JSON.parse(__firebase_config);
  } catch (e) {}
  return { 
    apiKey: "DEMO_KEY", authDomain: "demo.firebaseapp.com", projectId: "demo-project", 
    storageBucket: "demo.appspot.com", messagingSenderId: "000", appId: "1:000:web:000" 
  };
};

const firebaseConfig = getFirebaseConfig();
let app, auth, db, isDemoMode = false;

try {
  if (firebaseConfig.apiKey !== "DEMO_KEY" && firebaseConfig.apiKey !== "YOUR_ACTUAL_FIREBASE_API_KEY") {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } else {
    isDemoMode = true;
  }
} catch (e) {
  isDemoMode = true;
}

const appId = (typeof __app_id !== 'undefined' ? __app_id : 'neo-arch-eval').replace(/[\/\.]/g, '_');

const App = () => {
  const [activeStyle, setActiveStyle] = useState('blueprint');
  const [logs, setLogs] = useState(["[SYSTEM] KERNEL_LOADED", "[MODE] EVALUATION_ACCESS_GRANTED"]);
  const [params, setParams] = useState({ complexity: 6, lineWeight: 1.2, neuralWeight: 0.85 });
  const [user, setUser] = useState(null);
  const [savedProjects, setSavedProjects] = useState([]);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [evalData, setEvalData] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [runtimeError, setRuntimeError] = useState(null);

  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const GEMINI_API_KEY = ""; 

  // --- SELF-DIAGNOSTIC KERNEL ---
  useEffect(() => {
    const handleError = (event) => {
      const errorMsg = event.error?.message || "Unknown Runtime Error";
      addLog(`CRITICAL: ${errorMsg}`);
      setRuntimeError(errorMsg);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  const MOCK_PROJECTS = [
    { id: '1', style: 'blueprint', params: { complexity: 8, lineWeight: 1.0 }, timestamp: { toDate: () => new Date() } },
    { id: '2', style: 'wireframe', params: { complexity: 4, lineWeight: 2.5 }, timestamp: { toDate: () => new Date(Date.now() - 86400000) } }
  ];

  const MOCK_CRITIQUES = [
    "Spatial hierarchy optimized for high-density volumetric massing.",
    "Neural trace suggests high structural integrity with minimal load paths.",
    "Aesthetic coherence achieved through parametric edge distribution.",
    "Optimal geometric resolution for neo-futuristic urban integration."
  ];

  useEffect(() => {
    if (isDemoMode) {
      setUser({ uid: 'EVALUATOR_GUEST', isAnonymous: true });
      setSavedProjects(MOCK_PROJECTS);
      addLog("AUTH: RUNNING_IN_SIMULATION_MODE");
    } else {
      const initAuth = async () => {
        try {
          if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
          } else {
            await signInAnonymously(auth);
          }
        } catch (err) {
          addLog("AUTH: CLOUD_ERROR - FALLING_BACK_TO_SIM");
          setUser({ uid: 'EVALUATOR_GUEST' });
          setSavedProjects(MOCK_PROJECTS);
        }
      };
      initAuth();
      if (auth) return onAuthStateChanged(auth, (u) => u && setUser(u));
    }
  }, []);

  useEffect(() => {
    if (!user || isDemoMode || !db) return;
    const projectCol = collection(db, 'artifacts', appId, 'users', user.uid, 'projects');
    return onSnapshot(projectCol, (snap) => {
      setSavedProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => addLog(`VAULT: SYNC_ERR_${err.code}`));
  }, [user]);

  const addLog = (msg) => setLogs(p => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p].slice(0, 8));

  const saveToVault = async () => {
    if (isDemoMode) {
      addLog("VAULT: SIM_WRITE_SUCCESS");
      setSavedProjects(p => [{ id: Date.now().toString(), style: activeStyle, params, timestamp: { toDate: () => new Date() } }, ...p]);
      return;
    }
    addLog("VAULT: SYNCING...");
    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'projects'), {
        style: activeStyle, params, timestamp: serverTimestamp()
      });
      addLog("VAULT: SYNC_COMPLETE");
    } catch (e) { addLog("ERR: CLOUD_WRITE_FAIL"); }
  };

  const evaluateDesign = async () => {
    setIsEvaluating(true);
    addLog("AUDIT: SCANNING_VOLUMETRICS...");
    const scores = { 
      structure: (1 - (params.lineWeight / 5)) * 100, 
      complexity: (params.complexity / 12) * 100,
      neural: params.neuralWeight * 100
    };

    if (!GEMINI_API_KEY) {
      setTimeout(() => {
        setEvalData({ scores, critique: MOCK_CRITIQUES[Math.floor(Math.random() * MOCK_CRITIQUES.length)] });
        addLog("AUDIT: SIM_RESULTS_GENERATED");
        setIsEvaluating(false);
      }, 1200);
      return;
    }

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Critique this 3D architectural massing: Complexity ${params.complexity}/12. One short sentence.` }] }]
        })
      });
      const data = await response.json();
      setEvalData({ scores, critique: data.candidates?.[0]?.content?.parts?.[0]?.text });
      addLog("AUDIT: LIVE_REPORT_SYNCED");
    } catch (e) { 
      setEvalData({ scores, critique: "Neural bridge timeout. Using local heuristics." }); 
    }
    setIsEvaluating(false);
  };

  useEffect(() => {
    if (!containerRef.current) return;
    let renderer, scene, camera, group;
    
    try {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(75, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      containerRef.current.appendChild(renderer.domElement);

      group = new THREE.Group();
      scene.add(group);
      scene.add(new THREE.GridHelper(20, 20, 0x083344, 0x083344));

      const updateGeometry = () => {
        group.clear();
        const color = 0x22d3ee;
        for (let i = 0; i < params.complexity; i++) {
          const h = 1.5 + Math.random() * 5;
          const geo = new THREE.BoxGeometry(2, h, 2);
          const line = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color }));
          const angle = (i / params.complexity) * Math.PI * 2;
          line.position.set(Math.cos(angle) * 5, h/2, Math.sin(angle) * 5);
          group.add(line);
        }
      };

      updateGeometry();
      camera.position.set(10, 10, 10);
      camera.lookAt(0, 2, 0);

      const animate = () => {
        if (!renderer) return;
        requestAnimationFrame(animate);
        group.rotation.y += 0.004;
        renderer.render(scene, camera);
      };
      animate();
    } catch (e) {
      addLog(`ENGINE: WEBGL_LOAD_ERR_${e.message}`);
    }

    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (renderer) containerRef.current?.removeChild(renderer.domElement);
    };
  }, [params.complexity]);

  return (
    <div className="flex flex-col h-screen bg-[#020617] text-cyan-50 font-sans overflow-hidden selection:bg-cyan-500/30">
      <header className="h-20 flex items-center justify-between px-8 border-b border-cyan-500/20 bg-black/40 backdrop-blur-xl z-50">
        <div className="flex items-center gap-6">
          <div className="p-3 bg-black border border-cyan-500/50 rounded-sm skew-x-[-12deg] shadow-[0_0_15px_rgba(34,211,238,0.4)]"><Cpu className="text-cyan-400 w-6 h-6 skew-x-[12deg]" /></div>
          <div>
            <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none">NEO<span className="text-cyan-400">ARCH</span></h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[9px] font-black text-cyan-800 uppercase tracking-widest">{isDemoMode ? 'EVAL_MODE_ACTIVE' : 'VAULT_LINK_ONLINE'}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setIsVaultOpen(true)} className="px-4 py-2 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold uppercase hover:bg-cyan-500/10 transition">Vault</button>
          <button onClick={saveToVault} className="px-6 py-2 border border-cyan-400 text-cyan-400 text-[10px] font-bold uppercase hover:bg-cyan-400 hover:text-black transition">Sync</button>
          <button onClick={evaluateDesign} className="px-8 py-2 bg-cyan-500 text-black text-[10px] font-black uppercase shadow-[0_0_25px_rgba(34,211,238,0.5)] transition hover:bg-cyan-400 active:scale-95">
            {isEvaluating ? <RefreshCw className="animate-spin w-3 h-3" /> : 'Run Audit'}
          </button>
        </div>
      </header>

      <main className="flex flex-1 relative">
        <section className="flex-1 relative bg-[#020617]">
          <div ref={containerRef} className="w-full h-full" />
          
          {runtimeError && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md z-50 p-6">
               <div className="bg-red-950/40 border border-red-500/50 p-10 rounded-3xl max-w-xl w-full text-center">
                 <AlertTriangle size={48} className="text-red-500 mx-auto mb-6" />
                 <h2 className="text-red-400 font-black uppercase tracking-widest mb-2">Kernel Panic</h2>
                 <p className="text-red-200/60 font-mono text-xs leading-relaxed">{runtimeError}</p>
                 <button onClick={() => window.location.reload()} className="mt-8 px-8 py-2 bg-red-500 text-white font-black uppercase text-[10px] rounded-lg">Attempt Re-Sync</button>
               </div>
             </div>
          )}

          {evalData && (
            <div className="absolute top-10 right-10 w-72 bg-black/90 border border-cyan-500/40 p-6 animate-in slide-in-from-right backdrop-blur-xl z-40">
               <div className="flex justify-between items-center mb-6"><h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2"><BarChart3 size={14}/> Spatial_Audit</h3><X size={14} className="cursor-pointer text-cyan-900 hover:text-white" onClick={() => setEvalData(null)} /></div>
               <div className="space-y-4">
                 <ScoreBar label="STRUCTURE" score={evalData.scores.structure} />
                 <ScoreBar label="COMPLEXITY" score={evalData.scores.complexity} />
                 <ScoreBar label="NEURAL" score={evalData.scores.neural} />
               </div>
               <p className="mt-6 pt-6 border-t border-cyan-500/10 text-[11px] text-neutral-300 italic leading-relaxed">"{evalData.critique}"</p>
            </div>
          )}
        </section>

        {isVaultOpen && (
          <aside className="absolute inset-y-0 right-0 w-96 bg-black border-l border-cyan-500/20 z-[100] p-8 flex flex-col animate-in slide-in-from-right shadow-2xl">
            <div className="flex justify-between items-center mb-8"><h2 className="text-sm font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2"><Database size={16}/> Vault_Units</h2><X className="cursor-pointer text-cyan-900 hover:text-cyan-400 transition" onClick={() => setIsVaultOpen(false)} /></div>
            <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide">
              {savedProjects.map((p) => (
                <div key={p.id} className="p-4 bg-neutral-950 border border-cyan-500/10 hover:border-cyan-500/40 transition cursor-pointer" onClick={() => setParams(p.params)}>
                  <div className="flex justify-between text-[10px] text-cyan-600 uppercase font-black mb-1"><span>{p.style}</span> <span>{Math.round(p.params.complexity*10)}%</span></div>
                  <div className="text-[9px] text-neutral-700 font-mono italic">{p.timestamp?.toDate().toLocaleString()}</div>
                </div>
              ))}
            </div>
          </aside>
        )}
        
        <aside className="w-80 border-l border-cyan-500/10 bg-black/60 p-8 flex flex-col gap-10 backdrop-blur-md">
          <div className="space-y-8">
            <h3 className="text-[10px] font-black text-cyan-800 uppercase tracking-[0.4em] flex items-center gap-2"><Settings2 size={14}/> Control_Array</h3>
            <Slider label="COMPLEXITY" val={params.complexity} min={2} max={12} onChange={v => setParams(p => ({...p, complexity: v}))} />
            <Slider label="TRACE_W" val={params.lineWeight} min={0.5} max={4} onChange={v => setParams(p => ({...p, lineWeight: v}))} />
            <Slider label="NEURAL_ST" val={params.neuralWeight} min={0.1} max={1} onChange={v => setParams(p => ({...p, neuralWeight: v}))} />
          </div>
          <div className="mt-auto">
             <div className="flex items-center gap-2 mb-3 text-[10px] font-black text-cyan-900 uppercase"><Terminal size={12}/> Kernel_Flow</div>
             <div className="bg-cyan-950/5 border border-cyan-500/10 p-4 h-48 overflow-y-auto font-mono text-[9px] text-cyan-700 space-y-2 scrollbar-hide">
                {logs.map((l, i) => <div key={i} className={i === 0 ? "text-cyan-400" : ""}>{l}</div>)}
             </div>
          </div>
        </aside>
      </main>

      <footer className="h-10 bg-black border-t border-cyan-500/10 flex items-center px-6 justify-between text-[8px] font-mono tracking-[0.2em] text-cyan-900">
        <div className="flex gap-8 items-center">
           <span>UUID: {user?.uid.substring(0,12) || 'OFFLINE'}</span>
           <span className="flex items-center gap-2 border-l border-cyan-900 pl-8"><Activity size={10}/> WEBGL_CORE_STABLE</span>
        </div>
        <div className="flex items-center gap-4">
           {isDemoMode && <span className="text-yellow-600 font-black border border-yellow-900/30 px-2 py-0.5 rounded italic">PREVIEW_ONLY</span>}
           <span className="text-cyan-800">BUILD_3.0.7</span>
        </div>
      </footer>
    </div>
  );
};

const ScoreBar = ({ label, score }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[9px] font-mono text-cyan-600 uppercase"><span>{label}</span><span>{Math.round(score)}%</span></div>
    <div className="w-full bg-cyan-950 h-1 rounded-full overflow-hidden"><div className="h-full bg-cyan-400 transition-all duration-1000" style={{ width: `${score}%` }}></div></div>
  </div>
);

const Slider = ({ label, val, min, max, onChange }) => (
  <div className="space-y-4">
    <div className="flex justify-between text-[9px] font-black text-cyan-800 uppercase tracking-widest"><span>{label}</span><span className="text-white font-mono">{val}</span></div>
    <input type="range" min={min} max={max} step={0.1} value={val} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full h-[2px] bg-cyan-950 appearance-none accent-cyan-500 cursor-pointer" />
  </div>
);

// --- STANDALONE MOUNTING LOGIC ---
const rootElement = document.getElementById('root');
if (rootElement) { createRoot(rootElement).render(<App />); }

export default App;
