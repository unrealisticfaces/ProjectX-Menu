import { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Gamepad2, Settings, Coffee, Pizza, Wallet, ShoppingCart, ChevronDown, ChevronRight, User, Lock, BadgeCheck, LogOut, History, ShieldAlert, X, Edit, Trash2, Plus, Search, ListTodo, CheckCircle, FileText, Users, Medal, Trophy, Sliders, Home, MonitorPlay, Zap, Flame, CalendarDays, Megaphone } from 'lucide-react';
import { ref, set, get, child, update, onValue, push, remove, onChildAdded, query, limitToLast } from "firebase/database";
import { db } from './firebase'; 
import toast, { Toaster } from 'react-hot-toast'; 
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './App.css';

// ==========================================
// --- TIER SYSTEM & PROGRESS LOGIC ---
// ==========================================
const getTier = (lifetimeXp, config) => {
  if (lifetimeXp >= config.goldXp) return { level: 'Gold', color: '#fbbf24' }; 
  if (lifetimeXp >= config.silverXp) return { level: 'Silver', color: '#cbd5e1' };
  return { level: 'Bronze', color: '#b45309' }; 
};

const getTierProgress = (lifetimeXp, config) => {
  if (lifetimeXp < config.silverXp) {
    return { current: lifetimeXp, target: config.silverXp, percentage: (lifetimeXp / config.silverXp) * 100, next: 'Silver', color: '#cbd5e1' };
  } else if (lifetimeXp < config.goldXp) {
    return { current: lifetimeXp, target: config.goldXp, percentage: ((lifetimeXp - config.silverXp) / (config.goldXp - config.silverXp)) * 100, next: 'Gold', color: '#fbbf24' };
  } else {
    return { current: lifetimeXp, target: 'MAX', percentage: 100, next: 'Max Tier', color: '#fbbf24' };
  }
};

// ==========================================
// --- HOME DASHBOARD & LIVE NEWS ---
// ==========================================
const HomeDashboard = ({ inventory, newsList }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Adjusted image size and mask for the shorter widescreen banner
  const blendedPhotoStyle = {
    position: 'absolute', right: '-5%', top: '50%', transform: 'translateY(-50%)', width: '350px', height: '350px', 
    opacity: 0.18, objectFit: 'contain', filter: 'grayscale(100%) brightness(180%)',
    WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 70%)',
    maskImage: 'radial-gradient(circle, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 70%)'
  };

  const slides = [
    {
      id: 1,
      title: "EXPERIENCE PREMIUM GAMING",
      desc: "Welcome to 4G Gamers. Enjoy high-performance rigs, ultra-fast internet, and an exclusive rewards program just for playing.",
      color: "linear-gradient(135deg, rgba(193,35,32,0.6) 0%, rgba(10,10,10,0.95) 100%)",
      icon: <img src="./images/logo/logo2.png" alt="4G Gamers Logo" style={blendedPhotoStyle} />
    },
    {
      id: 2,
      title: "RANK UP FOR REWARDS",
      desc: "Earn XP every minute you play. Level up from Bronze to Gold to unlock premium Battle Passes, Steam points, and free PC time.",
      color: "linear-gradient(135deg, rgba(234,179,8,0.4) 0%, rgba(10,10,10,0.95) 100%)",
      icon: <img src="./images/your-rank-photo.png" alt="Rank Up" style={blendedPhotoStyle} />
    },
    {
      id: 3,
      title: "FUEL YOUR GRIND",
      desc: "Thirsty? Hungry? Check out the shop. Spend your Wallet XP on hot meals and cold energy drinks delivered straight to your desk.",
      color: "linear-gradient(135deg, rgba(34,197,94,0.3) 0%, rgba(10,10,10,0.95) 100%)",
      icon: <img src="./images/your-food-photo.png" alt="Fuel Grind" style={blendedPhotoStyle} />
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const featuredItems = [];
  if (inventory.battlepass && Object.values(inventory.battlepass).length > 0) featuredItems.push(Object.values(inventory.battlepass)[0]);
  if (inventory.foods && Object.values(inventory.foods).length > 0) featuredItems.push(Object.values(inventory.foods)[0]);
  if (inventory.drinks && Object.values(inventory.drinks).length > 0) featuredItems.push(Object.values(inventory.drinks)[0]);

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* 1. COMPACT Hero Carousel */}
      <div style={{ width: '100%', height: '260px', position: 'relative', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 16px 40px rgba(0,0,0,0.5)', marginBottom: '20px' }}>
        {slides.map((slide, index) => (
          <div key={slide.id} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '30px 50px', background: slide.color, opacity: index === currentSlide ? 1 : 0, transition: 'opacity 0.8s ease-in-out', pointerEvents: index === currentSlide ? 'auto' : 'none' }}>
            {slide.icon}
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', letterSpacing: '-1px', marginBottom: '8px', maxWidth: '60%', textShadow: '0 4px 12px rgba(0,0,0,0.5)', zIndex: 1 }}>{slide.title}</h1>
            <p style={{ fontSize: '1rem', color: '#e2e8f0', maxWidth: '55%', lineHeight: 1.5, zIndex: 1 }}>{slide.desc}</p>
          </div>
        ))}
        <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '8px', zIndex: 10 }}>
          {slides.map((_, index) => (
            <div key={index} style={{ width: '8px', height: '8px', borderRadius: '50%', background: index === currentSlide ? '#fff' : 'rgba(255, 255, 255, 0.3)', transform: index === currentSlide ? 'scale(1.3)' : 'scale(1)', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: index === currentSlide ? '0 0 8px rgba(255, 255, 255, 0.5)' : 'none' }} onClick={() => setCurrentSlide(index)} />
          ))}
        </div>
      </div>

      {/* 2. COMPACT Quick Action Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <Gamepad2 size={28} color="var(--text-muted)" style={{ margin: '0 auto 8px auto' }} />
          <h3 style={{ color: '#fff', marginBottom: '6px', fontSize: '1rem' }}>Active Session</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Your time is currently being tracked. XP is accumulating in the background.</p>
        </div>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <Wallet size={28} color="var(--primary)" style={{ margin: '0 auto 8px auto' }} />
          <h3 style={{ color: '#fff', marginBottom: '6px', fontSize: '1rem' }}>Claim Your XP</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Don't forget to claim your live session XP to your wallet before you log out!</p>
        </div>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <ShoppingCart size={28} color="#22c55e" style={{ margin: '0 auto 8px auto' }} />
          <h3 style={{ color: '#fff', marginBottom: '6px', fontSize: '1rem' }}>Browse the Shop</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Head over to the shop tab to exchange your hard-earned XP for real cafe rewards.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        
        {/* LEFT COLUMN: Featured Items & Live News */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Flame size={20} color="var(--primary)" />
              <h3 style={{ color: '#fff', fontSize: '1.1rem', margin: 0 }}>Trending Rewards</h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
              {featuredItems.map((item, i) => {
                const imgSrc = item.file.startsWith('data:image') || item.file.startsWith('http') ? item.file : `./images/battlepass/${item.file}`; 
                return (
                  <div key={i} style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '8px', border: '1px solid var(--border)', padding: '12px', textAlign: 'center' }}>
                    <div style={{ width: '100%', height: '80px', backgroundColor: '#1a1a1a', borderRadius: '6px', overflow: 'hidden', marginBottom: '10px' }}>
                      <img src={imgSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={item.name} onError={(e) => { e.target.style.display = 'none' }} />
                    </div>
                    <h4 style={{ color: '#fff', fontSize: '0.85rem', marginBottom: '4px' }}>{item.name}</h4>
                    <span style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '0.8rem', fontFamily: 'monospace' }}>{item.price} XP</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DYNAMIC NEWS BOARD */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ color: '#fff', fontSize: '1.1rem', margin: '10px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Megaphone size={20} color="var(--primary)" /> Cafe Announcements
            </h3>
            
            {newsList.length === 0 ? (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border)', borderRadius: '12px', padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No recent announcements.
              </div>
            ) : (
              newsList.map(n => (
                <div key={n.id} style={{ background: 'linear-gradient(to right, rgba(34, 197, 94, 0.1), rgba(0,0,0,0.6))', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '12px', padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
                  <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CalendarDays size={22} color="#22c55e" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                      <h3 style={{ color: '#22c55e', fontSize: '1.1rem', margin: 0 }}>{n.title}</h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{n.date}</span>
                    </div>
                    <p style={{ color: '#e2e8f0', fontSize: '0.9rem', margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{n.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Vertical Leaderboard */}
        <div className="card" style={{ padding: '24px' }}>
          <LeaderboardWidget layout="vertical" />
        </div>

      </div>
    </div>
  );
};

const TierGuideModal = ({ onClose, config }) => {
  const [page, setPage] = useState(1);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
        <div className="auth-card" style={{ position: 'relative' }}>
          <button className="close-modal" onClick={onClose}><X size={20}/></button>
          
          {page === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '10px 0' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '1px solid var(--border)' }}>
                <Trophy size={28} color="var(--primary)" />
              </div>
              <h2 style={{ color: '#fff', fontSize: '1.3rem', marginBottom: '12px' }}>The 4G Tier System</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                Your account ranks up the more you play! Earning XP automatically increases your Lifetime Rank, unlocking exclusive rewards and premium items in the shop.
              </p>
            </div>
          )}

          {page === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '10px 0' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '1px solid var(--border)' }}>
                <Wallet size={28} color="#cbd5e1" />
              </div>
              <h2 style={{ color: '#fff', fontSize: '1.3rem', marginBottom: '12px' }}>Spending vs Ranking</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                Don't worry about spending your points! Your <strong>Wallet XP</strong> is spent on items, but your <strong>Lifetime XP</strong> never goes down. Buying snacks will never cause you to lose your rank.
              </p>
            </div>
          )}

          {page === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '10px 0' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '1px solid var(--border)' }}>
                <Lock size={28} color="#fbbf24" />
              </div>
              <h2 style={{ color: '#fff', fontSize: '1.3rem', marginBottom: '12px' }}>Rank Unlocks</h2>
              <div style={{ textAlign: 'left', width: '100%', marginTop: '10px', fontSize: '0.85rem' }}>
                <div style={{ marginBottom: '10px', color: '#b45309' }}><strong>Bronze (0+ XP):</strong> Full access to Foods & Drinks.</div>
                <div style={{ marginBottom: '10px', color: '#cbd5e1' }}><strong>Silver ({config.silverXp.toLocaleString()}+ XP):</strong> Mid-tier gaming rewards.</div>
                <div style={{ color: '#fbbf24' }}><strong>Gold ({config.goldXp.toLocaleString()}+ XP):</strong> Unlocks premium Battle Pass items.</div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', margin: '20px 0' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: page === 1 ? 'var(--primary)' : 'rgba(255,255,255,0.2)', transition: 'all 0.3s', transform: page === 1 ? 'scale(1.2)' : 'none' }} />
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: page === 2 ? 'var(--primary)' : 'rgba(255,255,255,0.2)', transition: 'all 0.3s', transform: page === 2 ? 'scale(1.2)' : 'none' }} />
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: page === 3 ? 'var(--primary)' : 'rgba(255,255,255,0.2)', transition: 'all 0.3s', transform: page === 3 ? 'scale(1.2)' : 'none' }} />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="claim-btn" style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)' }} onClick={() => page > 1 ? setPage(p => p - 1) : onClose()}>
              {page === 1 ? 'Close' : 'Back'}
            </button>
            {page < 3 ? (
              <button type="button" className="claim-btn" style={{ flex: 1 }} onClick={() => setPage(p => p + 1)}>Next</button>
            ) : (
              <button type="button" className="claim-btn" style={{ flex: 1 }} onClick={onClose}>Got it!</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AccountSettings = ({ currentUser }) => {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error("New passwords do not match!"); return; }
    if (newPassword.length < 4) { toast.error("Password must be at least 4 characters."); return; }
    
    try {
      const snapshot = await get(child(ref(db), `users/${currentUser.username}`));
      if (snapshot.exists()) {
        const userData = snapshot.val();
        if (userData.password !== currentPassword) {
          toast.error("Current password is incorrect!");
          return;
        }

        await update(ref(db, `users/${currentUser.username}`), { password: newPassword });
        toast.success("Password updated successfully!");
        setIsChangingPassword(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error("User not found!");
      }
    } catch (error) { toast.error("Failed to update password. Check connection."); }
  };

  if (!currentUser) return <div style={{ textAlign: 'center' }}><h1 className="page-title">Account Settings</h1><p className="page-desc">Please sign in to view your account details.</p></div>;

  return (
    <div className="auth-card" style={{ margin: '0', width: '100%', maxWidth: '400px' }}>
      <h2 className="page-title" style={{ textAlign: 'center', marginBottom: '24px' }}>Account Details</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div className="sleek-input-container" style={{ background: '#000', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Full Name:</span><strong style={{ color: '#fff', fontSize: '0.85rem' }}>{currentUser.name}</strong>
        </div>
        <div className="sleek-input-container" style={{ background: '#000', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Username:</span><strong style={{ color: '#fff', fontSize: '0.85rem' }}>@{currentUser.username}</strong>
        </div>
        
        {!isChangingPassword ? (
          <button className="claim-btn" style={{ marginTop: '10px', width: '100%' }} onClick={() => setIsChangingPassword(true)}>Change Password</button>
        ) : (
          <form onSubmit={handlePasswordUpdate} style={{ background: '#111', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            <span style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '4px', fontWeight: '600' }}>Update Password</span>
            
            <input type="password" placeholder="Current Password" className="sleek-input" style={{ paddingLeft: '14px', fontSize: '0.85rem' }} required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            
            <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }}></div>

            <input type="password" placeholder="New Password" className="sleek-input" style={{ paddingLeft: '14px', fontSize: '0.85rem' }} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            <input type="password" placeholder="Confirm New Password" className="sleek-input" style={{ paddingLeft: '14px', fontSize: '0.85rem' }} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button type="button" className="claim-btn" style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)' }} onClick={() => { setIsChangingPassword(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}>Cancel</button>
              <button type="submit" className="claim-btn" style={{ flex: 1 }}>Save Changes</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const SystemConfig = ({ config }) => {
  const [form, setForm] = useState(config);

  useEffect(() => { setForm(config); }, [config]);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await update(ref(db, 'config'), {
        silverXp: parseInt(form.silverXp),
        goldXp: parseInt(form.goldXp),
        xpPerHour: parseInt(form.xpPerHour),
        enableWeekendBoost: form.enableWeekendBoost,
        enableMidnightBoost: form.enableMidnightBoost,
        boostMultiplier: parseFloat(form.boostMultiplier)
      });
      
      const newLogRef = push(ref(db, 'admin_logs'));
      await set(newLogRef, { action: `Updated System Economy Configuration`, timestamp: new Date().toLocaleString() });

      toast.success("System configurations updated!");
    } catch (error) { toast.error("Failed to save settings."); }
  };

  return (
    <div className="auth-card" style={{ margin: '0', width: '100%', maxWidth: '450px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '8px' }}>
        <Sliders color="var(--primary)" size={24} />
        <h2 className="page-title" style={{ margin: 0 }}>System Config</h2>
      </div>
      <p className="page-desc" style={{ textAlign: 'center', marginBottom: '24px' }}>Adjust the game economy and automated events.</p>
      
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <h3 style={{ color: '#fff', fontSize: '0.95rem', margin: 0, borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>Base Economy</h3>
        <div className="sleek-input-container">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', fontWeight: '600' }}>XP Earned Per Hour (Standard Rate)</span>
          <input type="number" className="sleek-input" style={{ paddingLeft: '14px', fontSize: '0.85rem' }} required value={form.xpPerHour} onChange={e => setForm({...form, xpPerHour: e.target.value})} />
        </div>

        <h3 style={{ color: '#fff', fontSize: '0.95rem', margin: '8px 0 0 0', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>Automated Event Multipliers</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '0.85rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.enableWeekendBoost} onChange={e => setForm({...form, enableWeekendBoost: e.target.checked})} style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }} />
            Enable Weekend Boost (Sat & Sun)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '0.85rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.enableMidnightBoost} onChange={e => setForm({...form, enableMidnightBoost: e.target.checked})} style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }} />
            Enable Midnight Boost (12:00 AM - 6:00 AM)
          </label>
          <div className="sleek-input-container" style={{ marginTop: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', fontWeight: '600' }}>Event Multiplier (e.g., 2 for Double XP)</span>
            <input type="number" step="0.1" className="sleek-input" style={{ paddingLeft: '14px', fontSize: '0.85rem' }} required value={form.boostMultiplier} onChange={e => setForm({...form, boostMultiplier: e.target.value})} />
          </div>
        </div>
        
        <h3 style={{ color: '#fff', fontSize: '0.95rem', margin: '8px 0 0 0', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>Tier Boundaries</h3>
        <div className="sleek-input-container">
          <span style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px', display: 'block', fontWeight: '600' }}>Silver Tier Requirement (Lifetime XP)</span>
          <input type="number" className="sleek-input" style={{ paddingLeft: '14px', fontSize: '0.85rem' }} required value={form.silverXp} onChange={e => setForm({...form, silverXp: e.target.value})} />
        </div>
        <div className="sleek-input-container">
          <span style={{ fontSize: '0.8rem', color: '#fbbf24', marginBottom: '6px', display: 'block', fontWeight: '600' }}>Gold Tier Requirement (Lifetime XP)</span>
          <input type="number" className="sleek-input" style={{ paddingLeft: '14px', fontSize: '0.85rem' }} required value={form.goldXp} onChange={e => setForm({...form, goldXp: e.target.value})} />
        </div>

        <button type="submit" className="claim-btn" style={{ padding: '12px', marginTop: '10px', width: '100%', fontSize: '0.85rem' }}>Save System Settings</button>
      </form>
    </div>
  );
};

const ProductCard = ({ item, categoryId, totalXp, lifetimeXp, config, currentUser, onBuy, onLockedClick, isAdmin, onEdit, onDelete, onToggleStock }) => {
  const progress = Math.min(100, Math.floor((totalXp / item.price) * 100));
  const canAfford = totalXp >= item.price;
  const inStock = item.inStock !== false;

  let isTierLocked = false;
  if (currentUser && !isAdmin) {
    const userTier = getTier(lifetimeXp, config); 
    if (categoryId === 'battlepass' && userTier.level !== 'Gold') {
      isTierLocked = true;
    }
  }

  const isBuyDisabled = !inStock || isAdmin;
  const imgSrc = item.file.startsWith('data:image') || item.file.startsWith('http') ? item.file : `./images/${categoryId}/${item.file}`;

  return (
    <div className="card" style={{ width: '180px', display: 'flex', flexDirection: 'column', gap: '8px', opacity: !inStock && !isAdmin ? 0.6 : 1 }}>
      {isAdmin && (
        <div className="admin-card-controls">
          <button className="admin-icon-btn" onClick={() => onEdit('edit', categoryId, item)} title="Edit"><Edit size={14}/></button>
          <button className="admin-icon-btn" onClick={() => onDelete(categoryId, item.id)} title="Delete"><Trash2 size={14}/></button>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '4px', cursor: isAdmin ? 'pointer' : 'default' }} onClick={() => isAdmin && onToggleStock(categoryId, item.id, inStock)}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: inStock ? '#22c55e' : '#eab308', boxShadow: inStock ? '0 0 8px #22c55e' : '0 0 8px #eab308' }}></div>
        <span style={{ fontSize: '0.7rem', color: inStock ? '#22c55e' : '#eab308', fontWeight: '700', letterSpacing: '0.5px' }}>{inStock ? 'AVAILABLE' : 'OUT OF STOCK'}</span>
      </div>
      
      <div style={{ width: '100%', height: '110px', backgroundColor: '#1a1a1a', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
        <img src={imgSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={item.name} onError={(e) => { e.target.style.display = 'none' }} />
      </div>
      
      <h3 style={{ fontSize: '0.85rem', color: '#ffffff', margin: '2px 0 0 0', textAlign: 'center' }}>{item.name}</h3>
      
      <button 
        onClick={() => isTierLocked ? onLockedClick() : onBuy(item.name, item.price)} 
        disabled={isBuyDisabled}
        className={`claim-btn ${!currentUser ? 'product-btn-logged-out' : ''}`} 
        style={!currentUser ? { width: '100%', marginTop: '4px', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border)' } : { 
          width: '100%', marginTop: '4px', 
          fontSize: isTierLocked ? '0.65rem' : '0.8rem', 
          background: (canAfford) && !isTierLocked ? '' : `linear-gradient(to right, var(--primary) ${progress}%, #1a1a1a ${progress}%)`,
          border: (canAfford) && !isTierLocked ? 'none' : '1px solid #2a2a2a',
          opacity: ((canAfford) && inStock && !isTierLocked) ? 1 : 0.8,
          cursor: isBuyDisabled ? 'not-allowed' : 'pointer'
        }}
      >
        {isAdmin ? 'ADMIN VIEW' : isTierLocked ? 'DOES NOT MEET REQUIREMENTS' : `${item.price} XP`}
      </button>
    </div>
  );
};

const LeaderboardWidget = ({ layout = 'vertical' }) => {
  const [topPlayers, setTopPlayers] = useState([]);
  const medalColors = ['#fbbf24', '#cbd5e1', '#b45309']; 

  useEffect(() => {
    const usersRef = ref(db, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      if(snapshot.exists()) {
         const data = snapshot.val();
         const players = Object.entries(data)
           .filter(([username]) => username !== 'admin')
           .map(([username, details]) => ({ username, xp: details.lifetimeXp !== undefined ? details.lifetimeXp : (details.xp || 0) }))
           .sort((a, b) => b.xp - a.xp)
           .slice(0, 3);
         setTopPlayers(players);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: layout === 'horizontal' ? '10px 0' : '0' }}>
      <div className="chart-title" style={{ textAlign: layout === 'horizontal' ? 'left' : 'center', marginBottom: layout === 'horizontal' ? '0' : '16px', letterSpacing: '0.5px' }}>Top 3 Ranked Players (Lifetime XP)</div>
      {topPlayers.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data available.</div>
      ) : (
        <div className={layout === 'horizontal' ? "leaderboard-list-horizontal" : "leaderboard-list"}>
          {topPlayers.map((player, idx) => (
            <div key={player.username} className="leaderboard-item">
              <div className="player-info">
                <Medal size={22} color={medalColors[idx]} /> 
                <span className="player-name">@{player.username}</span>
              </div>
              <span className="xp-score">{player.xp} XP</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AdminDashboard = () => {
  const [stats, setStats] = useState({ online: 0, approvedClaims: 0, totalUsers: 0 });
  const [trendData, setTrendData] = useState([]);
  const [pieData, setPieData] = useState([]);

  const COLORS = ['#c12320', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];

  useEffect(() => {
    get(child(ref(db), 'users')).then((snapshot) => {
      if (snapshot.exists()) {
        const usersObj = snapshot.val();
        let onlineCount = 0;
        let approvedCount = 0;
        let userCount = 0;
        
        const trendMap = {};
        for(let i=6; i>=0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          trendMap[d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] = 0;
        }

        const productMap = {};

        Object.entries(usersObj).forEach(([username, data]) => {
          if (username !== 'admin') {
            userCount++;
            if (data.isOnline) onlineCount++;
            if (data.purchases) {
              Object.entries(data.purchases).forEach(([timestampKey, p]) => {
                if (p.status === 'completed') {
                  approvedCount++;
                  const pDate = new Date(parseInt(timestampKey)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  if (trendMap[pDate] !== undefined) { trendMap[pDate]++; }
                  productMap[p.item] = (productMap[p.item] || 0) + 1;
                }
              });
            }
          }
        });

        setStats({ online: onlineCount, approvedClaims: approvedCount, totalUsers: userCount });
        setTrendData(Object.entries(trendMap).map(([date, claims]) => ({ date, claims })));
        
        const sortedPie = Object.entries(productMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, value]) => ({ name, value }));
        setPieData(sortedPie);
      }
    });
  }, []);

  return (
    <div>
      <h1 className="page-title" style={{ textAlign: 'center' }}>System Dashboard</h1>
      <p className="page-desc" style={{ marginBottom: '24px', textAlign: 'center' }}>Real-time analytics and cafe performance metrics.</p>
      
      <div className="bento-grid">
        <div className="bento-card bento-stat-card" title="Players currently logged in.">
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600' }}>ACTIVE ONLINE NOW</span>
          <span className="dash-card-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }}></div>
            {stats.online}
          </span>
        </div>
        <div className="bento-card bento-stat-card" title="Total number of items fully approved and handed out.">
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600' }}>CLAIMS FULFILLED</span>
          <span className="dash-card-value">{stats.approvedClaims}</span>
        </div>
        <div className="bento-card bento-stat-card" title="Total registered players in the system.">
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '600' }}>REGISTERED PLAYERS</span>
          <span className="dash-card-value">{stats.totalUsers}</span>
        </div>

        <div className="bento-card bento-span-2" style={{ height: '340px' }}>
          <div className="chart-title">Claims (Last 7 Days)</div>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#888" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#888" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
              <RechartsTooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '0.85rem' }} />
              <Line type="monotone" dataKey="claims" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4, fill: "var(--primary)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bento-card" style={{ height: '340px' }}>
          <div className="chart-title" style={{ textAlign: 'center' }}>Most Claimed</div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '0.85rem' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No claims data available.
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
            {pieData.map((entry, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#ccc' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: COLORS[index % COLORS.length] }}></div>
                {entry.name}
              </div>
            ))}
          </div>
        </div>

        <div className="bento-card bento-span-3">
          <LeaderboardWidget layout="horizontal" />
        </div>
      </div>
    </div>
  );
};

const OrderQueue = () => {
  const [allPurchases, setAllPurchases] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    get(child(ref(db), 'users')).then((snapshot) => {
      if (snapshot.exists()) {
        const usersObj = snapshot.val();
        let purchasesArr = [];
        Object.entries(usersObj).forEach(([username, data]) => {
          if (username !== 'admin' && data.purchases) {
            Object.entries(data.purchases).forEach(([timestampKey, p]) => {
              purchasesArr.push({ ...p, username, name: data.name, timestampKey: parseInt(timestampKey) });
            });
          }
        });
        purchasesArr.sort((a, b) => b.timestampKey - a.timestampKey);
        setAllPurchases(purchasesArr);
      }
    });
  }, []);

  const handleFulfillOrder = async (username, timestampKey, itemName) => {
    try {
      await update(ref(db, `users/${username}/purchases/${timestampKey}`), { status: 'completed' });
      toast.success(`Approved ${itemName} for @${username}!`);
      setAllPurchases(prev => prev.map(p => 
        p.timestampKey === timestampKey && p.username === username ? { ...p, status: 'completed' } : p
      ));
    } catch (error) {
      toast.error("Failed to approve order.");
    }
  };

  const handleDeclineOrder = async (username, timestampKey, price, itemName) => {
    try {
      const userRef = ref(db, `users/${username}`);
      const snapshot = await get(userRef);
      if (snapshot.exists()) {
        const userData = snapshot.val();
        const refundedXp = (userData.xp || 0) + price;
        
        await update(userRef, {
          xp: refundedXp,
          [`purchases/${timestampKey}/status`]: 'declined'
        });
        
        toast.success(`Declined ${itemName}. Refunded ${price} XP to @${username}.`);
        setAllPurchases(prev => prev.map(p => 
          p.timestampKey === timestampKey && p.username === username ? { ...p, status: 'declined' } : p
        ));
      }
    } catch (error) { toast.error("Failed to decline order."); }
  };

  const totalPages = Math.ceil(allPurchases.length / itemsPerPage);
  const currentPurchases = allPurchases.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div>
      <h1 className="page-title" style={{ textAlign: 'center' }}>Order Queue</h1>
      <p className="page-desc" style={{ marginBottom: '24px', textAlign: 'center' }}>Approve or Decline player claims here.</p>
      
      {allPurchases.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No orders in the queue.</p> : (
        <>
          <table className="sleek-table">
            <thead><tr><th>Time</th><th>User</th><th>Name</th><th>Product</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {currentPurchases.map((p, i) => {
                const isPending = !p.status || p.status === 'pending';
                return (
                  <tr key={i} style={{ background: isPending ? 'rgba(234, 179, 8, 0.05)' : 'transparent' }}>
                    <td style={{ color: 'var(--text-muted)' }}>{p.date}</td>
                    <td style={{ fontWeight: '600', color: '#fff' }}>@{p.username}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.name}</td>
                    <td style={{ color: '#fff' }}>{p.item}</td>
                    <td>
                      <span className={`status-badge status-${p.status || 'pending'}`}>
                        {p.status || 'pending'}
                      </span>
                    </td>
                    <td>
                      {isPending ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="claim-btn" style={{ padding: '4px 8px', fontSize: '0.7rem', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)' }} onClick={() => handleFulfillOrder(p.username, p.timestampKey, p.item)}>
                            Approve
                          </button>
                          <button className="claim-btn" style={{ padding: '4px 8px', fontSize: '0.7rem', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444' }} onClick={() => handleDeclineOrder(p.username, p.timestampKey, p.price, p.item)}>
                            Decline
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'capitalize' }}>{p.status}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="pagination-controls">
              <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
              <span className="page-info">Page {currentPage} of {totalPages}</span>
              <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const AdminLog = () => {
  const [logs, setLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const logsRef = ref(db, 'admin_logs');
    const unsubscribe = onValue(logsRef, (snapshot) => {
      if (snapshot.exists()) {
        const logsArray = Object.values(snapshot.val()).reverse();
        setLogs(logsArray);
      }
    });
    return () => unsubscribe();
  }, []);

  const totalPages = Math.ceil(logs.length / itemsPerPage);
  const currentLogs = logs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div>
      <h1 className="page-title" style={{ textAlign: 'center' }}>Admin Log</h1>
      <p className="page-desc" style={{ marginBottom: '24px', textAlign: 'center' }}>Tracker for inventory modifications (Add, Edit, Delete).</p>
      {logs.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No recent admin actions.</p> : (
        <>
          <table className="sleek-table">
            <thead><tr><th>Date & Time</th><th>Action Taken</th></tr></thead>
            <tbody>
              {currentLogs.map((log, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--text-muted)', width: '220px' }}>{log.timestamp}</td>
                  <td style={{ color: '#fff' }}>{log.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <div className="pagination-controls">
              <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
              <span className="page-info">Page {currentPage} of {totalPages}</span>
              <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const AccountsList = () => {
  const [users, setUsers] = useState({});
  const [search, setSearch] = useState('');
  
  const [editUserModal, setEditUserModal] = useState({ open: false, username: '', name: '', password: '' });
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    get(child(ref(db), 'users')).then((snapshot) => {
      if (snapshot.exists()) setUsers(snapshot.val());
    });
  }, []);

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (editUserModal.password.length < 4) { toast.error("Password must be at least 4 characters."); return; }
    
    try {
      await update(ref(db, `users/${editUserModal.username}`), { name: editUserModal.name, password: editUserModal.password });
      setUsers(prev => ({ ...prev, [editUserModal.username]: { ...prev[editUserModal.username], name: editUserModal.name, password: editUserModal.password } }));
      const newLogRef = push(ref(db, 'admin_logs'));
      await set(newLogRef, { action: `Updated account details/password for @${editUserModal.username}`, timestamp: new Date().toLocaleString() });
      toast.success(`Account @${editUserModal.username} updated!`);
      setEditUserModal({ open: false, username: '', name: '', password: '' });
    } catch (error) { toast.error("Failed to update user."); }
  };

  const filteredUsers = Object.entries(users).filter(([username, data]) => {
    if (username === 'admin') return false;
    return username.toLowerCase().includes(search.toLowerCase()) || (data.name && data.name.toLowerCase().includes(search.toLowerCase()));
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const currentUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div>
      <h1 className="page-title" style={{ textAlign: 'center' }}>Registered Accounts</h1>
      <p className="page-desc" style={{ marginBottom: '24px', textAlign: 'center' }}>Manage players and reset forgotten passwords.</p>
      
      <div className="sleek-input-container" style={{ maxWidth: '400px', margin: '0 auto 20px auto' }}>
        <input type="text" placeholder="Search username or name..." className="sleek-input search-glow-input" style={{ fontSize: '0.85rem' }} value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} />
        <Search size={16} className="sleek-icon" />
      </div>

      <table className="sleek-table">
        <thead><tr><th>Username</th><th>Full Name</th><th>Wallet Balance</th><th>Action</th></tr></thead>
        <tbody>
          {currentUsers.map(([username, data]) => (
            <tr key={username}>
              <td style={{ fontWeight: '600', color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {data.isOnline && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }}></div>}
                  @{username}
                </div>
              </td>
              <td style={{ color: 'var(--text-muted)' }}>{data.name}</td>
              <td style={{ color: 'var(--primary)', fontFamily: 'monospace', fontWeight: 'bold' }}>{data.xp || 0} XP</td>
              <td>
                <button className="admin-icon-btn" onClick={() => setEditUserModal({ open: true, username: username, name: data.name, password: data.password })} title="Edit User">
                  <Edit size={14}/>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="pagination-controls">
          <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
          <span className="page-info">Page {currentPage} of {totalPages}</span>
          <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
        </div>
      )}

      {editUserModal.open && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '350px' }}>
            <div className="auth-card">
              <button className="close-modal" onClick={() => setEditUserModal({ open: false, username: '', name: '', password: '' })}><X size={20}/></button>
              <h2 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '1.2rem', color: '#fff' }}>Edit @{editUserModal.username}</h2>
              
              <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="sleek-input-container">
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Full Name:</span>
                  <input type="text" className="sleek-input" style={{ paddingLeft: '14px', fontSize: '0.85rem' }} required value={editUserModal.name} onChange={e => setEditUserModal({...editUserModal, name: e.target.value})} />
                </div>
                
                <div className="sleek-input-container">
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Reset Password:</span>
                  <input type="text" className="sleek-input" style={{ paddingLeft: '14px', fontSize: '0.85rem' }} required value={editUserModal.password} onChange={e => setEditUserModal({...editUserModal, password: e.target.value})} />
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="claim-btn" style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)' }} onClick={() => setEditUserModal({ open: false, username: '', name: '', password: '' })}>Cancel</button>
                  <button type="submit" className="claim-btn" style={{ flex: 1 }}>Save User</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PurchaseHistory = ({ currentUser }) => {
  const [history, setHistory] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (currentUser) {
      const pRef = ref(db, `users/${currentUser.username}/purchases`);
      const unsubscribe = onValue(pRef, (snapshot) => {
        if (snapshot.exists()) {
          setHistory(Object.entries(snapshot.val()).map(([key, data]) => ({ ...data, timestampKey: key })).reverse());
        } else {
          setHistory([]);
        }
      });
      return () => unsubscribe();
    }
  }, [currentUser]);

  const handleCancelOrder = async (timestampKey, price, itemName) => {
    try {
      const userRef = ref(db, `users/${currentUser.username}`);
      const snapshot = await get(userRef);
      if(snapshot.exists()) {
        const userData = snapshot.val();
        const refundedXp = (userData.xp || 0) + price;
        
        await update(userRef, {
          xp: refundedXp,
          [`purchases/${timestampKey}/status`]: 'cancelled'
        });
        toast.success(`Cancelled ${itemName} and refunded ${price} XP!`);
      }
    } catch (error) { toast.error("Failed to cancel order."); }
  };

  if (!currentUser) return <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.85rem' }}>Please log in to view history.</p>;

  const totalPages = Math.ceil(history.length / itemsPerPage);
  const currentHistory = history.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div>
      <h1 className="page-title" style={{ textAlign: 'center' }}>Purchase History</h1>
      <p className="page-desc" style={{ marginBottom: '24px', textAlign: 'center' }}>A record of all your claimed items.</p>
      
      {history.length === 0 ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.85rem' }}>You haven't bought anything yet.</p> : (
        <>
          <table className="sleek-table">
            <thead><tr><th>Date & Time</th><th>Item</th><th>Status</th><th>XP Cost</th><th>Action</th></tr></thead>
            <tbody>
              {currentHistory.map((purchase, index) => {
                const isPending = !purchase.status || purchase.status === 'pending';
                return (
                  <tr key={index}>
                    <td style={{ color: 'var(--text-muted)' }}>{purchase.date}</td>
                    <td style={{ fontWeight: '600', color: '#fff' }}>{purchase.item}</td>
                    <td>
                      <span className={`status-badge status-${purchase.status || 'pending'}`}>
                        {purchase.status || 'pending'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{purchase.price} XP</td>
                    <td>
                      {isPending ? (
                         <button className="claim-btn" style={{ padding: '4px 8px', fontSize: '0.7rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)' }} onClick={() => handleCancelOrder(purchase.timestampKey, purchase.price, purchase.item)}>
                           Cancel Order
                         </button>
                      ) : (
                         <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'capitalize' }}>--</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="pagination-controls">
              <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
              <span className="page-info">Page {currentPage} of {totalPages}</span>
              <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// --- ADMIN NEWS MANAGER COMPONENT ---
const NewsManager = ({ newsList }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handlePostNews = async (e) => {
    e.preventDefault();
    if (!title || !content) return;
    try {
      const newRef = push(ref(db, 'news'));
      await set(newRef, {
        id: newRef.key,
        title,
        content,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        timestamp: Date.now()
      });
      toast.success("News posted to Home Page!");
      setTitle('');
      setContent('');
    } catch (e) { toast.error("Failed to post news."); }
  };

  const handleDeleteNews = async (id) => {
    try {
      await remove(ref(db, `news/${id}`));
      toast.success("News removed.");
    } catch (e) { toast.error("Failed to delete."); }
  };

  return (
    <div style={{ width: '100%', maxWidth: '700px' }}>
      <h2 className="page-title" style={{ textAlign: 'center', marginBottom: '8px' }}>News Board Manager</h2>
      <p className="page-desc" style={{ textAlign: 'center', marginBottom: '24px' }}>Post live announcements to the player Home dashboard.</p>
      
      <div className="auth-card" style={{ width: '100%', maxWidth: '100%', marginBottom: '30px', padding: '24px' }}>
        <h3 style={{ color: '#fff', marginBottom: '16px', fontSize: '1.1rem' }}>Create New Announcement</h3>
        <form onSubmit={handlePostNews} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input type="text" placeholder="Announcement Title" className="sleek-input" required value={title} onChange={e => setTitle(e.target.value)} />
          <textarea placeholder="Details..." className="sleek-input" rows="4" style={{ resize: 'vertical', fontFamily: 'inherit', padding: '14px' }} required value={content} onChange={e => setContent(e.target.value)} />
          <button type="submit" className="claim-btn" style={{ padding: '12px', marginTop: '4px' }}>Post to Home Page</button>
        </form>
      </div>

      <h3 style={{ color: '#fff', marginBottom: '16px', fontSize: '1.1rem' }}>Active Announcements</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {newsList.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No news posted yet.</p> : null}
        {newsList.map(n => (
          <div key={n.id} style={{ background: 'rgba(18,18,18,0.4)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ color: '#fff', margin: '0 0 4px 0' }}>{n.title}</h4>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Posted {n.date}</span>
            </div>
            <button className="admin-icon-btn" onClick={() => handleDeleteNews(n.id)} title="Delete Post"><Trash2 size={16} color="#ef4444" /></button>
          </div>
        ))}
      </div>
    </div>
  );
};

function AppContent() {
  const [currentUser, setCurrentUser] = useState(null); 
  const [totalXp, setTotalXp] = useState(0); 
  const [lifetimeXp, setLifetimeXp] = useState(0);

  const [sessionTime, setSessionTime] = useState(0); 
  const [claimedSessionXp, setClaimedSessionXp] = useState(0); 
  
  const [sysConfig, setSysConfig] = useState({ silverXp: 2000, goldXp: 5000, xpPerHour: 1800, enableWeekendBoost: false, enableMidnightBoost: false, boostMultiplier: 2 });
  
  const sysConfigRef = useRef(sysConfig);
  useEffect(() => { sysConfigRef.current = sysConfig; }, [sysConfig]);

  const [newsList, setNewsList] = useState([]);
  
  const [isShopOpen, setIsShopOpen] = useState(false); 
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isLoginView, setIsLoginView] = useState(true);
  const [isWebMode, setIsWebMode] = useState(false);
  const [authForm, setAuthForm] = useState({ name: '', username: '', password: '' });

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showTierGuide, setShowTierGuide] = useState(false);

  const [inventory, setInventory] = useState({ foods: {}, drinks: {}, battlepass: {} });
  
  const [editorModal, setEditorModal] = useState({ open: false, mode: 'add', category: '', item: null });
  const [editForm, setEditForm] = useState({ name: '', price: '', file: '', inStock: 'true' });

  const [deleteModal, setDeleteModal] = useState({ open: false, category: '', id: '', name: '' });

  const location = useLocation();
  const navigate = useNavigate(); 
  
  const isShopActive = location.pathname.startsWith('/shop');
  const isSettingsActive = location.pathname.startsWith('/settings');
  const isAdmin = currentUser?.username === 'admin';

  useEffect(() => {
    const configRef = ref(db, 'config');
    const unsubscribe = onValue(configRef, (snapshot) => {
      if (snapshot.exists()) {
        setSysConfig(snapshot.val());
      } else {
        const defConfig = { silverXp: 2000, goldXp: 5000, xpPerHour: 1800, enableWeekendBoost: false, enableMidnightBoost: false, boostMultiplier: 2 };
        set(configRef, defConfig);
        setSysConfig(defConfig);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const newsRef = ref(db, 'news');
    const unsubscribe = onValue(newsRef, (snapshot) => {
      if (snapshot.exists()) {
        const sortedNews = Object.values(snapshot.val()).sort((a, b) => b.timestamp - a.timestamp);
        setNewsList(sortedNews);
      } else {
        setNewsList([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser && !isAdmin) {
      const userRef = ref(db, `users/${currentUser.username}`);
      const unsubscribe = onValue(userRef, (snapshot) => {
        if(snapshot.exists()) {
          const data = snapshot.val();
          setTotalXp(data.xp || 0);
          setLifetimeXp(data.lifetimeXp !== undefined ? data.lifetimeXp : (data.xp || 0));
        }
      });
      return () => unsubscribe();
    }
  }, [currentUser, isAdmin]);

  useEffect(() => {
    const scrollContainer = document.querySelector('.page-content');
    if (!scrollContainer) return;

    let isScrolling = false;
    let targetY = scrollContainer.scrollTop;
    let currentY = scrollContainer.scrollTop;
    const ease = 0.08; 
    let animationFrame;

    const updateScroll = () => {
      const distance = targetY - currentY;
      if (Math.abs(distance) < 0.5) {
        currentY = targetY;
        scrollContainer.scrollTop = currentY;
        isScrolling = false;
        return;
      }
      currentY += distance * ease;
      scrollContainer.scrollTop = currentY;
      animationFrame = requestAnimationFrame(updateScroll);
    };

    const handleWheel = (e) => {
      e.preventDefault();
      targetY += e.deltaY * 0.4; 
      const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
      targetY = Math.max(0, Math.min(targetY, maxScroll));
      if (!isScrolling) {
        isScrolling = true;
        currentY = scrollContainer.scrollTop;
        updateScroll();
      }
    };

    scrollContainer.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      scrollContainer.removeEventListener('wheel', handleWheel);
      if (animationFrame) cancelAnimationFrame(animationFrame);
    };
  }, [location.pathname]); 

  useEffect(() => {
    if (isAdmin) {
      const q = query(ref(db, 'live_notifications'), limitToLast(1));
      const unsubscribe = onChildAdded(q, (snapshot) => {
        const notif = snapshot.val();
        if (Date.now() - notif.time < 5000) {
          toast(`New Order: @${notif.username} wants ${notif.item}!`, {
            icon: '🔔',
            style: { background: 'var(--primary)', color: '#fff', fontWeight: 'bold' },
            duration: 6000
          });
        }
      });
      return () => unsubscribe();
    }
  }, [isAdmin]);

  const logAction = async (actionDesc) => {
    const newLogRef = push(ref(db, 'admin_logs'));
    await set(newLogRef, { action: actionDesc, timestamp: new Date().toLocaleString() });
  };

  useEffect(() => {
    if (isAdmin) {
      const sessionRef = ref(db, 'admin_session/token');
      const unsubscribe = onValue(sessionRef, (snapshot) => {
        const activeToken = snapshot.val();
        if (activeToken && activeToken !== localStorage.getItem('adminToken')) {
          setCurrentUser(null);
          setTotalXp(0);
          setLifetimeXp(0);
          navigate('/');
          toast.error("Logged out: Admin signed in on another device.");
        }
      });
      return () => unsubscribe();
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    const invRef = ref(db, 'inventory');
    const unsubscribe = onValue(invRef, async (snapshot) => {
      if (snapshot.exists()) {
        setInventory(snapshot.val());
      } else {
        const defaultInv = {
          foods: {
            f1: { id: 'f1', name: 'Chili Mansi', file: 'chilimansi.webp', price: 80, inStock: true },
            f2: { id: 'f2', name: 'Sweet N Spicy', file: 'sweetspicy.webp', price: 60, inStock: true },
            f3: { id: 'f3', name: 'Sandwich', file: 'sandwich.jpeg', price: 100, inStock: true }
          },
          drinks: {
            d1: { id: 'd1', name: 'Sprite', file: 'sprite.webp', price: 50, inStock: true },
            d2: { id: 'd2', name: 'Coke', file: 'coke.webp', price: 50, inStock: true },
            d3: { id: 'd3', name: 'Mountain Dew', file: 'mountaindew.webp', price: 50, inStock: true }
          },
          battlepass: {
            b1: { id: 'b1', name: '100 Steam Points', file: 'steam.webp', price: 500, inStock: true },
            b2: { id: 'b2', name: 'Valorant 300 VP', file: 'valorant.webp', price: 1200, inStock: true },
            b3: { id: 'b3', name: '1 Hr Free PC Time', file: 'pctime.webp', price: 600, inStock: true }
          }
        };
        await set(ref(db, 'inventory'), defaultInv);
        setInventory(defaultInv);
      }
    });
    return () => unsubscribe();
  }, []);

  const [rawPendingXp, setRawPendingXp] = useState(0); 

  useEffect(() => {
    let os;
    try { os = window.require('os'); } catch (e) { setIsWebMode(true); }
    
    const timer = setInterval(() => {
      const config = sysConfigRef.current;
      let mult = 1;
      const d = new Date();
      
      const isWeekend = d.getDay() === 0 || d.getDay() === 6; 
      const isMidnight = d.getHours() >= 0 && d.getHours() < 6; 

      if ((config.enableWeekendBoost && isWeekend) || (config.enableMidnightBoost && isMidnight)) {
        mult = config.boostMultiplier || 2; 
      }

      const xpPerSecond = (config.xpPerHour / 3600) * mult;
      setRawPendingXp((prev) => prev + xpPerSecond);
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const pendingXp = Math.floor(rawPendingXp);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    const dbRef = ref(db);
    try {
      if (isLoginView) {
        const snapshot = await get(child(dbRef, `users/${authForm.username}`));
        if (snapshot.exists()) {
          const data = snapshot.val();
          if (data.password === authForm.password) {
            setCurrentUser({ username: authForm.username, name: data.name });
            setTotalXp(data.xp || 0);
            setLifetimeXp(data.lifetimeXp !== undefined ? data.lifetimeXp : (data.xp || 0));
            setRawPendingXp(0); 
            
            setShowLoginModal(false);
            await update(ref(db, `users/${authForm.username}`), { isOnline: true });
            toast.success(`Welcome back, ${data.name}!`);
            if (authForm.username === 'admin') {
              const token = Math.random().toString(36).substr(2);
              localStorage.setItem('adminToken', token);
              await set(ref(db, 'admin_session'), { token });
              navigate('/dashboard');
            }
          } else { toast.error("Incorrect password."); }
        } else { toast.error("Username not found."); }
      } else {
        if (!authForm.name || !authForm.username || !authForm.password) { toast.error("Please fill all fields."); return; }
        const snapshot = await get(child(dbRef, `users/${authForm.username}`));
        if (snapshot.exists()) { toast.error("Username already taken!"); } 
        else {
          await set(ref(db, `users/${authForm.username}`), { name: authForm.name, password: authForm.password, xp: 0, lifetimeXp: 0, isOnline: true });
          setCurrentUser({ username: authForm.username, name: authForm.name });
          setTotalXp(0);
          setLifetimeXp(0);
          setRawPendingXp(0);
          setShowLoginModal(false);
          toast.success("Account created and logged in!");
        }
      }
    } catch (error) { toast.error("Connection failed."); }
  };

  const handleLogout = async () => {
    if (currentUser) {
      await update(ref(db, `users/${currentUser.username}`), { isOnline: false });
    }
    setCurrentUser(null);
    setTotalXp(0);
    setLifetimeXp(0);
    setShowUserMenu(false);
    toast.success("Logged out successfully.");
    navigate('/');
  };

  const openLoginModal = () => { setIsLoginView(true); setShowLoginModal(true); };

  const claimXp = () => {
    if (!currentUser) { openLoginModal(); return; }
    if (pendingXp > 0) {
      const newTotal = totalXp + pendingXp;
      const newLifetime = lifetimeXp + pendingXp;
      
      setTotalXp(newTotal);
      setLifetimeXp(newLifetime);
      
      setRawPendingXp(0);
      
      update(ref(db, `users/${currentUser.username}`), { xp: newTotal, lifetimeXp: newLifetime });
      toast.success(`Claimed ${pendingXp} XP!`);
    } else { toast.error("No XP to claim yet."); }
  };

  const handleBuy = async (item, price) => {
    if (!currentUser) { openLoginModal(); return; }
    
    if (totalXp >= price) {
      const newTotal = totalXp - price;
      setTotalXp(newTotal); 
      
      const timestamp = new Date().toLocaleString(); 
      const updates = {};
      
      updates[`users/${currentUser.username}/xp`] = newTotal;
      updates[`users/${currentUser.username}/purchases/${Date.now()}`] = { item, price, date: timestamp, status: 'pending' };
      
      await update(ref(db), updates);
      
      const notifRef = push(ref(db, 'live_notifications'));
      await set(notifRef, { username: currentUser.username, item: item, time: Date.now() });

      toast.success(`Order placed! Please wait for Admin approval.`, { duration: 5000 });
    } else { toast.error(`Not enough XP! Need ${price - totalXp} more.`); }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setEditForm({ ...editForm, file: reader.result }); };
      reader.readAsDataURL(file);
    }
  };

  const saveProduct = async (e) => {
    e.preventDefault();
    if (!editForm.file) { toast.error("Please upload an image or provide a filename."); return; }

    const cat = editorModal.category;
    let targetId = editorModal.mode === 'edit' ? editorModal.item.id : `prod_${Date.now()}`;
    
    const productData = {
      id: targetId,
      name: editForm.name,
      price: parseInt(editForm.price),
      file: editForm.file,
      inStock: editForm.inStock === 'true'
    };

    await set(ref(db, `inventory/${cat}/${targetId}`), productData);
    await logAction(`${editorModal.mode === 'edit' ? 'Updated' : 'Added'} product: ${editForm.name} in ${cat}`);
    toast.success(`Product saved!`);
    setEditorModal({ open: false, mode: 'add', category: '', item: null });
  };

  const requestDelete = (cat, id) => {
    const itemName = inventory[cat][id].name;
    setDeleteModal({ open: true, category: cat, id, name: itemName });
  };

  const confirmDelete = async () => {
    const { category, id, name } = deleteModal;
    await remove(ref(db, `inventory/${category}/${id}`));
    await logAction(`Deleted product: ${name} from ${category}`);
    toast.success("Item removed.");
    setDeleteModal({ open: false, category: '', id: '', name: '' });
  };

  const toggleStock = async (cat, id, currentStock) => {
    await update(ref(db, `inventory/${cat}/${id}`), { inStock: !currentStock });
    const itemName = inventory[cat][id].name;
    await logAction(`Marked ${itemName} as ${!currentStock ? 'In Stock' : 'Out of Stock'}`);
  };

  const openEditor = (mode, cat, item = null) => {
    setEditorModal({ open: true, mode, category: cat, item });
    if(mode === 'edit') setEditForm({ ...item, inStock: item.inStock !== false ? 'true' : 'false' });
    else setEditForm({ name: '', price: '', file: '', inStock: 'true' });
  };

  const renderCategoryPage = (title, desc, catKey) => (
    <>
      <div style={{ position: 'relative', textAlign: 'center', marginBottom: '24px' }}>
        <h1 className="page-title" style={{ fontSize: '1.5rem' }}>{title}</h1>
        <p className="page-desc" style={{ margin: 0, fontSize: '0.85rem' }}>{desc}</p>
        
        {isAdmin && (
          <button 
            className="claim-btn" 
            style={{ position: 'absolute', right: '0', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '8px', alignItems: 'center' }} 
            onClick={() => openEditor('add', catKey)}
          >
            <Plus size={16}/> Add New
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {Object.values(inventory[catKey] || {}).map(item => (
          <ProductCard 
            key={item.id} 
            item={item} 
            totalXp={totalXp} 
            lifetimeXp={lifetimeXp} 
            config={sysConfig}
            currentUser={currentUser} 
            onBuy={handleBuy} 
            onLockedClick={() => setShowTierGuide(true)}
            categoryId={catKey} 
            isAdmin={isAdmin} 
            onEdit={openEditor} 
            onDelete={requestDelete} 
            onToggleStock={toggleStock} 
          />
        ))}
      </div>
    </>
  );

  return (
    <div className="app-container" onClick={() => showUserMenu && setShowUserMenu(false)}>
      <Toaster position="bottom-right" toastOptions={{ style: { background: 'var(--bg-elevated)', color: '#fff', border: '1px solid var(--border)', fontSize: '13px', borderRadius: '8px' }, success: { iconTheme: { primary: 'var(--primary)', secondary: '#ffffff' } }, error: { iconTheme: { primary: '#ef4444', secondary: '#ffffff' } } }} />

      {showTierGuide && <TierGuideModal config={sysConfig} onClose={() => setShowTierGuide(false)} />}

      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="auth-card" style={{ maxWidth: '100%', position: 'relative' }}>
              <button className="close-modal" onClick={() => setShowLoginModal(false)}><X size={20}/></button>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}><img src="./images/logo/logo2.png" alt="Logo" style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px' }} /></div>
              <h2 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '1.5rem', color: '#fff' }}>{isLoginView ? 'Sign In' : 'Create Account'}</h2>
              
              <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {!isLoginView && <div className="sleek-input-container"><input type="text" placeholder="Full Name" className="sleek-input" style={{ fontSize: '0.85rem' }} required onChange={e => setAuthForm({...authForm, name: e.target.value})} /><BadgeCheck size={16} className="sleek-icon" /></div>}
                <div className="sleek-input-container"><input type="text" placeholder="Username" className="sleek-input" style={{ fontSize: '0.85rem' }} required onChange={e => setAuthForm({...authForm, username: e.target.value})} /><User size={16} className="sleek-icon" /></div>
                <div className="sleek-input-container"><input type="password" placeholder="Password" className="sleek-input" style={{ fontSize: '0.85rem' }} required onChange={e => setAuthForm({...authForm, password: e.target.value})} /><Lock size={16} className="sleek-icon" /></div>
                <button type="submit" className="claim-btn" style={{ padding: '12px', marginTop: '10px', width: '100%' }}>{isLoginView ? 'Sign In' : 'Sign Up'}</button>
              </form>

              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <span style={{ color: '#52525b', fontSize: '0.85rem' }}>{isLoginView ? "Don't have an account? " : "Already have an account? "}</span>
                <button onClick={() => setIsLoginView(!isLoginView)} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}>{isLoginView ? "Register here" : "Sign in"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editorModal.open && (
        <div className="modal-overlay" onClick={() => setEditorModal({ open: false, mode: 'add', category: '', item: null })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="auth-card" style={{ maxWidth: '100%', position: 'relative' }}>
              <button className="close-modal" onClick={() => setEditorModal({ open: false, mode: 'add', category: '', item: null })}><X size={20}/></button>
              <h2 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '1.25rem', color: '#fff', textTransform: 'capitalize' }}>{editorModal.mode} {editorModal.category.slice(0, -1)}</h2>
              
              <form onSubmit={saveProduct} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="sleek-input-container">
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Product Name:</span>
                  <input type="text" placeholder="Product Name" className="sleek-input" style={{ paddingLeft: '14px', fontSize: '0.85rem' }} required value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                </div>
                
                <div className="sleek-input-container">
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Price (XP):</span>
                  <input type="number" placeholder="Price (XP)" className="sleek-input" style={{ paddingLeft: '14px', fontSize: '0.85rem' }} required value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} />
                </div>
                
                <div className="sleek-input-container">
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Stock Status:</span>
                  <select 
                    className="sleek-input" 
                    style={{ paddingLeft: '14px', appearance: 'none', cursor: 'pointer', fontSize: '0.85rem' }} 
                    value={editForm.inStock} 
                    onChange={e => setEditForm({...editForm, inStock: e.target.value})}
                  >
                    <option value="true">Available (In Stock)</option>
                    <option value="false">Out of Stock</option>
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: '14px', top: '38px', color: 'var(--text-muted)' }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Upload Image:</span>
                  <input type="file" accept="image/*" className="file-upload-input" onChange={handleImageUpload} />
                </div>

                <button type="submit" className="claim-btn" style={{ padding: '12px', marginTop: '10px', width: '100%' }}>Save Product</button>
              </form>
            </div>
          </div>
        </div>
      )}

      {deleteModal.open && (
        <div className="modal-overlay" onClick={() => setDeleteModal({ open: false, category: '', id: '', name: '' })}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '320px' }}>
            <div className="auth-card" style={{ textAlign: 'center', padding: '24px', position: 'relative' }}>
              <ShieldAlert size={40} color="#ef4444" style={{ margin: '0 auto 16px auto' }} />
              <h2 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '8px' }}>Delete Product</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
                Are you sure you want to delete <strong style={{color: '#fff'}}>{deleteModal.name}</strong>? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="claim-btn" style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)' }} onClick={() => setDeleteModal({ open: false, category: '', id: '', name: '' })}>Cancel</button>
                <button className="claim-btn" style={{ flex: 1, background: '#ef4444' }} onClick={confirmDelete}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="sidebar">
        <div className="brand"><img src="./images/logo/logo2.png" alt="Logo" style={{ width: '24px', height: '24px', objectFit: 'cover', borderRadius: '4px' }} /> 4G GAMERS</div>
        <div className="nav-menu" style={{ height: '100%', display: 'flex', flexDirection: 'column', paddingTop: '12px' }}>
          
          <NavLink to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} style={{ marginBottom: '8px' }}>
            <Home size={16} /> Home
          </NavLink>

          {isAdmin && (
            <>
              <NavLink to="/dashboard" className="nav-link" style={{ marginBottom: '4px', color: 'var(--primary)' }}><ShieldAlert size={16} /> Dashboard</NavLink>
              <NavLink to="/queue" className="nav-link" style={{ marginBottom: '8px', color: 'var(--primary)' }}><ListTodo size={16} /> Order Queue</NavLink>
            </>
          )}

          <div className={`nav-link ${isShopActive ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setIsShopOpen(!isShopOpen); }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><ShoppingCart size={16} /> Shop</div>
            {isShopOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>

          {isShopOpen && (
            <div className="sub-menu">
              <NavLink to="/shop/foods" className="nav-link sub-link"><Pizza size={14} /> Foods</NavLink>
              <NavLink to="/shop/drinks" className="nav-link sub-link"><Coffee size={14} /> Drinks</NavLink>
            </div>
          )}

          <NavLink to="/battlepass" className="nav-link" style={{ marginTop: '8px' }}><Gamepad2 size={16} /> Battle Pass</NavLink>
          
          {!isAdmin && currentUser && (
            <NavLink to="/history" className="nav-link" style={{ marginTop: '4px' }}><History size={16} /> Purchase History</NavLink>
          )}

          {isAdmin && (
            <>
              <div className={`nav-link ${isSettingsActive ? 'active' : ''}`} style={{ marginTop: '4px' }} onClick={(e) => { e.stopPropagation(); setIsSettingsOpen(!isSettingsOpen); }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Settings size={16} /> Settings</div>
                {isSettingsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>

              {isSettingsOpen && (
                <div className="sub-menu">
                  <NavLink to="/settings/news" className="nav-link sub-link"><Megaphone size={14} /> Announcements</NavLink>
                  <NavLink to="/settings/accounts" className="nav-link sub-link"><Users size={14} /> User Accounts</NavLink>
                  <NavLink to="/settings/log" className="nav-link sub-link"><FileText size={14} /> Admin Log</NavLink>
                  <NavLink to="/settings/system" className="nav-link sub-link"><Sliders size={14} /> System Config</NavLink>
                </div>
              )}
            </>
          )}

          <div style={{ marginTop: 'auto', marginBottom: '16px' }}>
            {currentUser && (
              <div className="nav-link" onClick={handleLogout} style={{ cursor: 'pointer', color: '#ff5252' }}><LogOut size={16} /> Log Out</div>
            )}
          </div>
        </div>
      </div>

      <div className="main-area">
        <div className="topbar">
          <div className="unclaimed-xp-hud">
            <div className="hud-status-container">
              <div className="status-dot-pulse"></div>
              <span className="xp-label">LIVE SESSION XP:</span>
            </div>
            <span className="xp-amount">{pendingXp}</span>
            <button className="claim-btn" style={{ padding: '4px 10px'}} onClick={claimXp}>Claim</button>
          </div>
          
          {currentUser ? (
            <div style={{ position: 'relative' }}>
              <button 
                className="admin-icon-btn" 
                onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); }} 
                style={{ borderRadius: '50%', width: '42px', height: '42px', padding: '0' }}
              >
                <User size={20} />
              </button>

              {showUserMenu && (
                <div className="user-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                  <div className="drop-header">
                    <div className="drop-avatar"><User size={24} color="#ccc" /></div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span className="drop-name">{currentUser.name}</span>
                      <span className="drop-user">@{currentUser.username}</span>
                    </div>
                  </div>
                  
                  <div className="drop-divider"></div>
                  
                  <div className="drop-stat-row">
                    <span className="drop-stat-label">Wallet XP:</span>
                    <span className="drop-stat-val" style={{ color: 'var(--primary)' }}>{isAdmin ? '∞' : totalXp}</span>
                  </div>

                  {!isAdmin && (
                    <>
                      <div className="drop-stat-row" style={{ marginTop: '12px' }}>
                        <span className="drop-stat-label">Tier Status:</span>
                        <div style={{ display: 'flex', alignItems: 'center', color: getTier(lifetimeXp, sysConfig).color }}>
                          <span style={{ fontWeight: '600', textTransform: 'uppercase' }}>{getTier(lifetimeXp, sysConfig).level}</span>
                        </div>
                      </div>

                      <div style={{ marginTop: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          <span>{lifetimeXp} XP</span>
                          <span>Next: {getTierProgress(lifetimeXp, sysConfig).next}</span>
                        </div>
                        <div className="progress-bar-bg">
                          <div 
                            className="progress-bar-fill" 
                            style={{ 
                              width: `${getTierProgress(lifetimeXp, sysConfig).percentage}%`, 
                              background: getTierProgress(lifetimeXp, sysConfig).color,
                              boxShadow: `0 0 10px ${getTierProgress(lifetimeXp, sysConfig).color}`
                            }}
                          ></div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="drop-divider" style={{ marginTop: '16px' }}></div>
                  <button 
                    className="claim-btn" 
                    style={{ width: '100%', background: 'rgba(255, 255, 255, 0.05)', color: '#fff', border: '1px solid var(--border)', marginTop: '8px' }}
                    onClick={() => { navigate('/settings/account'); setShowUserMenu(false); }}
                  >
                    <Settings size={14} style={{ marginRight: '6px', verticalAlign: 'text-bottom' }}/> Account Settings
                  </button>

                </div>
              )}
            </div>
          ) : (
            <button className="claim-btn" onClick={openLoginModal} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', fontSize: '0.8rem' }}>
              <User size={16} /> Sign In
            </button>
          )}
        </div>

        <div className="page-content" onClick={() => showUserMenu && setShowUserMenu(false)}>
          <Routes>
            <Route path="/" element={<HomeDashboard inventory={inventory} newsList={newsList} />} />
            <Route path="/shop/foods" element={renderCategoryPage("Foods", "Exchange your XP for snacks.", "foods")} />
            <Route path="/shop/drinks" element={renderCategoryPage("Drinks", "Grab a cold drink to keep grinding.", "drinks")} />
            <Route path="/battlepass" element={renderCategoryPage("Battle Pass", "Redeem Steam Points, Valorant VP, and more.", "battlepass")} />
            
            <Route path="/history" element={<PurchaseHistory currentUser={currentUser} />} />
            <Route path="/settings/account" element={<div style={{ display: 'flex', justifyContent: 'center', paddingTop: '20px' }}><AccountSettings currentUser={currentUser} /></div>} />
            
            {/* ADMIN ROUTES */}
            <Route path="/dashboard" element={isAdmin ? <AdminDashboard /> : <h1 className="page-title" style={{ textAlign: 'center', fontSize: '1.5rem' }}>Access Denied.</h1>} />
            <Route path="/queue" element={isAdmin ? <OrderQueue /> : <h1 className="page-title" style={{ textAlign: 'center', fontSize: '1.5rem' }}>Access Denied.</h1>} />
            <Route path="/settings/log" element={isAdmin ? <AdminLog /> : <h1 className="page-title" style={{ textAlign: 'center', fontSize: '1.5rem' }}>Access Denied.</h1>} />
            <Route path="/settings/accounts" element={isAdmin ? <AccountsList /> : <h1 className="page-title" style={{ textAlign: 'center', fontSize: '1.5rem' }}>Access Denied.</h1>} />
            <Route path="/settings/system" element={isAdmin ? <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '20px' }}><SystemConfig config={sysConfig} /></div> : <h1 className="page-title" style={{ textAlign: 'center', fontSize: '1.5rem' }}>Access Denied.</h1>} />
            <Route path="/settings/news" element={isAdmin ? <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '20px' }}><NewsManager newsList={newsList} /></div> : <h1 className="page-title" style={{ textAlign: 'center', fontSize: '1.5rem' }}>Access Denied.</h1>} />
          </Routes>
        </div>

      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}