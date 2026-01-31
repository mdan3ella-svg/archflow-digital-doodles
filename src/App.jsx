import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom'; 
import * as THREE from 'three';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { 
  Layers, Settings2, Save, Upload,
  Terminal, Activity, Database, 
  History, X, Sparkles, Box,
  Move3d, MousePointer2, ChevronRight, 
  LayoutTemplate, Loader2, Camera, 
  Maximize, Sun, Moon, Grid, Type, Sliders,
  Cpu, CheckCircle2, Ratio, PenTool,
  Undo, Redo, Trash2, FilePlus, Ruler, Globe, Map, Download, FileJson,
  FileCode, ScanLine, Layout, AlertTriangle, Calculator
} from 'lucide-react';

/**
 * Describe by Digital Doodles | v7.8.3 [STABLE_REFRESH]
 * - Core: Native Camera/Orbit Engine (Zero Dependencies).
 * - UI: High-Contrast Dark Glass Dashboard.
 * - Logic: Auto-Naming & Intelligent Voxel Meshing.
 */

// --- 1. CONFIGURATION ---
const getFirebaseConfig = () => {
  try {
    if (typeof __firebase_config !== 'undefined' && __firebase_config) return JSON.parse(__firebase_config);
  } catch (e) {}
  return { apiKey: "DEMO_KEY", appId: "1:000:web:000" };
};

const config = getFirebaseConfig();
let services = { app: null, auth: null, db: null, isDemo: true };

try {
  if (config.apiKey && config.apiKey !== "DEMO_KEY") {
    services.app = initializeApp(config);
    services.auth = getAuth(services.app);
    services.db = getFirestore(services.app);
    services.isDemo = false;
  }
} catch (e) {
  console.warn("[SVC] Offline Mode");
}

const APP_ID = (typeof __app_id !== 'undefined' ? __app_id : 'describe-dd').replace(/[\/\.]/g, '_');

// --- 2. ALGORITHMS ---

const exportToOBJ = (scene, fileName) => {
  let output = "# Describe Export\n";
  let indexVertex = 0;
  scene.traverse((mesh) => {
    if (mesh.isMesh) {
      const geometry = mesh.geometry;
      const vertices = geometry.attributes.position.array;
      const matrix = mesh.matrixWorld;
      for (let i = 0; i < vertices.length; i += 3) {
        const v = new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]);
        v.applyMatrix4(matrix);
        output += `v ${v.x.toFixed(4)} ${v.y.toFixed(4)} ${v.z.toFixed(4)}\n`;
      }
      for (let i = 0; i < vertices.length / 3; i += 3) {
        output += `f ${indexVertex + i + 1} ${indexVertex + i + 2} ${indexVertex + i + 3}\n`;
      }
      indexVertex += vertices.length / 3;
    }
  });
  const blob = new Blob([output], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${fileName}.obj`;
  link.click();
};

const processImageToGeometry = (imageSrc, complexity, mode, threshold = 128, invert = false) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageSrc;
    img.onload = () => {
      const resolution = Math.min(256, complexity * 10); 
      const canvas = document.createElement('canvas');
      canvas.width = resolution;
      canvas.height = resolution;
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = invert ? '#000000' : '#FFFFFF';
      ctx.fillRect(0, 0, resolution, resolution);
      ctx.drawImage(img, 0, 0, resolution, resolution);

      if (mode === 'floorplan') {
          ctx.filter = `contrast(150%) grayscale(100%) ${invert ? 'invert(100%)' : ''}`;
      } else {
          ctx.filter = `blur(1px) ${invert ? 'invert(100%)' : ''}`;
      }
      ctx.drawImage(canvas, 0, 0); 
      
      const pxData = ctx.getImageData(0, 0, resolution, resolution).data;
      const rawVoxels = []; 
      
      for (let y = 0; y < resolution; y++) {
        const row = [];
        for (let x = 0; x < resolution; x++) {
            const i = (y * resolution + x) * 4;
            const val = (pxData[i] + pxData[i+1] + pxData[i+2]) / 3;
            if (val < threshold) {
               const h = mode === 'floorplan' ? 1.0 : (255 - val) / 255;
               row.push(h);
            } else {
               row.push(0);
            }
        }
        rawVoxels.push(row);
      }

      // Greedy Meshing
      const optimized = [];
      for (let y = 0; y < resolution; y++) {
          let startX = -1;
          let currentH = 0;
          for (let x = 0; x <= resolution; x++) {
              const h = (x < resolution) ? rawVoxels[y][x] : 0;
              if (h !== currentH) {
                  if (currentH > 0.05 && startX !== -1) {
                      const w = x - startX;
                      const cx = startX + (w / 2);
                      optimized.push({ x: cx - resolution/2, z: y - resolution/2, w: w, d: 1, h: currentH });
                  }
                  startX = x;
                  currentH = h;
              }
          }
      }
      resolve({ type: 'optimized_voxel', data: optimized, width: resolution, height: resolution });
    };
  });
};

// --- 3. MAIN COMPONENT ---

const App = () => {
  const [activePanel, setActivePanel] = useState(null); 
  const [logs, setLogs] = useState(["[SYS] SYSTEM_READY", "[UI] DARK_MODE_METRICS"]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeStyle, setActiveStyle] = useState('plaster'); 
  
  const [params, setParams] = useState({ 
    complexity: 15, height: 1.0, width: 1.0, depth: 1.0, seed: 123, 
    floorHeight: 0.3, siteWidth: 50, units: 'm', showAxis: true, showContext: true,
    ingestMode: 'floorplan', threshold: 128, invert: false
  });
  
  const [metrics, setMetrics] = useState({ gfa: 0, height: 0, levels: 0 });
  const [geoData, setGeoData] = useState(null); 
  const [conceptImage, setConceptImage] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const containerRef = useRef(null);
  const engineRef = useRef({ scene: null, camera: null, renderer: null, group: null });
  const fileInputRef = useRef(null);
  
  // Native Controls
  const isDragging = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });
  const camState = useRef({ theta: Math.PI / 4, phi: Math.PI / 3, radius: 80 });

  const addLog = useCallback((msg) => setLogs(prev => [msg, ...prev].slice(0, 6)), []);

  // --- HOOKS ---
  const useAuthSession = () => {
    const [user, setUser] = useState(null);
    useEffect(() => {
      if (services.isDemo) { setUser({ uid: 'GUEST', isAnonymous: true }); return; }
      const init = async () => {
        try {
          if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(services.auth, __initial_auth_token);
          else await signInAnonymously(services.auth);
        } catch (e) { setUser({ uid: 'GUEST' }); }
      };
      init();
      return onAuthStateChanged(services.auth, setUser);
    }, []);
    return user;
  };

  const useDataStream = (user) => {
    const [projects, setProjects] = useState([]);
    useEffect(() => {
      if (!user || services.isDemo || !services.db) {
          if(services.isDemo) setProjects([{ id: 'mock', name: 'Demo Tower', style: 'plaster', params: { complexity: 25 }, timestamp: { toDate: () => new Date() } }]);
          return;
      }
      try {
        const colRef = collection(services.db, 'artifacts', APP_ID, 'users', user.uid, 'projects');
        return onSnapshot(colRef, (s) => setProjects(s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.timestamp - a.timestamp)));
      } catch (e) {}
    }, [user]);

    const saveProject = async (data) => {
      if (services.isDemo || !services.db) return true;
      try { await addDoc(collection(services.db, 'artifacts', APP_ID, 'users', user.uid, 'projects'), { ...data, timestamp: serverTimestamp() }); return true; } 
      catch (e) { return false; }
    };

    const deleteProject = async (id) => {
        if (services.isDemo || !services.db) { setProjects(p => p.filter(x => x.id !== id)); return true; }
        try { await deleteDoc(doc(services.db, 'artifacts', APP_ID, 'users', user.uid, 'projects', id)); return true; }
        catch (e) { return false; }
    };
    return { projects, saveProject, deleteProject };
  };

  const user = useAuthSession();
  const { projects, saveProject, deleteProject } = useDataStream(user);

  // --- HISTORY ---
  const commitChange = () => {
      const snapshot = { params: { ...params }, geoData, activeStyle };
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(snapshot);
      if (newHistory.length > 20) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
  };
  const handleUndo = () => {
      if (historyIndex > 0) {
          const prev = history[historyIndex - 1];
          setParams(prev.params); setGeoData(prev.geoData); setActiveStyle(prev.activeStyle);
          setHistoryIndex(historyIndex - 1);
      }
  };
  const handleRedo = () => {
      if (historyIndex < history.length - 1) {
          const next = history[historyIndex + 1];
          setParams(next.params); setGeoData(next.geoData); setActiveStyle(next.activeStyle);
          setHistoryIndex(historyIndex + 1);
      }
  };
  useEffect(() => { if (history.length === 0) commitChange(); }, []);

  // --- 3D ENGINE ---
  useEffect(() => {
    if (!containerRef.current) return;
    const { clientWidth: w, clientHeight: h } = containerRef.current;
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF5F7FA);
    scene.fog = new THREE.Fog(0xF5F7FA, 40, 160);

    const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, logarithmicDepthBuffer: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    const amb = new THREE.AmbientLight(0xffffff, 0.7);
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(20, 60, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    scene.add(amb, sun);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.ShadowMaterial({ opacity: 0.1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const gridMajor = new THREE.GridHelper(200, 20, 0x999999, 0xdddddd);
    gridMajor.position.y = 0.05;
    scene.add(gridMajor);

    const group = new THREE.Group();
    const contextGroup = new THREE.Group();
    scene.add(group, contextGroup);

    const treeGeo = new THREE.CylinderGeometry(0, 1.5, 6, 5);
    const treeMat = new THREE.MeshStandardMaterial({color: 0xeeeeee, flatShading: true});
    const instancedTrees = new THREE.InstancedMesh(treeGeo, treeMat, 40);
    const dummy = new THREE.Object3D();
    for(let i=0; i<40; i++) {
        const r = 60 + Math.random()*80;
        const theta = Math.random() * Math.PI * 2;
        dummy.position.set(r*Math.cos(theta), 3, r*Math.sin(theta));
        dummy.updateMatrix();
        instancedTrees.setMatrixAt(i, dummy.matrix);
    }
    instancedTrees.castShadow = true;
    instancedTrees.receiveShadow = true;
    contextGroup.add(instancedTrees);

    engineRef.current = { scene, camera, renderer, group, contextGroup };

    const animate = () => {
      requestAnimationFrame(animate);
      const { theta, phi, radius } = camState.current;
      camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
      camera.position.z = radius * Math.sin(phi) * Math.cos(theta);
      camera.position.y = radius * Math.cos(phi);
      camera.lookAt(0, 5, 0); 
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
        if(!containerRef.current || !camera) return;
        const nw = containerRef.current.clientWidth;
        const nh = containerRef.current.clientHeight;
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- NATIVE MOUSE ---
  const handleMouseDown = (e) => { isDragging.current = true; prevMouse.current = { x: e.clientX, y: e.clientY }; };
  const handleMouseMove = (e) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - prevMouse.current.x;
    const deltaY = e.clientY - prevMouse.current.y;
    prevMouse.current = { x: e.clientX, y: e.clientY };
    camState.current.theta -= deltaX * 0.005;
    camState.current.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, camState.current.phi - deltaY * 0.005));
  };
  const handleMouseUp = () => isDragging.current = false;
  const handleWheel = (e) => { camState.current.radius = Math.max(10, Math.min(200, camState.current.radius + e.deltaY * 0.05)); };

  // --- PROCESSING ---
  useEffect(() => {
      if (!conceptImage) return;
      let isMounted = true;
      setIsProcessing(true);
      const runPipeline = async () => {
          const data = await processImageToGeometry(conceptImage, params.complexity, params.ingestMode, params.threshold, params.invert);
          if (isMounted) {
              setGeoData(data);
              addLog(`GEN: ${data.data.length} BLOCKS`);
              setIsProcessing(false);
          }
      };
      const timer = setTimeout(runPipeline, 500); 
      return () => { isMounted = false; clearTimeout(timer); };
  }, [conceptImage, params.complexity, params.ingestMode, params.threshold, params.invert]);

  // --- GEOMETRY ---
  useEffect(() => {
    const { group, contextGroup } = engineRef.current;
    if (!group) return;

    while(group.children.length > 0){ const obj = group.children[0]; group.remove(obj); if(obj.geometry) obj.geometry.dispose(); }
    contextGroup.visible = params.showContext;

    const mats = {
        plaster: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1.0, metalness: 0.0, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
        wireframe: new THREE.MeshBasicMaterial({ color: 0x1a1a1a, wireframe: true }),
        glass: new THREE.MeshPhysicalMaterial({ color: 0xddeeff, metalness: 0.1, roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.6, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })
    };
    const activeMat = mats[activeStyle] || mats.plaster;
    
    let calcGFA = 0;
    let maxHeight = 0;

    if (geoData && geoData.type === 'optimized_voxel') {
        const scaleFactor = params.siteWidth / geoData.width;
        const baseGeo = new THREE.BoxGeometry(1, 1, 1);
        const mesh = new THREE.InstancedMesh(baseGeo, activeMat, geoData.data.length);
        const dummy = new THREE.Object3D();

        geoData.data.forEach((v, i) => {
            const h = Math.max(0.5, v.h * params.height * 10);
            const w = scaleFactor * v.w * 0.99; 
            const d = scaleFactor * 1 * 0.99;
            dummy.position.set(v.x * scaleFactor, h/2, v.z * scaleFactor);
            dummy.scale.set(w, h, d);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
            
            calcGFA += (w * d) * (h / 3);
            if (h > maxHeight) maxHeight = h;
        });
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
    } else {
        const rng = (i) => (Math.sin(i * params.seed) * 10000) % 1;
        const count = params.complexity * 3;
        for (let i = 0; i < count; i++) {
            const w = 2 + Math.abs(rng(i)*5*params.width);
            const h = 2 + Math.abs(rng(i+100)*8*params.height);
            const d = 2 + Math.abs(rng(i+200)*5*params.depth);
            const geo = new THREE.BoxGeometry(w, h, d);
            const angle = i * 0.8;
            const radius = Math.abs(rng(i+300) * 8);
            const mesh = new THREE.Mesh(geo, activeMat);
            mesh.position.set(Math.cos(angle)*radius, h/2, Math.sin(angle)*radius);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            group.add(mesh);
            
            calcGFA += (w * d) * (h / 3);
            if (h > maxHeight) maxHeight = h;
        }
    }
    setMetrics({ gfa: Math.round(calcGFA), height: maxHeight.toFixed(1), levels: Math.floor(maxHeight/3) });
  }, [params, activeStyle, geoData, params.showContext]);

  // --- HANDLERS ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setConceptImage(reader.result); if (activePanel !== 'ai') setActivePanel('ai'); };
      reader.readAsDataURL(file);
    }
  };

  const handleSync = async () => {
    const name = `Project ${new Date().toLocaleTimeString()}`;
    await saveProject({ style: activeStyle, params, name });
    addLog("CLOUD: SAVED");
  };

  const handleClear = () => {
      setParams({ complexity: 15, height: 1.5, width: 1.0, depth: 1.0, seed: 123, floorHeight: 0.3, siteWidth: 50, units: 'm', showAxis: true, showContext: true, ingestMode: 'floorplan', threshold: 128, invert: false });
      setGeoData(null); setConceptImage(null); addLog("SYS: RESET"); commitChange();
  };

  const handleSnapshot = () => {
    const link = document.createElement('a');
    link.download = `DESCRIBE-${Date.now()}.png`;
    link.href = engineRef.current.renderer.domElement.toDataURL('image/png');
    link.click();
  };

  const handleExport = () => {
      if(engineRef.current.group) { exportToOBJ(engineRef.current.group, `DESCRIBE-${Date.now()}`); addLog("EXP: OBJ SAVED"); }
  };

  return (
    <div className="relative w-full h-screen bg-[#F5F7FA] text-[#1a1a1a] font-sans overflow-hidden">
      
      <div 
          ref={containerRef} 
          className="absolute inset-0 z-0 bg-[#f0f2f5] cursor-move"
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}
      />
      
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30">
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-xl px-6 py-2 rounded-full shadow-xl border border-white/50">
             <div className="w-2 h-2 bg-black rounded-full animate-pulse"></div>
             <h1 className="text-sm font-black tracking-widest text-black uppercase">Describe</h1>
             <span className="text-[10px] font-thin text-black border-l border-gray-300 pl-2 ml-2">Shape Form & Function Analysis Tool</span>
          </div>
      </div>
      
      {/* Dark Glass Metrics */}
      <div className="absolute top-8 right-8 z-30 flex flex-col gap-2 pointer-events-none">
          <div className="bg-black/85 backdrop-blur-md px-4 py-3 rounded-xl shadow-2xl border border-white/20 min-w-[140px] text-white">
              <div className="flex items-center gap-2 mb-1 text-gray-400"><Calculator size={12}/><span className="text-[9px] font-bold uppercase tracking-wider">GFA (Approx)</span></div>
              <div className="text-xl font-thin font-mono tracking-tight">{metrics.gfa.toLocaleString()} m²</div>
              <div className="text-[9px] text-gray-500 mt-1">~{metrics.levels} Floors</div>
          </div>
          <div className="bg-black/85 backdrop-blur-md px-4 py-3 rounded-xl shadow-2xl border border-white/20 min-w-[140px] text-white">
              <div className="flex items-center gap-2 mb-1 text-gray-400"><Ruler size={12}/><span className="text-[9px] font-bold uppercase tracking-wider">Max Height</span></div>
              <div className="text-xl font-thin font-mono tracking-tight">{metrics.height} m</div>
          </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
           <div className="bg-white/90 backdrop-blur-xl px-4 py-3 rounded-2xl shadow-2xl border border-white/50 flex items-center gap-4">
               <ToolBtn Icon={Undo} onClick={handleUndo} title="Undo" />
               <ToolBtn Icon={Redo} onClick={handleRedo} title="Redo" />
               <div className="w-px h-6 bg-gray-300/50" />
               <DockItem Icon={Settings2} label="Logic" active={activePanel === 'params'} onClick={() => setActivePanel(activePanel === 'params' ? null : 'params')} />
               <DockItem Icon={Sparkles} label="Vision" active={activePanel === 'ai'} onClick={() => setActivePanel(activePanel === 'ai' ? null : 'ai')} />
               <DockItem Icon={Layers} label="Layers" active={activePanel === 'layers'} onClick={() => setActivePanel(activePanel === 'layers' ? null : 'layers')} />
               <DockItem Icon={Database} label="Vault" active={activePanel === 'vault'} onClick={() => setActivePanel(activePanel === 'vault' ? null : 'vault')} />
               <div className="w-px h-6 bg-gray-300/50" />
               <ToolBtn Icon={Camera} onClick={handleSnapshot} title="Capture" />
               <ToolBtn Icon={Download} onClick={handleExport} title="Export 3D" />
           </div>
      </div>

      {activePanel && (
        <aside className="absolute top-36 bottom-32 left-8 w-80 z-30 flex flex-col animate-in slide-in-from-left-4 duration-300">
           <div className="flex-1 bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/50 flex flex-col overflow-hidden relative">
               <div className="h-14 flex items-center justify-between px-6 border-b border-gray-100/50 bg-white/40">
                   <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Inspector</span>
                   <button onClick={() => setActivePanel(null)}><X size={16} className="text-gray-400 hover:text-black"/></button>
               </div>

               <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                   {activePanel === 'params' && (
                       <>
                           <section>
                               <Label>VISUAL STYLE</Label>
                               <div className="grid grid-cols-2 gap-3 mb-6">
                                   {['plaster', 'wireframe', 'glass'].map(s => (
                                       <button key={s} onClick={() => { setActiveStyle(s); commitChange(); }} className={`py-3 rounded-xl border text-[10px] font-bold uppercase transition ${activeStyle === s ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'}`}>{s}</button>
                                   ))}
                               </div>
                           </section>
                           <section>
                               <Label>MASSING</Label>
                               <InputGroup label="Scale (M)" value={params.siteWidth} min={10} max={200} step={5} onChange={v => { setParams(p => ({...p, siteWidth: v})); }} onCommit={commitChange} />
                               <InputGroup label="Resolution" value={params.complexity} min={5} max={60} onChange={v => { setParams(p => ({...p, complexity: v})); }} onCommit={commitChange} />
                               <InputGroup label="Height" value={params.height} min={0.5} max={5} step={0.1} onChange={v => { setParams(p => ({...p, height: v})); }} onCommit={commitChange} />
                           </section>
                       </>
                   )}

                   {activePanel === 'ai' && (
                       <section>
                           <Label>SOURCE MATERIAL</Label>
                           <div onClick={() => document.getElementById('upload').click()} className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:bg-white transition group">
                               <Upload className="mx-auto text-gray-400 group-hover:text-black mb-2 transition" size={20}/>
                               <span className="text-[10px] font-bold text-gray-500 uppercase group-hover:text-black">Upload SVG / Plan</span>
                               <input id="upload" type="file" hidden onChange={handleFileUpload} />
                           </div>
                           {conceptImage && (
                               <div className="mt-3 space-y-2">
                                   <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg border border-green-100"><CheckCircle2 size={12} className="text-green-600"/><span className="text-[10px] font-bold text-green-700 uppercase">Input Active</span></div>
                                   {isProcessing && <div className="text-[10px] text-gray-400 flex items-center gap-2"><Loader2 size={10} className="animate-spin"/> Processing...</div>}
                               </div>
                           )}
                           <div className="mt-4 flex flex-col gap-2">
                               <div className="flex gap-2">
                                   <button onClick={() => setParams(p => ({...p, ingestMode: 'floorplan'}))} className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase border ${params.ingestMode === 'floorplan' ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-200'}`}>Floorplan</button>
                                   <button onClick={() => setParams(p => ({...p, ingestMode: 'heightmap'}))} className={`flex-1 py-2 rounded-lg text-[9px] font-bold uppercase border ${params.ingestMode === 'heightmap' ? 'bg-black text-white border-black' : 'bg-white text-gray-400 border-gray-200'}`}>Heightmap</button>
                               </div>
                               <div className="pt-2 border-t border-gray-100 mt-2">
                                   <div className="flex justify-between items-center mb-1">
                                       <span className="text-[9px] font-bold text-gray-400 uppercase">Threshold</span>
                                       <span className="text-[9px] font-mono text-black">{params.threshold}</span>
                                   </div>
                                   <input type="range" min={0} max={255} value={params.threshold} onChange={(e) => setParams(p => ({...p, threshold: parseInt(e.target.value)}))} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black" />
                                   <button onClick={() => setParams(p => ({...p, invert: !p.invert}))} className={`mt-2 w-full py-1.5 rounded text-[9px] font-bold uppercase border ${params.invert ? 'bg-red-500 text-white border-red-600' : 'bg-white text-gray-500 border-gray-200'}`}>{params.invert ? 'Inverted' : 'Normal Colors'}</button>
                               </div>
                           </div>
                       </section>
                   )}

                   {activePanel === 'layers' && (
                       <section>
                           <Label>ENVIRONMENT</Label>
                           <ToggleRow label="Context Props" active={params.showContext} onClick={() => setParams(p => ({...p, showContext: !p.showContext}))} />
                           <ToggleRow label="Coordinate Axis" active={params.showAxis} onClick={() => setParams(p => ({...p, showAxis: !p.showAxis}))} />
                       </section>
                   )}

                   {activePanel === 'vault' && (
                       <section>
                           <Label>SESSION HISTORY</Label>
                           <button onClick={handleSync} className="w-full py-3 bg-black text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-gray-800 transition mb-4 shadow-lg">Save Snapshot</button>
                           <div className="space-y-2">
                               {projects.map(p => (
                                   <div key={p.id} className="p-3 bg-white border border-gray-100 rounded-xl hover:border-black transition cursor-pointer flex justify-between items-center group" onClick={() => { setParams(p.params); commitChange(); }}>
                                       <div>
                                           <div className="text-[10px] font-bold text-black uppercase">{p.name || `${p.style} MODEL`}</div>
                                           <div className="text-[9px] text-gray-400">{p.timestamp?.toDate ? p.timestamp.toDate().toLocaleDateString() : 'unsaved'}</div>
                                       </div>
                                       <button onClick={(e) => { e.stopPropagation(); deleteProject(p.id); }} className="text-gray-300 hover:text-red-500"><X size={14}/></button>
                                   </div>
                               ))}
                           </div>
                       </section>
                   )}
               </div>
           </div>
        </aside>
      )}

      {/* 6. LOGS (Dark Glass) */}
      <div className="absolute bottom-6 left-6 pointer-events-none">
          <div className="flex flex-col items-start space-y-1">
              {logs.map((l, i) => (
                  <span key={i} className="text-[10px] font-mono text-white bg-black/80 px-2 py-0.5 rounded backdrop-blur-md border border-white/10 shadow-sm">{l}</span>
              ))}
          </div>
      </div>
    </div>
  );
};

// --- COMPONENTS ---
const ToolBtn = ({ Icon, onClick, title }) => (
  <button onClick={onClick} title={title} className="p-2 text-gray-400 hover:text-black transition hover:bg-black/5 rounded-lg"><Icon size={18} /></button>
);
const DockItem = ({ Icon, label, active, onClick }) => (
  <button onClick={onClick} title={label} className={`p-2.5 rounded-xl transition ${active ? 'bg-black text-white shadow-lg' : 'text-gray-400 hover:text-black hover:bg-black/5'}`}><Icon size={20} /></button>
);
const Label = ({ children }) => (
  <h3 className="text-[10px] font-black text-black uppercase tracking-[0.2em] mb-3 opacity-40">{children}</h3>
);
const InputGroup = ({ label, value, min, max, step = 1, onChange, onCommit }) => (
  <div className="space-y-1 mb-4">
    <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase"><span>{label}</span><span className="text-black">{value.toFixed(1)}</span></div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} onMouseUp={onCommit} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black" />
  </div>
);
const ToggleRow = ({ label, active, onClick }) => (
    <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold text-gray-500 uppercase">{label}</span>
        <button onClick={onClick} className={`w-8 h-4 rounded-full flex items-center transition-all ${active ? 'bg-black justify-end' : 'bg-gray-200 justify-start'}`}><div className="w-3 h-3 bg-white rounded-full mx-0.5 shadow-sm" /></button>
    </div>
);

const rootElement = document.getElementById('root');
if (rootElement) { ReactDOM.render(<App />, rootElement); }

export default App;
