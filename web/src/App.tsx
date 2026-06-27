import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  MriButton, 
  MriInput, 
  MriCard, 
  MriCardHeader, 
  MriCardContent,
  MriBadge,
  MriSearchInput
} from '@mriqbox/ui-kit';
import { 
  Laptop, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Play, 
  Square, 
  Copy, 
  Star, 
  Clock, 
  Plus, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Sliders, 
  TrendingUp, 
  Code 
} from 'lucide-react';
import { devParticles, devSounds, type SoundEntry } from './devData';

type SoundTab = 'all' | 'fav' | 'recent';

interface NuiWindow extends Window {
  GetParentResourceName?: () => string;
}

const isNuiEnvironment = typeof (window as NuiWindow).GetParentResourceName === 'function';
const isBrowserPreview = !isNuiEnvironment;

function postNui(endpoint: string, data: Record<string, unknown> = {}) {
  if (!isNuiEnvironment) return;

  const resource = (window as NuiWindow).GetParentResourceName?.();
  if (!resource) return;

  void fetch(`https://${resource}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: JSON.stringify(data),
  }).catch(() => undefined);
}

function buildSoundIndex(sounds: SoundEntry[]) {
  return new Map(sounds.map((sound, index) => [
    `${sound.AudioName}|${sound.AudioRef || 'HUD_FRONTEND_DEFAULT_SOUNDSET'}`,
    index,
  ]));
}

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export default function App() {
  const [open, setOpen] = useState(isBrowserPreview);
  const [activeTab, setActiveTab] = useState<'particles' | 'sounds'>('particles');
  const [activeSoundTab, setActiveSoundTab] = useState<SoundTab>('all');
  const [sidebarHovered, setSidebarHovered] = useState(false);

  // Databases (NUI loaded)
  const [particlesData, setParticlesData] = useState<Record<string, string[]>>(isBrowserPreview ? devParticles : {});
  const [soundsData, setSoundsData] = useState<SoundEntry[]>(isBrowserPreview ? devSounds : []);
  const [soundKeyToId, setSoundKeyToId] = useState<Map<string, number>>(() => buildSoundIndex(isBrowserPreview ? devSounds : []));
  const [playingSoundId, setPlayingSoundId] = useState<number | null>(null);
  const [autoplay, setAutoplay] = useState(true);
  const [hideUnsetted, setHideUnsetted] = useState(true);
  const [selectedSoundIdx, setSelectedSoundIdx] = useState<number>(0);
  const [visibleCount, setVisibleCount] = useState(100);

  // Favorites & Recents Persistent states
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recents, setRecents] = useState<string[]>([]);

  // Search filter states
  const [soundSearch, setSoundSearch] = useState('');
  const [particleSearch, setParticleSearch] = useState('');
  const [showParticleSearchDropdown, setShowParticleSearchDropdown] = useState(false);

  // Particles config states
  const [currentDictIdx, setCurrentDictIdx] = useState(0);
  const [currentFxIdx, setCurrentFxIdx] = useState(0);
  const [particleScale, setParticleScale] = useState(1.0);
  const [color, setColor] = useState<RGBA>({ r: 1.0, g: 1.0, b: 1.0, a: 1.0 });
  const [evolutionValues, setEvolutionValues] = useState<Record<string, number>>({});
  const [evoName, setEvoName] = useState('');
  const [evoValue, setEvoValue] = useState(1.0);
  const [isPlayingParticle, setIsPlayingParticle] = useState(false);

  // Window coordinates state
  const [pos, setPos] = useState({ x: 100, y: 100 });
  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const posRef = useRef(pos);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  // Toast System
  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
  };

  useEffect(() => {
    if (toastVisible) {
      const t = setTimeout(() => setToastVisible(false), 2500);
      return () => clearTimeout(t);
    }
  }, [toastVisible]);

  // Load Saved Settings on Mount
  useEffect(() => {
    // Favorites
    try {
      const favs = JSON.parse(localStorage.getItem("gst_favs") || "[]");
      setFavorites(new Set(favs));
    } catch {}

    // Recents
    try {
      const rec = JSON.parse(localStorage.getItem("gst_recent") || "[]");
      setRecents(Array.isArray(rec) ? rec : []);
    } catch {}

    // Options
    try {
      const savedAutoplay = localStorage.getItem("gst_autoplay");
      if (savedAutoplay !== null) setAutoplay(savedAutoplay === "true");
      const savedHide = localStorage.getItem("gst_hide_unsetted");
      if (savedHide !== null) setHideUnsetted(savedHide === "true");
    } catch {}

    // Window Position
    try {
      const savedX = localStorage.getItem("devtools_x");
      const savedY = localStorage.getItem("devtools_y");
      if (savedX && savedY) {
        setPos({ x: parseFloat(savedX), y: parseFloat(savedY) });
      } else {
        // center slightly
        setPos({ x: window.innerWidth * 0.05, y: window.innerHeight * 0.1 });
      }
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("gst_autoplay", autoplay ? "true" : "false");
  }, [autoplay]);

  useEffect(() => {
    localStorage.setItem("gst_hide_unsetted", hideUnsetted ? "true" : "false");
  }, [hideUnsetted]);

  useEffect(() => {
    setSelectedSoundIdx(0);
  }, [soundSearch, activeSoundTab]);

  useEffect(() => {
    if (activeTab === 'sounds' && open) {
      const activeEl = containerRef.current?.querySelector('.sound-item-active');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedSoundIdx, activeTab, open]);

  useEffect(() => {
    setVisibleCount(100);
  }, [soundSearch, activeSoundTab]);



  // Dragging mouse listener
  const handleDragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // left click only
    if ((e.target as HTMLElement).closest('button, input, select, textarea, .slider, .evolution-item, a')) return;

    draggingRef.current = true;
    dragOffsetRef.current = {
      x: pos.x - e.clientX,
      y: pos.y - e.clientY
    };

    const handleDragMove = (moveEvent: MouseEvent) => {
      if (!draggingRef.current) return;
      const newX = moveEvent.clientX + dragOffsetRef.current.x;
      const newY = moveEvent.clientY + dragOffsetRef.current.y;

      const minX = -350;
      const maxX = window.innerWidth - 100;
      const minY = 0;
      const maxY = window.innerHeight - 100;

      const clampedX = Math.max(minX, Math.min(maxX, newX));
      const clampedY = Math.max(minY, Math.min(maxY, newY));

      setPos({ x: clampedX, y: clampedY });
    };

    const handleDragEnd = () => {
      draggingRef.current = false;
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);

      localStorage.setItem("devtools_x", `${posRef.current.x}px`);
      localStorage.setItem("devtools_y", `${posRef.current.y}px`);
    };

    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('mouseup', handleDragEnd);
  };

  // NUI Message Router
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      const item = e.data;
      if (item.action === "LOAD_DATABASES") {
        const parts = item.particles || {};
        const sounds = item.sounds || [];
        setParticlesData(parts);
        setSoundsData(sounds);

        // Build sound key to index map
        setSoundKeyToId(buildSoundIndex(sounds));
      } else if (item.action === "SET_OPEN_STATE") {
        setOpen(item.state);
        if (item.state && item.tab) {
          setActiveTab(item.tab);
        }
      } else if (item.action === "soundFinished") {
        setPlayingSoundId(current => current === item.soundId ? null : current);
      }
    };
    window.addEventListener('message', handleMessage);

    // Notify client the React UI is loaded
    postNui('uiLoaded');

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Orbit camera scroll / zoom listeners
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!open) return;
      // If scroll is over the devtools, let NUI handle scroll, do not zoom
      if ((e.target as HTMLElement).closest('#devtools-container')) return;

      postNui("CAMERA_ZOOM", { delta: e.deltaY > 0 ? 0.5 : -0.5 });
    };
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => window.removeEventListener('wheel', handleWheel);
  }, [open]);

  // Orbit camera dragging
  useEffect(() => {
    let camDragging = false;
    let accDx = 0;
    let accDy = 0;
    let rafId = 0;

    const flushCamera = () => {
      if (accDx !== 0 || accDy !== 0) {
        postNui("CAMERA_ROTATE", { dx: accDx, dy: accDy });
        accDx = 0;
        accDy = 0;
      }
      if (camDragging) {
        rafId = requestAnimationFrame(flushCamera);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 2 || !open) return; // Right Click only
      if ((e.target as HTMLElement).closest('#devtools-container')) return; // ignore right click on UI

      camDragging = true;
      accDx = 0;
      accDy = 0;
      rafId = requestAnimationFrame(flushCamera);
      e.preventDefault();
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button !== 2 || !camDragging) return;
      camDragging = false;
      cancelAnimationFrame(rafId);
      flushCamera();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!camDragging) return;
      accDx += e.movementX;
      accDy += e.movementY;
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (open) e.preventDefault();
    };

    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [open]);

  // Close UI callback
  const closeUI = useCallback(() => {
    if (isBrowserPreview) {
      setOpen(false);
      return;
    }
    postNui('closeInterface');
  }, []);

  // Particles variables calculations
  const dictKeys = useMemo(() => Object.keys(particlesData), [particlesData]);
  const currentDict = useMemo(() => dictKeys[currentDictIdx] || '', [dictKeys, currentDictIdx]);
  const effectsInDict = useMemo(() => particlesData[currentDict] || [], [particlesData, currentDict]);
  const currentFx = useMemo(() => effectsInDict[currentFxIdx] || '', [effectsInDict, currentFxIdx]);

  // Trigger NUI change particle on selection change
  useEffect(() => {
    if (currentDict && currentFx && open) {
      postNui("CHANGE_PARTICLE", {
        dictionary: currentDict,
        particleFx: currentFx
      });
    }
  }, [currentDict, currentFx, open]);

  const handleDictPrev = useCallback(() => {
    if (currentDictIdx > 0) {
      setCurrentDictIdx(prev => prev - 1);
      setCurrentFxIdx(0);
    }
  }, [currentDictIdx]);

  const handleDictNext = useCallback(() => {
    if (currentDictIdx < dictKeys.length - 1) {
      setCurrentDictIdx(prev => prev + 1);
      setCurrentFxIdx(0);
    }
  }, [currentDictIdx, dictKeys.length]);

  const handleFxPrev = useCallback(() => {
    if (currentFxIdx > 0) {
      setCurrentFxIdx(prev => prev - 1);
    } else if (currentDictIdx > 0) {
      setCurrentDictIdx(prev => prev - 1);
      const prevEffects = particlesData[dictKeys[currentDictIdx - 1]] || [];
      setCurrentFxIdx(prevEffects.length - 1);
    }
  }, [currentDictIdx, currentFxIdx, dictKeys, particlesData]);

  const handleFxNext = useCallback(() => {
    if (currentFxIdx < effectsInDict.length - 1) {
      setCurrentFxIdx(prev => prev + 1);
    } else if (currentDictIdx < dictKeys.length - 1) {
      setCurrentDictIdx(prev => prev + 1);
      setCurrentFxIdx(0);
    }
  }, [currentDictIdx, currentFxIdx, dictKeys.length, effectsInDict.length]);

  const adjustScale = useCallback((amount: number) => {
    setParticleScale(prev => {
      const next = Math.max(0.1, Math.min(15.0, prev + amount));
      postNui("CHANGE_PARTICLE_SCALE", { scale: next });
      return next;
    });
  }, []);



  const handleScaleChange = (val: number) => {
    setParticleScale(val);
    postNui("CHANGE_PARTICLE_SCALE", { scale: val });
  };

  const handleColorChange = (chan: keyof RGBA, val: number) => {
    setColor(prev => {
      const next = { ...prev, [chan]: val };
      postNui("CHANGE_PARTICLE_COLOR", {
        color: {
          r: next.r,
          g: next.g,
          b: next.b,
          a: next.a
        }
      });
      return next;
    });
  };

  const handlePlayToggle = (playState: boolean) => {
    setIsPlayingParticle(playState);
    postNui("SET_PLAYING_STATE", { state: playState });
  };

  const addEvolution = () => {
    const name = evoName.trim();
    if (name && !isNaN(evoValue)) {
      setEvolutionValues(prev => {
        const next = { ...prev, [name]: evoValue };
        postNui("CHANGE_EVOLUTION_PROPERTY", { name, value: evoValue });
        return next;
      });
      setEvoName('');
      setEvoValue(1.0);
    }
  };

  const removeEvolution = (name: string) => {
    setEvolutionValues(prev => {
      const next = { ...prev };
      delete next[name];
      postNui("CHANGE_EVOLUTION_PROPERTY", { name, value: 0.0 });
      return next;
    });
  };

  // Particles autocomplete search
  const particleMatches = useMemo(() => {
    const query = particleSearch.toLowerCase().trim();
    if (!query) return [];

    const matches: { dictIdx: number; fxIdx: number; dict: string; fx: string }[] = [];
    for (let d = 0; d < dictKeys.length; d++) {
      const dict = dictKeys[d];
      const effects = particlesData[dict] || [];
      for (let f = 0; f < effects.length; f++) {
        const fx = effects[f];
        if (fx.toLowerCase().includes(query) || dict.toLowerCase().includes(query)) {
          matches.push({ dictIdx: d, fxIdx: f, dict, fx });
        }
        if (matches.length >= 10) break;
      }
      if (matches.length >= 10) break;
    }
    return matches;
  }, [particleSearch, dictKeys, particlesData]);

  // Code Snippet Builder
  const luaCodeSnippet = useMemo(() => {
    if (!currentDict || !currentFx) return '-- Selecting Ptfx...';
    
    let evoCode = "";
    if (Object.keys(evolutionValues).length > 0) {
      evoCode = "\n    -- Set Evolution Properties\n";
      for (const [name, val] of Object.entries(evolutionValues)) {
        evoCode += `    SetParticleFxLoopedEvolution(handle, "${name}", ${val.toFixed(2)}, false)\n`;
      }
    }

    return `-- Play Looped Particle on Entity
RequestNamedPtfxAsset("${currentDict}")
while not HasNamedPtfxAssetLoaded("${currentDict}") do Wait(10) end
UseParticleFxAssetNextCall("${currentDict}")
local handle = StartParticleFxLoopedOnEntity(
    "${currentFx}", 
    PlayerPedId(), 
    0.0, 1.0, 0.0, -- Offset
    0.0, 0.0, 0.0, -- Rotation
    ${particleScale.toFixed(1)}, 
    false, false, false
)
SetParticleFxLoopedColour(handle, ${color.r.toFixed(2)}, ${color.g.toFixed(2)}, ${color.b.toFixed(2)}, false)
SetParticleFxLoopedAlpha(handle, ${color.a.toFixed(2)})${evoCode}`;
  }, [currentDict, currentFx, particleScale, color, evolutionValues]);

  const copyToClipboard = (text: string) => {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    showToast("Copied to clipboard!");
  };

  // Sounds lists filtering
  const baseSoundsList = useMemo(() => {
    let list = soundsData;
    if (activeSoundTab === 'fav') {
      list = soundsData.filter(s => {
        const key = `${s.AudioName}|${s.AudioRef || "HUD_FRONTEND_DEFAULT_SOUNDSET"}`;
        return favorites.has(key);
      });
    } else if (activeSoundTab === 'recent') {
      list = recents.map(k => {
        const idx = soundKeyToId.get(k);
        return idx !== undefined ? soundsData[idx] : null;
      }).filter((s): s is SoundEntry => s !== null);
    }

    if (hideUnsetted) {
      list = list.filter(s => s.AudioRef && s.AudioRef !== '0');
    }
    return list;
  }, [activeSoundTab, soundsData, favorites, recents, soundKeyToId, hideUnsetted]);

  const filteredSoundsList = useMemo(() => {
    const query = soundSearch.toLowerCase().trim();
    if (!query) return baseSoundsList;

    return baseSoundsList.filter(s => 
      s.AudioName.toLowerCase().includes(query) || 
      (s.AudioRef || "HUD_FRONTEND_DEFAULT_SOUNDSET").toLowerCase().includes(query)
    );
  }, [baseSoundsList, soundSearch]);

  const playFrontendSound = (audioName: string, audioRef: string, index: number) => {
    postNui("playSound", {
      audioName,
      audioRef,
      audioId: index
    });
    setPlayingSoundId(index);

    const key = `${audioName}|${audioRef}`;
    setRecents(prev => {
      const next = prev.filter(k => k !== key);
      next.unshift(key);
      if (next.length > 50) next.pop();
      localStorage.setItem("gst_recent", JSON.stringify(next));
      return next;
    });
  };

  const stopAllSounds = () => {
    setPlayingSoundId(null);
    postNui("stopSounds");
  };

  const copySoundSnippet = (audioName: string, audioRef: string) => {
    copyToClipboard(`PlaySoundFrontend(-1, "${audioName}", "${audioRef}", true)`);
  };

  const toggleFavorite = (audioName: string, audioRef: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const key = `${audioName}|${audioRef}`;
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
        showToast("Removed from favorites");
      } else {
        next.add(key);
        showToast("Added to favorites!");
      }
      localStorage.setItem("gst_favs", JSON.stringify([...next]));
      return next;
    });
  };

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 150) {
      setVisibleCount(prev => Math.min(prev + 100, filteredSoundsList.length));
    }
  }, [filteredSoundsList.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) return;

      const key = event.key.toLowerCase();
      if (key === 'escape') {
        closeUI();
        return;
      }

      const isInput = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';

      if (activeTab === 'particles') {
        if (isInput) return;
        if (key === 'q') handleDictPrev();
        if (key === 'e') handleDictNext();
        if (key === 'arrowleft') handleFxPrev();
        if (key === 'arrowright') handleFxNext();
        if (key === 'arrowup' || key === 'arrowdown') {
          event.preventDefault();
          adjustScale(key === 'arrowup' ? 0.1 : -0.1);
        }
      } else if (activeTab === 'sounds') {
        if (isInput && key !== 'arrowup' && key !== 'arrowdown' && key !== 'enter') {
          return;
        }

        const total = filteredSoundsList.length;
        if (total === 0) return;

        if (key === 'arrowup') {
          event.preventDefault();
          setSelectedSoundIdx(prev => {
            const next = Math.max(0, prev - 1);
            if (next !== prev && autoplay) {
              const sound = filteredSoundsList[next];
              const originalIndex = soundKeyToId.get(`${sound.AudioName}|${sound.AudioRef || "HUD_FRONTEND_DEFAULT_SOUNDSET"}`) || 0;
              playFrontendSound(sound.AudioName, sound.AudioRef || "HUD_FRONTEND_DEFAULT_SOUNDSET", originalIndex);
            }
            return next;
          });
        }
        if (key === 'arrowdown') {
          event.preventDefault();
          setSelectedSoundIdx(prev => {
            const next = Math.min(total - 1, prev + 1);
            if (next !== prev && autoplay) {
              const sound = filteredSoundsList[next];
              const originalIndex = soundKeyToId.get(`${sound.AudioName}|${sound.AudioRef || "HUD_FRONTEND_DEFAULT_SOUNDSET"}`) || 0;
              playFrontendSound(sound.AudioName, sound.AudioRef || "HUD_FRONTEND_DEFAULT_SOUNDSET", originalIndex);
            }
            return next;
          });
        }
        if (key === 'enter' || key === ' ') {
          event.preventDefault();
          const sound = filteredSoundsList[selectedSoundIdx];
          if (sound) {
            const originalIndex = soundKeyToId.get(`${sound.AudioName}|${sound.AudioRef || "HUD_FRONTEND_DEFAULT_SOUNDSET"}`) || 0;
            playFrontendSound(sound.AudioName, sound.AudioRef || "HUD_FRONTEND_DEFAULT_SOUNDSET", originalIndex);
          }
        }
        if (key === 'c') {
          event.preventDefault();
          const sound = filteredSoundsList[selectedSoundIdx];
          if (sound) {
            copySoundSnippet(sound.AudioName, sound.AudioRef || "HUD_FRONTEND_DEFAULT_SOUNDSET");
          }
        }
        if (key === 'f') {
          event.preventDefault();
          const sound = filteredSoundsList[selectedSoundIdx];
          if (sound) {
            const keyName = `${sound.AudioName}|${sound.AudioRef || "HUD_FRONTEND_DEFAULT_SOUNDSET"}`;
            setFavorites(prev => {
              const next = new Set(prev);
              if (next.has(keyName)) {
                next.delete(keyName);
                showToast("Removed from favorites");
              } else {
                next.add(keyName);
                showToast("Added to favorites!");
              }
              localStorage.setItem("gst_favs", JSON.stringify([...next]));
              return next;
            });
          }
        }
        if (key === 'r') {
          event.preventDefault();
          const sound = filteredSoundsList[selectedSoundIdx];
          if (sound) {
            const originalIndex = soundKeyToId.get(`${sound.AudioName}|${sound.AudioRef || "HUD_FRONTEND_DEFAULT_SOUNDSET"}`) || 0;
            playFrontendSound(sound.AudioName, sound.AudioRef || "HUD_FRONTEND_DEFAULT_SOUNDSET", originalIndex);
          }
        }
        if (key === 's') {
          event.preventDefault();
          stopAllSounds();
        }
        if (key === '1') {
          event.preventDefault();
          setActiveSoundTab('all');
        }
        if (key === '2') {
          event.preventDefault();
          setActiveSoundTab('fav');
        }
        if (key === '3') {
          event.preventDefault();
          setActiveSoundTab('recent');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    open,
    activeTab,
    closeUI,
    handleDictPrev,
    handleDictNext,
    handleFxPrev,
    handleFxNext,
    adjustScale,
    filteredSoundsList,
    selectedSoundIdx,
    autoplay,
    soundKeyToId,
    playFrontendSound,
    copySoundSnippet,
    favorites,
    setFavorites,
    setActiveSoundTab,
    stopAllSounds
  ]);

  if (!open) {
    if (!isBrowserPreview) return null;

    return (
      <div className="fixed inset-0 grid place-items-center">
        <MriButton onClick={() => setOpen(true)} className="gap-2 shadow-lg shadow-primary/20">
          <Laptop className="h-4 w-4" />
          Open DevTools preview
        </MriButton>
      </div>
    );
  }

  return (
    <div 
      id="devtools-container" 
      ref={containerRef}
      onMouseDown={handleDragStart}
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`
      }}
      className="w-[25vw] min-w-[440px] max-w-[520px] h-[75vh] min-height-[550px] max-height-[750px] absolute bg-background/95 border border-border/80 rounded-2xl shadow-2xl flex overflow-hidden select-none font-sans"
    >
      {/* Sidebar Navigation */}
      <aside 
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        className={`bg-card/90 border-r border-border/60 py-7 flex flex-col justify-between shrink-0 relative transition-all duration-300 ease-in-out z-50 ${
          sidebarHovered ? 'w-[220px] px-5' : 'w-[72px] px-3.5'
        }`}
      >
        <div className="flex flex-col gap-9 shrink-0">
          <div className="flex items-center gap-3 relative w-[180px]">
            <Laptop className="h-6 w-6 text-primary drop-shadow-[0_0_8px_rgba(0,230,153,0.6)] shrink-0" />
            <h2 className={`font-bold text-lg tracking-wider bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent white-space-nowrap transition-opacity duration-300 ${
              sidebarHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}>
              MRI <span className="text-primary">DevTools</span>
            </h2>
          </div>
          
          <nav className="flex flex-col gap-2">
            <MriButton 
              variant={activeTab === 'particles' ? 'default' : 'ghost'} 
              onClick={() => setActiveTab('particles')}
              className={`w-full justify-start text-sm font-medium gap-4 rounded-xl transition-all duration-150 h-11 px-3 ${
                activeTab === 'particles' ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles className="h-[18px] w-[18px] shrink-0" />
              <span className={`transition-opacity duration-300 whitespace-nowrap ${sidebarHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                Particles
              </span>
            </MriButton>

            <MriButton 
              variant={activeTab === 'sounds' ? 'default' : 'ghost'} 
              onClick={() => setActiveTab('sounds')}
              className={`w-full justify-start text-sm font-medium gap-4 rounded-xl transition-all duration-150 h-11 px-3 ${
                activeTab === 'sounds' ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Volume2 className="h-[18px] w-[18px] shrink-0" />
              <span className={`transition-opacity duration-300 whitespace-nowrap ${sidebarHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                Sound Tester
              </span>
            </MriButton>
          </nav>
        </div>

        <div className="flex flex-col gap-4 shrink-0">
          <div className={`bg-neutral-900/40 border border-neutral-800/50 rounded-xl p-3.5 transition-all duration-300 ${
            sidebarHovered ? 'opacity-100 max-h-[300px]' : 'opacity-0 max-h-0 overflow-hidden pointer-events-none'
          }`}>
            <h3 className="font-semibold text-xs text-neutral-400 mb-2 flex items-center gap-1.5">
              Controls
            </h3>
            <ul className="flex flex-col gap-1.5 text-[10px] text-neutral-500">
              <li className="flex justify-between"><span>Right Click+Drag</span> <span className="text-neutral-400 font-medium">Orbit Cam</span></li>
              <li className="flex justify-between"><span>Mouse Wheel</span> <span className="text-neutral-400 font-medium">Zoom Cam</span></li>
              <li className="flex justify-between"><span>Q / E</span> <span className="text-neutral-400 font-medium">Prev/Next Dict</span></li>
              <li className="flex justify-between"><span>Arrow L / R</span> <span className="text-neutral-400 font-medium">Prev/Next Fx</span></li>
              <li className="flex justify-between"><span>Arrow U / D</span> <span className="text-neutral-400 font-medium">Adjust Scale</span></li>
              <li className="flex justify-between"><span>ESC</span> <span className="text-neutral-400 font-medium">Close UI</span></li>
            </ul>
          </div>

          <MriButton 
            variant="destructive" 
            onClick={closeUI}
            className={`w-full justify-start gap-4 rounded-xl transition-all duration-150 h-11 px-3 ${
              sidebarHovered ? 'justify-center bg-red-950/40 text-red-400 border border-red-900/30 hover:bg-red-900/40' : ''
            }`}
          >
            <X className="h-[18px] w-[18px] shrink-0" />
            <span className={`transition-opacity duration-300 whitespace-nowrap ${sidebarHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              Close UI
            </span>
          </MriButton>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow h-full p-5 overflow-y-auto relative bg-neutral-950/20">
        {/* Particles Tab View */}
        {activeTab === 'particles' && (
          <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <header className="flex justify-between items-center mb-1">
              <div>
                <h1 className="font-bold text-xl tracking-tight text-white">Particle Viewer</h1>
                <p className="text-xs text-neutral-500 mt-0.5">Preview and adjust particle assets.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <MriButton 
                  size="sm" 
                  variant="default"
                  onClick={() => handlePlayToggle(true)}
                  className={`h-8 gap-1.5 px-3 font-semibold text-xs border border-primary/20 ${isPlayingParticle ? 'shadow-[0_0_12px_rgba(0,230,153,0.4)]' : ''}`}
                >
                  <Play size={12} fill="currentColor" /> Play
                </MriButton>
                <MriButton 
                  size="sm" 
                  variant="destructive"
                  onClick={() => handlePlayToggle(false)}
                  className={`h-8 gap-1.5 px-3 font-semibold text-xs border border-red-900/20 ${!isPlayingParticle ? 'shadow-[0_0_12px_rgba(239,68,68,0.4)]' : ''}`}
                >
                  <Square size={12} fill="currentColor" /> Stop
                </MriButton>
              </div>
            </header>

            {/* Search autocomplete bar */}
            <div className="relative" onFocusCapture={() => setShowParticleSearchDropdown(true)}>
              <MriSearchInput
                value={particleSearch}
                onChange={(value) => {
                  setParticleSearch(value);
                  setShowParticleSearchDropdown(true);
                }}
                placeholder="Search particle effect or dictionary..."
                width="w-full"
                size="sm"
                className="[&_input]:bg-card/60 [&_input]:border-border/80 [&_input]:rounded-xl [&_input]:text-xs"
              />
              {showParticleSearchDropdown && particleMatches.length > 0 && (
                <div className="absolute top-10 left-0 w-full bg-neutral-900 border border-border/80 rounded-xl z-[100] shadow-2xl overflow-hidden">
                  {particleMatches.map((m, idx) => (
                    <div 
                      key={idx}
                      onClick={() => {
                        setCurrentDictIdx(m.dictIdx);
                        setCurrentFxIdx(m.fxIdx);
                        setParticleSearch('');
                        setShowParticleSearchDropdown(false);
                      }}
                      className="px-4 py-2 text-xs border-b border-border/20 last:border-none cursor-pointer hover:bg-neutral-800/80 transition-colors flex justify-between"
                    >
                      <span className="font-semibold text-white">{m.fx}</span>
                      <span className="text-[10px] text-neutral-500 font-mono">{m.dict}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4">
              {/* Configuration Card */}
              <MriCard className="bg-card/90 border-border p-4 shadow-md rounded-xl">
                <MriCardHeader className="p-0 mb-3.5 flex flex-row items-center gap-2">
                  <Sliders className="h-4.5 w-4.5 text-primary" />
                  <h3 className="font-semibold text-sm text-neutral-200">Configuration</h3>
                </MriCardHeader>
                <MriCardContent className="p-0 flex flex-col gap-3.5">
                  <div className="flex justify-between items-center py-2 border-b border-border/20">
                    <span className="text-xs text-neutral-400 font-medium">Ptfx Dictionary</span>
                    <div className="flex items-center bg-black/40 border border-border/60 rounded-lg p-0.5">
                      <MriButton size="icon" variant="ghost" onClick={handleDictPrev} className="h-7 w-7 text-neutral-400 hover:text-white"><ChevronLeft size={14} /></MriButton>
                      <span className="text-xs font-semibold text-primary px-3 min-w-[120px] text-center overflow-hidden text-ellipsis whitespace-nowrap">{currentDict || 'core'}</span>
                      <MriButton size="icon" variant="ghost" onClick={handleDictNext} className="h-7 w-7 text-neutral-400 hover:text-white"><ChevronRight size={14} /></MriButton>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-border/20">
                    <span className="text-xs text-neutral-400 font-medium">Particle Effect</span>
                    <div className="flex items-center bg-black/40 border border-border/60 rounded-lg p-0.5">
                      <MriButton size="icon" variant="ghost" onClick={handleFxPrev} className="h-7 w-7 text-neutral-400 hover:text-white"><ChevronLeft size={14} /></MriButton>
                      <span className="text-xs font-semibold text-primary px-3 min-w-[120px] text-center overflow-hidden text-ellipsis whitespace-nowrap">{currentFx || 'bul_gravel_heli'}</span>
                      <MriButton size="icon" variant="ghost" onClick={handleFxNext} className="h-7 w-7 text-neutral-400 hover:text-white"><ChevronRight size={14} /></MriButton>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 mt-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-400 font-medium">Scale</span>
                      <span className="font-bold text-primary text-[11px] bg-primary/10 px-2 py-0.5 rounded">{particleScale.toFixed(1)}</span>
                    </div>
                    <input 
                      type="range" 
                      min="0.1" 
                      max="15.0" 
                      step="0.1" 
                      value={particleScale}
                      onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
                      className="w-full h-1 rounded-lg appearance-none bg-neutral-800 accent-primary cursor-pointer"
                    />
                  </div>

                  <div className="flex flex-col gap-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-neutral-400 font-medium">Color (RGBA)</span>
                      <div 
                        className="w-7 h-4.5 rounded border border-border shadow-inner" 
                        style={{ backgroundColor: `rgba(${color.r*255}, ${color.g*255}, ${color.b*255}, ${color.a})` }}
                      />
                    </div>
                    <div className="flex flex-col gap-2 bg-neutral-950/20 p-2.5 rounded-lg border border-border/20">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-red-500 w-3">R</span>
                        <input type="range" min="0" max="1" step="0.01" value={color.r} onChange={(e) => handleColorChange('r', parseFloat(e.target.value))} className="w-full h-1 appearance-none bg-neutral-800 accent-red-500 rounded cursor-pointer" />
                        <span className="text-[10px] text-neutral-500 w-6 text-right">{Math.round(color.r*255)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-emerald-500 w-3">G</span>
                        <input type="range" min="0" max="1" step="0.01" value={color.g} onChange={(e) => handleColorChange('g', parseFloat(e.target.value))} className="w-full h-1 appearance-none bg-neutral-800 accent-emerald-500 rounded cursor-pointer" />
                        <span className="text-[10px] text-neutral-500 w-6 text-right">{Math.round(color.g*255)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-blue-500 w-3">B</span>
                        <input type="range" min="0" max="1" step="0.01" value={color.b} onChange={(e) => handleColorChange('b', parseFloat(e.target.value))} className="w-full h-1 appearance-none bg-neutral-800 accent-blue-500 rounded cursor-pointer" />
                        <span className="text-[10px] text-neutral-500 w-6 text-right">{Math.round(color.b*255)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-neutral-400 w-3">A</span>
                        <input type="range" min="0" max="1" step="0.01" value={color.a} onChange={(e) => handleColorChange('a', parseFloat(e.target.value))} className="w-full h-1 appearance-none bg-neutral-800 accent-neutral-500 rounded cursor-pointer" />
                        <span className="text-[10px] text-neutral-500 w-6 text-right">{color.a.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </MriCardContent>
              </MriCard>

              {/* Evolution variables */}
              <MriCard className="bg-card/90 border-border p-4 shadow-md rounded-xl">
                <MriCardHeader className="p-0 mb-3.5 flex flex-row items-center gap-2">
                  <TrendingUp className="h-4.5 w-4.5 text-primary" />
                  <h3 className="font-semibold text-sm text-neutral-200">Evolution Variables</h3>
                </MriCardHeader>
                <MriCardContent className="p-0 flex flex-col gap-3">
                  <div className="flex gap-2">
                    <MriInput 
                      placeholder="Variable (e.g. speed)" 
                      value={evoName}
                      onChange={(e) => setEvoName(e.target.value)}
                      className="h-8 text-xs bg-black/30 border-border/80 focus-visible:ring-primary"
                    />
                    <MriInput 
                      type="number" 
                      step="0.1"
                      value={evoValue}
                      onChange={(e) => setEvoValue(parseFloat(e.target.value) || 0.0)}
                      className="h-8 text-xs bg-black/30 border-border/80 w-16 text-center focus-visible:ring-primary"
                    />
                    <MriButton variant="default" size="sm" onClick={addEvolution} className="h-8 w-8 px-0 shrink-0">
                      <Plus size={14} />
                    </MriButton>
                  </div>
                  <div className="flex flex-col gap-2 max-h-[120px] overflow-y-auto">
                    {Object.entries(evolutionValues).map(([name, val]) => (
                      <div key={name} className="flex justify-between items-center bg-neutral-900/60 border border-neutral-800/40 rounded-lg px-3 py-1.5 text-xs">
                        <span className="text-neutral-400 font-medium">{name}</span>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-primary">{val.toFixed(2)}</span>
                          <button onClick={() => removeEvolution(name)} className="text-neutral-500 hover:text-red-500 transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </MriCardContent>
              </MriCard>

              {/* Code snippet card */}
              <MriCard className="bg-card/90 border-border p-4 shadow-md rounded-xl">
                <div className="flex justify-between items-center mb-3.5">
                  <div className="flex items-center gap-2">
                    <Code className="h-4.5 w-4.5 text-primary" />
                    <h3 className="font-semibold text-sm text-neutral-200">Lua Code Snippet</h3>
                  </div>
                  <MriButton variant="secondary" size="sm" onClick={() => copyToClipboard(luaCodeSnippet)} className="h-7 gap-1 px-2 text-[10px] font-semibold">
                    <Copy size={11} /> Copy
                  </MriButton>
                </div>
                <MriCardContent className="p-0">
                  <div className="bg-black/60 border border-border/80 rounded-xl p-3 max-h-[140px] overflow-auto text-[10px] font-mono text-indigo-200">
                    <pre className="select-text whitespace-pre"><code className="select-text">{luaCodeSnippet}</code></pre>
                  </div>
                </MriCardContent>
              </MriCard>
            </div>
          </div>
        )}

        {/* Sound Tester Tab View */}
        {activeTab === 'sounds' && (
          <div className="flex flex-col gap-4 h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
            <header className="flex justify-between items-center mb-1">
              <div>
                <h1 className="font-bold text-xl tracking-tight text-white">Sound Tester</h1>
                <p className="text-xs text-neutral-500 mt-0.5">Audition frontend sound assets.</p>
              </div>
              <MriButton 
                size="sm" 
                variant="destructive"
                onClick={stopAllSounds}
                className="h-8 gap-1.5 px-3 font-semibold text-xs border border-red-900/20"
              >
                <VolumeX size={12} /> Stop All
              </MriButton>
            </header>

            <div className="flex gap-1 rounded-xl border border-border bg-muted/50 p-1 shadow-inner">
              <MriButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveSoundTab('all')}
                className={`h-8 flex-1 text-xs ${activeSoundTab === 'all' ? 'bg-background text-primary ring-1 ring-border/20' : 'text-muted-foreground'}`}
              >
                All
              </MriButton>
              <MriButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveSoundTab('fav')}
                className={`h-8 flex-1 gap-1.5 text-xs ${activeSoundTab === 'fav' ? 'bg-background text-primary ring-1 ring-border/20' : 'text-muted-foreground'}`}
              >
                <Star className="h-3 w-3" /> Favorites
              </MriButton>
              <MriButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActiveSoundTab('recent')}
                className={`h-8 flex-1 gap-1.5 text-xs ${activeSoundTab === 'recent' ? 'bg-background text-primary ring-1 ring-border/20' : 'text-muted-foreground'}`}
              >
                <Clock className="h-3 w-3" /> Recent
              </MriButton>
            </div>

            {/* Options Row */}
            <div className="flex justify-between items-center gap-4 bg-card/45 border border-border/30 p-2 rounded-xl text-[11px] font-medium text-neutral-400 shrink-0">
              <label className="flex items-center gap-2 cursor-pointer select-none hover:text-white transition-colors">
                <input 
                  type="checkbox" 
                  checked={autoplay}
                  onChange={(e) => setAutoplay(e.target.checked)}
                  className="rounded bg-black/60 border-border/80 text-primary focus:ring-0 focus:ring-offset-0 cursor-pointer w-3.5 h-3.5"
                />
                <span>Auto-play</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer select-none hover:text-white transition-colors">
                <input 
                  type="checkbox" 
                  checked={hideUnsetted}
                  onChange={(e) => setHideUnsetted(e.target.checked)}
                  className="rounded bg-black/60 border-border/80 text-primary focus:ring-0 focus:ring-offset-0 cursor-pointer w-3.5 h-3.5"
                />
                <span>Hide Unsetted</span>
              </label>
            </div>

            {/* Sound Search bar */}
            <MriSearchInput
              value={soundSearch}
              onChange={setSoundSearch}
              placeholder="Search sounds by name or reference..."
              width="w-full"
              size="sm"
              className="[&_input]:bg-card/60 [&_input]:border-border/80 [&_input]:rounded-xl [&_input]:text-xs"
            />

            {/* Sound List viewport */}
            <div 
              className="flex-grow overflow-y-auto pr-1"
              onScroll={handleScroll}
            >
              <div className="flex flex-col gap-2 pr-2">
              {filteredSoundsList.slice(0, visibleCount).map((sound, i) => {
                const audioName = sound.AudioName;
                const audioRef = sound.AudioRef || "HUD_FRONTEND_DEFAULT_SOUNDSET";
                const key = `${audioName}|${audioRef}`;
                const isFav = favorites.has(key);
                const originalIndex = soundKeyToId.get(key) || 0;

                return (
                  <div 
                    key={i}
                    className={`flex justify-between items-center bg-card/40 border border-border/40 hover:border-primary/20 hover:bg-card/75 rounded-xl px-3.5 py-2.5 transition-all shrink-0 cursor-pointer ${
                      selectedSoundIdx === i ? 'sound-item-active ring-1 ring-primary/60 bg-card/80 border-primary/45' : ''
                    }`}
                    onClick={() => {
                      setSelectedSoundIdx(i);
                      playFrontendSound(audioName, audioRef, originalIndex);
                    }}
                  >
                    <div className="flex items-center gap-2 overflow-hidden flex-grow mr-3">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(audioName, audioRef, e);
                        }}
                        className={`p-1 hover:text-amber-400 transition-colors shrink-0 ${isFav ? 'text-amber-400' : 'text-neutral-600'}`}
                      >
                        <Star size={14} className={isFav ? 'fill-current' : ''} />
                      </button>
                      <div className="flex flex-col overflow-hidden text-left" title={`Name: ${audioName}\nRef: ${audioRef}`}>
                        <span className="text-xs font-semibold text-white overflow-hidden text-ellipsis whitespace-nowrap">{audioName}</span>
                        <span className="text-[10px] text-neutral-500 font-mono overflow-hidden text-ellipsis whitespace-nowrap mt-0.5">{audioRef}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <MriButton 
                        size="icon" 
                        variant={playingSoundId === originalIndex ? 'secondary' : 'default'}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSoundIdx(i);
                          playFrontendSound(audioName, audioRef, originalIndex);
                        }}
                        className={`h-7 w-7 rounded-lg shrink-0 ${playingSoundId === originalIndex ? 'text-primary ring-1 ring-primary/40' : ''}`}
                        style={{ width: '28px', height: '28px', minWidth: '28px' }}
                      >
                        {playingSoundId === originalIndex
                          ? <Volume2 size={12} className="animate-pulse" />
                          : <Play size={11} fill="currentColor" />}
                      </MriButton>
                      <MriButton 
                        size="icon" 
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          copySoundSnippet(audioName, audioRef);
                        }}
                        className="h-7 w-7 rounded-lg shrink-0"
                        style={{ width: '28px', height: '28px', minWidth: '28px' }}
                      >
                        <Copy size={11} />
                      </MriButton>
                    </div>
                  </div>
                );
              })}

              {filteredSoundsList.length === 0 && (
                <div className="text-center text-neutral-500 py-10 text-xs">
                  {activeSoundTab === 'fav' ? "You haven't favorited any sounds yet." :
                   activeSoundTab === 'recent' ? "You haven't played any sounds recently." :
                   "No sounds match your search."}
                </div>
              )}
              {visibleCount < filteredSoundsList.length && (
                <div className="text-center text-[10px] text-muted-foreground py-2 font-mono">
                  Loading more sounds on scroll... ({visibleCount} of {filteredSoundsList.length})
                </div>
              )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Notification Toast */}
      <div 
        id="toast" 
        className={`absolute bottom-6 right-6 bg-emerald-500 text-black px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 font-bold text-xs z-[1000] transition-all duration-300 ${
          toastVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'
        }`}
      >
        <MriBadge variant="default" className="bg-black text-emerald-400 border-none font-bold text-[9px] px-1.5 py-0.5 shrink-0">SUCCESS</MriBadge>
        <span>{toastMessage}</span>
      </div>
    </div>
  );
}
