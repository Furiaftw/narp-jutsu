import { useState, useEffect, useMemo } from 'react';
import {
  auth, db,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  doc, getDoc, setDoc, updateDoc,
  collection, onSnapshot, serverTimestamp
} from './firebase';

// ============================================================
// CONFIG
// ============================================================
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwtenwxf4oiShSKDlt0hmhCuWdY3eg3eLVMY0irQVwAx29eRZ6Ii5YdO4u1S1BGCPqMGg/exec';
const CACHE_KEY = 'narp_jutsu_cache';
const CACHE_TTL = 60 * 60 * 1000;
const APP_VERSION = 'v2.4';

// ============================================================
// ICONS
// ============================================================
const Icon = ({ path, size = 24, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{path}</svg>
);
const Search = (p) => <Icon {...p} path={<><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>} />;
const ExternalLink = (p) => <Icon {...p} path={<><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>} />;
const Copy = (p) => <Icon {...p} path={<><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></>} />;
const Check = (p) => <Icon {...p} path={<path d="M20 6 9 17l-5-5" />} />;
const FilterIcon = (p) => <Icon {...p} path={<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />} />;
const ChevronDown = (p) => <Icon {...p} path={<path d="m6 9 6 6 6-6" />} />;
const ChevronUp = (p) => <Icon {...p} path={<path d="m18 15-6-6-6 6" />} />;
const TagIcon = (p) => <Icon {...p} path={<><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42l-8.704-8.704z" /><circle cx="7.5" cy="7.5" r=".5" fill="currentColor" /></>} />;
const BookOpen = (p) => <Icon {...p} path={<><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></>} />;
const AlertCircle = (p) => <Icon {...p} path={<><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></>} />;
const Shield = (p) => <Icon {...p} path={<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />} />;
const Key = (p) => <Icon {...p} path={<><circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6" /><path d="m15.5 7.5 3 3L22 7l-3-3" /></>} />;
const LogOut = (p) => <Icon {...p} path={<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></>} />;
const CheckCircle = (p) => <Icon {...p} path={<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>} />;
const Lock = (p) => <Icon {...p} path={<><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>} />;
const UsersIcon = (p) => <Icon {...p} path={<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>} />;
const XCircle = (p) => <Icon {...p} path={<><circle cx="12" cy="12" r="10" /><line x1="15" x2="9" y1="9" y2="15" /><line x1="9" x2="15" y1="9" y2="15" /></>} />;
const Clock = (p) => <Icon {...p} path={<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>} />;
const RefreshCw = (p) => <Icon {...p} path={<><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></>} />;
const UserCheck = (p) => <Icon {...p} path={<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="16 11 18 13 22 9" /></>} />;

// ============================================================
// STATIC CONSTANTS
// ============================================================
const NATURES = ["Fire", "Water", "Lightning", "Earth", "Wind", "Medical Ninjutsu", "Sound", "Yang", "Yin"];
const JUTSU_TYPES = ["1-Post", "Continuous", "Multi-Post", "Hybrid"];
const RANKS = ["D", "C", "B", "A", "S"];
const ORIGIN = ["Canon", "Custom"];

const getNatureColor = (nature) => {
  const colors = {
    "Fire": "bg-orange-100 text-orange-800 border-orange-200",
    "Water": "bg-blue-100 text-blue-800 border-blue-200",
    "Lightning": "bg-yellow-200 text-yellow-900 border-yellow-300",
    "Earth": "bg-red-900 text-red-100 border-red-800",
    "Wind": "bg-green-100 text-green-800 border-green-200",
    "Medical Ninjutsu": "bg-emerald-100 text-emerald-800 border-emerald-300",
    "Sound": "bg-fuchsia-200 text-fuchsia-900 border-fuchsia-300",
    "Yang": "bg-amber-100 text-amber-900 border-amber-300",
    "Yin": "bg-purple-100 text-purple-900 border-purple-300",
  };
  return colors[nature] || "bg-slate-200 text-slate-800 border-slate-300";
};

// ============================================================
// HELPERS
// ============================================================
function toArray(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string' && val.trim() !== '') return val.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

// ============================================================
// DATA FETCHING
// ============================================================
function deriveClanCategory(bloodlineName, bloodlineDb) {
  if (!bloodlineName || bloodlineName === '') return 'None';
  for (const [cat, names] of Object.entries(bloodlineDb)) {
    if (names.includes(bloodlineName)) return cat;
  }
  return 'None';
}

async function fetchSheetData() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Date.now() - parsed.ts < CACHE_TTL) return parsed;
    }
  } catch (e) { }

  const res = await fetch(APPS_SCRIPT_URL);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);

  const bloodlines = json.bloodlines || {};
  const factions = json.factions || [];
  const clanSlots = json.clanSlots || [];

  const jutsus = (json.jutsus || []).map((row, idx) => {
    const rankArr = (row['Rank'] || '').split(',').map(r => r.trim()).filter(Boolean);
    const conditions = (row['Conditions'] || '').toLowerCase();
    const secretStr = row['Secret Faction'] || '';
    const secretFactions = secretStr.split(',').map(f => f.trim()).filter(Boolean);
    const bloodlineName = (row['Bloodline'] || '').trim();

    return {
      _id: `jutsu-${idx}`,
      name: row['Ability Name'] || '',
      nature: row['Nature Type'] || '',
      rank: rankArr,
      cost: row['Cost'] || '',
      types: (row['Jutsu Types'] || '').split(',').map(t => t.trim()).filter(Boolean),
      origin: row['Origin'] || '',
      spec: (row['Specialization'] || '').split(',').map(s => s.trim()).filter(Boolean),
      link: row['Doc Link'] || '',
      clanCat: deriveClanCategory(bloodlineName, bloodlines),
      clanName: bloodlineName || 'None',
      limited: conditions.includes('limited'),
      mustLearnIC: conditions.includes('learn ic'),
      secret: secretFactions.length > 0,
      secretFactions,
      multiRank: rankArr.length > 1,
    };
  });

  const result = { jutsus, bloodlines, factions, clanSlots, ts: Date.now() };
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(result)); } catch (e) { }
  return result;
}

// ============================================================
// MAIN APP
// ============================================================
function App() {
  const [jutsus, setJutsus] = useState([]);
  const [bloodlines, setBloodlines] = useState({});
  const [factions, setFactions] = useState([]);
  const [clanSlots, setClanSlots] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]);

  const [view, setView] = useState('browser');

  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [fNature, setFNature] = useState('Any');
  const [fOrigin, setFOrigin] = useState('Any');
  const [fSpec, setFSpec] = useState('Any');
  const [fType, setFType] = useState('Any');
  const [fRank, setFRank] = useState('Any');
  const [fClanCat, setFClanCat] = useState('Any');
  const [fClanName, setFClanName] = useState('Any');
  const [fLimited, setFLimited] = useState(false);
  const [fActiveSecrets, setFActiveSecrets] = useState([]);

  const [clanSearch, setClanSearch] = useState('');

  const [loginTab, setLoginTab] = useState('faction');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginMessage, setLoginMessage] = useState(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  const CLAN_CATEGORIES = useMemo(() => Object.keys(bloodlines), [bloodlines]);
  const ALL_FACTIONS = useMemo(() => factions, [factions]);
  const SPECIALIZATIONS = useMemo(() => {
    const specs = new Set(jutsus.flatMap(j => toArray(j.spec)));
    return [...specs].sort();
  }, [jutsus]);

  const visibleFactions = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return ALL_FACTIONS;
    return currentUser.allowedFactions || [];
  }, [currentUser, ALL_FACTIONS]);

  const filteredClans = useMemo(() => {
    if (!clanSearch.trim()) return clanSlots;
    return clanSlots.filter(c => c.name.toLowerCase().includes(clanSearch.toLowerCase()));
  }, [clanSlots, clanSearch]);

  useEffect(() => {
    fetchSheetData()
      .then(data => {
        setJutsus(data.jutsus);
        setBloodlines(data.bloodlines);
        setFactions(data.factions);
        setClanSlots(data.clanSlots || []);
        setDataLoading(false);
      })
      .catch(err => {
        console.error(err);
        setDataError(err.message);
        setDataLoading(false);
      });
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists() && userDoc.data().status === 'approved') {
            setCurrentUser({ uid: firebaseUser.uid, ...userDoc.data() });
          } else {
            setCurrentUser(null);
          }
        } catch (err) {
          console.error('Profile fetch error:', err);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (currentUser?.role !== 'admin') { setAllUsers([]); return; }
    const unsub = onSnapshot(collection(db, 'users'),
      snap => setAllUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() }))),
      err => console.error('Users listener error:', err)
    );
    return () => unsub();
  }, [currentUser?.role]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginMessage(null);
    setLoginLoading(true);
    const email = emailInput.toLowerCase().trim();

    try {
      if (isRequesting) {
        const cred = await createUserWithEmailAndPassword(auth, email, passwordInput);
        await setDoc(doc(db, 'users', cred.user.uid), {
          email,
          role: loginTab,
          status: 'pending',
          allowedFactions: [],
          createdAt: serverTimestamp()
        });
        setLoginMessage({ type: 'success', text: 'Account registered! Pending admin approval.' });
        await signOut(auth);
        setIsRequesting(false);
        setPasswordInput('');
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, passwordInput);
        const userDoc = await getDoc(doc(db, 'users', cred.user.uid));

        if (!userDoc.exists()) {
          setLoginMessage({ type: 'error', text: 'User profile not found. Contact admin.' });
          await signOut(auth);
          return;
        }

        const userData = userDoc.data();
        if (userData.status === 'approved') {
          setCurrentUser({ uid: cred.user.uid, ...userData });
          setLoginMessage(null);
          setView(userData.role === 'admin' ? 'admin_dashboard' : 'browser');
        } else if (userData.status === 'pending') {
          setLoginMessage({ type: 'pending', text: 'Account is pending admin approval.' });
          await signOut(auth);
        } else {
          setLoginMessage({ type: 'error', text: 'Access request was denied by admin.' });
          await signOut(auth);
        }
      }
    } catch (err) {
      const msg = {
        'auth/email-already-in-use': 'Account already exists. Log in instead.',
        'auth/user-not-found': 'Invalid email or password.',
        'auth/wrong-password': 'Invalid email or password.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/weak-password': 'Password must be at least 6 characters.',
        'auth/invalid-email': 'Invalid email address.',
      }[err.code] || err.message;
      setLoginMessage({ type: 'error', text: msg });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setEmailInput(''); setPasswordInput('');
    setLoginMessage(null); setFActiveSecrets([]);
    setIsRequesting(false); setView('browser');
  };

  const handleUpdateUserStatus = async (uid, newStatus) => {
    try { await updateDoc(doc(db, 'users', uid), { status: newStatus }); }
    catch (err) { console.error('Update status error:', err); }
  };

  const handleToggleFaction = async (uid, faction) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      const curr = userDoc.data().allowedFactions || [];
      const updated = curr.includes(faction) ? curr.filter(f => f !== faction) : [...curr, faction];
      await updateDoc(doc(db, 'users', uid), { allowedFactions: updated });
    } catch (err) { console.error('Toggle faction error:', err); }
  };

  const handleCopyLink = (link, id) => {
    navigator.clipboard.writeText(link).then(() => {
      setCopiedId(id); setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {
      const ta = document.createElement("textarea"); ta.value = link;
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); setCopiedId(id); setTimeout(() => setCopiedId(null), 2000); } catch (e) { }
      document.body.removeChild(ta);
    });
  };

  const handleForceRefresh = async () => {
    setDataLoading(true);
    localStorage.removeItem(CACHE_KEY);
    try {
      const data = await fetchSheetData();
      setJutsus(data.jutsus);
      setBloodlines(data.bloodlines);
      setFactions(data.factions);
      setClanSlots(data.clanSlots || []);
      setDataError(null);
    } catch (err) { setDataError(err.message); }
    setDataLoading(false);
  };

  const filteredJutsus = useMemo(() => {
    const secretModeActive = fActiveSecrets.length > 0;

    return jutsus.filter(j => {
      if (secretModeActive) {
        if (!j.secret) return false;
        if (!j.secretFactions || !j.secretFactions.some(f => fActiveSecrets.includes(f))) return false;
      } else {
        if (j.secret) return false;
      }

      const specArr = toArray(j.spec);
      const rankArr = toArray(j.rank);
      const matchSearch = j.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchNature = fNature === 'Any' || j.nature === fNature;
      const matchOrigin = fOrigin === 'Any' || j.origin === fOrigin;
      const matchSpec = fSpec === 'Any' || specArr.includes(fSpec);
      const matchType = fType === 'Any' || j.types.includes(fType);
      const matchRank = fRank === 'Any' || rankArr.includes(fRank);
      let matchClan = true;
      if (fClanCat !== 'Any') matchClan = j.clanCat === fClanCat && (fClanName === 'Any' || j.clanName === fClanName);
      const matchLimited = fLimited ? j.limited === true : true;
      return matchSearch && matchNature && matchOrigin && matchSpec && matchType && matchRank && matchClan && matchLimited;
    });
  }, [jutsus, searchTerm, fNature, fOrigin, fSpec, fType, fRank, fClanCat, fClanName, fLimited, fActiveSecrets]);

  if (authLoading || dataLoading) {
    return (
      <div className="w-full h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-3 border-slate-600 border-t-indigo-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 text-sm font-semibold">Loading NARP Database...</p>
        {dataError && <p className="text-red-400 text-xs">Error: {dataError}</p>}
      </div>
    );
  }

  const renderBrowser = () => (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      <div className="bg-slate-900 text-white p-4 shadow-md z-10 shrink-0">
        <div className="relative mb-3 max-w-4xl mx-auto">
          <Search className="absolute left-3 top-3 text-slate-400" size={18} />
          <input type="text" placeholder="Search jutsu name..." className="w-full bg-slate-800 text-white rounded-xl py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-indigo-500 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto flex-nowrap md:flex-wrap pb-1 scrollbar-hide max-w-4xl mx-auto">
          {['Any', ...NATURES].map(n => (
            <button key={n} onClick={() => setFNature(n)} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition-colors ${fNature === n ? 'bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}>{n}</button>
          ))}
        </div>
        <button onClick={() => setShowFilters(!showFilters)} className="w-full max-w-4xl mx-auto mt-3 bg-slate-800 border border-slate-700 text-slate-300 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors">
          <FilterIcon size={16} /> {showFilters ? 'Hide Advanced Filters' : 'Show Advanced Filters'}
          {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {showFilters && (
        <div className="bg-white border-b border-slate-200 p-4 shadow-inner overflow-y-auto max-h-72 shrink-0">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Origin</label><select value={fOrigin} onChange={e => setFOrigin(e.target.value)} className="w-full text-sm bg-slate-50 border rounded p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"><option value="Any">All Origins</option>{ORIGIN.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
              <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Type</label><select value={fType} onChange={e => setFType(e.target.value)} className="w-full text-sm bg-slate-50 border rounded p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"><option value="Any">All Types</option>{JUTSU_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
              <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rank</label><select value={fRank} onChange={e => setFRank(e.target.value)} className="w-full text-sm bg-slate-50 border rounded p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"><option value="Any">All Ranks</option>{RANKS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
              <div><label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Specialization</label><select value={fSpec} onChange={e => setFSpec(e.target.value)} className="w-full text-sm bg-slate-50 border rounded p-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"><option value="Any">All Specs</option>{SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
            </div>
            <div className="border-t border-slate-100 pt-4 mt-4">
              <label className="block text-[10px] font-bold text-purple-600 uppercase mb-2 flex items-center gap-1"><TagIcon size={12} /> Bloodline Filters</label>
              <div className="flex flex-col md:flex-row gap-3">
                <select value={fClanCat} onChange={e => { setFClanCat(e.target.value); setFClanName('Any'); }} className="flex-1 text-sm bg-purple-50 border-purple-200 text-purple-900 rounded p-2.5 focus:ring-2 focus:ring-purple-500 outline-none">
                  <option value="Any">Any Bloodline</option>
                  {CLAN_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {fClanCat !== 'Any' && bloodlines[fClanCat] && (
                  <select value={fClanName} onChange={e => setFClanName(e.target.value)} className="flex-1 text-sm bg-white border-purple-200 text-purple-900 rounded p-2.5 focus:ring-2 focus:ring-purple-500 outline-none">
                    <option value="Any">All in {fClanCat}</option>
                    {bloodlines[fClanCat].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}
              </div>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 space-y-3">
              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer"><input type="checkbox" checked={fLimited} onChange={e => setFLimited(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4" /> Limited Only</label>
                {visibleFactions.length > 0 && (
                  <>
                    <div className="w-px h-5 bg-slate-300 hidden md:block"></div>
                    {visibleFactions.map(faction => (
                      <label key={faction} className={`flex items-center gap-2 text-sm font-bold cursor-pointer transition-colors ${fActiveSecrets.includes(faction) ? 'text-purple-700' : 'text-slate-500'}`}>
                        <input type="checkbox" checked={fActiveSecrets.includes(faction)} onChange={(e) => { if (e.target.checked) setFActiveSecrets([...fActiveSecrets, faction]); else setFActiveSecrets(fActiveSecrets.filter(f => f !== faction)); }} className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4" /> {faction} Secrets
                      </label>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 bg-slate-100 pb-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="text-xs font-bold text-slate-400 uppercase">{filteredJutsus.length} Results Found</div>
              {fActiveSecrets.length > 0 && <span className="text-[10px] font-bold text-purple-600 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-full uppercase">Secret Mode: {fActiveSecrets.join(', ')}</span>}
            </div>
            {currentUser?.role === 'admin' && (
              <button onClick={handleForceRefresh} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"><RefreshCw size={12} /> Refresh</button>
            )}
          </div>

          {dataError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle size={16} /> Failed to load data: {dataError}
            </div>
          )}

          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredJutsus.map(j => {
              const specArr = toArray(j.spec);
              const rankArr = toArray(j.rank);
              return (
              <div key={j._id} className={`bg-white rounded-2xl shadow-sm border flex flex-col overflow-hidden hover:shadow-md transition-shadow ${j.secret ? 'border-purple-300 shadow-purple-100' : 'border-slate-200'}`}>
                <div className={`p-4 pb-0 flex-1 ${j.secret ? 'bg-purple-50/30' : ''}`}>
                  <div className="flex justify-between items-start mb-2"><h2 className="text-xl font-bold leading-tight flex items-center gap-2">{j.secret && <Lock size={16} className="text-purple-600 shrink-0" />} {j.name}</h2></div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {j.nature && <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getNatureColor(j.nature)}`}>{j.nature}</span>}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${j.origin === 'Canon' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-cyan-50 text-cyan-700 border-cyan-200'}`}>{j.origin}</span>
                    {j.limited && <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border-rose-200 flex items-center gap-1"><AlertCircle size={10} /> Limited</span>}
                    {j.secret && <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-800 border-purple-200">SECRET</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {specArr.map(s => <span key={s} className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">{s}</span>)}
                    {j.types.map(t => <span key={t} className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">{t}</span>)}
                    {j.mustLearnIC && <span className="text-xs font-medium px-2 py-1 rounded border bg-slate-700 text-white border-slate-800">Must Learn IC</span>}
                    {j.clanCat !== 'None' && j.clanName !== 'None' && j.clanName && <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-1 rounded border border-purple-200 flex items-center gap-1"><TagIcon size={12} /> {j.clanName} ({j.clanCat})</span>}
                  </div>
                </div>
                <div className="bg-slate-50 border-t border-slate-100 px-4 py-3 flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-4">
                    <div><div className="text-[10px] font-bold text-slate-400 uppercase">Rank</div><div className="text-sm font-black text-slate-700">{rankArr.join(", ") || "-"}</div></div>
                    <div className="h-6 w-px bg-slate-200"></div>
                    <div><div className="text-[10px] font-bold text-slate-400 uppercase">CU Cost</div><div className="text-sm font-black text-indigo-600">{j.cost || '-'}</div></div>
                  </div>
                  {j.multiRank && <span className="text-[10px] font-bold text-indigo-500 border border-indigo-200 bg-indigo-50 px-2 py-1 rounded-full uppercase shrink-0">Multi-Rank</span>}
                </div>
                <div className="p-4 pt-0 bg-slate-50 border-t border-slate-100 flex gap-2 pt-3">
                  {j.link && j.link !== 'Link' ? (
                    <a href={j.link} target="_blank" rel="noopener noreferrer" className="flex-1 bg-white border border-slate-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-200 font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-colors"><ExternalLink size={16} /> Doc</a>
                  ) : (
                    <span className="flex-1 bg-slate-100 border border-slate-200 text-slate-400 font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm cursor-not-allowed">No Doc</span>
                  )}
                  {j.link && j.link !== 'Link' && <button onClick={() => handleCopyLink(j.link, j._id)} className={`p-2.5 rounded-xl flex items-center justify-center min-w-[50px] transition-all border ${copiedId === j._id ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'}`}>{copiedId === j._id ? <Check size={18} /> : <Copy size={18} />}</button>}
                </div>
              </div>
              );
            })}
          </div>

          {filteredJutsus.length === 0 && (
            <div className="text-center py-16">
              <AlertCircle size={40} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-semibold">No jutsu match your filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderClanSlots = () => {
    const availableCount = clanSlots.filter(c => c.available).length;
    const unavailableCount = clanSlots.filter(c => !c.available).length;

    return (
      <div className="flex-1 overflow-y-auto bg-slate-100 pb-10">
        <div className="bg-slate-900 text-white p-6 shadow-md">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <UserCheck size={28} className="text-indigo-400" />
              <div>
                <h2 className="text-2xl font-bold">Clan & Limited Item Availability</h2>
                <p className="text-sm text-slate-400 mt-0.5">Check which clans and limited items have open slots.</p>
              </div>
            </div>
            <div className="flex gap-4 mb-4">
              <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl px-4 py-2 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                <span className="text-sm font-bold text-emerald-300">{availableCount} Open</span>
              </div>
              <div className="bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-2 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <span className="text-sm font-bold text-red-300">{unavailableCount} Closed</span>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-3 text-slate-400" size={18} />
              <input type="text" placeholder="Search clan or item name..." className="w-full bg-slate-800 text-white rounded-xl py-2.5 pl-10 pr-4 outline-none focus:ring-2 focus:ring-indigo-500 text-sm" value={clanSearch} onChange={(e) => setClanSearch(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-4">
          {currentUser?.role === 'admin' && (
            <div className="flex justify-end mb-4">
              <button onClick={handleForceRefresh} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"><RefreshCw size={12} /> Refresh</button>
            </div>
          )}

          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredClans.map((clan, idx) => (
              <div key={`${clan.name}-${idx}`} className={`rounded-xl border p-4 flex items-center justify-between transition-shadow hover:shadow-md ${clan.available ? 'bg-white border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                {clan.link ? (
                  <a href={clan.link} target="_blank" rel="noopener noreferrer" className={`font-bold text-sm underline decoration-1 underline-offset-2 transition-colors ${clan.available ? 'text-indigo-700 hover:text-indigo-900' : 'text-slate-400 hover:text-slate-600'}`}>{clan.name}</a>
                ) : (
                  <span className={`font-bold text-sm ${clan.available ? 'text-slate-800' : 'text-slate-400'}`}>{clan.name}</span>
                )}
                {clan.available ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-full">
                    <CheckCircle size={14} /> Open
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-100 border border-red-200 px-3 py-1 rounded-full">
                    <XCircle size={14} /> Closed
                  </span>
                )}
              </div>
            ))}
          </div>

          {filteredClans.length === 0 && (
            <div className="text-center py-16">
              <AlertCircle size={40} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-semibold">No results match your search.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderLogin = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-100 overflow-y-auto">
      <div className="bg-white p-8 rounded-3xl shadow-xl border w-full max-w-sm">
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
          <button type="button" onClick={() => { setLoginTab('admin'); setLoginMessage(null); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex justify-center gap-2 items-center ${loginTab === 'admin' ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}><Shield size={16} /> Admin</button>
          <button type="button" onClick={() => { setLoginTab('faction'); setLoginMessage(null); }} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors flex justify-center gap-2 items-center ${loginTab === 'faction' ? 'bg-white shadow text-purple-700' : 'text-slate-500'}`}><Key size={16} /> Faction</button>
        </div>
        <h2 className="text-2xl font-bold mb-2 text-center text-slate-800">{loginTab === 'admin' ? 'Admin Login' : 'Faction Access'}</h2>
        <p className="text-sm text-slate-500 mb-6 text-center">{loginTab === 'admin' ? 'Log in to manage database access.' : 'Unlock hidden techniques for your faction.'}</p>
        {loginMessage && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${loginMessage.type === 'error' ? 'bg-red-50 text-red-800' : loginMessage.type === 'pending' ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>{loginMessage.text}</div>
        )}
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <input type="email" required placeholder="Email Address" className="w-full bg-slate-50 border py-3 px-4 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} disabled={loginLoading} />
          <input type="password" required minLength={6} placeholder={isRequesting ? "Create Password (min 6)" : "Password"} className="w-full bg-slate-50 border py-3 px-4 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} disabled={loginLoading} />
          <button type="submit" disabled={loginLoading} className={`w-full text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 ${loginTab === 'admin' ? 'bg-slate-900 hover:bg-black' : 'bg-purple-600 hover:bg-purple-700'}`}>
            {loginLoading ? 'Please wait...' : isRequesting ? 'Request Access' : 'Log In'}
          </button>
          <div className="flex justify-between items-center pt-2">
            <button type="button" onClick={() => { setIsRequesting(!isRequesting); setLoginMessage(null); }} className="text-sm font-semibold text-slate-500 hover:text-slate-800">{isRequesting ? 'Already approved? Log in' : 'Need access? Register'}</button>
            <button type="button" onClick={() => setView('browser')} className="text-slate-400 text-sm font-semibold hover:text-slate-600">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );

  const renderAdminDashboard = () => {
    const pendingUsers = allUsers.filter(u => u.status === 'pending');
    const approvedUsers = allUsers.filter(u => u.status === 'approved' && u.uid !== currentUser?.uid);
    const deniedUsers = allUsers.filter(u => u.status === 'denied');

    return (
      <div className="flex-1 bg-slate-50 overflow-y-auto p-4 md:p-8 pb-10">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 bg-emerald-600 text-white p-6 rounded-2xl flex items-center gap-4 shadow-lg">
            <UsersIcon size={32} />
            <div><h2 className="text-2xl font-bold">Admin Dashboard</h2><p className="text-sm text-emerald-100 mt-1">Manage user accounts and faction access.</p></div>
          </div>

          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Pending ({pendingUsers.length})</h3>
          <div className="space-y-3 mb-8">
            {pendingUsers.map(user => (
              <div key={user.uid} className="bg-white border border-amber-200 shadow-sm rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-100 p-2 rounded-full text-amber-600"><Clock size={20} /></div>
                  <div><p className="font-bold text-slate-800">{user.email}</p><p className="text-[10px] font-bold uppercase text-amber-600 mt-0.5">Requesting: {user.role}</p></div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <button onClick={() => handleUpdateUserStatus(user.uid, 'approved')} className="flex-1 md:flex-none bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1"><CheckCircle size={16} /> Approve</button>
                  <button onClick={() => handleUpdateUserStatus(user.uid, 'denied')} className="flex-1 md:flex-none bg-red-100 text-red-700 hover:bg-red-200 px-4 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1"><XCircle size={16} /> Deny</button>
                </div>
              </div>
            ))}
            {pendingUsers.length === 0 && <div className="text-center p-8 bg-white border border-dashed border-slate-300 rounded-2xl text-slate-400 text-sm">No pending requests.</div>}
          </div>

          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Approved ({approvedUsers.length})</h3>
          <div className="space-y-4 mb-8">
            {approvedUsers.map(user => (
              <div key={user.uid} className="bg-white border border-slate-200 shadow-sm rounded-xl p-4 md:p-5">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-purple-100 text-purple-600'}`}>
                      {user.role === 'admin' ? <Shield size={20} /> : <Key size={20} />}
                    </div>
                    <div><p className="font-bold text-slate-700">{user.email}</p><p className="text-[10px] font-bold uppercase text-slate-400 mt-0.5">{user.role}</p></div>
                  </div>
                  <button onClick={() => handleUpdateUserStatus(user.uid, 'denied')} className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-bold">Revoke</button>
                </div>
                {user.role === 'faction' && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-3">Grant Faction Secrets:</p>
                    <div className="flex flex-wrap gap-2.5">
                      {ALL_FACTIONS.map(faction => (
                        <label key={faction} className={`flex items-center gap-1.5 text-xs font-semibold cursor-pointer px-3 py-1.5 rounded border transition-colors ${user.allowedFactions?.includes(faction) ? 'bg-purple-50 border-purple-300 text-purple-800' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                          <input type="checkbox" checked={user.allowedFactions?.includes(faction) || false} onChange={() => handleToggleFaction(user.uid, faction)} className="rounded text-purple-600 focus:ring-purple-500 w-3.5 h-3.5" />
                          {faction}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {deniedUsers.length > 0 && (
            <>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Denied ({deniedUsers.length})</h3>
              <div className="space-y-3">
                {deniedUsers.map(user => (
                  <div key={user.uid} className="bg-white border border-red-100 shadow-sm rounded-xl p-4 flex justify-between items-center opacity-60">
                    <div className="flex items-center gap-3">
                      <div className="bg-red-100 p-2 rounded-full text-red-400"><XCircle size={20} /></div>
                      <div><p className="font-bold text-slate-600">{user.email}</p><p className="text-[10px] font-bold uppercase text-red-400">{user.role}</p></div>
                    </div>
                    <button onClick={() => handleUpdateUserStatus(user.uid, 'approved')} className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1"><CheckCircle size={16} /> Re-approve</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-screen bg-slate-200 flex flex-col font-sans text-slate-900 overflow-hidden">
      <div className="bg-slate-900 text-white p-4 sticky top-0 z-30 flex justify-between items-center shadow-lg shrink-0">
        <h1 className="text-lg font-bold tracking-widest uppercase flex items-center gap-2">
          {view === 'browser' && <BookOpen size={18} className="text-indigo-400" />}
          {view === 'clan_slots' && <UserCheck size={18} className="text-emerald-400" />}
          {view === 'login' && <Key size={18} className="text-indigo-400" />}
          {view === 'admin_dashboard' && <UsersIcon size={18} className="text-emerald-400" />}
          <span className="hidden sm:inline">
            {view === 'browser' ? 'NARP Database' : view === 'clan_slots' ? 'Clans & Items' : view === 'login' ? 'Auth Portal' : 'Admin Area'}
          </span>
          <span className="sm:hidden">
            {view === 'browser' ? 'NARP' : view === 'clan_slots' ? 'Items' : view === 'login' ? 'Auth' : 'Admin'}
          </span>
        </h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setView('browser')} className={`text-xs px-3 py-1.5 font-bold rounded-lg transition-colors ${view === 'browser' ? 'bg-indigo-900 text-indigo-200' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
            <span className="hidden sm:inline">Jutsu</span>
            <span className="sm:hidden"><BookOpen size={14} /></span>
          </button>
          <button onClick={() => setView('clan_slots')} className={`text-xs px-3 py-1.5 font-bold rounded-lg transition-colors ${view === 'clan_slots' ? 'bg-emerald-900 text-emerald-200' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
            <span className="hidden sm:inline">Clans & Items</span>
            <span className="sm:hidden"><UserCheck size={14} /></span>
          </button>

          {currentUser ? (
            <>
              <span className="text-xs text-slate-400 hidden lg:inline mx-1">{currentUser.email}</span>
              {currentUser.role === 'admin' && (
                <button onClick={() => setView('admin_dashboard')} className={`text-xs px-3 py-1.5 font-bold rounded-lg transition-colors ${view === 'admin_dashboard' ? 'bg-indigo-900 text-indigo-200' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                  <span className="hidden sm:inline">Dashboard</span>
                  <span className="sm:hidden"><UsersIcon size={14} /></span>
                </button>
              )}
              <button onClick={handleLogout} className="text-slate-400 hover:text-white p-1.5 bg-slate-800 rounded-lg"><LogOut size={16} /></button>
            </>
          ) : (
            <button onClick={() => setView('login')} className="text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-bold bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg transition-colors hover:bg-slate-700"><Shield size={14} /><span className="hidden sm:inline">Login</span></button>
          )}
        </div>
      </div>

      {view === 'browser' && renderBrowser()}
      {view === 'clan_slots' && renderClanSlots()}
      {view === 'login' && renderLogin()}
      {view === 'admin_dashboard' && currentUser?.role === 'admin' && renderAdminDashboard()}

      <div className="bg-slate-900 text-center py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest z-20 shrink-0 border-t border-slate-800">
        Credits: Hexagon & A Road Sign — {APP_VERSION}
      </div>
    </div>
  );
}

export default App;
