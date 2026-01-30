import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { 
  Cpu, Layers, Palette, Zap, Maximize2, PenTool, Settings2, Save, 
  Image as ImageIcon, MousePointer2, Wind, Sun, Layout, Terminal, 
  Activity, ChevronRight, Database, BarChart3, ShieldCheck, History, X 
} from 'lucide-react';

/**
 * NEO-ARCH | Save & Evaluate Upgrade
 * 3D WebGL Engine with AI Auditing
 * Production Ready for Netlify Deployment
 */

// --- FIREBASE INITIALIZATION ---
// Fallback to local config if environment variables aren't present
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : { 
      apiKey: "", 
      authDomain: "", 
      projectId: "", 
      storageBucket: "", 
      messagingSenderId: "", 
      appId: "" 
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = (typeof __app_id !== 'undefined' ? __app_id : 'neo-arch-default').replace(/[\/\.]/g, '_');

const App = () => {
  const [activeStyle, setActiveStyle] = useState('blueprint');
  const [isGenerating, setIsGenerating] = useState(false);
  const [logs, setLogs] = useState(["KERNEL: ONLINE", "VAULT: CONNECTING..."]);
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
    const unsubscribe = onAuthStateChanged(auth, setUser);
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
    } catch (err) { 
      addLog("ERR: SAVE_FAILED"); 
    }
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
    } catch (e) { 
      setEvalData({ scores, critique: "Neural audit connection timed out." }); 
    }
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
    
    // Aesthetic Grid
    const grid = new THREE.GridHelper(20, 20, 0x083344, 0x083344);
    scene.add(grid);

    const updateGeometry = () => {
      group.clear();
      const color = 0x22d3ee;
      for (let i = 0; i < params.complexity; i++) {
        const h = 2 + Math.random() * 5;
        const geo = new THREE.BoxGeometry(2, h, 2);
        const edges = new THREE.EdgesGeometry(geo);
        const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color, linewidth: 2 }));
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

    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => { 
      window.removeEventListener('resize', handleResize);
      containerRef.current?.removeChild(renderer.domElement); 
    };
  }, [params.complexity]);

  const addLog = (msg) => setLogs(p => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...p].slice(0, 8));

  return (
    <div className="flex flex-col h-screen bg-[#020617] text-cyan-50 font-sans overflow-hidden">
      <header className="h-20 flex items-center justify-between px-8 border-b border-cyan-500/20 bg-black/40 backdrop-blur-xl z-50">
        <div className="flex items-center gap-6">
          <div className="p-3 bg-black border border-cyan-500/50 rounded-sm skew-x-[-12deg] shadow-[0_0_15px_rgba(34,211,238,0.2)]">
            <Cpu className="text-cyan-400 w-6 h-6 skew-x-[12deg]" />
          </div>
          <h1 className="text-2xl font-black italic uppercase tracking-tighter">NEO<span className="text-cyan-400">ARCH</span></h1>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setIsVaultOpen(true)} className="px-4 py-2 border border-cyan-500/30 text-cyan-400 text-[10px] font-bold uppercase hover:bg-cyan-500/10 transition">Vault</button>
          <button onClick={saveToVault} className="px-6 py-2 border border-cyan-400 text-cyan-400 text-[10px] font-bold uppercase hover:bg-cyan-400 hover:text-black transition">Sync</button>
          <button onClick={evaluateDesign} className="px-8 py-2 bg-cyan-500 text-black text-[10px] font-black uppercase shadow-[0_0_20px_rgba(34,211,238,0.4)] transition hover:bg-cyan-400 active:scale-95">Audit</button>
        </div>
      </header>

      <main className="flex flex-1 relative">
        <section className="flex-1 relative bg-[#020617]">
          <div ref={containerRef} className="w-full h-full cursor-move" />
          {evalData && (
            <div className="absolute top-10 right-10 w-72 bg-black/80 border border-cyan-500/30 p-6 animate-in slide-in-from-right backdrop-blur-md">
               <div className="flex justify-between items-center mb-6">
                 <h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Audit_Report</h3>
                 <X size={14} className="cursor-pointer text-cyan-800 hover:text-cyan-400" onClick={() => setEvalData(null)} />
               </div>
               <div className="space-y-4">
                 <ScoreBar label="STRUCTURE" score={evalData.scores.structure} />
                 <ScoreBar label="COMPLEXITY" score={evalData.scores.complexity} />
               </div>
               <p className="mt-6 pt-6 border-t border-cyan-500/10 text-[11px] text-neutral-300 italic leading-relaxed">"{evalData.critique}"</p>
            </div>
          )}
        </section>

        {isVaultOpen && (
          <aside className="absolute inset-y-0 right-0 w-96 bg-black border-l border-cyan-500/20 z-[100] p-8 flex flex-col animate-in slide-in-from-right shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-sm font-black text-cyan-400 uppercase tracking-widest flex items-center gap-3">
                <Database size={16} /> Sync_Vault
              </h2>
              <X className="cursor-pointer text-cyan-800 hover:text-cyan-400" onClick={() => setIsVaultOpen(false)} />
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 scrollbar-hide">
              {savedProjects.length === 0 ? (
                <div className="text-[10px] text-neutral-700 text-center mt-20 italic uppercase tracking-widest">Vault_Empty</div>
              ) : (
                savedProjects.map((p) => (
                  <div key={p.id} className="p-4 bg-neutral-900 border border-cyan-500/10 hover:border-cyan-500/40 transition cursor-pointer" onClick={() => { setParams(p.params); addLog("VAULT: UNIT_LOADED"); }}>
                    <div className="text-[10px] text-cyan-500 uppercase font-bold mb-1">{p.style}</div>
                    <div className="text-[9px] text-neutral-600 font-mono">
                      {p.timestamp?.toDate().toLocaleString() || 'PENDING...'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}
        
        <aside className="w-80 border-l border-cyan-500/10 bg-black/60 backdrop-blur-xl p-8 flex flex-col gap-10 z-20">
          <div className="space-y-8">
            <h3 className="text-[10px] font-black text-cyan-600 uppercase tracking-widest flex items-center gap-2">
              <Settings2 size={14} /> Systems
            </h3>
            <Slider label="GEOMETRY" val={params.complexity} min={2} max={12} onChange={v => setParams(p => ({...p, complexity: v}))} />
            <Slider label="TRACE" val={params.lineWeight} min={0.5} max={4} onChange={v => setParams(p => ({...p, lineWeight: v}))} />
          </div>
          <div className="mt-auto">
            <div className="flex items-center gap-2 mb-3">
              <Terminal size={12} className="text-cyan-800" />
              <span className="text-[9px] font-black text-cyan-800 uppercase tracking-widest">Telemetry</span>
            </div>
            <div className="bg-cyan-950/10 border border-cyan-500/10 p-4 h-48 overflow-y-auto font-mono text-[9px] text-cyan-600 space-y-1 scrollbar-hide">
              {logs.map((l, i) => <div key={i} className={i === 0 ? "text-cyan-400" : ""}>{l}</div>)}
            </div>
          </div>
        </aside>
      </main>

      <footer className="h-10 bg-black border-t border-cyan-500/10 flex items-center px-6 justify-between text-[9px] font-mono tracking-widest text-cyan-900">
        <div className="flex gap-8">
           <span>ID: {user?.uid.substring(0,8) || 'ARCH_LNK'}</span>
           <span className="flex items-center gap-2 border-l border-cyan-900 pl-8"><Activity size={10}/> WEBGL_STABLE</span>
        </div>
        <div className="flex items-center gap-6">
           <span className="text-cyan-700">CORE_VER: 3.0.0</span>
        </div>
      </footer>
    </div>
  );
};

const ScoreBar = ({ label, score }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-[9px] font-mono text-cyan-600">
      <span>{label}</span>
      <span>{Math.round(score)}%</span>
    </div>
    <div className="w-full bg-cyan-950 h-1 rounded-full overflow-hidden">
      <div className="h-full bg-cyan-400 transition-all duration-1000" style={{ width: `${score}%` }}></div>
    </div>
  </div>
);

const Slider = ({ label, val, min, max, onChange }) => (
  <div className="space-y-4">
    <div className="flex justify-between text-[9px] font-black text-cyan-800 uppercase tracking-widest">
      <span>{label}</span>
      <span className="text-white font-mono">{val}</span>
    </div>
    <input 
      type="range" 
      min={min} 
      max={max} 
      step={0.1} 
      value={val} 
      onChange={(e) => onChange(parseFloat(e.target.value))} 
      className="w-full h-[2px] bg-cyan-950 appearance-none accent-cyan-500 cursor-pointer" 
    />
  </div>
);

export default App;
