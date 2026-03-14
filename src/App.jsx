import { useState, useEffect } from 'react';
import axios from 'axios';
import { initializeApp } from 'firebase/app';
// 👇 Removed all the complicated Phone/SMS tools, kept only Email & Google!
import { getAuth, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, updateProfile, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

// 🔥 FIREBASE CONFIGURATION 🔥
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
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [showAuthPortal, setShowAuthPortal] = useState(false);

  // --- Auth UI States ---
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [selectedQty, setSelectedQty] = useState({});
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (user) {
        setShowAuthPortal(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    if (query.get("success")) {
      setIsSuccess(true);
    }
    const fetchProducts = async () => {
      try {
        const response = await axios.get('https://zando-backend-rnjv.onrender.com/api/products');
        setProducts(response.data);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // --- EMAIL & PASSWORD LOGIN ---
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
      setEmail('');
      setPassword('');
      setFullName('');
    } catch (err) {
      setAuthError(err.message.replace('Firebase: ', ''));
    }
  };

  // --- GOOGLE LOGIN ---
  const handleGoogleLogin = async () => {
    setAuthError('');
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(err.message.replace('Firebase: ', ''));
    }
  };

  // --- E-COMMERCE LOGIC ---
  const addToCart = (product) => {
    const qtyToAdd = parseInt(selectedQty[product.sku]) || 1;
    const existingItem = cart.find(item => item.sku === product.sku);
    const currentCartQty = existingItem ? existingItem.quantity : 0;

    if (currentCartQty + qtyToAdd > product.stock) {
      alert(`Notice: We only have ${product.stock} of these left in stock!`);
      return;
    }

    if (existingItem) {
      setCart(cart.map(item => item.sku === product.sku ? { ...item, quantity: item.quantity + qtyToAdd } : item));
    } else {
      setCart([...cart, { sku: product.sku, name: product.name, price: product.price, quantity: qtyToAdd }]);
    }
    setSelectedQty(prev => ({ ...prev, [product.sku]: '' }));
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
      setShowAuthPortal(true);
      return;
    }

    setCheckoutLoading(true);
    
    try {
      const response = await axios.post('https://zando-backend-rnjv.onrender.com/api/orders/checkout', {
        customer_email: currentUser.email || "google_user@zando.local", 
        items: cart
      });
      window.location.href = response.data.checkout_url;
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Oops! Something went wrong with checkout. Please try again.");
      setCheckoutLoading(false);
    }
  };

  const clearSuccess = () => {
    window.history.replaceState({}, document.title, "/");
    setIsSuccess(false);
    setCart([]); 
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center font-sans">
        <div className="w-8 h-8 rounded-full border-t-2 border-white animate-spin mb-4"></div>
        <div className="text-white text-sm font-medium tracking-wide animate-pulse">Loading Zando...</div>
      </div>
    );
  }

  // --- RENDER AUTH PORTAL ---
  if (showAuthPortal && !currentUser) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 font-sans">

        <button 
          onClick={() => { setShowAuthPortal(false); setAuthError(''); }}
          className="mb-6 text-slate-400 font-bold hover:text-white transition-colors"
        >
          ← Back to Storefront
        </button>

        <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md text-slate-900">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black tracking-tighter text-slate-900 mb-2">ZANDO</h1>
            <p className="text-slate-500 font-medium">
              {isRegistering ? 'Create a new account.' : 'Sign in to complete your order.'}
            </p>
          </div>

          <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
            {isRegistering && (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full border-2 border-slate-200 text-slate-900 px-4 py-3 rounded-xl focus:border-slate-900 focus:outline-none transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border-2 border-slate-200 text-slate-900 px-4 py-3 rounded-xl focus:border-slate-900 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border-2 border-slate-200 text-slate-900 px-4 py-3 rounded-xl focus:border-slate-900 focus:outline-none transition-colors"
              />
            </div>

            {authError && <div className="bg-red-50 text-red-600 text-sm font-medium text-center p-3 rounded-lg mt-2">{authError}</div>}

            <button type="submit" className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all shadow-lg mt-2 text-sm">
              {isRegistering ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              {isRegistering ? 'Already have an account? ' : "Don't have an account? "}
              <button onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }} className="text-indigo-600 font-bold hover:text-indigo-800 transition-colors">
                {isRegistering ? 'Sign in here' : 'Register now'}
              </button>
            </p>
          </div>

          <div className="mt-6 flex items-center justify-center space-x-4">
            <div className="h-px bg-slate-200 flex-1"></div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Or continue with</span>
            <div className="h-px bg-slate-200 flex-1"></div>
          </div>

          <div className="mt-6">
            <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-200 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-sm">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER SUCCESS SCREEN ---
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="bg-slate-900 p-12 rounded-3xl border-2 border-emerald-600 shadow-2xl shadow-emerald-900/40 max-w-xl w-full">
          <div className="font-mono text-emerald-500 text-6xl mb-6 font-black animate-pulse">✓</div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-3">Order Confirmed!</h1>
          <p className="text-base text-slate-300 mb-10 border-t border-slate-700 pt-6">Thank you for shopping with Zando. Your receipt has been sent to your account.</p>
          <button onClick={clearSuccess} className="w-full bg-emerald-600 text-white font-extrabold py-5 rounded-2xl hover:bg-emerald-500 transition-all text-lg tracking-wider shadow-lg">
            CONTINUE SHOPPING
          </button>
        </div>
      </div>
    );
  }

  // --- RENDER MAIN STOREFRONT ---
  return (
    <div className="w-full min-h-screen bg-black font-sans text-white selection:bg-indigo-500 selection:text-white">
      
      <nav className="bg-slate-950 border-b-2 border-slate-800 p-5 shadow-2xl flex flex-wrap justify-between items-center gap-4 px-10">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-black tracking-tighter text-white">ZANDO</h1>
        </div>
        
        <div className="flex items-center gap-6">
          {currentUser ? (
            <>
              <div className="hidden md:flex flex-col items-end pr-6 border-r-2 border-slate-800">
                <span className="text-[10px] text-slate-500 tracking-widest font-bold uppercase">Welcome Back</span>
                <span className="text-xs text-white font-bold">{currentUser.displayName || currentUser.email}</span>
              </div>
              <button onClick={() => signOut(auth)} className="text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-wider">
                Sign Out
              </button>
            </>
          ) : (
            <button onClick={() => setShowAuthPortal(true)} className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wider">
              Sign In
            </button>
          )}
        </div>
      </nav>

      <div className="w-full max-w-[1500px] mx-auto p-6 md:p-10 flex flex-col xl:flex-row items-start gap-8 mt-4">
        
        <div className="flex-1 w-full">
          <div className="flex justify-between items-end mb-6 border-b-2 border-slate-800 pb-4">
            <h2 className="text-2xl font-black tracking-tight text-white">New Arrivals</h2>
          </div>
          
          {loading ? (
            <div className="text-center py-20 text-slate-500 text-lg">Loading collection...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 text-slate-500 text-lg">Our store is currently empty. Check back soon!</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {products.map((product) => (
                <div key={product.sku} className="bg-slate-900 rounded-3xl border-2 border-slate-800 p-6 hover:border-slate-600 transition-colors shadow-xl flex flex-col h-full">
                  
                  <div className="h-64 w-full bg-black border-2 border-slate-700 mb-5 flex items-center justify-center overflow-hidden rounded-2xl relative group">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                      <div className="text-slate-600 text-xs tracking-widest font-bold">No Image</div>
                    )}
                  </div>

                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold bg-slate-800 text-slate-300 px-3 py-1.5 rounded-full border border-slate-700">
                      {product.category?.toUpperCase() || 'APPAREL'}
                    </span>
                    <span className="text-emerald-400 font-black text-xl">${product.price?.toFixed(2)}</span>
                  </div>
                  
                  <h3 className="font-extrabold text-lg text-white mt-4 line-clamp-1">{product.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 mb-6 break-all">SKU: {product.sku}</p>
                  
                  <div className="flex flex-col mt-auto border-t-2 border-slate-800 pt-5 gap-4">
                    <div className="flex gap-3 w-full">
                      <input 
                        type="number" 
                        min="1" 
                        max={product.stock}
                        placeholder="1"
                        value={selectedQty[product.sku] || ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setSelectedQty(prev => ({ ...prev, [product.sku]: isNaN(val) ? '' : val }));
                        }}
                        disabled={product.stock <= 0}
                        className="w-20 bg-black border-2 border-slate-600 text-white px-3 py-3 rounded-xl text-sm focus:outline-none focus:border-slate-400 font-bold text-center disabled:opacity-50 transition-colors"
                      />
                      <button 
                        onClick={() => addToCart(product)}
                        disabled={product.stock <= 0}
                        className="flex-1 bg-white text-black px-4 py-3 rounded-xl text-sm font-extrabold hover:bg-slate-200 transition-all disabled:bg-slate-800 disabled:text-slate-600 disabled:border-2 disabled:border-slate-700 disabled:cursor-not-allowed uppercase tracking-wider"
                      >
                        {product.stock > 0 ? 'Add to Cart' : 'Sold Out'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="w-full xl:w-[450px] shrink-0 sticky top-10">
          <div className="bg-slate-900 p-6 rounded-3xl border-2 border-slate-800 shadow-2xl flex flex-col max-h-[calc(100vh-80px)]">
            
            <h2 className="text-xl font-black mb-6 border-b-2 border-slate-800 pb-5 tracking-tight text-white shrink-0">Your Cart</h2>
            
            {cart.length === 0 ? (
              <p className="text-slate-500 text-center py-12 text-sm font-medium">Your cart is currently empty.</p>
            ) : (
              <>
                <div className="flex flex-col gap-4 overflow-y-auto pr-2 flex-1 min-h-0">
                  {cart.map((item, index) => (
                    <div key={index} className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border-2 border-slate-800 shrink-0">
                      <div className="overflow-hidden pr-3 flex-grow">
                        <p className="font-extrabold text-sm text-white truncate">{item.name}</p>
                        <p className="text-xs text-slate-500 mt-1.5 font-bold">QTY: {item.quantity}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2.5 shrink-0">
                        <p className="text-emerald-400 text-sm font-black">${(item.price * item.quantity).toFixed(2)}</p>
                        <button onClick={() => removeFromCart(item.sku)} className="text-[11px] font-bold text-slate-400 hover:text-red-400 transition-colors uppercase tracking-wider">
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="shrink-0 pt-2 mt-4 bg-slate-900">
                  <div className="border-t-2 border-slate-800 pt-5 flex justify-between items-center font-black text-xl">
                    <span className="text-slate-400 text-sm uppercase tracking-wider">Total</span>
                    <span className="text-white text-2xl">${cartTotal.toFixed(2)}</span>
                  </div>

                  <button 
                    onClick={handleCheckout}
                    disabled={checkoutLoading || cart.length === 0}
                    className="w-full bg-indigo-600 text-white hover:bg-indigo-500 py-4.5 rounded-xl text-base font-extrabold mt-6 transition-all flex justify-center items-center disabled:bg-slate-800 disabled:text-slate-600 disabled:border-2 disabled:border-slate-700 disabled:cursor-not-allowed uppercase tracking-widest shadow-lg shadow-indigo-900/40"
                  >
                    {checkoutLoading ? 'Processing...' : (currentUser ? 'Checkout securely' : 'Sign in to Checkout')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;