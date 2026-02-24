import React, { useState } from 'react';
import { Search, User, History, Home, Plus, Loader2, Bookmark, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- 설정 ---
// Google Apps Script (GAS) URL - 나중에 배포 후 여기에 넣으세요.
const GAS_URL = "https://script.google.com/macros/s/AKfycbwMe4EXDkYcxlO8C8Jw9DEULNqd4mKFv06xw_RcqM2neSr8vYeVRlSJzsztZRtmTVbPRQ/exec";
const ALADIN_API_KEY = "ttbwehada20211856001";

interface BookInfo {
  title: string;
  author: string;
  publisher: string;
  price: number;
  isbn: string;
  coverUrl: string;
  isExisting?: boolean;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'history'>('home');
  const [user, setUser] = useState<{ name: string, email: string, role: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<BookInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRequesting, setIsRequesting] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ name: '', role: '학생', grade: '', classNum: '' });

  const handleLogin = () => setShowLoginModal(true);

  const handleLoginSubmit = () => {
    const { name, role, grade, classNum } = loginForm;
    if (!name.trim()) { alert('이름을 입력해주세요.'); return; }
    if (role !== '교직원' && (!grade.trim() || !classNum.trim())) { alert('학년과 반을 입력해주세요.'); return; }
    const roleLabel = role === '교직원' ? '교직원' : `${grade}학년 ${classNum}반`;
    setUser({ name: name.trim(), email: '', role: roleLabel });
    setShowLoginModal(false);
    setLoginForm({ name: '', role: '학생', grade: '', classNum: '' });
  };

  const handleLogout = () => setUser(null);

  const searchBooks = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setResults([]);

    try {
      // 1. GAS를 통한 보유 도서 검색 (구글 드라이브 엑셀 참조)
      let existingBooks: BookInfo[] = [];
      try {
        const gasResponse = await fetch(`${GAS_URL}?query=${encodeURIComponent(searchQuery)}`);
        const gasData = await gasResponse.json();
        if (Array.isArray(gasData)) {
          existingBooks = gasData.map(item => ({
            title: item.title,
            author: item.author,
            publisher: item.publisher,
            price: item.price || 0,
            isbn: String(item.isbn),
            coverUrl: "",
            isExisting: true
          }));
        }
      } catch (e) {
        console.error("GAS 검색 실패 (기존 도서 목록 접근 불가):", e);
      }

      // 2. 알라딘 미보유 도서 검색
      const baseUrl = `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${ALADIN_API_KEY}&Query=${encodeURIComponent(searchQuery)}&QueryType=Keyword&MaxResults=10&start=1&SearchTarget=Book&output=js&Version=20131101`;
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(baseUrl)}`;

      const response = await fetch(proxyUrl);
      const text = await response.text();

      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const jsonStr = text.substring(jsonStart, jsonEnd + 1);
        const data = JSON.parse(jsonStr);
        const aladinItems = (data.item || []).map((item: any) => ({
          title: item.title.replace(/<[^>]*>?/gm, ''),
          author: item.author.replace(/<[^>]*>?/gm, ''),
          publisher: item.publisher,
          price: item.priceStandard,
          isbn: item.isbn13 || item.isbn,
          coverUrl: item.cover,
          isExisting: false
        }));

        // 3. 데이터 통합: 이미 보유한 도서는 제외하거나 표시
        const normalize = (s: string) => s.replace(/[\s\:\-\(\)（）:·]/g, '').toLowerCase();
        const combined = [...existingBooks];
        aladinItems.forEach((item: BookInfo) => {
          // ISBN 또는 제목 포함 여부로 중복 체크 (부제목 대응)
          const normItem = normalize(item.title);
          const isDuplicate = combined.some(b => {
            if (b.isbn === item.isbn) return true;
            const normB = normalize(b.title);
            return normItem.includes(normB) || normB.includes(normItem);
          });
          if (!isDuplicate) {
            combined.push(item);
          }
        });
        setResults(combined);
      }
    } catch (error) {
      console.error("검색 중 오류 발생:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const requestBook = async (book: BookInfo) => {
    if (!user) {
      alert("신청을 위해 로그인이 필요합니다.");
      return;
    }

    setIsRequesting(book.isbn);
    try {
      // GAS로 신청 데이터 전송 (POST)
      await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({
          ...book,
          requester: user.name,
          requesterName: user.name,
          requesterRole: user.role
        }),
        mode: 'no-cors' // CORS 이슈 방지를 위해 no-cors 사용
      });

      alert(`'${book.title}' 희망도서 신청이 완료되었습니다!\n(Apps Script로 전송됨)`);
    } catch (error) {
      console.error("신청 실패:", error);
      alert("신청 중에 오류가 발생했습니다.");
    } finally {
      setIsRequesting(null);
    }
  };


  return (
    <div className="flex flex-col min-h-screen bg-[#050a1a] text-[#f0f4f8] pb-24 font-['Pretendard']">

      {/* 로그인 모달 */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-5"
            onClick={() => setShowLoginModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0d1530] border border-white/10 rounded-3xl p-8 w-full max-w-sm"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold mb-1">신청자 정보 입력</h2>
              <p className="text-xs text-slate-400 mb-6">희망도서 신청을 위해 정보를 입력해주세요.</p>

              {/* 역할 선택 */}
              <label className="text-xs text-slate-400 block mb-1.5">구분</label>
              <div className="flex gap-2 mb-4">
                {['학생', '교직원'].map(r => (
                  <button
                    key={r}
                    onClick={() => setLoginForm(f => ({ ...f, role: r }))}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${loginForm.role === r ? 'bg-sky-400 text-slate-900 border-sky-400' : 'bg-white/5 text-slate-400 border-white/10'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* 학생: 학년/반 */}
              {loginForm.role !== '교직원' && (
                <div className="flex gap-2 mb-4">
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 block mb-1.5">학년</label>
                    <input
                      type="number"
                      placeholder="1"
                      min="1" max="6"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-sky-400/50"
                      value={loginForm.grade}
                      onChange={(e) => setLoginForm(f => ({ ...f, grade: e.target.value }))}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-400 block mb-1.5">반</label>
                    <input
                      type="number"
                      placeholder="1"
                      min="1"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-sky-400/50"
                      value={loginForm.classNum}
                      onChange={(e) => setLoginForm(f => ({ ...f, classNum: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              <label className="text-xs text-slate-400 block mb-1.5">이름</label>
              <input
                type="text"
                placeholder="홍길동"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-sky-400/50 mb-4"
                value={loginForm.name}
                onChange={(e) => setLoginForm(f => ({ ...f, name: e.target.value }))}
              />
              <button
                onClick={handleLoginSubmit}
                className="w-full bg-sky-400 text-slate-900 font-bold py-3 rounded-xl text-sm"
              >
                확인
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* 고정 헤더 */}
      <header className="sticky top-0 z-40 p-5 bg-[#050a1a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">MY LAB <span className="text-sky-400">WEB</span></h1>
          </div>
          {user ? (
            <div onClick={handleLogout} className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-sky-400/20 cursor-pointer">
              <span className="text-xs font-medium text-sky-400">{user.name} 님</span>
              <div className="w-6 h-6 rounded-full bg-sky-400 flex items-center justify-center">
                <User size={14} className="text-slate-900" />
              </div>
            </div>
          ) : (
            <button onClick={handleLogin} className="text-xs font-bold bg-sky-400 text-slate-900 px-4 py-2 rounded-full shadow-[0_0_15px_rgba(56,189,248,0.3)]">
              신청자 등록
            </button>
          )}
        </div>
      </header>

      {/* 메인 영역 */}
      <main className="max-w-md mx-auto w-full px-5 py-8 flex-grow">
        {activeTab === 'home' ? (
          <>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-10 text-center"
            >
              <h2 className="text-2xl font-bold mb-2">어떤 책을 원하시나요?</h2>
              <p className="text-sm text-slate-400">보유 도서를 검색하고, 없는 책을 신청하세요.</p>
            </motion.div>

            {/* 검색창 - 반응형 & 겹침 방지 */}
            <div className="relative mb-8 group">
              <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl focus-within:border-sky-400/50 transition-all p-1.5">
                <div className="pl-3 pr-2 text-slate-500">
                  <Search size={20} />
                </div>
                <input
                  type="text"
                  placeholder="제목이나 저자를 입력하세요"
                  className="bg-transparent flex-grow h-12 outline-none text-sm placeholder:text-slate-600"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchBooks()}
                />
                <button
                  onClick={searchBooks}
                  className="bg-sky-400 hover:bg-sky-300 text-slate-900 h-12 px-6 rounded-xl font-bold text-xs transition-all flex items-center gap-2"
                  disabled={isSearching}
                >
                  {isSearching ? <Loader2 className="animate-spin" size={16} /> : "검색"}
                </button>
              </div>
            </div>

            {/* 검색 결과 */}
            <div className="space-y-4">
              <AnimatePresence>
                {results.map((book, idx) => (
                  <motion.div
                    key={book.isbn + idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-4 flex gap-4 hover:border-sky-400/30 transition-all"
                  >
                    <div className="w-20 h-28 flex-shrink-0 bg-slate-800 rounded-xl overflow-hidden shadow-xl border border-white/5">
                      <img src={book.coverUrl} className="w-full h-full object-cover" alt={book.title} />
                    </div>
                    <div className="flex flex-col justify-between py-1 flex-grow min-w-0">
                      <div>
                        <div className="flex justify-between gap-2">
                          <h3 className="text-sm font-bold truncate leading-tight flex-grow">{book.title}</h3>
                          {book.isExisting ? (
                            <Bookmark size={14} className="text-emerald-400 flex-shrink-0" />
                          ) : (
                            <Plus size={14} className="text-sky-400 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 truncate">{book.author} | {book.publisher}</p>
                        {book.isExisting ? (
                          <span className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-400/10 text-emerald-400 text-[10px] font-bold rounded-md">
                            <CheckCircle2 size={10} />
                            도서관 보유 중
                          </span>
                        ) : (
                          <span className="mt-2 inline-block px-2 py-0.5 bg-sky-400/10 text-sky-400 text-[10px] font-bold rounded-md">
                            미보유 (신청 가능)
                          </span>
                        )}
                      </div>

                      {!book.isExisting && (
                        <button
                          onClick={() => requestBook(book)}
                          className="mt-3 w-full py-2.5 rounded-xl bg-sky-400 text-slate-900 text-xs font-bold hover:bg-sky-300 transition-all flex items-center justify-center gap-2"
                          disabled={isRequesting === book.isbn}
                        >
                          {isRequesting === book.isbn ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <>
                              <Plus size={14} />
                              희망도서 신청하기
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {results.length === 0 && !isSearching && searchQuery && (
                <div className="text-center py-20 opacity-30">
                  <Search size={48} className="mx-auto mb-4" />
                  <p className="text-sm font-medium">검색 결과가 없습니다.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="py-20 text-center opacity-40">
            <History size={48} className="mx-auto mb-4" />
            <p className="text-sm font-medium">신청 내역이 없습니다.</p>
          </div>
        )}
      </main>

      {/* 네이티브 스타일 하단 바 */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-[#0a0f1e]/90 backdrop-blur-2xl border-t border-white/5 flex justify-around items-center px-6 pb-4">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'home' ? 'text-sky-400' : 'text-slate-500'}`}
        >
          <Home size={activeTab === 'home' ? 24 : 22} />
          <span className="text-[10px] font-bold">홈</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'history' ? 'text-sky-400' : 'text-slate-500'}`}
        >
          <History size={activeTab === 'history' ? 24 : 22} />
          <span className="text-[10px] font-bold">신청현황</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
