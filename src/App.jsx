import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Gamepad2, Settings, Coffee, Pizza, Wallet, ShoppingCart, ChevronDown, ChevronRight, User, Lock, BadgeCheck, LogOut, History, ShieldAlert } from 'lucide-react';
import { ref, set, get, child, update } from "firebase/database";
import { db } from './firebase'; 
import toast, { Toaster } from 'react-hot-toast'; 
import './App.css';

const AccountPage = ({ currentUser, setCurrentUser, setTotalXp }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const dbRef = ref(db);

    try {
      if (isLogin) {
        const snapshot = await get(child(dbRef, `users/${username}`));
        if (snapshot.exists()) {
          const data = snapshot.val();
          if (data.password === password) {
            setCurrentUser({ username, name: data.name });
            setTotalXp(data.xp || 0); 
            toast.success(`Welcome back, ${data.name}!`);
          } else {
            toast.error("Incorrect password.");
          }
        } else {
          toast.error("Username not found.");
        }
      } else {
        if (!name || !username || !password) {
          toast.error("Please fill in all fields.");
          setIsLoading(false);
          return;
        }
        
        const snapshot = await get(child(dbRef, `users/${username}`));
        if (snapshot.exists()) {
          toast.error("Username already taken! Choose another.");
        } else {
          await set(ref(db, `users/${username}`), {
            name: name,
            password: password, 
            xp: 0
          });
          setCurrentUser({ username, name });
          setTotalXp(0);
          toast.success("Registration successful! You are logged in.");
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Database connection failed. Check Firebase Rules!");
    }
    
    setIsLoading(false);
  };

  // --- CLEANED UP LOGGED-IN VIEW ---
  if (currentUser) {
    return (
      <div className="auth-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <div style={{ background: '#1a1a1a', padding: '16px', borderRadius: '50%', marginBottom: '16px' }}>
          <BadgeCheck size={36} color="var(--primary)" />
        </div>
        <h2 style={{ color: '#ffffff', marginBottom: '8px', fontSize: '1.4rem' }}>Profile Active</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '8px', fontSize: '0.9rem' }}>Name: <strong style={{ color: '#ffffff' }}>{currentUser.name}</strong></p>
        <p style={{ color: 'var(--text-muted)', marginBottom: '0', fontSize: '0.9rem' }}>Username: <strong style={{ color: '#ffffff' }}>@{currentUser.username}</strong></p>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', color: '#ffffff', marginBottom: '6px' }}>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{isLogin ? 'Enter your details to access your XP.' : 'Register to start earning rewards.'}</p>
      </div>

      <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {!isLogin && (
          <div className="sleek-input-container">
            <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} required className="sleek-input" />
            <BadgeCheck size={16} className="sleek-icon" />
          </div>
        )}
        <div className="sleek-input-container">
          <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required className="sleek-input" />
          <User size={16} className="sleek-icon" />
        </div>
        <div className="sleek-input-container">
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="sleek-input" />
          <Lock size={16} className="sleek-icon" />
        </div>
        <button type="submit" className="claim-btn" style={{ padding: '10px', marginTop: '8px', fontSize: '0.9rem' }} disabled={isLoading}>
          {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
        </button>
      </form>

      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <span style={{ color: '#52525b', fontSize: '0.85rem' }}>{isLogin ? "Don't have an account? " : "Already have an account? "}</span>
        <button 
          onClick={() => { setIsLogin(!isLogin); setUsername(''); setPassword(''); setName(''); }} 
          style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}
        >
          {isLogin ? "Register here" : "Sign in"}
        </button>
      </div>
    </div>
  );
};

const PurchaseHistory = ({ currentUser }) => {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (currentUser) {
      get(child(ref(db), `users/${currentUser.username}/purchases`)).then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const historyArray = Object.values(data).reverse();
          setHistory(historyArray);
        }
      });
    }
  }, [currentUser]);

  if (!currentUser) return <p style={{ color: 'var(--text-muted)' }}>Please log in to view history.</p>;

  return (
    <div>
      <h1 className="page-title">Purchase History</h1>
      <p className="page-desc" style={{ marginBottom: '24px' }}>A record of all your claimed items.</p>
      
      {history.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>You haven't bought anything yet.</p>
      ) : (
        <table className="sleek-table">
          <thead>
            <tr>
              <th>Date & Time</th>
              <th>Item</th>
              <th>XP Spent</th>
            </tr>
          </thead>
          <tbody>
            {history.map((purchase, index) => (
              <tr key={index}>
                <td style={{ color: 'var(--text-muted)' }}>{purchase.date}</td>
                <td style={{ fontWeight: '600', color: '#fff' }}>{purchase.item}</td>
                <td style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>-{purchase.price} XP</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const AdminDashboard = () => {
  const [allUsers, setAllUsers] = useState({});

  useEffect(() => {
    get(child(ref(db), 'users')).then((snapshot) => {
      if (snapshot.exists()) {
        setAllUsers(snapshot.val());
      }
    });
  }, []);

  return (
    <div>
      <h1 className="page-title" style={{ color: 'var(--primary)' }}>Admin Dashboard</h1>
      <p className="page-desc" style={{ marginBottom: '24px' }}>Overview of all players and their purchases.</p>
      
      {Object.entries(allUsers).map(([username, data]) => {
        if (username === 'admin') return null;

        const userPurchases = data.purchases ? Object.values(data.purchases).reverse() : [];

        return (
          <div key={username} className="admin-user-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>{data.name}</h3>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>@{username}</span>
              </div>
              <div className="xp-stat">
                Balance: <span className="xp-amount">{data.xp || 0} XP</span>
              </div>
            </div>

            {userPurchases.length > 0 ? (
              <table className="sleek-table" style={{ marginTop: '0' }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Item Purchased</th>
                    <th>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {userPurchases.map((p, idx) => (
                    <tr key={idx}>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.date}</td>
                      <td style={{ color: '#fff' }}>{p.item}</td>
                      <td style={{ color: 'var(--primary)' }}>{p.price} XP</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: '#555', fontSize: '0.85rem', fontStyle: 'italic' }}>No purchases yet.</p>
            )}
          </div>
        );
      })}
    </div>
  );
};

function AppContent() {
  const [currentUser, setCurrentUser] = useState(null); 
  const [totalXp, setTotalXp] = useState(0); 
  const [sessionTime, setSessionTime] = useState(0); 
  const [claimedSessionXp, setClaimedSessionXp] = useState(
    parseInt(localStorage.getItem('claimedSessionXp')) || 0
  );
  const [isShopOpen, setIsShopOpen] = useState(true);

  const location = useLocation();
  const navigate = useNavigate(); 
  const isShopActive = location.pathname.startsWith('/shop');

  const isAdmin = currentUser?.username === 'admin';

  const foodItems = [
    { name: 'Chili Mansi', file: 'chilimansi.webp', price: 80 },
    { name: 'Sweet N Spicy', file: 'sweetspicy.webp', price: 60 },
    { name: 'Sandwich', file: 'sandwich.jpeg', price: 100 }
  ];

  const drinkItems = [
    { name: 'Sprite', file: 'sprite.webp', price: 50 },
    { name: 'Coke', file: 'coke.webp', price: 50 }, 
    { name: 'Mountain Dew', file: 'mountaindew.webp', price: 50 }
  ];

  const battlePassItems = [
    { name: '100 Steam Points', file: 'steam.webp', price: 500 },
    { name: 'Valorant 300 VP', file: 'valorant.webp', price: 1200 },
    { name: '1 Hr Free PC Time', file: 'pctime.webp', price: 600 }
  ];

  useEffect(() => {
    let os;
    try {
      os = window.require('os');
    } catch (e) {
      console.warn("Running in browser mode. OS uptime tracking requires Electron.");
    }

    const timer = setInterval(() => {
      if (os) {
        setSessionTime(os.uptime()); 
      } else {
        setSessionTime((prev) => prev + 1); 
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const totalEarnedThisBoot = Math.floor((sessionTime / 60) * 10);
  const pendingXp = Math.max(0, totalEarnedThisBoot - claimedSessionXp);

  const claimXp = () => {
    if (!currentUser) {
      toast.error("Yowzza! You need to login first."); 
      navigate('/account');
      return;
    }

    if (pendingXp > 0) {
      const newTotal = totalXp + pendingXp;
      setTotalXp(newTotal);
      setClaimedSessionXp(totalEarnedThisBoot);
      localStorage.setItem('claimedSessionXp', totalEarnedThisBoot.toString());
      update(ref(db, `users/${currentUser.username}`), { xp: newTotal });
      toast.success(`Claimed ${pendingXp} XP!`);
    } else {
      toast.error("No XP to claim yet. Keep playing!");
    }
  };

  const handleBuy = (item, price) => {
    if (!currentUser) {
      toast.error("Yowzza! You need to login first.");
      navigate('/account');
      return;
    }

    if (totalXp >= price) {
      const newTotal = totalXp - price;
      setTotalXp(newTotal);
      
      const timestamp = new Date().toLocaleString(); 
      
      const updates = {};
      updates[`users/${currentUser.username}/xp`] = newTotal;
      updates[`users/${currentUser.username}/purchases/${Date.now()}`] = {
        item: item,
        price: price,
        date: timestamp
      };

      update(ref(db), updates);
      toast.success(`Success! Enjoy your ${item}.`);
    } else {
      toast.error(`Not enough XP! You need ${price - totalXp} more.`);
    }
  };

  return (
    <div className="app-container">
      
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0d0d0d', 
            color: '#fff',
            border: '1px solid #2a2a2a',
            fontSize: '13px',
            fontFamily: 'inherit',
            padding: '12px 16px',
            borderRadius: '8px',
          },
          success: { iconTheme: { primary: 'var(--primary)', secondary: '#ffffff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#ffffff' } },
        }}
      />

      <div className="sidebar">
        <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img 
            src="/images/logo/logo2.png" 
            alt="ProjectX Logo" 
            style={{ width: '24px', height: '24px', objectFit: 'cover', borderRadius: '4px' }} 
          />
          4G GAMERS
        </div>
        
        <div className="nav-menu" style={{ height: '100%', display: 'flex', flexDirection: 'column', paddingTop: '12px' }}>
          
          <div 
            className={`nav-link ${isShopActive ? 'active' : ''}`} 
            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            onClick={() => setIsShopOpen(!isShopOpen)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShoppingCart size={16} /> Shop
            </div>
            {isShopOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>

          {isShopOpen && (
            <div className="sub-menu">
              <NavLink to="/shop/foods" className="nav-link sub-link">
                <Pizza size={14} /> Foods
              </NavLink>
              <NavLink to="/shop/drinks" className="nav-link sub-link">
                <Coffee size={14} /> Drinks
              </NavLink>
            </div>
          )}

          <NavLink to="/battlepass" className="nav-link" style={{ marginTop: '8px' }}>
            <Gamepad2 size={16} /> Battle Pass
          </NavLink>

          <NavLink to="/history" className="nav-link" style={{ marginTop: '4px' }}>
            <History size={16} /> Purchase History
          </NavLink>

          {/* MOVED ACCOUNT SETTINGS UP HERE */}
          <NavLink to="/account" className="nav-link" style={{ marginTop: '4px' }}>
            <Settings size={16} /> Account Settings
          </NavLink>

          {isAdmin && (
            <NavLink to="/admin" className="nav-link" style={{ marginTop: '8px', color: 'var(--primary)' }}>
              <ShieldAlert size={16} /> Admin Dashboard
            </NavLink>
          )}

          {/* DYNAMIC LOGOUT AT THE VERY BOTTOM */}
          <div style={{ marginTop: 'auto', marginBottom: '16px' }}>
            {currentUser && (
              <div 
                className="nav-link" 
                onClick={() => {
                  setCurrentUser(null);
                  setTotalXp(0);
                  toast.success("Logged out successfully.");
                  navigate('/account');
                }}
                style={{ cursor: 'pointer', color: '#ff5252' }}
              >
                <LogOut size={16} /> Log Out
              </div>
            )}
          </div>
          
        </div>
      </div>

      <div className="main-area">
        
        <div className="topbar">
          <div className="xp-stat">
            <span>Unclaimed XP:</span>
            <span className="xp-amount">{pendingXp}</span>
            <button className="claim-btn" style={{ marginLeft: '10px' }} onClick={claimXp}>Claim</button>
          </div>
          
          <div className="xp-stat" style={{ background: 'transparent', border: '1px solid #1a1a1a' }}>
            <Wallet size={16} color="var(--primary)" />
            <span>{currentUser ? currentUser.username : 'Guest'}:</span>
            <span className="xp-amount" style={{ color: '#ffffff' }}>{totalXp} XP</span>
          </div>
        </div>

        <div className="page-content">
          <Routes>
            <Route path="/" element={<h1 className="page-title">Welcome back. Your session has started.</h1>} />
            
            <Route path="/shop/foods" element={
              <>
                <h1 className="page-title">Foods</h1>
                <p className="page-desc" style={{ marginBottom: '24px' }}>Exchange your XP for snacks.</p>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {foodItems.map(food => (
                    <div key={food.name} className="card" style={{ width: '160px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ width: '100%', height: '100px', backgroundColor: '#1a1a1a', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <img src={`/images/foods/${food.file}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={food.name} onError={(e) => { e.target.style.display = 'none' }} />
                      </div>
                      <h3 style={{ fontSize: '0.9rem', color: '#ffffff', textAlign: 'center', margin: 0 }}>{food.name}</h3>
                      <button onClick={() => handleBuy(food.name, food.price)} className="claim-btn" style={{ width: '100%' }}>{food.price} XP</button>
                    </div>
                  ))}
                </div>
              </>
            } />
            
            <Route path="/shop/drinks" element={
              <>
                <h1 className="page-title">Drinks</h1>
                <p className="page-desc" style={{ marginBottom: '24px' }}>Grab a cold drink to keep grinding.</p>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {drinkItems.map(drink => (
                    <div key={drink.name} className="card" style={{ width: '160px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ width: '100%', height: '100px', backgroundColor: '#1a1a1a', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <img src={`/images/drinks/${drink.file}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={drink.name} onError={(e) => { e.target.style.display = 'none' }} />
                      </div>
                      <h3 style={{ fontSize: '0.9rem', color: '#ffffff', textAlign: 'center', margin: 0 }}>{drink.name}</h3>
                      <button onClick={() => handleBuy(drink.name, drink.price)} className="claim-btn" style={{ width: '100%' }}>{drink.price} XP</button>
                    </div>
                  ))}
                </div>
              </>
            } />
            
            <Route path="/battlepass" element={
              <>
                <h1 className="page-title">Battle Pass</h1>
                <p className="page-desc" style={{ marginBottom: '24px' }}>Redeem Steam Points, Valorant VP, and more.</p>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {battlePassItems.map(item => (
                    <div key={item.name} className="card" style={{ width: '180px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ width: '100%', height: '120px', backgroundColor: '#1a1a1a', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        <img src={`/images/battlepass/${item.file}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={item.name} onError={(e) => { e.target.style.display = 'none' }} />
                      </div>
                      <h3 style={{ fontSize: '0.9rem', color: '#ffffff', textAlign: 'center', margin: 0 }}>{item.name}</h3>
                      <button onClick={() => handleBuy(item.name, item.price)} className="claim-btn" style={{ width: '100%' }}>{item.price} XP</button>
                    </div>
                  ))}
                </div>
              </>
            } />
            
            <Route path="/history" element={<PurchaseHistory currentUser={currentUser} />} />
            
            <Route path="/admin" element={isAdmin ? <AdminDashboard /> : <h1 className="page-title">Access Denied.</h1>} />

            <Route path="/account" element={
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '30px' }}>
                <AccountPage currentUser={currentUser} setCurrentUser={setCurrentUser} setTotalXp={setTotalXp} />
              </div>
            } />
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