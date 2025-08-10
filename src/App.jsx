import React, { useEffect, useRef, useState } from 'react';
import './App.css';

// Constants
const MAX_VIDEOS = 4;
const ACCEPTED_FORMATS = ['video/mp4','video/webm','video/ogg','video/quicktime'];
const MAX_SIZE_MB = 1024; // 1GB cap
const SEEK_STEP = 2; // seconds forward/backward

function App() {
  const [videos, setVideos] = useState([]); // {id,url,name,file}
  const videosRef = useRef([]); // track latest videos for unmount cleanup
  const [error, setError] = useState('');
  const videoRefs = useRef([]);
  const fileInputRef = useRef(null);
  const [playing, setPlaying] = useState([]);
  const [volumes, setVolumes] = useState([]);
  const [muted, setMuted] = useState([]);
  const [seekValues, setSeekValues] = useState([]);
  // Bottom main controls visibility (auto-hide after inactivity)
  const [showMainControls, setShowMainControls] = useState(true);
  const hideTimerRef = useRef(null);

  // Keep ref in sync with latest videos
  useEffect(()=> { videosRef.current = videos; }, [videos]);
  // Revoke object URLs only on unmount (NOT on every update to avoid invalidating active blobs)
  useEffect(()=> {
    return () => {
      videosRef.current.forEach(v => { try { URL.revokeObjectURL(v.url); } catch(_){} });
    };
  }, []);

  const resetArrays = n => { // not used for incremental add anymore, retained if future full reset needed
    setPlaying(Array(n).fill(false));
    setVolumes(Array(n).fill(1));
    // only first video unmuted
    setMuted(Array.from({length:n}, (_,i)=> i !==0));
    setSeekValues(Array(n).fill(0));
  };
  const setIdx = (setter, i, val) => setter(prev => { const c=[...prev]; c[i]=val; return c; });
  const validate = f => { if(!ACCEPTED_FORMATS.includes(f.type)) return `Unsupported: ${f.name}`; if(f.size/1024/1024 > MAX_SIZE_MB) return `Too large (> ${MAX_SIZE_MB}MB): ${f.name}`; return null; };
  const addFiles = list => {
    setError('');
    const incoming = Array.from(list);
    const slots = MAX_VIDEOS - videos.length;
    if (slots <= 0) { setError(`Maximum ${MAX_VIDEOS} videos reached.`); return; }
    const slice = incoming.slice(0, slots);
    const errs = []; const adds = [];
    slice.forEach(f => { const e = validate(f); if (e) errs.push(e); else adds.push({ id: crypto.randomUUID? crypto.randomUUID(): Math.random().toString(36).slice(2), url: URL.createObjectURL(f), name: f.name, file: f }); });
    if (errs.length) setError(errs.join('\n'));
    if (!adds.length) return;
    const prevLen = videos.length;
    const upd = [...videos, ...adds];
    setVideos(upd);
    // Extend parallel state arrays without resetting existing state
    setPlaying(p => [...p, ...Array(adds.length).fill(false)]);
    setVolumes(vs => [...vs, ...Array(adds.length).fill(1)]);
    setSeekValues(sv => [...sv, ...Array(adds.length).fill(0)]);
    setMuted(m => {
      // start from existing array or initialize
      const base = m.length === prevLen ? [...m] : Array(prevLen).fill(true).map((_,i)=> i!==0); // safety if mismatch
      // for each new index: mute unless overall index is 0
      for (let i = 0; i < adds.length; i++) {
        const overallIndex = prevLen + i;
        base[overallIndex] = overallIndex !== 0; // only index 0 plays audio by default
      }
      return base;
    });
  };
  const removeVideo = id => {
    setVideos(prev => {
      const idx = prev.findIndex(v => v.id === id);
      if (idx === -1) return prev;
      // Revoke only the removed video's object URL
      try { URL.revokeObjectURL(prev[idx].url); } catch(_){}
      videoRefs.current.splice(idx, 1);
      setPlaying(p => p.filter((_, i) => i !== idx));
      setVolumes(p => p.filter((_, i) => i !== idx));
      setMuted(p => p.filter((_, i) => i !== idx));
      setSeekValues(p => p.filter((_, i) => i !== idx));
      return prev.filter(v => v.id !== id);
    });
  };
  const handleDrop = e => { e.preventDefault(); addFiles(e.dataTransfer.files); };
  const handleSelect = e => { addFiles(e.target.files); e.target.value=''; };

  // Individual controls
  const togglePlay = i => { const el = videoRefs.current[i]; if(!el) return; if (el.paused){ el.play(); setIdx(setPlaying,i,true);} else { el.pause(); setIdx(setPlaying,i,false);} };
  const seekBy = (i,d) => { const el=videoRefs.current[i]; if(!el) return; const next=Math.max(0,Math.min(el.duration||0,el.currentTime+d)); el.currentTime=next; setIdx(setSeekValues,i,next); };
  const setVolume = (i,v) => { const el=videoRefs.current[i]; if(!el) return; el.volume=v; setIdx(setVolumes,i,v); };
  const toggleMute = i => { const el=videoRefs.current[i]; if(!el) return; el.muted=!el.muted; setIdx(setMuted,i,el.muted); };
  const scrubTo = (i,val) => { const el=videoRefs.current[i]; if(!el) return; el.currentTime=val; setIdx(setSeekValues,i,val); };
  const handleTimeUpdate = i => { const el=videoRefs.current[i]; if(!el) return; setIdx(setSeekValues,i,el.currentTime); setIdx(setPlaying,i,!el.paused); };

  // Global controls
  const allPaused = playing.every(p => !p);
  const toggleAll = () => videos.forEach((_,i)=>{ const el=videoRefs.current[i]; if(!el) return; if(allPaused){ el.play(); setIdx(setPlaying,i,true);} else { el.pause(); setIdx(setPlaying,i,false);} });
  const seekAll = d => videos.forEach((_,i)=>seekBy(i,d));
  const allMuted = muted.length>0 && muted.every(m=>m);
  const toggleMuteAll = () => {
    setMuted(prev => {
      const target = allMuted ? prev.map(()=>false) : prev.map(()=>true);
      // Keep only first unmuted when unmuting all? Requirement asks only for mute-all option; using toggle for convenience.
      return target;
    });
  };
  // Sync muted state to actual video elements whenever it changes
  useEffect(()=> {
    muted.forEach((m,i)=>{ const el=videoRefs.current[i]; if(el) el.muted = m; });
  }, [muted]);
  const syncAll = () => { if(!videoRefs.current[0]) return; const t = videoRefs.current[0].currentTime; videos.forEach((_,i)=>{ if(i===0) return; const el=videoRefs.current[i]; if(el){ el.currentTime=t; setIdx(setSeekValues,i,t);} }); };

  // Auto-hide main controls after 5s of no interaction
  useEffect(()=>{
    const resetTimer = () => {
      setShowMainControls(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(()=> setShowMainControls(false), 5000);
    };
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    resetTimer();
    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [videos.length]);

  return (
    <div className="app-container">
      <h1>MultiViewPlayer</h1>
      <div className={`drop-area${videos.length < MAX_VIDEOS ? '' : ' disabled'}`}
           onDrop={handleDrop}
           onDragOver={e=>e.preventDefault()}
           onClick={()=> videos.length < MAX_VIDEOS && fileInputRef.current?.click()}>
        <input ref={fileInputRef} type="file" accept="video/*" multiple hidden disabled={videos.length>=MAX_VIDEOS} onChange={handleSelect} />
        {videos.length < MAX_VIDEOS ? <span>Drag & drop up to {MAX_VIDEOS} videos or click</span> : <span>Maximum {MAX_VIDEOS} videos loaded</span>}
      </div>
      {error && <div className="error" style={{whiteSpace:'pre-line'}}>{error}</div>}
      <div className={`video-grid videos-${videos.length}`}>
        {videos.map((v,i)=>(
          <div className="video-container" key={v.id}>
            <video
              ref={el=>videoRefs.current[i]=el}
              src={v.url}
              className="video-player"
              preload="metadata"
              loop
              onTimeUpdate={()=>handleTimeUpdate(i)}
              onPlay={()=>setIdx(setPlaying,i,true)}
              onPause={()=>setIdx(setPlaying,i,false)}
              onVolumeChange={()=>{ const el=videoRefs.current[i]; if(el){ setIdx(setVolumes,i,el.volume); setIdx(setMuted,i,el.muted);} }}
            />
            <div className="video-overlay">
              <div className="video-top">
                <div className="video-label">{v.name}</div>
                <button className="remove-btn" onClick={()=>removeVideo(v.id)} title="Remove">✕</button>
              </div>
              <div className="video-controls">
                <button onClick={()=>togglePlay(i)}>{playing[i] ? 'Pause' : 'Play'}</button>
                <button onClick={()=>seekBy(i,-SEEK_STEP)}>&laquo; {SEEK_STEP}s</button>
                <button onClick={()=>seekBy(i,SEEK_STEP)}>{SEEK_STEP}s &raquo;</button>
                <button onClick={()=>toggleMute(i)}>{muted[i] ? 'Unmute' : 'Mute'}</button>
                <input type="range" min={0} max={1} step={0.01} value={volumes[i] ?? 1} onChange={e=>setVolume(i,Number(e.target.value))} />
                <input type="range" min={0} max={videoRefs.current[i]?.duration || 0} step={0.1} value={seekValues[i] ?? 0} onChange={e=>scrubTo(i,Number(e.target.value))} />
                <span className="time-display">{formatTime(seekValues[i] || 0)} / {formatTime(videoRefs.current[i]?.duration || 0)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {videos.length>0 && (
        <div className={`overall-controls side-overlay ${showMainControls ? 'visible' : ''}`}
             onMouseEnter={()=>{ if(hideTimerRef.current) clearTimeout(hideTimerRef.current); setShowMainControls(true);} }
             onMouseLeave={()=>{ if(hideTimerRef.current) clearTimeout(hideTimerRef.current); hideTimerRef.current = setTimeout(()=> setShowMainControls(false), 3000); }}>
          <button onClick={toggleAll}>{allPaused?'Play All':'Pause All'}</button>
          <button onClick={()=>seekAll(-SEEK_STEP)}>&laquo; {SEEK_STEP}s</button>
          <button onClick={()=>seekAll(SEEK_STEP)}>{SEEK_STEP}s &raquo;</button>
          <button onClick={syncAll}>Sync All</button>
          <button onClick={toggleMuteAll}>{allMuted ? 'Unmute All' : 'Mute All'}</button>
        </div>
      )}
    </div>
  );
}

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default App;
