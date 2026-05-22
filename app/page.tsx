"use client";

import React, { useState, useEffect } from "react";
import { BookOpen, Library, LogOut, MessageSquare, Plus, ScanLine, Search, User, X, Loader2, Download, Printer, Camera, Edit, Sparkles, Trash2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Scanner } from '@yudiel/react-qr-scanner';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://13.250.200.60:8000";

// --- Image Compression Helper ---
// Resizes and compresses images before sending them to the backend to save storage!
const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // Good max width for book covers
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          } else {
            resolve(file); // Fallback to original if compression fails
          }
        }, 'image/jpeg', 0.8); // 80% compression quality
      };
    };
  });
};

export default function SmartLibApp() {
  // --- App State ---
  const [token, setToken] = useState<string | null>(null);
  const [view, setView] = useState<"login" | "signup" | "borrower" | "librarian">("login");
  
  // --- User State ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  // --- Auth Handlers ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError("");
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Login failed");
      
      setToken(data.access_token);
      // Simple role routing based on email for the prototype
      if (email.includes("admin") || email.includes("library")) setView("librarian");
      else setView("borrower");
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError("");
    try {
      const response = await fetch(`${API_BASE_URL}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Signup failed");
      
      setToken(data.access_token);
      if (email.includes("admin") || email.includes("library")) setView("librarian");
      else setView("borrower");
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setView("login");
    setEmail("");
    setPassword("");
  };

  // --- Main Render ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 print:bg-white">
      {/* Navigation Bar */}
      {token && (
        <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10 print:hidden">
          <div className="flex items-center gap-2 text-indigo-600">
            <BookOpen size={24} />
            <span className="text-xl font-bold tracking-tight">SmartLib QR</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 font-medium">
              {view === "librarian" ? "Librarian Mode" : "Borrower Mode"}
            </span>
            <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </nav>
      )}

      {/* View Router */}
      <main className="p-6 print:p-0">
        {view === "login" && (
          <AuthView 
            type="login" 
            email={email} setEmail={setEmail} 
            password={password} setPassword={setPassword} 
            onSubmit={handleLogin} error={authError} switchView={() => setView("signup")} loading={loading} 
          />
        )}
        {view === "signup" && (
          <AuthView 
            type="signup" 
            email={email} setEmail={setEmail} 
            password={password} setPassword={setPassword} 
            name={name} setName={setName}
            onSubmit={handleSignup} error={authError} switchView={() => setView("login")} loading={loading}
          />
        )}
        {view === "borrower" && token && <BorrowerDashboard token={token} />}
        {view === "librarian" && token && <LibrarianDashboard token={token} />}
      </main>

      {/* Global Floating AI Chat */}
      {token && <AIChatWidget />}
    </div>
  );
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

function AuthView({ type, email, setEmail, password, setPassword, name, setName, onSubmit, error, switchView, loading }: any) {
  return (
    <div className="max-w-md mx-auto mt-10 md:mt-20 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex justify-center mb-6 text-indigo-600">
        <Library size={48} strokeWidth={1.5} />
      </div>
      <h2 className="text-2xl font-bold text-center mb-2">{type === "login" ? "Welcome Back" : "Create Account"}</h2>
      <p className="text-slate-500 text-center mb-8">{type === "login" ? "Sign in to access your library." : "Join SmartLib today."}</p>
      
      <form onSubmit={onSubmit} className="space-y-5">
        {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
        
        {type === "signup" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
            <input 
              type="text" 
              required 
              value={name} 
              onChange={e => setName(e.target.value)} 
              autoComplete="name"
              className="w-full px-4 py-3 min-h-[48px] rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-base" 
              placeholder="John Doe" 
            />
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
          <input 
            type="email" 
            required 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            autoComplete="email"
            className="w-full px-4 py-3 min-h-[48px] rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-base" 
            placeholder="you@example.com" 
          />
          {type === "login" && <p className="text-xs text-slate-400 mt-1">Hint: Use 'admin@...' for Librarian dashboard</p>}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
          <input 
            type="password" 
            required 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            autoComplete={type === "login" ? "current-password" : "new-password"}
            className="w-full px-4 py-3 min-h-[48px] rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-base" 
            placeholder="••••••••" 
          />
        </div>

        <button 
          disabled={loading} 
          type="submit" 
          className="w-full min-h-[48px] bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-colors flex justify-center items-center gap-2 disabled:opacity-70 text-base shadow-sm"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : type === "login" ? "Sign In" : "Sign Up"}
        </button>
      </form>
      
      <div className="text-center mt-6 flex flex-col items-center justify-center">
        <span className="text-sm text-slate-500">
          {type === "login" ? "Don't have an account?" : "Already have an account?"}
        </span>
        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            switchView();
          }} 
          className="text-indigo-600 font-medium hover:underline p-3 inline-block mt-1 min-h-[44px] min-w-[44px]"
        >
          {type === "login" ? "Sign up" : "Log in"}
        </button>
      </div>
    </div>
  );
}

function BorrowerDashboard({ token }: { token: string }) {
  const [scanInput, setScanInput] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const [borrowedBooks, setBorrowedBooks] = useState<any[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);

  // New state for viewing book details and updating progress
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [progressBook, setProgressBook] = useState<any>(null);
  const [newPage, setNewPage] = useState("");

  const fetchBorrowedBooks = async () => {
    setLoadingBooks(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/transactions/me`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) setBorrowedBooks(data);
    } catch (err) {
      console.error("Failed to fetch borrowed books", err);
    } finally {
      setLoadingBooks(false);
    }
  };

  useEffect(() => {
    fetchBorrowedBooks();
  }, []);

  const handleTransaction = async (endpoint: string) => {
    if (!scanInput) return;
    setLoading(true);
    setMessage({ text: "", type: "" });
    try {
      const response = await fetch(`${API_BASE_URL}/api/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ qr_code_id: scanInput }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Transaction failed");
      setMessage({ text: `Successfully ${endpoint}ed book!`, type: "success" });
      setScanInput("");
      fetchBorrowedBooks(); // Refresh the active books list immediately!
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressBook || !newPage) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions/${progressBook.transaction_id}/progress`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ current_page: parseInt(newPage) }),
      });
      if (!response.ok) throw new Error("Failed to update progress");
      setMessage({ text: "Reading progress updated!", type: "success" });
      setProgressBook(null);
      setNewPage("");
      fetchBorrowedBooks();
    } catch (err: any) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 relative">
      
      {/* Progress Update Modal */}
      {progressBook && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden">
            <div className="bg-indigo-50 p-4 border-b border-indigo-100 flex justify-between items-center">
              <h3 className="font-bold text-indigo-900">Update Progress</h3>
              <button onClick={() => setProgressBook(null)} className="text-indigo-400 hover:text-indigo-900"><X size={20}/></button>
            </div>
            <form onSubmit={handleUpdateProgress} className="p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                What page are you on? (Total: {progressBook.book_total_pages})
              </label>
              <input 
                type="number" 
                min="0" 
                max={progressBook.book_total_pages || undefined}
                value={newPage} 
                onChange={e => setNewPage(e.target.value)} 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-base mb-4" 
                placeholder="e.g. 150" 
                required
              />
              <button disabled={loading} type="submit" className="w-full min-h-[48px] bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors">
                {loading ? "Updating..." : "Save Progress"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Book Details Modal */}
      {selectedBook && !progressBook && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-indigo-50 p-4 border-b border-indigo-100 flex justify-between items-center">
              <h3 className="font-bold text-indigo-900">Book Details</h3>
              <button onClick={() => setSelectedBook(null)} className="text-indigo-400 hover:text-indigo-900"><X size={20}/></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 text-center">
              {selectedBook.book_cover_image_url ? (
                <img src={`${API_BASE_URL}${selectedBook.book_cover_image_url}`} alt="Cover" className="w-32 h-48 object-cover rounded-lg shadow-md mx-auto mb-4 border border-slate-200" />
              ) : (
                <div className="w-32 h-48 bg-indigo-100 rounded-lg shadow-md mx-auto mb-4 flex items-center justify-center text-indigo-400">
                  <BookOpen size={48} />
                </div>
              )}
              <h2 className="text-2xl font-bold text-slate-800 mb-1">{selectedBook.book_title}</h2>
              <p className="text-slate-600 font-medium mb-1">by {selectedBook.book_author}</p>
              <span className="inline-block bg-slate-100 text-slate-500 text-xs font-bold px-2.5 py-1 rounded-full mb-4">{selectedBook.book_genre || 'Genre Unknown'}</span>
              
              <div className="text-left bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 text-sm text-slate-700 leading-relaxed">
                {selectedBook.book_description || 'No synopsis available for this book.'}
              </div>
              
              <button onClick={() => { setProgressBook(selectedBook); }} className="w-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium py-3 rounded-xl transition-colors border border-indigo-100">
                Update Reading Progress
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Your Dashboard</h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* Scanner Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
          
          {showScanner ? (
            <div className="w-full max-w-sm mb-6 rounded-2xl overflow-hidden border-2 border-indigo-500 relative">
              <Scanner 
                onScan={(result) => {
                  if (result && result.length > 0) {
                    setScanInput(result[0].rawValue);
                    setShowScanner(false);
                    setMessage({ text: "QR Scanned Successfully!", type: "success" });
                  }
                }} 
              />
              <button 
                onClick={() => setShowScanner(false)} 
                className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowScanner(true)}
              className="w-32 h-32 bg-slate-50 border-2 border-dashed border-slate-300 hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-600 rounded-2xl flex flex-col items-center justify-center text-slate-400 mb-6 transition-colors group cursor-pointer"
            >
              <Camera size={32} className="mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium">Open Camera</span>
            </button>
          )}
          
          <h3 className="text-lg font-bold mb-2">Scan a Book</h3>
          <p className="text-sm text-slate-500 mb-6">Scan a QR code to borrow or return a book instantly.</p>
          
          <div className="w-full space-y-3">
            <input 
              type="text" 
              value={scanInput} 
              onChange={e => setScanInput(e.target.value)} 
              placeholder="Or enter QR ID manually (e.g., QR-123)" 
              className="w-full px-4 py-3 min-h-[48px] text-center rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
            />
            {message.text && (
              <div className={`p-2 text-sm rounded-lg ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                {message.text}
              </div>
            )}
            <div className="flex gap-2">
              <button disabled={loading || !scanInput} onClick={() => handleTransaction('borrow')} className="flex-1 min-h-[48px] bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2 rounded-xl transition-colors">Borrow</button>
              <button disabled={loading || !scanInput} onClick={() => handleTransaction('return')} className="flex-1 min-h-[48px] bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-medium py-2 rounded-xl transition-colors">Return</button>
            </div>
          </div>
        </div>

        {/* Currently Reading Dashboard */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><BookOpen size={20} className="text-indigo-600" /> Currently Reading</h3>
          <div className="space-y-4">
            {loadingBooks ? (
              <div className="p-8 text-center text-slate-400"><Loader2 className="animate-spin mx-auto" /></div>
            ) : borrowedBooks.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-slate-400">
                <p className="text-sm">Ready for a new adventure?</p>
                <p className="text-xs mt-1">Ask the AI for a recommendation, then scan a book to borrow it!</p>
          </div>
        ) : (
          borrowedBooks.map((bBook: any) => (
            <div key={bBook.transaction_id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-start gap-4 hover:border-indigo-200 transition-colors cursor-pointer group" onClick={() => setSelectedBook(bBook)}>
              {bBook.book_cover_image_url ? (
                <img src={`${API_BASE_URL}${bBook.book_cover_image_url}`} alt="Cover" className="w-12 h-16 object-cover rounded shadow-sm flex-shrink-0 border border-slate-200" />
              ) : (
                <div className="w-12 h-16 bg-indigo-100 rounded shadow-sm flex-shrink-0 flex items-center justify-center text-indigo-400">
                  <BookOpen size={24} />
                </div>
              )}
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">{bBook.book_title || "Unknown Title"}</h4>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setProgressBook(bBook); }} 
                    className="text-[10px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded transition-colors whitespace-nowrap ml-2"
                  >
                    Update Page
                  </button>
                </div>
                <p className="text-sm text-slate-500 line-clamp-1">{bBook.book_author || "Unknown Author"}</p>
                <div className="mt-3 bg-slate-200 h-2 w-full rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${bBook.book_total_pages > 0 ? (bBook.current_page / bBook.book_total_pages) * 100 : 0}%` }}
                  ></div>
                </div>
                <p className="text-xs text-slate-400 mt-1 flex justify-between">
                  <span>Page {bBook.current_page} of {bBook.book_total_pages || '?'}</span>
                  <span className={bBook.days_left <= 3 ? "text-red-500 font-bold ml-1" : "ml-1"}>
                    {bBook.days_left} days left
                  </span>
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  </div>
</div>
  );
}

function LibrarianDashboard({ token }: { token: string }) {
  const [tab, setTab] = useState('inventory'); // 'inventory', 'qr', 'scan'
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Forms State
  const [newBook, setNewBook] = useState({ qr_code_id: "", title: "", author: "", genre: "", description: "", cover_image_url: "", total_pages: 0 });
  const [editingBook, setEditingBook] = useState<any>(null); // Holds the book currently being edited

  const [formMsg, setFormMsg] = useState({ text: "", type: "" });
  const [showScanner, setShowScanner] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [autofilling, setAutofilling] = useState(false);

  // QR Generator State
  const [qrCount, setQrCount] = useState(12);
  const [qrBatch, setQrBatch] = useState<string[]>([]);

  const fetchBooks = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/books`);
      const data = await res.json();
      setBooks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBooks(); }, []);

  // --- Actions ---

  const handleAutofill = async (targetState: 'new' | 'edit', titleToSearch: string) => {
    if (!titleToSearch) return;
    setAutofilling(true);
    setFormMsg({ text: "", type: "" });
    try {
      const res = await fetch(`${API_BASE_URL}/api/books/autofill`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ title: titleToSearch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Autofill failed");
      
      if (targetState === 'new') {
        setNewBook(prev => ({ ...prev, ...data }));
      } else {
        setEditingBook((prev: any) => ({ ...prev, ...data }));
      }
      setFormMsg({ text: "AI Autofill Complete!", type: "success" });
    } catch (err: any) {
      setFormMsg({ text: err.message, type: "error" });
    } finally {
      setAutofilling(false);
    }
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg({ text: "", type: "" });
    try {
      const res = await fetch(`${API_BASE_URL}/api/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBook),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to add book");
      setFormMsg({ text: "Book added successfully!", type: "success" });
      setNewBook({ qr_code_id: "", title: "", author: "", genre: "", description: "", cover_image_url: "", total_pages: 0 });
      fetchBooks();
    } catch (err: any) {
      setFormMsg({ text: err.message, type: "error" });
    }
  };

  const handleUpdateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg({ text: "", type: "" });
    try {
      const res = await fetch(`${API_BASE_URL}/api/books/${editingBook.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(editingBook),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to update book");
      
      setFormMsg({ text: "Book updated successfully!", type: "success" });
      setTimeout(() => {
        setEditingBook(null);
        setFormMsg({ text: "", type: "" });
      }, 1500);
      fetchBooks();
    } catch (err: any) {
      setFormMsg({ text: err.message, type: "error" });
    }
  };

  const handleDeleteBook = async (bookId: number) => {
    if (!window.confirm("Are you sure you want to completely delete this book? This will also delete any uploaded cover image and its borrow history!")) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/books/${bookId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Failed to delete book");
      }
      fetchBooks(); // Refresh the list
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetState: 'new' | 'edit') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(true);
    
    try {
      // Compress the image before uploading to save storage!
      const compressedFile = await compressImage(file);
      const formData = new FormData();
      formData.append("file", compressedFile);

      const res = await fetch(`${API_BASE_URL}/api/upload-cover`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      
      if (targetState === 'new') setNewBook({...newBook, cover_image_url: data.cover_image_url});
      else setEditingBook({...editingBook, cover_image_url: data.cover_image_url});
      
      setFormMsg({ text: "Image compressed & uploaded securely!", type: "success" });
    } catch (err: any) {
      setFormMsg({ text: err.message, type: "error" });
    } finally {
      setUploadingImage(false);
    }
  };

  const generateQRBatch = () => {
    const newBatch = Array.from({ length: qrCount }, () => {
      const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
      return `QR-${randomString}`;
    });
    setQrBatch(newBatch);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-end print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Librarian Portal</h1>
          <p className="text-slate-500">Manage inventory and QR codes.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 print:hidden overflow-x-auto whitespace-nowrap">
        <button 
          onClick={() => setTab('inventory')}
          className={`pb-3 font-medium text-sm transition-colors min-h-[44px] ${tab === 'inventory' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Library className="w-4 h-4 inline mr-2"/>
          Inventory
        </button>
        <button 
          onClick={() => setTab('qr')}
          className={`pb-3 font-medium text-sm transition-colors min-h-[44px] ${tab === 'qr' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <Printer className="w-4 h-4 inline mr-2"/>
          Generate QRs
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6 min-h-[50vh] print:border-none print:shadow-none print:p-0">
        
        {/* --- INVENTORY TAB --- */}
        {tab === 'inventory' && (
          <div className="grid lg:grid-cols-3 gap-6 relative">
            
            {/* Book Edit Modal Overlay */}
            {editingBook && (
              <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="bg-indigo-50 p-4 border-b border-indigo-100 flex justify-between items-center">
                    <h3 className="font-bold text-indigo-900 flex items-center gap-2"><Edit size={18}/> Edit Book: {editingBook.title}</h3>
                    <button onClick={() => { setEditingBook(null); setFormMsg({text:"", type:""}); }} className="text-indigo-400 hover:text-indigo-900 min-w-[44px] min-h-[44px] flex justify-center items-center"><X size={20}/></button>
                  </div>
                  
                  <div className="p-4 md:p-6 overflow-y-auto flex-1">
                    <form onSubmit={handleUpdateBook} className="space-y-4">
                      {formMsg.text && (
                        <div className={`p-3 text-sm rounded-lg border ${formMsg.type === 'error' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                          {formMsg.text}
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">QR Code ID (Reassign)</label>
                        <input required value={editingBook.qr_code_id} onChange={e => setEditingBook({...editingBook, qr_code_id: e.target.value})} className="w-full px-3 py-2 min-h-[44px] text-sm rounded-lg border border-slate-300 font-mono" />
                        <p className="text-[10px] text-slate-500 mt-1">Change this to link the book to a newly printed QR sticker.</p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Title</label>
                        <div className="flex gap-2">
                          <input value={editingBook.title} onChange={e => setEditingBook({...editingBook, title: e.target.value})} className="flex-1 px-3 py-2 min-h-[44px] text-sm rounded-lg border border-slate-300" />
                          <button type="button" onClick={() => handleAutofill('edit', editingBook.title)} disabled={autofilling} className="bg-amber-100 text-amber-700 hover:bg-amber-200 px-3 rounded-lg min-h-[44px] transition-colors flex items-center gap-1 disabled:opacity-50 text-sm font-medium border border-amber-200">
                            {autofilling ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} AI Fill
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Author</label>
                          <input value={editingBook.author || ''} onChange={e => setEditingBook({...editingBook, author: e.target.value})} className="w-full px-3 py-2 min-h-[44px] text-sm rounded-lg border border-slate-300" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Genre</label>
                          <input value={editingBook.genre || ''} onChange={e => setEditingBook({...editingBook, genre: e.target.value})} className="w-full px-3 py-2 min-h-[44px] text-sm rounded-lg border border-slate-300" />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                         <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Total Pages</label>
                          <input type="number" value={editingBook.total_pages || ''} onChange={e => setEditingBook({...editingBook, total_pages: Number(e.target.value)})} className="w-full px-3 py-2 min-h-[44px] text-sm rounded-lg border border-slate-300" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Cover Image</label>
                        <div className="flex flex-col sm:flex-row gap-2">
                          {/* File Browser Upload */}
                          <div className="flex-1 relative">
                             <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'edit')} disabled={uploadingImage} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                             <div className="flex items-center justify-center gap-2 w-full bg-slate-100 text-slate-700 py-2.5 px-4 min-h-[44px] rounded-lg text-sm font-semibold border border-slate-200">
                               <Plus size={16} /> Choose File
                             </div>
                          </div>
                          
                          {/* Camera Specific Upload */}
                          <div className="flex-1 relative">
                             <input type="file" accept="image/*" capture="environment" onChange={(e) => handleImageUpload(e, 'edit')} disabled={uploadingImage} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                             <div className="flex items-center justify-center gap-2 w-full bg-indigo-50 text-indigo-700 py-2.5 px-4 min-h-[44px] rounded-lg text-sm font-semibold border border-indigo-100">
                               <Camera size={16} /> Take Photo
                             </div>
                          </div>
                        </div>
                        {uploadingImage && <p className="text-xs text-indigo-500 mt-2 flex items-center gap-1"><Loader2 size={12} className="animate-spin"/> Compressing & Uploading...</p>}
                        {editingBook.cover_image_url && (
                          <div className="mt-3 border border-slate-200 rounded-lg p-1 w-fit bg-white shadow-sm">
                            <img src={`${API_BASE_URL}${editingBook.cover_image_url}`} alt="Cover Preview" className="h-24 object-cover rounded" />
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Synopsis</label>
                        <textarea value={editingBook.description || ''} onChange={e => setEditingBook({...editingBook, description: e.target.value})} rows={3} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 resize-none" />
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex gap-2">
                         <button type="button" onClick={() => { setEditingBook(null); setFormMsg({text:"", type:""}); }} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 min-h-[48px] rounded-xl transition-colors">Cancel</button>
                         <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 min-h-[48px] rounded-xl transition-colors shadow-sm">Save Changes</button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}


            {/* Add Book Form (Sidebar) */}
            <div className="lg:col-span-1 bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-100 h-fit relative">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Plus size={20} className="text-indigo-600"/> Scan-to-Add Book</h3>
              
              {showScanner && (
                <div className="absolute inset-0 z-20 bg-white rounded-2xl border-2 border-indigo-500 overflow-hidden flex flex-col">
                  <div className="bg-indigo-50 p-3 flex justify-between items-center border-b border-indigo-100">
                    <span className="font-bold text-sm text-indigo-800">Scan Sticker</span>
                    <button onClick={() => setShowScanner(false)} className="text-indigo-600 hover:text-indigo-900 min-w-[44px] min-h-[44px] flex items-center justify-center"><X size={20}/></button>
                  </div>
                  <div className="flex-1">
                    <Scanner 
                      onScan={(result) => {
                        if (result && result.length > 0) {
                          setNewBook({...newBook, qr_code_id: result[0].rawValue});
                          setShowScanner(false);
                        }
                      }} 
                    />
                  </div>
                </div>
              )}

              <form onSubmit={handleAddBook} className="space-y-4">
                {formMsg.text && !editingBook && (
                  <div className={`p-3 text-sm rounded-lg ${formMsg.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {formMsg.text}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Scanned QR ID</label>
                  <div className="flex gap-2">
                    <input required value={newBook.qr_code_id} onChange={e => setNewBook({...newBook, qr_code_id: e.target.value})} className="w-full px-3 py-2 min-h-[44px] text-sm rounded-lg border border-slate-200" placeholder="e.g. QR-101" />
                    <button type="button" onClick={() => setShowScanner(true)} className="bg-indigo-100 text-indigo-700 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-indigo-200 transition-colors">
                      <Camera size={18} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Title</label>
                  <div className="flex gap-2">
                    <input value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})} className="flex-1 px-3 py-2 min-h-[44px] text-sm rounded-lg border border-slate-200" />
                    <button type="button" onClick={() => handleAutofill('new', newBook.title)} disabled={autofilling} className="bg-amber-100 text-amber-700 hover:bg-amber-200 px-3 min-h-[44px] rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 text-xs font-bold border border-amber-200">
                      {autofilling ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Fill
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Author</label>
                    <input value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})} className="w-full px-3 py-2 min-h-[44px] text-sm rounded-lg border border-slate-200" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Genre</label>
                    <input value={newBook.genre} onChange={e => setNewBook({...newBook, genre: e.target.value})} className="w-full px-3 py-2 min-h-[44px] text-sm rounded-lg border border-slate-200" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Total Pages</label>
                    <input type="number" value={newBook.total_pages || ''} onChange={e => setNewBook({...newBook, total_pages: Number(e.target.value)})} className="w-full px-3 py-2 min-h-[44px] text-sm rounded-lg border border-slate-200" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Cover Image</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    {/* File Browser Upload */}
                    <div className="flex-1 relative">
                       <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'new')} disabled={uploadingImage} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                       <div className="flex items-center justify-center gap-2 w-full bg-white text-slate-700 py-2.5 px-4 min-h-[44px] rounded-lg text-sm font-semibold border border-slate-200">
                         <Plus size={16} /> File
                       </div>
                    </div>
                    
                    {/* Camera Specific Upload */}
                    <div className="flex-1 relative">
                       <input type="file" accept="image/*" capture="environment" onChange={(e) => handleImageUpload(e, 'new')} disabled={uploadingImage} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                       <div className="flex items-center justify-center gap-2 w-full bg-indigo-50 text-indigo-700 py-2.5 px-4 min-h-[44px] rounded-lg text-sm font-semibold border border-indigo-100">
                         <Camera size={16} /> Photo
                       </div>
                    </div>
                  </div>
                  {uploadingImage && !editingBook && <p className="text-xs text-indigo-500 mt-2 flex items-center gap-1"><Loader2 size={12} className="animate-spin"/> Compressing...</p>}
                  {newBook.cover_image_url && (
                    <div className="mt-3 border border-slate-200 rounded-lg p-1 w-fit bg-white shadow-sm">
                      <img src={`${API_BASE_URL}${newBook.cover_image_url}`} alt="Cover Preview" className="h-24 object-cover rounded" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Synopsis</label>
                  <textarea value={newBook.description} onChange={e => setNewBook({...newBook, description: e.target.value})} rows={3} className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 resize-none" />
                </div>
                <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 min-h-[48px] rounded-xl transition-colors">Add to Database</button>
              </form>
            </div>

            {/* Inventory List */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-100 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
                <h3 className="text-lg font-bold flex items-center gap-2"><Library size={20} className="text-indigo-600"/> Library Inventory</h3>
              </div>
              
              <div className="overflow-x-auto bg-white flex-1">
                <table className="w-full text-left border-collapse text-sm min-w-[500px]">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500">
                      <th className="p-4 font-medium border-b border-slate-100">Cover</th>
                      <th className="p-4 font-medium border-b border-slate-100">Book Details</th>
                      <th className="p-4 font-medium border-b border-slate-100">Status</th>
                      <th className="p-4 font-medium border-b border-slate-100 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={4} className="p-8 text-center text-slate-400"><Loader2 className="animate-spin mx-auto" /></td></tr>
                    ) : books.length === 0 ? (
                      <tr><td colSpan={4} className="p-8 text-center text-slate-400">No books found. Scan a QR to add one!</td></tr>
                    ) : (
                      books.map((book) => (
                        <tr key={book.id} className="hover:bg-slate-50/50 border-b border-slate-100 last:border-0 transition-colors">
                          <td className="p-4 w-16">
                            {book.cover_image_url ? (
                              <img src={`${API_BASE_URL}${book.cover_image_url}`} alt="cover" className="w-10 h-14 object-cover rounded shadow-sm border border-slate-200" />
                            ) : (
                              <div className="w-10 h-14 bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-slate-300">
                                <BookOpen size={16} />
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <p className="font-medium text-slate-800 line-clamp-1">{book.title || "Untitled"}</p>
                            <p className="font-mono text-xs text-slate-400 mt-0.5">{book.qr_code_id}</p>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold ${book.is_available ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                              {book.is_available ? 'Available' : 'Checked Out'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              <button 
                                onClick={() => setEditingBook(book)}
                                className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg text-xs font-bold transition-colors min-w-[44px]"
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDeleteBook(book.id)}
                                className="text-red-600 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg text-xs font-bold transition-colors min-w-[44px]"
                              >
                                <Trash2 size={16}/>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- QR GENERATOR TAB --- */}
        {tab === 'qr' && (
          <div className="py-2 print:py-0">
            {/* Generator Controls - Hidden during printing */}
            <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end bg-slate-50 p-6 rounded-2xl border border-slate-100 print:hidden">
              <div className="mb-4 sm:mb-0 max-w-md">
                <h3 className="font-bold text-slate-800 mb-1 text-lg">Batch Generator</h3>
                <p className="text-sm text-slate-500">Generate unique QR codes, print them on sticker paper, and attach them to physical books to register them later.</p>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Quantity</label>
                  <input type="number" min="1" max="100" value={qrCount} onChange={e => setQrCount(Number(e.target.value))} className="w-20 px-3 py-2 min-h-[44px] text-sm rounded-xl border border-slate-200 text-center" />
                </div>
                <div className="flex items-end">
                  <button onClick={generateQRBatch} className="bg-slate-900 text-white px-5 py-2 min-h-[44px] rounded-xl font-medium hover:bg-slate-800 transition">
                    Generate
                  </button>
                </div>
              </div>
            </div>

            {/* Empty State */}
            {qrBatch.length === 0 && (
              <div className="text-center py-12 text-slate-400 print:hidden">
                <Printer size={48} className="mx-auto mb-4 opacity-20" />
                <p>Select a quantity and generate your QR codes.</p>
              </div>
            )}

            {/* Generated Grid - Visible on screen AND in print layout */}
            {qrBatch.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-4 print:hidden">
                  <h3 className="font-bold text-slate-800">Generated Batch ({qrBatch.length})</h3>
                  <button onClick={() => window.print()} className="bg-indigo-600 text-white px-5 py-2 min-h-[44px] rounded-xl font-medium hover:bg-indigo-700 transition flex items-center shadow-sm">
                    <Download className="w-4 h-4 mr-2" /> Print Stickers
                  </button>
                </div>

                {/* The Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 print:grid-cols-4 gap-4 print:gap-8 max-h-[60vh] print:max-h-none overflow-y-auto print:overflow-visible p-2 print:p-0">
                  {qrBatch.map(id => (
                    <div key={id} className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200 print:border-dashed print:border-gray-400 rounded-xl print:rounded-none break-inside-avoid shadow-sm print:shadow-none">
                      <QRCodeSVG value={id} size={100} level="M" />
                      <span className="text-sm font-mono mt-3 font-bold text-slate-800">{id}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">SmartLib</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user'|'ai', text: string}[]>([{ role: 'ai', text: 'Hi! Ask me for a book recommendation based on our available inventory.' }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Simple Markdown formatter for bold text, italics, and line breaks
  const formatMarkdown = (text: string) => {
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/\n/g, '<br/>');
    return { __html: formatted };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const userText = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText })
      });
      const data = await res.json();
      if (!res.ok) throw new Error("API Error");
      
      setMessages(prev => [...prev, { role: 'ai', text: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I'm having trouble connecting to the library brain right now." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="print:hidden">
      {/* Chat Toggle Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 hover:scale-105 transition-all z-40 ${isOpen ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100'}`}
      >
        <MessageSquare size={24} />
      </button>

      {/* Chat Panel */}
      <div className={`fixed bottom-6 right-6 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col transition-all duration-300 origin-bottom-right z-50 ${isOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'}`} style={{ height: '500px', maxHeight: '80vh' }}>
        
        {/* Header */}
        <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <Library size={20} />
            <h3 className="font-bold">SmartLib AI</h3>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-indigo-200 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'}`}
                dangerouslySetInnerHTML={msg.role === 'ai' ? formatMarkdown(msg.text) : undefined}
              >
                {msg.role === 'user' ? msg.text : undefined}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 shadow-sm">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form onSubmit={sendMessage} className="p-3 bg-white border-t border-slate-100">
          <input 
            type="text" 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            placeholder="Ask for recommendations..." 
            className="w-full px-4 py-3 min-h-[48px] bg-slate-50 border border-slate-200 rounded-full text-base focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors"
          />
        </form>
      </div>
    </div>
  );
}