import React, { useState, useEffect, useRef } from 'react';
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
  RefreshCw
} from 'lucide-react';

// --- PRODUCTION GUARD: PREVENT WHITE SCREEN ---
// We check if we are in the Canvas environment or a standalone build (Netlify)
const getFirebaseConfig = () => {
  try {
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
      return JSON.parse(__firebase_config);
    }
  } catch (e) {
    console.warn("Production Mode: Internal config missing. Please paste your Firebase keys here.");
  }
  // FALLBACK: Replace this empty object with your keys from Firebase Console
  return { 
    apiKey: "YOUR_API_KEY", 
    authDomain: "YOUR_PROJECT.firebaseapp.com", 
    projectId: "YOUR_PROJECT_ID", 
    storageBucket: "YOUR_PROJECT.appspot.com", 
    messagingSenderId: "YOUR_ID", 
    appId: "YOUR_APP_ID" 
  };
};

const firebaseConfig = getFirebaseConfig();
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Rule 1: Ensure appId is a single segment even if path-like
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'neo-arch-default';
const appId = rawAppId.replace(/[\/\.]/g, '_');

const App = () => {
  const [activeStyle, setActiveStyle] = useState('blueprint');
  const [isGenerating, setIsGenerating] = useState(false);
  const [logs, setLogs] = useState(["INIT: NEO-KERNEL LOADED", "AUTH: CONNECTING..."]);
  const [params, setParams] = useState({ complexity: 4, lineWeight: 1.5, neuralWeight: 0.8 });
  const [user, setUser] = useState(null);
  const [savedProjects, setSavedProjects] = useState([]);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [evalData, setEvalData] = useState(null);

  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const apiKey = ""; 

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        addLog("AUTH: ERR_INITIALIZING");
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if(u) addLog(`VAULT: LINKED TO ID_${u.uid.substring(0,6)}`);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const projectCol = collection(db, 'artifacts', appId, 'users', user.uid, 'projects');
    const unsubscribe = onSnapshot(projectCol, (snapshot) => {
      setSavedProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => addLog("ERR: SYNC_FAILED"));
    return () => unsubscribe();
  }, [user]);

  const saveToVault = async () => {
    if (!user) return;
    addLog("VAULT: SYNCING...");
    try {
      const projectCol = collection(db, 'artifacts', appId, 'users', user.uid, 'projects');
      await addDoc(projectCol, {
        style: activeStyle,
        params,
        timestamp: serverTimestamp()
      });
      addLog("VAULT: SAVED_OK");
    } catch (err) { addLog("ERR: SAVE_FAILED"); }
  };

  const evaluateDesign = async () => {
    addLog("AUDIT: ANALYZING...");
    const scores = { 
      structure: (1 - (params.lineWeight / 5)) * 100, 
      complexity: (params.complexity / 12) * 100, 
      neural: params.neuralWeight * 100 
    };
    
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Critique this 3D architectural massing: Complexity ${params.complexity}/12. One short sentence.` }] }]
        })
      });
      const data = await response.json();
      setEvalData({ scores, critique: data.candidates?.[0]?.content?.parts?.[0]?.text || "Optimal geometry detected." });
      addLog("AUDIT: COMPLETE");
    } catch (e) { setEvalData({ scores, critique: "Neural audit timed out." }); }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(75, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);
    scene.add(new THREE.GridHelper(20, 20, 0x083344, 0x083344));

    const updateGeometry = () => {
      group.clear();
      const color = 0x22d3ee;
      for (let i = 0; i < params.complexity; i++) {
        const h = 2 + Math.random() * 5;
        const geo = new THREE.BoxGeometry(2, h, 2);
        const line = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color }));
        const angle = (i / params.complexity) * Math.PI * 2;
        line.position.set(Math.cos(angle) * 5, h/2, Math.sin(angle) * 5);
        group.add(line);
      }
    };

    updateGeometry();
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);

    const animate = () => {
      requestAnimationFrame(animate);
      group.rotation.y += 0.005;
      renderer.render(scene, camera);
    };
    animate();

    return () => { containerRef.current?.removeChild(renderer.domElement); };
  }, [params.complexity]);

  const addLog = (msg) => setLogs(p => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p].slice(0, 8));

  return (
    <div className="flex flex-col h-screen bg-[#020617] text-cyan-50 font-sans overflow-hidden">
      <header className="h-20 flex items-center justify-between px-8 border-b border-cyan-500/20 bg-black/40 backdrop-blur-xl z-50">
        <div className="flex items-center gap-6">
          <div className="p-3 bg-black border border-cyan-500/50 rounded-sm skew-x-[-12deg]"><Cpu className="text-cyan-400 w-6 h-6 skew-x-[12deg]" /></div>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter">NEO<span className="text-cyan-400">ARCH</span></h1>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setIsVaultOpen(true)} className="px-4 py-2 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold uppercase hover:bg-cyan-500/10 transition">Vault</button>
          <button onClick={saveToVault} className="px-6 py-2 border border-cyan-400 text-cyan-400 text-[10px] font-bold uppercase hover:bg-cyan-400 hover:text-black transition">Sync</button>
          <button onClick={evaluateDesign} className="px-8 py-2 bg-cyan-500 text-black text-[10px] font-black uppercase shadow-[0_0_20px_rgba(34,211,238,0.4)] transition">Audit</button>
        </div>
      </header>

      <main className="flex flex-1 relative">
        <section className="flex-1 relative bg-[#020617]">
          <div ref={containerRef} className="w-full h-full" />
          {evalData && (
            <div className="absolute top-10 right-10 w-72 bg-black/80 border border-cyan-500/30 p-6 animate-in slide-in-from-right">
               <div className="flex justify-between items-center mb-6"><h3 className="text-[10px] font-black text-cyan-400 uppercase">Audit_Report</h3><X size={14} className="cursor-pointer" onClick={() => setEvalData(null)} /></div>
               <div className="space-y-4">
                 <ScoreBar label="STRUCTURE" score={evalData.scores.structure} />
                 <ScoreBar label="NEURAL" score={evalData.scores.neural} />
               </div>
               <p className="mt-6 pt-6 border-t border-cyan-500/10 text-[11px] text-neutral-300 italic">"{evalData.critique}"</p>
            </div>
          )}
        </section>

        {isVaultOpen && (
          <aside className="absolute inset-y-0 right-0 w-96 bg-black border-l border-cyan-500/20 z-[100] p-8 flex flex-col animate-in slide-in-from-right shadow-2xl">
            <div className="flex justify-between items-center mb-8"><h2 className="text-sm font-black text-cyan-400 uppercase tracking-widest">Sync_Vault</h2><X className="cursor-pointer" onClick={() => setIsVaultOpen(false)} /></div>
            <div className="flex-1 overflow-y-auto space-y-4">
              {savedProjects.map((p) => (
                <div key={p.id} className="p-4 bg-neutral-900 border border-cyan-500/10 hover:border-cyan-500/40 transition cursor-pointer" onClick={() => setParams(p.params)}>
                  <div className="text-[10px] text-cyan-500 uppercase">{p.style}</div>
                  <div className="text-[9px] text-neutral-600">{p.timestamp?.toDate().toLocaleString()}</div>
                </div>
              ))}
            </div>
          </aside>
        )}
        
        <aside className="w-80 border-l border-cyan-500/10 bg-black/60 p-8 flex flex-col gap-10">
          <div className="space-y-8">
            <h3 className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">Systems</h3>
            <Slider label="COMPLEXITY" val={params.complexity} min={2} max={12} onChange={v => setParams(p => ({...p, complexity: v}))} />
            <Slider label="TRACE" val={params.lineWeight} min={0.5} max={4} onChange={v => setParams(p => ({...p, lineWeight: v}))} />
          </div>
          <div className="mt-auto bg-cyan-950/10 border border-cyan-500/10 p-4 h-48 overflow-y-auto font-mono text-[9px] text-cyan-600">
            {logs.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </aside>
      </main>
    </div>
  );
};

const ScoreBar = ({ label, score }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[9px] font-mono text-cyan-600"><span>{label}</span><span>{Math.round(score)}%</span></div>
    <div className="w-full bg-cyan-950 h-1 rounded-full"><div className="h-full bg-cyan-400" style={{ width: `${score}%` }}></div></div>
  </div>
);

const Slider = ({ label, val, min, max, onChange }) => (
  <div className="space-y-4">
    <div className="flex justify-between text-[9px] font-black text-cyan-800 uppercase"><span>{label}</span><span className="text-white font-mono">{val}</span></div>
    <input type="range" min={min} max={max} step={0.1} value={val} onChange={(e) => onChange(parseFloat(e.target.value))} className="w-full h-[2px] bg-cyan-950 appearance-none accent-cyan-500" />
  </div>
);

export default App;
