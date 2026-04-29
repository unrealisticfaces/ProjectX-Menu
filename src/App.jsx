import { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Gamepad2, Settings, Coffee, Pizza, Wallet, ShoppingCart, ChevronDown, ChevronRight, User, Lock, BadgeCheck, LogOut, History, ShieldAlert, X, Edit, Trash2, Plus, Search, ListTodo, CheckCircle, FileText, Users, Medal, Trophy, Sliders, Home, Zap, Flame, CalendarDays, Megaphone, Coins, Cloud, Network } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast'; 
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { io } from 'socket.io-client';
import './App.css';

// Get saved IP from local storage, default to localhost for development
const savedServerIp = localStorage.getItem('4g_server_ip') || 'http://localhost:3000';
const socket = io(savedServerIp, { transports: ['websocket'] });

const changeServerIP = (newIp) => {
  let cleanIp = newIp.trim().replace(/^https?:\/\//, '');
  const finalUrl = `http://${cleanIp}`;
  localStorage.setItem('4g_server_ip', finalUrl);
  socket.io.uri = finalUrl;
  socket.disconnect();
  socket.connect();
};

const getTier = (lifetimeXp, config) => {
  const sXp = config?.silverXp || 2000;
  const gXp = config?.goldXp || 5000;
  if (lifetimeXp >= gXp) return { level: 'Gold', color: '#fbbf24' }; 
  if (lifetimeXp >= sXp) return { level: 'Silver', color: '#cbd5e1' };
  return { level: 'Bronze', color: '#b45309' }; 
};

const getTierProgress = (lifetimeXp, config) => {
  const sXp = config?.silverXp || 2000;
  const gXp = config?.goldXp || 5000;
  if (lifetimeXp < sXp) {
    return { current: lifetimeXp, target: sXp, percentage: (lifetimeXp / sXp) * 100, next: 'Silver', color: '#cbd5e1' };
  } else if (lifetimeXp < gXp) {
    return { current: lifetimeXp, target: gXp, percentage: ((lifetimeXp - sXp) / (gXp - sXp)) * 100, next: 'Gold', color: '#fbbf24' };
  } else {
    return { current: lifetimeXp, target: 'MAX', percentage: 100, next: 'Max Tier', color: '#fbbf24' };
  }
};

const LiveXpHud = ({ currentUser, sysConfig, onClaimXp }) => {
  const [pendingXp, setPendingXp] = useState(0);

  useEffect(() => {
    if (currentUser?.isAdmin || currentUser?.username === 'admin') {
      setPendingXp(0);
      return;
    }
    const timer = setInterval(() => {
      let mult = 1;
      const d = new Date();
      const isMidnight = d.getHours() >= 0 && d.getHours() < 6;
      if ((sysConfig?.boostDays && sysConfig.boostDays[d.getDay()]) || (sysConfig?.enableMidnightBoost && isMidnight)) {
        mult = sysConfig?.boostMultiplier || 2;
      }
      const xpPerSecond = ((sysConfig?.xpPerHour || 1800) / 3600) * mult;
      setPendingXp(prev => prev + xpPerSecond);
    }, 1000);
    return () => clearInterval(timer);
  }, [currentUser, sysConfig]);

  return (
    <div className="unclaimed-xp-hud">
      <div className="hud-status-container">
        <div className="status-dot-pulse"></div>
        <span className="xp-label">LIVE SESSION XP:</span>
      </div>
      <span className="xp-amount">{Math.floor(pendingXp)}</span>
      <button className="claim-btn" style={{ padding: '4px 10px'}} onClick={() => {
        if (!currentUser) { toast.error("Create an account or sign in to claim your XP!"); return; }
        if(pendingXp > 0) { onClaimXp(Math.floor(pendingXp)); setPendingXp(0); } 
        else { toast.error("No XP to claim yet."); }
      }}>Claim</button>
    </div>
  );
};

const LeaderboardWidget = ({ layout = 'vertical' }) => {
  const [topPlayers, setTopPlayers] = useState([]);
  const medalColors = ['#fbbf24', '#cbd5e1', '#b45309']; 
  const bgColors = ['rgba(251, 191, 36, 0.15)', 'rgba(203, 213, 225, 0.15)', 'rgba(180, 83, 9, 0.15)'];
  const borderColors = ['rgba(251, 191, 36, 0.3)', 'rgba(203, 213, 225, 0.3)', 'rgba(180, 83, 9, 0.3)'];

  useEffect(() => {
    socket.on('sync_leaderboard', (data) => setTopPlayers(Array.isArray(data) ? data : []));
    socket.emit('request_leaderboard');
    return () => socket.off('sync_leaderboard');
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: layout === 'horizontal' ? '10px 0' : '0' }}>
      <div className="chart-title" style={{ textAlign: layout === 'horizontal' ? 'left' : 'center', margin: layout === 'horizontal' ? '0' : '0 0 16px 0', letterSpacing: '0.5px' }}>TOP 3 RANKED</div>
      {topPlayers.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data available.</div>
      ) : (
        <div className={layout === 'horizontal' ? "leaderboard-list-horizontal" : "leaderboard-list"}>
          {topPlayers.map((player, idx) => (
            <div key={player.username} className="leaderboard-item" style={{ background: bgColors[idx], border: `1px solid ${borderColors[idx]}`, borderRadius: '8px', padding: '10px 14px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="player-info" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Medal size={22} color={medalColors[idx]} /> 
                <span className="player-name" style={{ fontWeight: 'bold', color: '#fff' }}>@{player.username}</span>
              </div>
              <span className="xp-score" style={{ fontWeight: 'bold', color: medalColors[idx] }}>{player.xp} XP</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const RecentActivityWidget = () => {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    socket.on('sync_all_orders', (orders) => {
      let allActivity = (Array.isArray(orders) ? orders : []).filter(p => p.status === 'completed').map(p => ({ username: p.username, item: p.itemName, time: p.timestamp }));
      allActivity.sort((a, b) => b.time - a.time);
      setActivities(allActivity.slice(0, 4));
    });
    socket.emit('request_all_orders');
    return () => socket.off('sync_all_orders');
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="chart-title" style={{ textAlign: 'center', margin: '0 0 16px 0', letterSpacing: '0.5px' }}>LIVE ACTIVITY</div>
      {activities.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No recent claims yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {activities.map((act, idx) => (
            <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e', flexShrink: 0 }}></div>
              <span style={{ fontSize: '0.8rem', color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <strong style={{ color: '#fff' }}>@{act.username}</strong> claimed {act.item}
              </span>
            </div>
          ))}
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
      socket.on('sync_user_history', (data) => {
        setHistory((Array.isArray(data) ? data : []).map(o => ({...o, item: o.itemName, date: new Date(o.timestamp).toLocaleString()})));
      });
      socket.emit('request_user_history', currentUser.username);
      return () => socket.off('sync_user_history');
    }
  }, [currentUser]);

  if (!currentUser) return <p style={{ color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.85rem' }}>Please log in to view history.</p>;

  const totalPages = Math.ceil(history.length / itemsPerPage);
  const currentHistory = history.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ color: '#fff', fontSize: '1.5rem', marginBottom: '24px', textAlign: 'center' }}>Purchase History</h2>
      {history.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>No purchases found.</div>
      ) : (
        <>
          <table className="sleek-table">
            <thead><tr><th>Date & Time</th><th>Item</th><th>Status</th><th>XP Cost</th></tr></thead>
            <tbody>
              {currentHistory.map((purchase, index) => (
                <tr key={index}>
                  <td style={{ color: 'var(--text-muted)' }}>{purchase.date}</td>
                  <td style={{ fontWeight: '600', color: '#fff' }}>{purchase.item}</td>
                  <td>
                    <span className={`status-badge status-${purchase.status || 'pending'}`}>
                      {purchase.status || 'pending'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{purchase.price} XP</td>
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

const AccountSettings = ({ currentUser }) => {
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const handleSuccess = (msg) => {
      toast.success(msg);
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    };
    const handleError = (msg) => toast.error(msg);

    socket.on('password_update_success', handleSuccess);
    socket.on('password_update_error', handleError);

    return () => {
      socket.off('password_update_success', handleSuccess);
      socket.off('password_update_error', handleError);
    };
  }, []);

  const handlePasswordUpdate = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error("New passwords do not match!"); return; }
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    socket.emit('update_password', { username: currentUser.username, currentPassword, newPassword });
  };

  if (!currentUser) return <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Please sign in to view your account details.</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '450px', margin: '0 auto', width: '100%' }}>
      <div className="bento-card" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
          <Settings color="var(--primary)" size={20} />
          <h2 className="page-title" style={{ margin: 0, fontSize: '1.25rem' }}>Account Settings</h2>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="sleek-input-container" style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Full Name:</span><strong style={{ color: '#fff', fontSize: '0.8rem' }}>{currentUser.name}</strong>
          </div>
          <div className="sleek-input-container" style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Username:</span><strong style={{ color: '#fff', fontSize: '0.8rem' }}>@{currentUser.username}</strong>
          </div>
          
          {!isChangingPassword ? (
            <button className="claim-btn" style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', fontSize: '0.8rem' }} onClick={() => setIsChangingPassword(true)}>
              <Lock size={14} /> Change Password
            </button>
          ) : (
            <form onSubmit={handlePasswordUpdate} style={{ background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
              <span style={{ color: '#fff', fontSize: '0.85rem', marginBottom: '4px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}><Lock size={14} color="var(--primary)" /> Update Password</span>
              
              <input type="password" placeholder="Current Password" className="sleek-input" style={{ paddingLeft: '12px', fontSize: '0.8rem', padding: '8px 12px' }} required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              
              <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }}></div>

              <input type="password" placeholder="New Password (min. 6 chars)" className="sleek-input" style={{ paddingLeft: '12px', fontSize: '0.8rem', padding: '8px 12px' }} required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <input type="password" placeholder="Confirm New Password" className="sleek-input" style={{ paddingLeft: '12px', fontSize: '0.8rem', padding: '8px 12px' }} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button type="button" className="claim-btn" style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)', fontSize: '0.75rem', padding: '8px' }} onClick={() => { setIsChangingPassword(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}>Cancel</button>
                <button type="submit" className="claim-btn" style={{ flex: 1, fontSize: '0.75rem', padding: '8px' }}>Save</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [stats, setStats] = useState({ online: 0, approvedClaims: 0, totalUsers: 0 });
  const [trendData, setTrendData] = useState([]);
  const [pieData, setPieData] = useState([]);

  const COLORS = ['#c12320', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];

  useEffect(() => {
    socket.on('sync_all_users', (usersArray) => {
      const safeUsers = Array.isArray(usersArray) ? usersArray : [];
      let onlineCount = safeUsers.filter(u => u.isOnline && !u.isAdmin).length;
      let userCount = safeUsers.filter(u => !u.isAdmin).length;
      setStats(s => ({ ...s, online: onlineCount, totalUsers: userCount }));
    });

    socket.on('sync_all_orders', (ordersArray) => {
      const safeOrders = Array.isArray(ordersArray) ? ordersArray : [];
      let approvedCount = 0;
      const trendMap = {};
      for(let i=6; i>=0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        trendMap[d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })] = 0;
      }
      const productMap = {};

      safeOrders.forEach(p => {
        if (p.status === 'completed') {
          approvedCount++;
          const pDate = new Date(p.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          if (trendMap[pDate] !== undefined) trendMap[pDate]++;
          productMap[p.itemName] = (productMap[p.itemName] || 0) + 1;
        }
      });

      setStats(s => ({ ...s, approvedClaims: approvedCount }));
      setTrendData(Object.entries(trendMap).map(([date, claims]) => ({ date, claims })));
      const sortedPie = Object.entries(productMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }));
      setPieData(sortedPie);
    });

    socket.emit('request_all_users');
    socket.emit('request_all_orders');

    return () => { socket.off('sync_all_users'); socket.off('sync_all_orders'); };
  }, []);

  return (
    <div style={{ padding: '20px' }}>
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
    socket.on('sync_all_orders', (data) => {
      const sorted = (Array.isArray(data) ? data : []).sort((a, b) => b.timestamp - a.timestamp);
      setAllPurchases(sorted.map(o => ({ ...o, orderId: o.id, item: o.itemName })));
    });
    socket.emit('request_all_orders');
    return () => socket.off('sync_all_orders');
  }, []);

  const handleFulfillOrder = (orderId, username, itemName) => {
    socket.emit('update_order_status', { id: orderId, status: 'completed' });
    toast.success(`Approved ${itemName} for @${username}!`);
  };

  const handleDeclineOrder = (orderId, username, price, itemName) => {
    socket.emit('update_order_status', { id: orderId, status: 'declined', refund: { username, price } });
    toast.success(`Declined ${itemName}.`);
  };

  const totalPages = Math.ceil(allPurchases.length / itemsPerPage);
  const currentPurchases = allPurchases.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={{ padding: '20px' }}>
      <h1 className="page-title" style={{ textAlign: 'center' }}>Order Queue</h1>
      <p className="page-desc" style={{ marginBottom: '24px', textAlign: 'center' }}>Approve or Decline player claims here.</p>
      
      {allPurchases.length === 0 ? <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>No orders in the queue.</p> : (
        <>
          <table className="sleek-table">
            <thead><tr><th>Time</th><th>User</th><th>Name</th><th>Product</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {currentPurchases.map((p, i) => {
                const isPending = !p.status || p.status === 'pending';
                return (
                  <tr key={i} style={{ background: isPending ? 'rgba(234, 179, 8, 0.05)' : 'transparent' }}>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(p.timestamp).toLocaleString()}</td>
                    <td style={{ fontWeight: '600', color: '#fff' }}>@{p.username}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{p.name || 'Player'}</td>
                    <td style={{ color: '#fff' }}>{p.item}</td>
                    <td>
                      <span className={`status-badge status-${p.status || 'pending'}`}>
                        {p.status || 'pending'}
                      </span>
                    </td>
                    <td>
                      {isPending ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="claim-btn" style={{ padding: '4px 8px', fontSize: '0.7rem', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.3)' }} onClick={() => handleFulfillOrder(p.orderId, p.username, p.item)}>
                            Approve
                          </button>
                          <button className="claim-btn" style={{ padding: '4px 8px', fontSize: '0.7rem', background: 'transparent', border: '1px solid #ef4444', color: '#ef4444' }} onClick={() => handleDeclineOrder(p.orderId, p.username, p.price, p.item)}>
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

const AccountsList = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [editUserModal, setEditUserModal] = useState({ open: false, username: '', name: '', password: '', isEnabled: true });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    socket.on('sync_all_users', (data) => {
      setUsers(Array.isArray(data) ? data : []);
    });
    socket.emit('request_all_users');
    return () => socket.off('sync_all_users');
  }, []);

  const handleSaveUser = (e) => {
    e.preventDefault();
    socket.emit('admin_update_user', { 
      username: editUserModal.username, 
      name: editUserModal.name, 
      password: editUserModal.password,
      isEnabled: editUserModal.isEnabled
    });
    toast.success(`Account @${editUserModal.username} updated!`);
    setEditUserModal({ open: false, username: '', name: '', password: '', isEnabled: true });
  };

  const handleDeleteUser = (username) => {
    if (window.confirm(`Are you absolutely sure you want to permanently delete the account @${username}?`)) {
      socket.emit('admin_delete_user', username);
      toast.success(`Account @${username} has been deleted.`);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!u) return false;
    const isAdm = u.isAdmin === true || u.isAdmin === 1 || String(u.isAdmin).toLowerCase() === 'true';
    if (isAdm || u.username === 'admin') return false;
    
    const searchLower = search.toLowerCase();
    const matchUser = u.username ? String(u.username).toLowerCase().includes(searchLower) : false;
    const matchName = u.name ? String(u.name).toLowerCase().includes(searchLower) : false;
    
    return matchUser || matchName;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const currentUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 className="page-title" style={{ textAlign: 'center' }}>Registered Accounts</h1>
      <p className="page-desc" style={{ marginBottom: '24px', textAlign: 'center' }}>Manage players and user accounts.</p>
      
      <div className="bento-card" style={{ padding: '24px' }}>
        <div className="sleek-input-container" style={{ maxWidth: '400px', margin: '0 0 20px 0' }}>
          <input type="text" placeholder="Search username or name..." className="sleek-input search-glow-input" style={{ fontSize: '0.85rem' }} value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} />
          <Search size={16} className="sleek-icon" />
        </div>

        {filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
            No player accounts found. Register a new user to see them here.
          </div>
        ) : (
          <table className="sleek-table">
            <thead><tr><th>Username</th><th>Full Name</th><th>Wallet Balance</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {currentUsers.map((user, idx) => {
                const isOnline = user.isOnline === true || user.isOnline === 1 || String(user.isOnline).toLowerCase() === 'true';
                const isEnabled = user.isEnabled === 1 || String(user.isEnabled) === 'true' || user.isEnabled === null || user.isEnabled === undefined;
                
                return (
                  <tr key={user.username || idx} style={{ opacity: isEnabled ? 1 : 0.5 }}>
                    <td style={{ fontWeight: '600', color: '#fff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isOnline && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e' }}></div>}
                        @{user.username || 'unknown'}
                        {!isEnabled && <span style={{ fontSize: '0.65rem', background: '#ef4444', color: '#fff', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>DISABLED</span>}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{user.name || 'Unknown'}</td>
                    <td style={{ color: 'var(--primary)', fontFamily: 'monospace', fontWeight: 'bold' }}>{user.xp || 0} XP</td>
                    <td>
                      <span className={`status-badge ${isEnabled ? 'status-completed' : 'status-declined'}`}>
                        {isEnabled ? 'ENABLED' : 'DISABLED'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="admin-icon-btn" onClick={() => setEditUserModal({ open: true, username: user.username, name: user.name || '', password: '', isEnabled: isEnabled })} title="Edit User & Reset Password"><Edit size={14}/></button>
                        <button className="admin-icon-btn" onClick={() => handleDeleteUser(user.username)} title="Delete User"><Trash2 size={14} color="#ef4444" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="pagination-controls">
            <button className="page-btn" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
            <span className="page-info">Page {currentPage} of {totalPages}</span>
            <button className="page-btn" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
          </div>
        )}
      </div>

      {editUserModal.open && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '350px' }}>
            <div className="auth-card">
              <button className="close-modal" onClick={() => setEditUserModal({ open: false, username: '', name: '', password: '', isEnabled: true })}><X size={20}/></button>
              <h2 style={{ textAlign: 'center', marginBottom: '20px', fontSize: '1.2rem', color: '#fff' }}>Edit @{editUserModal.username}</h2>
              
              <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="sleek-input-container">
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 4px 0', display: 'block' }}>Display Name:</span>
                  <input type="text" className="sleek-input" style={{ paddingLeft: '14px', fontSize: '0.85rem' }} required value={editUserModal.name} onChange={e => setEditUserModal({...editUserModal, name: e.target.value})} />
                </div>

                <div className="sleek-input-container">
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 4px 0', display: 'block' }}>Security:</span>
                  <button 
                    type="button" 
                    className="claim-btn" 
                    style={{ 
                      width: '100%', 
                      background: editUserModal.password === '123' ? '#eab308' : 'var(--primary)', 
                      color: editUserModal.password === '123' ? '#000' : '#fff', 
                      border: 'none', 
                      transition: 'all 0.2s' 
                    }} 
                    onClick={() => setEditUserModal({...editUserModal, password: editUserModal.password === '123' ? '' : '123'})}
                  >
                    {editUserModal.password === '123' ? '✅ Password will be reset to "123"' : 'Reset Password to Default (123)'}
                  </button>
                </div>

                <div className="sleek-input-container" style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '0.85rem', cursor: 'pointer', margin: 0 }}>
                    <input type="checkbox" checked={editUserModal.isEnabled} onChange={e => setEditUserModal({...editUserModal, isEnabled: e.target.checked})} style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }} />
                    Account is Enabled
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  <button type="button" className="claim-btn" style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)' }} onClick={() => setEditUserModal({ open: false, username: '', name: '', password: '', isEnabled: true })}>Cancel</button>
                  <button type="submit" className="claim-btn" style={{ flex: 1 }}>Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const NewsManager = ({ newsList }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    socket.emit('admin_save_news', { title, content });
    setTitle('');
    setContent('');
    toast.success("Announcement posted!");
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
      <h1 className="page-title" style={{ textAlign: 'center' }}>Announcements</h1>
      <p className="page-desc" style={{ marginBottom: '24px', textAlign: 'center' }}>Post live updates to the player dashboard.</p>
      
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        <div className="bento-card" style={{ flex: '1 1 350px' }}>
          <h3 style={{ color: '#fff', fontSize: '1.05rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Megaphone color="var(--primary)" size={18} /> Create New Post
          </h3>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="sleek-input-container">
              <input type="text" placeholder="Title" className="sleek-input" style={{ paddingLeft: '12px', fontSize: '0.85rem', padding: '10px 12px' }} value={title} onChange={e => setTitle(e.target.value)} required />
            </div>
            <div className="sleek-input-container">
              <textarea placeholder="Message..." className="sleek-input" style={{ paddingLeft: '12px', minHeight: '120px', resize: 'vertical', paddingTop: '10px', fontSize: '0.85rem' }} value={content} onChange={e => setContent(e.target.value)} required />
            </div>
            <button type="submit" className="claim-btn" style={{ padding: '10px', fontSize: '0.85rem', width: '100%' }}>Post Announcement</button>
          </form>
        </div>

        <div className="bento-card" style={{ flex: '2 1 400px' }}>
          <h3 style={{ color: '#fff', fontSize: '1.05rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarDays size={18} color="var(--primary)" /> Active Posts
          </h3>
          
          {newsList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No active announcements.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '8px' }} className="custom-scrollbar">
              {(Array.isArray(newsList) ? newsList : []).map(news => (
                <div key={news.id} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', position: 'relative' }}>
                  <button onClick={() => socket.emit('admin_delete_news', news.id)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: '6px', padding: '6px', cursor: 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}><Trash2 size={14} /></button>
                  <h4 style={{ color: '#fff', margin: '0 0 6px 0', fontSize: '0.95rem', paddingRight: '40px' }}>{news.title}</h4>
                  <p style={{ color: 'var(--text-muted)', margin: '0 0 12px 0', fontSize: '0.85rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{news.content}</p>
                  <div style={{ color: 'var(--primary)', fontSize: '0.7rem', fontWeight: 'bold', fontFamily: 'monospace' }}>{new Date(news.timestamp).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

const AdminLog = () => {
  const [logs, setLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    socket.on('sync_admin_logs', (data) => setLogs(Array.isArray(data) ? data : []));
    socket.emit('request_admin_logs');
    
    // Auto-update logs if changes occur
    socket.on('new_log_entry', () => socket.emit('request_admin_logs'));

    return () => {
      socket.off('sync_admin_logs');
      socket.off('new_log_entry');
    };
  }, []);

  const totalPages = Math.ceil(logs.length / itemsPerPage);
  const currentLogs = logs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 className="page-title" style={{ textAlign: 'center' }}>Admin Log</h1>
      <p className="page-desc" style={{ marginBottom: '24px', textAlign: 'center' }}>Tracker for system modifications.</p>
      
      <div className="bento-card" style={{ padding: '24px' }}>
        {logs.length === 0 ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>No recent admin actions logged.</p> : (
          <>
            <table className="sleek-table">
              <thead><tr><th>Date & Time</th><th>Action Taken</th></tr></thead>
              <tbody>
                {currentLogs.map((log, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-muted)', width: '25%' }}>{log.timestamp}</td>
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
    </div>
  );
};

const SystemConfig = ({ config }) => {
  const [form, setForm] = useState({
    silverXp: config?.silverXp || 2000, goldXp: config?.goldXp || 5000, xpPerHour: config?.xpPerHour || 1800,
    boostDays: config?.boostDays || { 0: false, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false },
    enableMidnightBoost: config?.enableMidnightBoost || false, boostMultiplier: config?.boostMultiplier || 2,
    autoBackupDaily: config?.autoBackupDaily !== false 
  });
  const [localIp, setLocalIp] = useState(localStorage.getItem('4g_server_ip') || 'http://localhost:3000');

  useEffect(() => { if(config) setForm(prev => ({...prev, ...config, autoBackupDaily: config.autoBackupDaily !== false})); }, [config]);

  const handleDayChange = (dayIndex, isChecked) => setForm(prev => ({ ...prev, boostDays: { ...prev.boostDays, [dayIndex]: isChecked } }));
  const handleSave = (e) => { e.preventDefault(); socket.emit('update_config', form); toast.success("System configurations updated!"); };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>System Config</h1>
          <p className="page-desc" style={{ margin: 0 }}>Adjust game economy, events, and network.</p>
        </div>
        <button type="button" className="claim-btn" style={{ padding: '10px 24px', fontSize: '0.9rem', display: 'flex', gap: '8px', alignItems: 'center' }} onClick={handleSave}>
          <CheckCircle size={18} /> Save Settings
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        
        {/* Network Configuration Block */}
        <div className="bento-card">
          <h3 style={{ color: '#fff', fontSize: '1.05rem', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Network color="var(--primary)" size={18} /> Client Connection Setup
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '16px', lineHeight: '1.5' }}>
            Configure where this client PC looks for the main cafe server. E.g., <span style={{color: '#fff', fontFamily: 'monospace'}}>192.168.1.100:3000</span>
          </p>
          <div className="sleek-input-container">
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" className="sleek-input" style={{ paddingLeft: '14px', fontSize: '0.85rem' }} required value={localIp} onChange={e => setLocalIp(e.target.value)} />
              <button type="button" className="claim-btn" style={{ padding: '0 16px', flexShrink: 0 }} onClick={() => { changeServerIP(localIp); toast.success("Client connection updated!"); }}>Apply</button>
            </div>
          </div>
        </div>

        {/* Base Economy & Tier Boundaries */}
        <div className="bento-card">
          <h3 style={{ color: '#fff', fontSize: '1.05rem', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wallet color="var(--primary)" size={18} /> Economy & Tiers
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="sleek-input-container">
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', fontWeight: '600' }}>XP Earned Per Hour (Standard Rate)</span>
              <input type="number" className="sleek-input" style={{ paddingLeft: '14px', fontSize: '0.85rem' }} required value={form.xpPerHour} onChange={e => setForm({...form, xpPerHour: e.target.value})} />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="sleek-input-container" style={{ flex: 1 }}>
                <span style={{ fontSize: '0.8rem', color: '#cbd5e1', marginBottom: '6px', display: 'block', fontWeight: '600' }}>Silver Tier XP</span>
                <input type="number" className="sleek-input" style={{ paddingLeft: '14px', fontSize: '0.85rem' }} required value={form.silverXp} onChange={e => setForm({...form, silverXp: e.target.value})} />
              </div>
              <div className="sleek-input-container" style={{ flex: 1 }}>
                <span style={{ fontSize: '0.8rem', color: '#fbbf24', marginBottom: '6px', display: 'block', fontWeight: '600' }}>Gold Tier XP</span>
                <input type="number" className="sleek-input" style={{ paddingLeft: '14px', fontSize: '0.85rem' }} required value={form.goldXp} onChange={e => setForm({...form, goldXp: e.target.value})} />
              </div>
            </div>
          </div>
        </div>

        {/* Automated Event Multipliers */}
        <div className="bento-card">
          <h3 style={{ color: '#fff', fontSize: '1.05rem', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap color="var(--primary)" size={18} /> Automated Boost Events
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', display: 'block', fontWeight: '600' }}>Active Boost Days</span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, idx) => (
                  <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fff', fontSize: '0.8rem', cursor: 'pointer', background: form.boostDays[idx] ? 'var(--primary-soft)' : 'rgba(0,0,0,0.4)', padding: '6px 10px', borderRadius: '6px', border: `1px solid ${form.boostDays[idx] ? 'var(--primary)' : 'var(--border)'}`, transition: 'all 0.2s' }}>
                    <input type="checkbox" checked={!!(form.boostDays && form.boostDays[idx])} onChange={e => handleDayChange(idx, e.target.checked)} style={{ display: 'none' }} />
                    {dayName}
                  </label>
                ))}
              </div>
            </div>
            
            <div style={{ height: '1px', background: 'var(--border)' }}></div>
            
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '0.85rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.enableMidnightBoost} onChange={e => setForm({...form, enableMidnightBoost: e.target.checked})} style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }} />
              Enable Midnight Boost (12:00 AM - 6:00 AM)
            </label>
            
            <div className="sleek-input-container">
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', display: 'block', fontWeight: '600' }}>Event Multiplier (e.g., 2 for Double XP)</span>
              <input type="number" step="0.1" className="sleek-input" style={{ paddingLeft: '14px', fontSize: '0.85rem' }} required value={form.boostMultiplier} onChange={e => setForm({...form, boostMultiplier: e.target.value})} />
            </div>
          </div>
        </div>

        {/* Data Security */}
        <div className="bento-card">
          <h3 style={{ color: '#fff', fontSize: '1.05rem', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert color="var(--primary)" size={18} /> Data Security
          </h3>
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '16px', borderRadius: '8px' }}>
             <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', color: '#fff', fontSize: '0.85rem', cursor: 'pointer', margin: 0 }}>
              <input type="checkbox" checked={form.autoBackupDaily} onChange={e => setForm({...form, autoBackupDaily: e.target.checked})} style={{ width: '16px', height: '16px', accentColor: '#3b82f6', marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}><Cloud size={14}/> Enable Daily Cloud Backup</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '6px', lineHeight: '1.4' }}>Automatically uploads a secure snapshot of the SQLite database to Firebase every day at 4:00 AM.</div>
              </div>
            </label>
          </div>
        </div>

      </div>
    </div>
  );
};

const HomeDashboard = ({ inventory, newsList, topPicks }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const blendedPhotoStyle = {
    position: 'absolute', right: '-5%', top: '50%', transform: 'translateY(-50%)', width: '500px', height: '500px', 
    opacity: 0.18, objectFit: 'contain', filter: 'grayscale(100%) brightness(180%)',
    WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 70%)',
    maskImage: 'radial-gradient(circle, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 70%)'
  };

  const slides = [
    {
      id: 1, title: "EXPERIENCE PREMIUM GAMING", desc: "Welcome to 4G Gamers. Enjoy high-performance rigs, ultra-fast internet, and an exclusive rewards program just for playing.",
      color: "linear-gradient(135deg, rgba(193,35,32,0.6) 0%, rgba(10,10,10,0.95) 100%)", icon: <img src="./images/logo/logo2.png" alt="4G Gamers Logo" style={blendedPhotoStyle} />
    },
    {
      id: 2, title: "RANK UP FOR REWARDS", desc: "Earn XP every minute you play. Level up from Bronze to Gold to unlock premium Battle Passes, Steam points, and free PC time.",
      color: "linear-gradient(135deg, rgba(234,179,8,0.4) 0%, rgba(10,10,10,0.95) 100%)", icon: <img src="./images/logo/ads1.jpg" alt="Rank Up" style={blendedPhotoStyle} />
    },
    {
      id: 3, title: "FUEL YOUR GRIND", desc: "Thirsty? Hungry? Check out the shop. Spend your Wallet XP on hot meals and cold energy drinks delivered straight to your desk.",
      color: "linear-gradient(135deg, rgba(34,197,94,0.3) 0%, rgba(10,10,10,0.95) 100%)", icon: <img src="./images/foods/sweetspicy.webp" alt="Fuel Grind" style={blendedPhotoStyle} />
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => setCurrentSlide((prev) => (prev + 1) % slides.length), 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  const featuredItems = [];
  const allItems = [
    ...Object.values(inventory?.foods || {}).map(item => ({...item, categoryId: 'foods'})), 
    ...Object.values(inventory?.drinks || {}).map(item => ({...item, categoryId: 'drinks'})), 
    ...Object.values(inventory?.battlepass || {}).map(item => ({...item, categoryId: 'battlepass'})), 
    ...Object.values(inventory?.ecoin || {}).map(item => ({...item, categoryId: 'ecoin'}))
  ];

  if (topPicks && topPicks.length > 0) {
    topPicks.forEach(pickName => {
      const found = allItems.find(i => i.name === pickName);
      if (found && featuredItems.length < 3) featuredItems.push(found);
    });
  } 

  if (featuredItems.length < 3) {
    const available = allItems.filter(i => !featuredItems.some(f => f.id === i.id));
    featuredItems.push(...available.slice(0, 3 - featuredItems.length));
  }

  const renderAnnouncements = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
      <h3 style={{ color: '#fff', fontSize: '1.1rem', margin: '0', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Megaphone size={20} color="var(--primary)" /> Cafe Announcements
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, maxHeight: '280px', overflowY: 'auto', paddingRight: '8px' }} className="custom-scrollbar">
        {(Array.isArray(newsList) ? newsList : []).map(n => (
          <div key={n.id} className="card" style={{ background: 'linear-gradient(to right, rgba(34, 197, 94, 0.1), rgba(0,0,0,0.6))', border: '1px solid rgba(34, 197, 94, 0.2)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><CalendarDays size={18} color="#22c55e" /></div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '0 0 4px 0' }}>
                <h3 style={{ color: '#22c55e', fontSize: '1rem', margin: 0 }}>{n.title}</h3>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(n.timestamp).toLocaleDateString()}</span>
              </div>
              <p style={{ color: '#e2e8f0', fontSize: '0.85rem', margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>{n.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTrending = (
    <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0' }}>
        <Flame size={20} color="var(--primary)" />
        <h3 style={{ color: '#fff', fontSize: '1.1rem', margin: 0 }}>Trending Rewards</h3>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', flex: 1, alignContent: 'start' }}>
        {featuredItems.map((item, i) => {
          const imgSrc = item?.file?.startsWith('data:image') || item?.file?.startsWith('http') ? item.file : `./images/${item.categoryId || 'battlepass'}/${item.file}`; 
          return (
            <div key={i} style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '8px', border: '1px solid var(--border)', padding: '12px', textAlign: 'center', position: 'relative', display: 'flex', flexDirection: 'column' }}>
              <div style={{ width: '100%', height: '80px', backgroundColor: '#1a1a1a', borderRadius: '6px', overflow: 'hidden', margin: '0 0 10px 0' }}>
                <img src={imgSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={item.name} onError={(e) => { e.target.style.display = 'none' }} />
              </div>
              <h4 style={{ color: '#fff', fontSize: '0.85rem', margin: '0 0 4px 0', flex: 1 }}>{item.name}</h4>
              <span style={{ color: 'var(--primary)', fontWeight: '700', fontSize: '0.8rem', fontFamily: 'monospace' }}>{item.price} XP</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderTips = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
      <h3 style={{ color: '#fff', fontSize: '1.1rem', margin: '0', display: 'flex', alignItems: 'center', gap: '8px' }}><Zap size={20} color="#3b82f6" /> Quick Tips</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
        <div className="card" style={{ background: 'linear-gradient(to right, rgba(59, 130, 246, 0.1), rgba(0,0,0,0.6))', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1 }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Zap size={18} color="#3b82f6" /></div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '0 0 4px 0' }}><h3 style={{ color: '#3b82f6', fontSize: '1rem', margin: 0 }}>Level Up Faster</h3><span style={{ fontSize: '0.65rem', color: '#3b82f6', fontWeight: 'bold', letterSpacing: '0.5px', background: 'rgba(59, 130, 246, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>QUICK TIP</span></div>
            <p style={{ color: '#e2e8f0', fontSize: '0.85rem', margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>Keep your session active to accumulate XP. Remember, your lifetime XP dictates your tier, unlocking exclusive items in the Battle Pass section!</p>
          </div>
        </div>
        <div className="card" style={{ background: 'linear-gradient(to right, rgba(168, 85, 247, 0.1), rgba(0,0,0,0.6))', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1 }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Zap size={18} color="#a855f7" /></div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '0 0 4px 0' }}><h3 style={{ color: '#a855f7', fontSize: '1rem', margin: 0 }}>XP Multipliers</h3><span style={{ fontSize: '0.65rem', color: '#a855f7', fontWeight: 'bold', letterSpacing: '0.5px', background: 'rgba(168, 85, 247, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>QUICK TIP</span></div>
            <p style={{ color: '#e2e8f0', fontSize: '0.85rem', margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.4' }}>Play during late-night hours or on specific boost days to trigger automated XP multipliers. You can stack up your Wallet XP much faster!</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ paddingBottom: '40px' }}>
      <div style={{ width: '100%', height: '350px', position: 'relative', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 16px 40px rgba(0,0,0,0.5)', margin: '0 0 24px 0' }}>
        {slides.map((slide, index) => (
          <div key={slide.id} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 60px', background: slide.color, opacity: index === currentSlide ? 1 : 0, transition: 'opacity 0.8s ease-in-out', pointerEvents: index === currentSlide ? 'auto' : 'none' }}>
            {slide.icon}
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-1px', margin: '0 0 12px 0', maxWidth: '60%', textShadow: '0 4px 12px rgba(0,0,0,0.5)', zIndex: 1 }}>{slide.title}</h1>
            <p style={{ fontSize: '1.1rem', color: '#e2e8f0', maxWidth: '50%', lineHeight: 1.6, zIndex: 1 }}>{slide.desc}</p>
          </div>
        ))}
        <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '10px', zIndex: 10 }}>
          {slides.map((_, index) => (
            <div key={index} style={{ width: '10px', height: '10px', borderRadius: '50%', background: index === currentSlide ? '#fff' : 'rgba(255, 255, 255, 0.3)', transform: index === currentSlide ? 'scale(1.3)' : 'scale(1)', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: index === currentSlide ? '0 0 10px rgba(255, 255, 255, 0.5)' : 'none' }} onClick={() => setCurrentSlide(index)} />
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', margin: '0 0 24px 0' }}>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <Gamepad2 size={24} color="#0ea5e9" style={{ margin: '0 auto 8px auto' }} />
          <h3 style={{ color: '#fff', margin: '0 0 4px 0', fontSize: '0.95rem' }}>Active Session</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Your time is tracked. XP is accumulating in the background.</p>
        </div>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <Wallet size={24} color="var(--primary)" style={{ margin: '0 auto 8px auto' }} />
          <h3 style={{ color: '#fff', margin: '0 0 4px 0', fontSize: '0.95rem' }}>Claim Your XP</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Claim your live session XP to your wallet before logging out!</p>
        </div>
        <div className="card" style={{ padding: '16px', textAlign: 'center' }}>
          <ShoppingCart size={24} color="#22c55e" style={{ margin: '0 auto 8px auto' }} />
          <h3 style={{ color: '#fff', margin: '0 0 4px 0', fontSize: '0.95rem' }}>Browse the Shop</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>Head over to the shop to exchange XP for real cafe rewards.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'stretch' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {newsList?.length > 0 ? (
            <>
              {renderAnnouncements}
              {renderTrending}
            </>
          ) : (
            <>
              {renderTrending}
              {renderTips}
            </>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: 1 }}><LeaderboardWidget layout="vertical" /></div>
          <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: 1 }}><RecentActivityWidget /></div>
        </div>
      </div>
    </div>
  );
};

const TierGuideModal = ({ onClose, config }) => {
  const [page, setPage] = useState(1);
  const sXp = config?.silverXp || 2000;
  const gXp = config?.goldXp || 5000;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
        <div className="auth-card" style={{ position: 'relative' }}>
          <button className="close-modal" onClick={onClose}><X size={20}/></button>
          {page === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '10px 0' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '1px solid var(--border)' }}><Trophy size={28} color="var(--primary)" /></div>
              <h2 style={{ color: '#fff', fontSize: '1.3rem', marginBottom: '12px' }}>The 4G Tier System</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>Your account ranks up the more you play! Earning XP automatically increases your Lifetime Rank, unlocking exclusive rewards.</p>
            </div>
          )}
          {page === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '10px 0' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '1px solid var(--border)' }}><Wallet size={28} color="#cbd5e1" /></div>
              <h2 style={{ color: '#fff', fontSize: '1.3rem', marginBottom: '12px' }}>Spending vs Ranking</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>Don't worry about spending your points! Your Wallet XP is spent on items, but your Lifetime XP never goes down.</p>
            </div>
          )}
          {page === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '10px 0' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '1px solid var(--border)' }}><Lock size={28} color="#fbbf24" /></div>
              <h2 style={{ color: '#fff', fontSize: '1.3rem', marginBottom: '12px' }}>Rank Unlocks</h2>
              <div style={{ textAlign: 'left', width: '100%', marginTop: '10px', fontSize: '0.85rem' }}>
                <div style={{ marginBottom: '10px', color: '#b45309' }}>Bronze (0+ XP): Full access to Foods & Drinks.</div>
                <div style={{ marginBottom: '10px', color: '#cbd5e1' }}>Silver ({sXp.toLocaleString()}+ XP): Mid-tier gaming rewards.</div>
                <div style={{ color: '#fbbf24' }}>Gold ({gXp.toLocaleString()}+ XP): Unlocks premium Battle Pass items.</div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', margin: '20px 0' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: page === 1 ? 'var(--primary)' : 'rgba(255,255,255,0.2)', transition: 'all 0.3s', transform: page === 1 ? 'scale(1.2)' : 'none' }} />
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: page === 2 ? 'var(--primary)' : 'rgba(255,255,255,0.2)', transition: 'all 0.3s', transform: page === 2 ? 'scale(1.2)' : 'none' }} />
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: page === 3 ? 'var(--primary)' : 'rgba(255,255,255,0.2)', transition: 'all 0.3s', transform: page === 3 ? 'scale(1.2)' : 'none' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="button" className="claim-btn" style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)' }} onClick={() => page > 1 ? setPage(p => p - 1) : onClose()}>{page === 1 ? 'Close' : 'Back'}</button>
            {page < 3 ? <button type="button" className="claim-btn" style={{ flex: 1 }} onClick={() => setPage(p => p + 1)}>Next</button> : <button type="button" className="claim-btn" style={{ flex: 1 }} onClick={onClose}>Got it!</button>}
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductCard = ({ item, categoryId, totalXp, lifetimeXp, config, currentUser, onAddToCart, onLockedClick, isAdmin, onEdit, onDelete, onToggleStock, onToggleTopPick, topPicks }) => {
  const safePrice = item?.price || 1;
  const progress = Math.min(100, Math.floor((totalXp / safePrice) * 100));
  const canAfford = totalXp >= safePrice;
  const inStock = item?.inStock !== false;

  const requiredTier = item?.requiredTier && item.requiredTier !== 'none' && item.requiredTier !== 'bronze' ? item.requiredTier : null;
  let isTierLocked = false;
  
  if (currentUser && !isAdmin && requiredTier) {
    const userTier = getTier(lifetimeXp, config); 
    if (requiredTier === 'gold' && userTier.level !== 'Gold') isTierLocked = true;
    if (requiredTier === 'silver' && userTier.level === 'Bronze') isTierLocked = true;
  }

  const isBuyDisabled = (!inStock && !isTierLocked) || isAdmin; 
  const imgSrc = item?.file?.startsWith('data:image') || item?.file?.startsWith('http') ? item.file : `./images/${categoryId}/${item?.file || 'default.png'}`;
  const isTopPick = topPicks?.includes(item?.name);

  return (
    <div className="card" style={{ width: '180px', display: 'flex', flexDirection: 'column', gap: '8px', opacity: !inStock && !isAdmin ? 0.6 : 1 }}>
      {isTopPick && (
        <div style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', borderRadius: '12px', padding: '4px 8px', fontSize: '0.65rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', zIndex: 10, boxShadow: '0 4px 10px rgba(234, 88, 12, 0.5)' }}>
          <Flame size={12} /> TOP PICK
        </div>
      )}
      {isAdmin && (
        <div className="admin-card-controls" style={{ top: isTopPick ? '24px' : '8px' }}>
          <button className="admin-icon-btn" onClick={() => onToggleTopPick(item.name, isTopPick)} title={isTopPick ? "Remove from Top Picks" : "Add to Top Picks"}><Flame size={14} color={isTopPick ? "#f97316" : "#fff"} /></button>
          <button className="admin-icon-btn" onClick={() => onEdit('edit', categoryId, item)} title="Edit"><Edit size={14}/></button>
          <button className="admin-icon-btn" onClick={() => onDelete(categoryId, item.id)} title="Delete"><Trash2 size={14}/></button>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '4px', cursor: isAdmin ? 'pointer' : 'default' }} onClick={() => isAdmin && onToggleStock(categoryId, item.id, inStock)}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: inStock ? '#22c55e' : '#eab308', boxShadow: inStock ? '0 0 8px #22c55e' : '0 0 8px #eab308' }}></div>
        <span style={{ fontSize: '0.7rem', color: inStock ? '#22c55e' : '#eab308', fontWeight: '700', letterSpacing: '0.5px' }}>{inStock ? 'AVAILABLE' : 'OUT OF STOCK'}</span>
      </div>
      <div style={{ width: '100%', height: '110px', backgroundColor: '#1a1a1a', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
        {requiredTier && (
          <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', border: '1px solid rgba(251,191,36,0.3)', color: '#fbbf24', borderRadius: '4px', padding: '4px 6px', fontSize: '0.6rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px', zIndex: 5 }}><Lock size={10} /> REQUIRES {requiredTier.toUpperCase()}</div>
        )}
        <img src={imgSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={item?.name || 'Item'} onError={(e) => { e.target.style.display = 'none' }} />
      </div>
      <h3 style={{ fontSize: '0.85rem', color: '#ffffff', margin: '2px 0 0 0', textAlign: 'center' }}>{item?.name || 'Unknown'}</h3>
      <button 
        onClick={() => { if (isTierLocked) onLockedClick(); else onAddToCart(item.name, safePrice); }}
        disabled={isBuyDisabled}
        className={`claim-btn ${!currentUser ? 'product-btn-logged-out' : ''}`} 
        style={!currentUser ? { width: '100%', marginTop: '4px', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border)' } : { 
          width: '100%', marginTop: '4px', fontSize: '0.8rem', background: (canAfford) && !isTierLocked ? '' : `linear-gradient(to right, var(--primary) ${progress}%, #1a1a1a ${progress}%)`,
          border: (canAfford) && !isTierLocked ? 'none' : '1px solid #2a2a2a', opacity: ((canAfford) && inStock && !isTierLocked) ? 1 : 0.8,
          cursor: isBuyDisabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
        }}
      >
        {isAdmin ? 'ADMIN VIEW' : isTierLocked ? (<><Lock size={12}/> {safePrice} XP</>) : <><ShoppingCart size={14} /> {safePrice} XP</>}
      </button>
    </div>
  );
};

function AppContent() {
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); 
  const [totalXp, setTotalXp] = useState(0); 
  const [lifetimeXp, setLifetimeXp] = useState(0);
  
  const [sysConfig, setSysConfig] = useState({ 
    silverXp: 2000, goldXp: 5000, xpPerHour: 1800, 
    boostDays: { 0: false, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false },
    enableMidnightBoost: false, boostMultiplier: 2, autoBackupDaily: true
  });
  
  const sysConfigRef = useRef(sysConfig);
  useEffect(() => { sysConfigRef.current = sysConfig; }, [sysConfig]);

  const [newsList, setNewsList] = useState([]);
  const [topPicks, setTopPicks] = useState([]);
  const [cart, setCart] = useState([]);
  const [showCartModal, setShowCartModal] = useState(false);
  const [inventory, setInventory] = useState({ foods: {}, drinks: {}, battlepass: {}, ecoin: {} });

  const [isShopOpen, setIsShopOpen] = useState(false); 
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authView, setAuthView] = useState('login'); 
  const [authForm, setAuthForm] = useState({ name: '', username: '', password: '', newPassword: '' });

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showTierGuide, setShowTierGuide] = useState(false);
  const [editorModal, setEditorModal] = useState({ open: false, mode: 'add', category: '', item: null });
  const [editForm, setEditForm] = useState({ name: '', price: '', file: '', inStock: 'true', requiredTier: 'none' });
  const [deleteModal, setDeleteModal] = useState({ open: false, category: '', id: '', name: '' });

  const location = useLocation();
  const navigate = useNavigate(); 
  
  const isShopActive = location.pathname.startsWith('/shop');
  const isSettingsActive = location.pathname.startsWith('/settings');
  const isAdmin = currentUser?.isAdmin === true || currentUser?.isAdmin === 1 || currentUser?.username === 'admin';

  useEffect(() => {
    socket.on('connect', () => { setIsConnected(true); socket.emit('request_initial_data'); });
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('sync_inventory', (data) => setInventory(data || { foods: {}, drinks: {}, battlepass: {}, ecoin: {} }));
    socket.on('sync_news', (data) => setNewsList(Array.isArray(data) ? data : []));
    socket.on('sync_config', (data) => setSysConfig(data || sysConfigRef.current));
    socket.on('sync_top_picks', (data) => setTopPicks(Array.isArray(data) ? data : []));

    socket.on('login_success', (user) => {
      setCurrentUser(user); setTotalXp(user.xp); setLifetimeXp(user.lifetimeXp);
      setShowLoginModal(false); toast.success(`Welcome back, ${user.name}!`);
      if (user.isAdmin === true || user.isAdmin === 1 || user.username === 'admin') navigate('/dashboard');
    });

    socket.on('password_reset_success', (msg) => {
      toast.success(msg);
      setAuthView('login');
      setAuthForm({ name: '', username: '', password: '', newPassword: '' });
    });

    socket.on('login_error', (msg) => toast.error(msg));
    socket.on('xp_updated', (data) => { setTotalXp(data.xp); if (data.lifetimeXp !== undefined) setLifetimeXp(data.lifetimeXp); });
    socket.on('order_success', (msg) => { toast.success(msg, { duration: 5000 }); setCart([]); setShowCartModal(false); });
    socket.on('order_error', (msg) => toast.error(msg));

    socket.on('new_live_order', (orderData) => {
      if (currentUser?.isAdmin === true || currentUser?.isAdmin === 1 || currentUser?.username === 'admin') { toast(`New Order: @${orderData.username} wants ${orderData.item}!`, { icon: '🔔', style: { background: 'var(--primary)', color: '#fff', fontWeight: 'bold' }}); }
    });

    return () => {
      socket.off('connect'); socket.off('disconnect'); socket.off('sync_inventory'); socket.off('sync_news');
      socket.off('sync_config'); socket.off('sync_top_picks'); socket.off('login_success'); socket.off('login_error');
      socket.off('password_reset_success');
      socket.off('xp_updated'); socket.off('order_success'); socket.off('order_error'); socket.off('new_live_order');
    };
  }, [currentUser, navigate]);

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (!isConnected) { toast.error("Disconnected from server. Please wait."); return; }
    
    const safeUsername = authForm.username.trim().toLowerCase();
    if (safeUsername.includes(' ')) { toast.error("Username cannot contain spaces."); return; }
    
    if (authView === 'login') {
      if (!safeUsername || !authForm.password) return toast.error("Please fill all fields.");
      socket.emit('login', { username: safeUsername, password: authForm.password });
    } else if (authView === 'register') {
      if (!safeUsername || !authForm.password || !authForm.name) return toast.error("Please fill all fields.");
      if (authForm.password.length < 6) return toast.error("Password must be at least 6 characters.");
      socket.emit('register', { username: safeUsername, password: authForm.password, name: authForm.name });
    } else if (authView === 'forgot') {
      if (!safeUsername || !authForm.name) return toast.error("Please fill all fields.");
      socket.emit('reset_forgot_password', { username: safeUsername, name: authForm.name, newPassword: '123' });
    }
  };

  const handleLogout = () => {
    socket.emit('logout', currentUser.username);
    setCurrentUser(null); setTotalXp(0); setLifetimeXp(0); setCart([]); setShowUserMenu(false);
    toast.success("Logged out successfully."); navigate('/');
  };

  const openLoginModal = () => { setAuthView('login'); setAuthForm({ name: '', username: '', password: '', newPassword: '' }); setShowLoginModal(true); };
  const claimXp = (amount) => { if (!currentUser) return; socket.emit('claim_xp', { username: currentUser.username, amount }); toast.success(`Claimed ${amount} XP!`); };

  const handleAddToCart = (item, price) => {
    if (!currentUser) { openLoginModal(); return; }
    setCart(prev => {
      const existing = prev.find(c => c.item === item);
      if (existing) return prev.map(c => c.item === item ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { item, price, quantity: 1, id: Date.now() + Math.random() }];
    });
    toast.success(`${item} added to cart!`);
  };

  const handleRemoveFromCart = (id) => setCart(prev => prev.filter(c => c.id !== id));

  const handleCheckout = () => {
    if (!currentUser || cart.length === 0) return;
    const cartTotal = cart.reduce((sum, current) => sum + (current.price * current.quantity), 0);
    if (totalXp >= cartTotal) { socket.emit('place_order', { username: currentUser.username, cartTotal, items: cart }); } 
    else { toast.error(`Not enough XP! Need ${cartTotal - totalXp} more.`); }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400; const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH; canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setEditForm({ ...editForm, file: compressedBase64 });
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProduct = (e) => {
    e.preventDefault();
    if (!editForm.file) { toast.error("Please upload an image."); return; }
    const cat = editorModal.category;
    let targetId = editorModal.mode === 'edit' ? editorModal.item?.id : `prod_${Date.now()}`;
    const productData = { id: targetId, name: editForm.name, price: parseInt(editForm.price), file: editForm.file, inStock: editForm.inStock === 'true', requiredTier: editForm.requiredTier || 'none' };
    socket.emit('admin_save_product', { category: cat, targetId, productData });
    setEditorModal({ open: false, mode: 'add', category: '', item: null });
  };

  const requestDelete = (cat, id) => setDeleteModal({ open: true, category: cat, id, name: inventory[cat][id]?.name || 'Unknown' });
  const confirmDelete = () => { socket.emit('admin_delete_product', { category: deleteModal.category, targetId: deleteModal.id }); setDeleteModal({ open: false, category: '', id: '', name: '' }); };
  const toggleStock = (cat, id, currentStock) => { socket.emit('admin_toggle_stock', { category: cat, targetId: id, currentStock: !currentStock }); };
  const toggleTopPick = (name, isCurrentlyTopPick) => { socket.emit('admin_toggle_top_pick', { name, isTopPick: isCurrentlyTopPick }); };

  const openEditor = (mode, cat, item = null) => {
    setEditorModal({ open: true, mode, category: cat, item });
    if(mode === 'edit') setEditForm({ ...item, inStock: item?.inStock !== false ? 'true' : 'false', requiredTier: item?.requiredTier || 'none' });
    else setEditForm({ name: '', price: '', file: '', inStock: 'true', requiredTier: 'none' });
  };

  const renderCategoryPage = (title, desc, catKey) => (
    <>
      <div style={{ position: 'relative', textAlign: 'center', marginBottom: '24px' }}>
        <h1 className="page-title" style={{ fontSize: '1.5rem' }}>{title}</h1>
        <p className="page-desc" style={{ margin: 0, fontSize: '0.85rem' }}>{desc}</p>
        {isAdmin && <button className="claim-btn" style={{ position: 'absolute', right: '0', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '8px', alignItems: 'center' }} onClick={() => openEditor('add', catKey)}><Plus size={16}/> Add New</button>}
      </div>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {Object.values(inventory[catKey] || {}).map(item => (
          <ProductCard key={item.id} item={item} totalXp={totalXp} lifetimeXp={lifetimeXp} config={sysConfig} currentUser={currentUser} onAddToCart={handleAddToCart} onLockedClick={() => setShowTierGuide(true)} categoryId={catKey} isAdmin={isAdmin} onEdit={openEditor} onDelete={requestDelete} onToggleStock={toggleStock} onToggleTopPick={toggleTopPick} topPicks={topPicks} />
        ))}
      </div>
    </>
  );

  const cartTotal = cart.reduce((sum, current) => sum + (current.price * current.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="app-container" onClick={() => showUserMenu && setShowUserMenu(false)}>
      <Toaster position="bottom-right" toastOptions={{ style: { background: 'var(--bg-elevated)', color: '#fff', border: '1px solid var(--border)', fontSize: '13px', borderRadius: '8px' }, success: { iconTheme: { primary: 'var(--primary)', secondary: '#ffffff' } }, error: { iconTheme: { primary: '#ef4444', secondary: '#ffffff' } } }} />

      {!isConnected && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', background: 'rgba(239, 68, 68, 0.95)', backdropFilter: 'blur(10px)', color: '#fff', textAlign: 'center', padding: '12px', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>DISCONNECTED FROM SERVER</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
             <span style={{ fontSize: '0.8rem' }}>Server IP/Port:</span>
             <input 
               type="text" 
               id="server-ip-input"
               defaultValue={localStorage.getItem('4g_server_ip') || 'localhost:3000'}
               style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', color: '#000', fontSize: '0.8rem' }}
             />
             <button onClick={() => changeServerIP(document.getElementById('server-ip-input').value)} style={{ padding: '4px 12px', background: '#000', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>Connect</button>
          </div>
        </div>
      )}

      {showTierGuide && <TierGuideModal config={sysConfig} onClose={() => setShowTierGuide(false)} />}
      
      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="auth-card" style={{ maxWidth: '100%', position: 'relative' }}>
              <button className="close-modal" onClick={() => setShowLoginModal(false)}><X size={20}/></button>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}><img src="./images/logo/logo2.png" alt="Logo" style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px' }} /></div>
              
              <h2 style={{ textAlign: 'center', marginBottom: '24px', fontSize: '1.5rem', color: '#fff' }}>
                {authView === 'login' ? 'Sign In' : authView === 'register' ? 'Create Account' : 'Reset Password'}
              </h2>
              
              <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {authView !== 'login' && (
                  <div className="sleek-input-container">
                    <input type="text" placeholder={authView === 'forgot' ? "Full Name (for verification)" : "Full Name"} className="sleek-input" required value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} />
                    <BadgeCheck size={16} className="sleek-icon" />
                  </div>
                )}
                <div className="sleek-input-container">
                  <input type="text" placeholder="Username" className="sleek-input" required value={authForm.username} onChange={e => setAuthForm({...authForm, username: e.target.value})} />
                  <User size={16} className="sleek-icon" />
                </div>
                {authView !== 'forgot' && (
                  <div className="sleek-input-container">
                    <input type="password" placeholder="Password" className="sleek-input" required value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
                    <Lock size={16} className="sleek-icon" />
                  </div>
                )}

                {authView === 'forgot' && (
                  <p style={{ color: '#e2e8f0', fontSize: '0.85rem', textAlign: 'center', margin: '4px 0' }}>
                    If verified, your password will be reset to the default: <strong style={{color: '#fff'}}>123</strong>
                  </p>
                )}

                <button type="submit" className="claim-btn" style={{ padding: '12px', marginTop: '10px' }}>
                  {authView === 'login' ? 'Sign In' : authView === 'register' ? 'Sign Up' : 'Reset to Default (123)'}
                </button>
              </form>

              <div style={{ marginTop: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {authView === 'login' && (
                  <>
                    <button type="button" onClick={() => setAuthView('forgot')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}>Forgot Password?</button>
                    <div>
                      <span style={{ color: '#52525b', fontSize: '0.85rem' }}>Don't have an account? </span>
                      <button type="button" onClick={() => setAuthView('register')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}>Register here</button>
                    </div>
                  </>
                )}
                {authView !== 'login' && (
                  <div>
                    <span style={{ color: '#52525b', fontSize: '0.85rem' }}>Remembered your password? </span>
                    <button type="button" onClick={() => setAuthView('login')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '600', cursor: 'pointer', fontSize: '0.85rem' }}>Sign in</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showCartModal && (
        <div className="modal-overlay" onClick={() => setShowCartModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="auth-card" style={{ position: 'relative' }}>
              <button className="close-modal" onClick={() => setShowCartModal(false)}><X size={20}/></button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <ShoppingCart size={24} color="var(--primary)" />
                <h2 style={{ color: '#fff', fontSize: '1.3rem', margin: 0 }}>Your Cart</h2>
              </div>
              {cart.length === 0 ? (<div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Your cart is currently empty.</div>) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', paddingRight: '8px' }} className="custom-scrollbar">
                    {cart.map((cartItem) => (
                      <div key={cartItem.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <span style={{ color: '#fff', fontSize: '0.9rem' }}>{cartItem.quantity > 1 && <span style={{ color: 'var(--primary)', fontWeight: 'bold', marginRight: '6px' }}>{cartItem.quantity}x</span>}{cartItem.item}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.85rem' }}>{cartItem.price * cartItem.quantity} XP</span>
                          <button className="admin-icon-btn" onClick={() => handleRemoveFromCart(cartItem.id)}><X size={16} color="#ef4444" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ height: '1px', background: 'var(--border)', margin: '20px 0' }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}><span style={{ color: 'var(--text-muted)' }}>Total Cost:</span><span style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}>{cartTotal} XP</span></div>
                  <button className="claim-btn" style={{ width: '100%', padding: '12px', display: 'flex', justifyContent: 'center', gap: '8px' }} onClick={handleCheckout} disabled={totalXp < cartTotal}><CheckCircle size={18} /> {totalXp >= cartTotal ? 'Place Order' : 'Not Enough XP'}</button>
                </>
              )}
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
                <div className="sleek-input-container"><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Product Name:</span><input type="text" className="sleek-input" required value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} /></div>
                <div className="sleek-input-container"><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Price (XP):</span><input type="number" className="sleek-input" required value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})} /></div>
                
                <div className="sleek-input-container">
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tier Requirement:</span>
                  <select className="sleek-input" style={{ appearance: 'none', cursor: 'pointer' }} value={editForm.requiredTier || 'none'} onChange={e => setEditForm({...editForm, requiredTier: e.target.value})}>
                    <option value="none">None (Bronze+)</option>
                    <option value="silver">Silver Tier</option>
                    <option value="gold">Gold Tier</option>
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: '14px', top: '38px', color: 'var(--text-muted)' }} />
                </div>
                
                <div className="sleek-input-container">
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Stock Status:</span>
                  <select className="sleek-input" style={{ appearance: 'none', cursor: 'pointer' }} value={editForm.inStock} onChange={e => setEditForm({...editForm, inStock: e.target.value})}>
                    <option value="true">Available (In Stock)</option>
                    <option value="false">Out of Stock</option>
                  </select>
                  <ChevronDown size={14} style={{ position: 'absolute', right: '14px', top: '38px', color: 'var(--text-muted)' }} />
                </div>

                <div className="sleek-input-container"><span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Upload Image:</span><input type="file" accept="image/*" className="file-upload-input" onChange={handleImageUpload} /></div>
                <button type="submit" className="claim-btn" style={{ padding: '12px', marginTop: '10px' }}>Save Product</button>
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
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>Are you sure you want to delete <strong style={{color: '#fff'}}>{deleteModal.name}</strong>? This action cannot be undone.</p>
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
          
          <NavLink to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} style={{ marginBottom: '8px' }}><Home size={16} /> Home</NavLink>

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
              <NavLink to="/shop/ecoin" className="nav-link sub-link"><Coins size={14} /> E-Coin</NavLink>
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
            {currentUser && (<div className="nav-link" onClick={handleLogout} style={{ cursor: 'pointer', color: '#ff5252' }}><LogOut size={16} /> Log Out</div>)}
          </div>
        </div>
      </div>

      <div className="main-area">
        <div className="topbar">
          <LiveXpHud currentUser={currentUser} sysConfig={sysConfigRef.current} onClaimXp={claimXp} />
          
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {!isAdmin && (
                <div style={{ position: 'relative', marginRight: '16px' }}>
                  <button className="admin-icon-btn" onClick={(e) => { e.stopPropagation(); setShowCartModal(true); setShowUserMenu(false); }} style={{ borderRadius: '50%', width: '42px', height: '42px', padding: '0', position: 'relative' }}>
                    <ShoppingCart size={20} />
                    {cartItemCount > 0 && (<span style={{ position: 'absolute', top: '-2px', right: '-2px', background: '#ef4444', color: '#fff', fontSize: '0.65rem', fontWeight: 'bold', width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cartItemCount}</span>)}
                  </button>
                </div>
              )}

              <div style={{ position: 'relative' }}>
                <button className="admin-icon-btn" onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); setShowCartModal(false); }} style={{ borderRadius: '50%', width: '42px', height: '42px', padding: '0' }}>
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
                            <div className="progress-bar-fill" style={{ width: `${getTierProgress(lifetimeXp, sysConfig).percentage}%`, background: getTierProgress(lifetimeXp, sysConfig).color, boxShadow: `0 0 10px ${getTierProgress(lifetimeXp, sysConfig).color}`}}></div>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="drop-divider" style={{ marginTop: '16px' }}></div>
                    <button className="claim-btn" style={{ width: '100%', background: 'rgba(255, 255, 255, 0.05)', color: '#fff', border: '1px solid var(--border)', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => { navigate('/account'); setShowUserMenu(false); }}>
                      <Settings size={14} /> Account Settings
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button className="claim-btn" onClick={openLoginModal} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', fontSize: '0.8rem' }}>
              <User size={16} /> Sign In
            </button>
          )}
        </div>

        <div className="page-content" onClick={() => showUserMenu && setShowUserMenu(false)}>
          <Routes>
            <Route path="/" element={<HomeDashboard inventory={inventory} newsList={newsList} topPicks={topPicks} />} />
            
            <Route path="/shop/foods" element={renderCategoryPage("Foods", "Exchange your XP for snacks.", "foods")} />
            <Route path="/shop/drinks" element={renderCategoryPage("Drinks", "Grab a cold drink to keep grinding.", "drinks")} />
            <Route path="/shop/ecoin" element={renderCategoryPage("E-Coin", "Exchange your Wallet XP to redeem E-Coins.", "ecoin")} />
            <Route path="/battlepass" element={renderCategoryPage("Battle Pass", "Reach tier requirements by playing to unlock and redeem exclusive rewards.", "battlepass")} />
            
            <Route path="/history" element={!isAdmin && currentUser ? <PurchaseHistory currentUser={currentUser} /> : <h1 className="page-title" style={{ textAlign: 'center', fontSize: '1.5rem' }}>Access Denied.</h1>} />
            <Route path="/account" element={currentUser ? <AccountSettings currentUser={currentUser} /> : <h1 className="page-title" style={{ textAlign: 'center', fontSize: '1.5rem' }}>Please log in.</h1>} />
            
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