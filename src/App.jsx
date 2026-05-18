import { useState, useEffect } from 'react';
import axios from 'axios';
import { initializeApp } from 'firebase/app';
import { getAuth, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, updateProfile, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD3jb0_t9P16ZsU5W6ZauOB3YGbmVb_A90",
  authDomain: "inventory-ai-system.firebaseapp.com",
  projectId: "inventory-ai-system",
  storageBucket: "inventory-ai-system.firebasestorage.app",
  messagingSenderId: "493688869433",
  appId: "1:493688869433:web:34c8314bda7c4a3acd33e8",
  measurementId: "G-TXYJ0EF7FV"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

function App() {
  // --- Auth State ---
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [showAuthPortal, setShowAuthPortal] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // --- E-Commerce State ---
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [selectedQty, setSelectedQty] = useState({});
  const [isSuccess, setIsSuccess] = useState(false);

  // --- UI Layout State ---
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (user) setShowAuthPortal(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("success")) setIsSuccess(true);
    
    const fetchProducts = async () => {
      try {
        const response = await axios.get('https://zando-api-live.onrender.com/api/products');
        setProducts(response.data);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Prevent background scrolling when drawers are open
  useEffect(() => {
    if (isCartOpen || isMobileMenuOpen || showAuthPortal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isCartOpen, isMobileMenuOpen, showAuthPortal]);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isRegistering) {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        if (fullName) {
          await updateProfile(result.user, { displayName: fullName });
          setCurrentUser({ ...result.user, displayName: fullName });
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setEmail(''); setPassword(''); setFullName('');
    } catch (err) {
      setAuthError(err.message.replace('Firebase: ', ''));
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(err.message.replace('Firebase: ', ''));
    }
  };

  const addToCart = (product) => {
    const qtyToAdd = parseInt(selectedQty[product.sku]) || 1;
    const existingItem = cart.find(item => item.sku === product.sku);
    const currentCartQty = existingItem ? existingItem.quantity : 0;

    if (currentCartQty + qtyToAdd > product.stock) {
      alert(`Notice: Only ${product.stock} items available in stock.`);
      return;
    }

    if (existingItem) {
      setCart(cart.map(item => item.sku === product.sku ? { ...item, quantity: item.quantity + qtyToAdd } : item));
    } else {
      setCart([...cart, { sku: product.sku, name: product.name, price: product.price, quantity: qtyToAdd, image_url: product.image_url }]);
    }
    setSelectedQty(prev => ({ ...prev, [product.sku]: '' }));
    setIsCartOpen(true); // Open cart automatically when adding
  };

  const removeFromCart = (sku) => {
    const existingItem = cart.find(item => item.sku === sku);
    if (existingItem.quantity === 1) {
      setCart(cart.filter(item => item.sku !== sku));
    } else {
      setCart(cart.map(item => item.sku === sku ? { ...item, quantity: item.quantity - 1 } : item));
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!currentUser) { 
      setIsCartOpen(false);
      setShowAuthPortal(true); 
      return; 
    }
    setCheckoutLoading(true);
    try {
      const response = await axios.post('https://zando-api-live.onrender.com/api/orders/checkout', {
        customer_email: currentUser.email || "google_user@local", 
        items: cart
      });
      window.location.href = response.data.checkout_url;
    } catch (error) {
      alert("Checkout failed. Please try again or contact support.");
      setCheckoutLoading(false);
    }
  };

  const clearSuccess = () => {
    window.history.replaceState({}, document.title, "/");
    setIsSuccess(false);
    setCart([]); 
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const categories = ['WOMEN', 'MEN', 'KIDS', 'BEAUTY', 'HOME', 'SALE'];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
      </div>
    );
  }

  /* --- AUTH PORTAL OVERLAY --- */
  if (showAuthPortal && !currentUser) {
    return (
      <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <div className="absolute top-6 left-6 cursor-pointer" onClick={() => setShowAuthPortal(false)}>
          <svg className="w-6 h-6 hover:text-red-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        </div>
        
        <div className="w-full max-w-[400px]">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black tracking-tighter mb-2">ZANDO</h1>
            <p className="text-gray-500 text-sm">{isRegistering ? 'Create your account' : 'Sign in to your account'}</p>
          </div>
          
          <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
            {isRegistering && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">FULL NAME</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required 
                  className="w-full border border-gray-300 px-4 py-3 text-sm focus:border-black outline-none transition-all" />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">EMAIL ADDRESS</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required 
                className="w-full border border-gray-300 px-4 py-3 text-sm focus:border-black outline-none transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">PASSWORD</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required 
                className="w-full border border-gray-300 px-4 py-3 text-sm focus:border-black outline-none transition-all" />
            </div>
            
            {authError && <div className="text-red-600 text-xs mt-1 text-center font-medium">{authError}</div>}
            
            <button type="submit" className="w-full bg-black text-white font-bold py-4 hover:bg-gray-800 transition-colors mt-2 text-sm uppercase tracking-wider">
              {isRegistering ? 'CREATE ACCOUNT' : 'SIGN IN'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => setIsRegistering(!isRegistering)} className="text-sm font-medium text-gray-600 hover:text-black transition-colors underline">
              {isRegistering ? 'Already have an account? Sign In' : 'New customer? Create an account'}
            </button>
          </div>
          
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-4 bg-white text-gray-500 text-xs font-bold">OR CONTINUE WITH</span></div>
          </div>

          <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-black font-bold py-3 hover:bg-gray-50 transition-colors text-sm">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Google
          </button>
        </div>
      </div>
    );
  }

  /* --- SUCCESS PORTAL --- */
  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gray-50">
        <div className="bg-white border border-gray-200 p-10 sm:p-16 max-w-lg w-full rounded-lg shadow-2xl">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h1 className="text-3xl font-black mb-3">Order Confirmed</h1>
          <p className="text-gray-500 text-sm mb-8">Thank you for shopping. Your receipt has been emailed.</p>
          <button onClick={clearSuccess} className="w-full bg-black text-white text-sm py-4 font-bold uppercase hover:bg-gray-800 transition-colors">
            CONTINUE SHOPPING
          </button>
        </div>
      </div>
    );
  }

  /* --- MAIN APP LAYOUT --- */
  return (
    <div className="w-full min-h-screen bg-white">
      
      {/* 🔴 PROMO TOP BAR */}
      <div className="bg-red-600 text-white py-2 px-4 text-center text-xs font-bold tracking-widest uppercase">
        FREE DELIVERY ON ORDERS OVER $50
      </div>

      {/* 🔴 NAVIGATION HEADER */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          
          {/* Mobile Menu Button */}
          <button className="md:hidden p-2 -ml-2 text-gray-900" onClick={() => setIsMobileMenuOpen(true)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>

          {/* Logo */}
          <div className="flex-shrink-0">
            <h1 className="text-2xl sm:text-4xl font-black tracking-tighter">ZANDO</h1>
          </div>
          
          {/* Desktop Categories */}
          <div className="hidden md:flex flex-1 justify-center gap-8 text-sm font-bold tracking-wider text-gray-800">
            {categories.map((cat, i) => (
              <a key={i} href="#" className={`hover:text-red-600 transition-colors ${cat === 'SALE' ? 'text-red-600' : ''}`}>{cat}</a>
            ))}
          </div>

          {/* Right Actions (Search, Account, Cart) */}
          <div className="flex items-center gap-3 sm:gap-6">
            <button className="hidden sm:block text-gray-900 hover:text-gray-500 transition-colors">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </button>

            {currentUser ? (
              <div className="hidden sm:flex flex-col items-end group relative cursor-pointer">
                <span className="text-[10px] text-gray-500 font-bold uppercase">Account</span>
                <span className="text-sm font-bold text-gray-900 truncate max-w-[100px]">{currentUser.displayName || 'User'}</span>
                <div className="absolute top-full right-0 mt-2 w-32 bg-white border border-gray-200 shadow-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <button onClick={() => signOut(auth)} className="w-full text-left px-4 py-2 text-sm text-red-600 font-bold hover:bg-gray-50">Log Out</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAuthPortal(true)} className="hidden sm:block text-sm font-bold text-gray-900 hover:text-red-600 transition-colors">
                SIGN IN
              </button>
            )}
            
            <div className="h-6 w-px bg-gray-200 hidden sm:block"></div>
            
            {/* Cart Trigger */}
            <button onClick={() => setIsCartOpen(true)} className="relative flex items-center p-2 -mr-2 text-gray-900 hover:text-gray-500 transition-colors">
               <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
               {cart.length > 0 && <span className="absolute 0 right-0 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 min-w-[18px] text-center rounded-full border-2 border-white">{cart.length}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* 🔴 SLIDE-OUT MOBILE MENU */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}
      <div className={`fixed top-0 left-0 h-full w-[85%] max-w-[320px] bg-white z-[70] shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h2 className="text-xl font-black tracking-tighter">ZANDO</h2>
          <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-gray-500 hover:text-black">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          <div className="p-4 bg-gray-50 mb-4">
            {currentUser ? (
               <div>
                 <p className="text-xs text-gray-500 font-bold mb-1 uppercase">Signed in as</p>
                 <p className="font-bold text-lg mb-3 truncate">{currentUser.email}</p>
                 <button onClick={() => {signOut(auth); setIsMobileMenuOpen(false);}} className="text-sm font-bold text-red-600">LOGOUT</button>
               </div>
            ) : (
               <button onClick={() => {setIsMobileMenuOpen(false); setShowAuthPortal(true);}} className="w-full bg-black text-white font-bold py-3 uppercase text-sm tracking-wider">Sign In / Register</button>
            )}
          </div>
          <ul className="flex flex-col">
            {categories.map((cat, i) => (
              <li key={i} className="border-b border-gray-100">
                <a href="#" className={`block p-4 font-bold text-lg ${cat === 'SALE' ? 'text-red-600' : 'text-gray-900'}`}>{cat}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 🔴 SLIDE-OUT SHOPPING CART */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
      )}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[450px] bg-white z-[70] shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Cart Header */}
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-xl font-black">YOUR BAG ({cart.length})</h2>
          <button onClick={() => setIsCartOpen(false)} className="p-2 text-gray-500 hover:text-black">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <svg className="w-12 h-12 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
              <p className="font-bold text-lg text-gray-900 mb-2">Your bag is empty.</p>
              <button onClick={() => setIsCartOpen(false)} className="mt-4 text-sm font-bold border-b border-black pb-1 text-black">START SHOPPING</button>
            </div>
          ) : (
            <div className="space-y-6">
              {cart.map((item, index) => (
                <div key={index} className="flex gap-4 bg-white p-3 border border-gray-200 relative shadow-sm">
                  <div className="w-24 h-32 bg-gray-100 flex-shrink-0">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs font-bold">NO IMG</div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col pt-1 pr-6">
                    <p className="text-sm font-bold text-gray-900 leading-tight mb-1">{item.name}</p>
                    <p className="text-xs text-gray-500 mb-2">SKU: {item.sku}</p>
                    
                    <div className="mt-auto flex justify-between items-center">
                      <p className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded">QTY: {item.quantity}</p>
                      <p className="text-base font-black text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                  <button onClick={() => removeFromCart(item.sku)} className="absolute top-3 right-3 text-gray-400 hover:text-red-600 p-1 bg-white rounded-full transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Footer / Checkout */}
        {cart.length > 0 && (
          <div className="p-4 sm:p-6 border-t border-gray-200 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-end mb-4">
              <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Subtotal</span>
              <span className="text-2xl font-black text-gray-900">${cartTotal.toFixed(2)}</span>
            </div>
            <p className="text-xs text-gray-500 mb-4">Shipping and taxes calculated at checkout.</p>
            <button 
              onClick={handleCheckout} disabled={checkoutLoading}
              className="w-full bg-black text-white text-base py-4 font-black tracking-widest hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {checkoutLoading ? 'PROCESSING...' : 'SECURE CHECKOUT'}
            </button>
          </div>
        )}
      </div>

      {/* 🔴 PROMO BANNER */}
      <div className="w-full bg-gray-100 h-[200px] sm:h-[300px] flex items-center justify-center bg-cover bg-center border-b border-gray-200 relative overflow-hidden">
        {/* Background Image Setup */}
        <div className="absolute inset-0 z-0 bg-[url('https://images.unsplash.com/photo-1445205170230-053b83016050?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center opacity-60"></div>
        <div className="relative z-10 text-center px-4">
          <h2 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tighter mb-2">NEW ARRIVALS</h2>
          <p className="text-sm sm:text-lg font-medium text-gray-800 bg-white/80 inline-block px-4 py-1">Shop the latest trends of 2026.</p>
        </div>
      </div>

      {/* 🔴 MAIN PRODUCT GRID (FULL WIDTH) */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        
        {/* Tools */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight uppercase">Trending Now <span className="text-gray-400 text-sm ml-2 font-medium">({products.length})</span></h2>
          <select className="bg-white border border-gray-300 text-sm font-bold text-gray-700 px-4 py-2 w-full sm:w-auto outline-none cursor-pointer focus:border-black">
            <option>Recommended</option>
            <option>Newest Arrivals</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
          </select>
        </div>

        {/* Loading / Empty States */}
        {loading ? (
          <div className="w-full py-32 flex flex-col items-center justify-center text-gray-400">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin mb-4"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="w-full py-32 text-center text-gray-500 font-bold text-lg bg-gray-50 border border-gray-200">
            Vault is empty. Check back later.
          </div>
        ) : (
          
          /* Perfectly Responsive Grid: 2 cols on mobile, 3 tablet, 4 desktop, 5 wide */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-6">
            {products.map((product) => (
              <div key={product.sku} className="group flex flex-col bg-white border border-transparent hover:border-gray-200 hover:shadow-xl transition-all duration-300">
                
                {/* Image Container - Fashion Aspect Ratio */}
                <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
                  
                  {/* Badges */}
                  {product.stock <= 0 ? (
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-black text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 uppercase z-10">
                      Sold Out
                    </div>
                  ) : (product.stock > 0 && product.stock < 5) ? (
                    <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-red-600 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 uppercase z-10">
                      Low Stock
                    </div>
                  ) : product.price < 50 ? (
                     <div className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-red-600 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-1 uppercase z-10">
                      Sale
                    </div>
                  ) : null}

                  {/* Favorite Icon */}
                  <button className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1.5 sm:p-2 bg-white rounded-full text-gray-400 hover:text-red-600 shadow-sm z-10 transition-colors">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                  </button>

                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold text-xs tracking-widest">NO IMAGE</div>
                  )}
                  
                  {/* Quick Add overlay (Hidden on mobile touch, visible on desktop hover) */}
                  <div className="absolute bottom-0 left-0 w-full p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300 hidden md:block z-20">
                    <button 
                      onClick={() => addToCart(product)} disabled={product.stock <= 0}
                      className="w-full bg-black/90 backdrop-blur text-white font-bold text-xs py-3 uppercase tracking-wider hover:bg-red-600 transition-colors disabled:opacity-0"
                    >
                      Quick Add
                    </button>
                  </div>
                </div>

                {/* Details Container */}
                <div className="p-3 sm:p-4 flex flex-col flex-1">
                  <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{product.category || 'ZANDO'}</span>
                  
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-900 leading-snug line-clamp-2 mb-2 group-hover:underline cursor-pointer">
                    {product.name}
                  </h3>
                  
                  <div className="mt-auto flex items-baseline gap-2">
                    <span className={`text-sm sm:text-base font-black ${product.price < 50 ? 'text-red-600' : 'text-gray-900'}`}>
                      ${product.price.toFixed(2)}
                    </span>
                    {product.price < 50 && (
                      <span className="text-[10px] sm:text-xs text-gray-400 line-through">${(product.price * 1.3).toFixed(2)}</span>
                    )}
                  </div>

                  {/* Mobile Add to Cart (Visible on small screens, hidden on desktop since desktop has hover button) */}
                  <div className="md:hidden mt-3 flex border border-gray-200">
                     <select 
                        className="w-12 bg-gray-50 text-xs font-bold text-center border-r border-gray-200 outline-none"
                        value={selectedQty[product.sku] || '1'}
                        onChange={(e) => setSelectedQty(prev => ({ ...prev, [product.sku]: parseInt(e.target.value) }))}
                        disabled={product.stock <= 0}
                      >
                        {[...Array(Math.min(5, Math.max(1, product.stock || 1))).keys()].map(n => (
                          <option key={n+1} value={n+1}>{n+1}</option>
                        ))}
                      </select>
                     <button 
                        onClick={() => addToCart(product)} disabled={product.stock <= 0}
                        className="flex-1 bg-white text-black font-bold text-[10px] py-2 uppercase hover:bg-gray-100 disabled:opacity-50"
                      >
                        {product.stock > 0 ? 'Add' : 'Out'}
                      </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </main>

      {/* 🔴 PROFESSIONAL FOOTER */}
      <footer className="bg-white border-t border-gray-200 mt-10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-8">
          
          <div>
            <h4 className="text-black font-black text-2xl tracking-tighter mb-4">ZANDO</h4>
            <p className="text-gray-500 text-xs sm:text-sm mb-6 leading-relaxed">The ultimate destination for fashion, offering an exclusive edit of clothing, shoes and accessories.</p>
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-black hover:bg-red-600 hover:text-white transition-colors cursor-pointer"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg></div>
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-black hover:bg-red-600 hover:text-white transition-colors cursor-pointer"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg></div>
            </div>
          </div>

          <div>
            <h4 className="text-gray-900 font-bold text-xs tracking-widest mb-5 uppercase">Customer Service</h4>
            <ul className="space-y-3 text-sm text-gray-500 font-medium">
              <li><a href="#" className="hover:text-black transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-black transition-colors">Track Order</a></li>
              <li><a href="#" className="hover:text-black transition-colors">Returns & Refunds</a></li>
              <li><a href="#" className="hover:text-black transition-colors">Shipping Info</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-gray-900 font-bold text-xs tracking-widest mb-5 uppercase">About Zando</h4>
            <ul className="space-y-3 text-sm text-gray-500 font-medium">
              <li><a href="#" className="hover:text-black transition-colors">Our Story</a></li>
              <li><a href="#" className="hover:text-black transition-colors">Careers</a></li>
              <li><a href="#" className="hover:text-black transition-colors">Terms & Conditions</a></li>
              <li><a href="#" className="hover:text-black transition-colors">Privacy Policy</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-gray-900 font-bold text-xs tracking-widest mb-5 uppercase">Join Our Newsletter</h4>
            <p className="text-gray-500 text-sm mb-4 font-medium">Get exclusive offers and news delivered to your inbox.</p>
            <div className="flex">
              <input type="email" placeholder="Email Address" className="w-full bg-gray-50 border border-gray-300 text-sm px-4 py-3 outline-none focus:border-black focus:bg-white transition-colors" />
              <button className="bg-black text-white px-5 py-3 text-xs font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors">Join</button>
            </div>
          </div>

        </div>

        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 mt-4 pt-8 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-xs font-bold tracking-widest">© 2026 ZANDO COMMERCE. ALL RIGHTS RESERVED.</p>
          <div className="flex gap-2">
            <div className="w-12 h-8 bg-gray-100 rounded border border-gray-200"></div>
            <div className="w-12 h-8 bg-gray-100 rounded border border-gray-200"></div>
            <div className="w-12 h-8 bg-gray-100 rounded border border-gray-200"></div>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;