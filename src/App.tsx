import React, { useState, useTransition } from 'react';
import { Search, User, History, Home, Plus, Loader2, Bookmark, CheckCircle2, Settings, Download, Key, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';

// --- 설정 ---
const GAS_URL = "https://script.google.com/macros/s/AKfycbwMe4EXDkYcxlO8C8Jw9DEULNqd4mKFv06xw_RcqM2neSr8vYeVRlSJzsztZRtmTVbPRQ/exec";
const DEFAULT_ALADIN_API_KEY = "ttbwehada20211856001";
const DEFAULT_NL_API_KEY = "61e6d3f886f58011909c80e1ff3a9add1adc5d95753c4c2b580f2cb8dbaecb4a";
const ADMIN_PASSWORD = "admin1234"; // 관리자 비밀번호

// 모듈 레벨 상수 — 렌더마다 재생성 방지
const ROLES = ['학생', '교직원'] as const;
const NORMALIZE_REGEX = /[\s\:\-\(\)（）:·]/g;
const normalize = (s: string) => s.replace(NORMALIZE_REGEX, '').toLowerCase();

interface BookInfo {
  title: string;
  author: string;
  publisher: string;
  price: number;
  isbn: string;
  coverUrl: string;
  isExisting?: boolean;
  kdcCode?: string; // KDC 분류번호
  kdcName?: string; // KDC 분류명
}

// --- 서브 컴포넌트 ---

interface LoginModalProps {
  loginForm: { name: string; role: string; grade: string; classNum: string };
  setLoginForm: React.Dispatch<React.SetStateAction<{ name: string; role: string; grade: string; classNum: string }>>;
  onSubmit: () => void;
  onClose: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ loginForm, setLoginForm, onSubmit, onClose }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-5"
    onClick={onClose}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      className="glass rounded-3xl p-8 w-full max-w-sm shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <h2 className="text-lg font-bold mb-1">신청자 정보 입력</h2>
      <p className="text-xs text-slate-500 mb-6">희망도서 신청을 위해 정보를 입력해주세요.</p>

      <label className="text-xs text-slate-500 block mb-1.5">구분</label>
      <div className="flex gap-2 mb-4">
        {ROLES.map(r => (
          <button
            key={r}
            onClick={() => setLoginForm(f => ({ ...f, role: r }))}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${loginForm.role === r ? 'bg-primary text-white border-primary shadow-lg shadow-sky-200' : 'bg-slate-100 text-slate-400 border-slate-200'}`}
          >
            {r}
          </button>
        ))}
      </div>

      {loginForm.role !== '교직원' && (
        <div className="flex gap-2 mb-4">
          <div className="flex-1">
            <label className="text-xs text-slate-500 block mb-1.5">학년</label>
            <input
              type="number"
              placeholder="1"
              min="1" max="6"
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 focus:bg-white transition-all"
              value={loginForm.grade}
              onChange={(e) => setLoginForm(f => ({ ...f, grade: e.target.value }))}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-slate-500 block mb-1.5">반</label>
            <input
              type="number"
              placeholder="1"
              min="1"
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 focus:bg-white transition-all"
              value={loginForm.classNum}
              onChange={(e) => setLoginForm(f => ({ ...f, classNum: e.target.value }))}
            />
          </div>
        </div>
      )}

      <label className="text-xs text-slate-500 block mb-1.5">이름</label>
      <input
        type="text"
        placeholder="홍길동"
        className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 focus:bg-white transition-all mb-4"
        value={loginForm.name}
        onChange={(e) => setLoginForm(f => ({ ...f, name: e.target.value }))}
      />
      <button
        onClick={onSubmit}
        className="w-full bg-primary text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-sky-200 hover:bg-sky-500 transition-all"
      >
        확인
      </button>
    </motion.div>
  </motion.div>
);

interface BookCardProps {
  book: BookInfo;
  isRequesting: string | null;
  onRequest: (book: BookInfo) => void;
  idx: number;
}

const BookCard: React.FC<BookCardProps> = React.memo(({ book, isRequesting, onRequest, idx }) => (
  <motion.div
    key={book.isbn + idx}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: idx * 0.05 }}
    className="glass rounded-3xl p-4 flex gap-4 hover:border-primary/50 hover:shadow-xl transition-all"
  >
    <div className="w-20 h-28 flex-shrink-0 bg-slate-100 rounded-xl overflow-hidden shadow-md border border-slate-200">
      <img src={book.coverUrl} className="w-full h-full object-cover" alt={book.title} loading="lazy" />
    </div>
    <div className="flex flex-col justify-between py-1 flex-grow min-w-0">
      <div>
        <div className="flex justify-between gap-2">
          <h3 className="text-sm font-bold truncate leading-tight flex-grow">{book.title}</h3>
          {book.isExisting ? (
            <Bookmark size={14} className="text-emerald-500 flex-shrink-0" />
          ) : (
            <Plus size={14} className="text-primary flex-shrink-0" />
          )}
        </div>
        <p className="text-[11px] text-slate-500 mt-1 truncate">{book.author} | {book.publisher}</p>
        {book.isExisting ? (
          <span className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-md border border-emerald-100">
            <CheckCircle2 size={10} />
            도서관 보유 중
          </span>
        ) : (
          <span className="mt-2 inline-block px-2 py-0.5 bg-sky-50 text-primary text-[10px] font-bold rounded-md border border-sky-100">
            미보유 (신청 가능)
          </span>
        )}
      </div>

      {!book.isExisting && (
        <button
          onClick={() => onRequest(book)}
          className="mt-3 w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-sky-500 transition-all flex items-center justify-center gap-2 shadow-sm"
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
));

interface HistoryItemProps {
  item: { date: string; role: string; title: string; author: string; publisher: string };
  idx: number;
}

const HistoryItem: React.FC<HistoryItemProps> = React.memo(({ item, idx }) => (
  <motion.div
    key={idx}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: idx * 0.05 }}
    className="glass border-slate-200/50 rounded-2xl p-4"
  >
    <div className="flex justify-between items-start mb-2">
      <h3 className="text-sm font-bold flex-grow pr-2 text-slate-800">{item.title}</h3>
      <span className="text-[10px] bg-sky-50 text-primary font-bold px-2 py-0.5 rounded-md flex-shrink-0 border border-sky-100">{item.role}</span>
    </div>
    <p className="text-[11px] text-slate-500">{item.author} | {item.publisher}</p>
    <p className="text-[10px] text-slate-600 mt-1">{new Date(item.date).toLocaleDateString('ko-KR')}</p>
  </motion.div>
));

// --- 메인 앱 ---

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'admin'>('home');
  const [user, setUser] = useState<{ name: string, email: string, role: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<BookInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isRequesting, setIsRequesting] = useState<string | null>(null);
  const [history, setHistory] = useState<{ date: string, role: string, title: string, author: string, publisher: string }[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ name: '', role: '학생', grade: '', classNum: '' });
  const [, startTransition] = useTransition();

  // 관리자
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [aladinKey, setAladinKey] = useState(() => localStorage.getItem('aladinKey') || DEFAULT_ALADIN_API_KEY);
  const [nlKey, setNlKey] = useState(() => localStorage.getItem('nlKey') || DEFAULT_NL_API_KEY);
  const [aladinKeyInput, setAladinKeyInput] = useState('');
  const [nlKeyInput, setNlKeyInput] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

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

  const handleLogout = () => { setUser(null); setHistory([]); };

  const handleAdminUnlock = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAdminUnlocked(true);
      setAladinKeyInput(aladinKey);
      setNlKeyInput(nlKey);
    } else {
      alert('비밀번호가 올바르지 않습니다.');
    }
    setAdminPassword('');
  };

  const handleSaveKeys = () => {
    if (aladinKeyInput.trim()) {
      localStorage.setItem('aladinKey', aladinKeyInput.trim());
      setAladinKey(aladinKeyInput.trim());
    }
    if (nlKeyInput.trim()) {
      localStorage.setItem('nlKey', nlKeyInput.trim());
      setNlKey(nlKeyInput.trim());
    }
    alert('저장됐습니다.');
  };

  const handleDownloadExcel = async () => {
    setIsDownloading(true);
    try {
      const url = `${GAS_URL}?action=allRequests`;
      const proxyUrl = `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl);
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        alert('신청 데이터가 없습니다.');
        return;
      }
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '신청내역');
      XLSX.writeFile(wb, `희망도서신청목록_${new Date().toLocaleDateString('ko-KR').replace(/\. /g, '-').replace('.', '')}.xlsx`);
    } catch (e) {
      console.error('다운로드 실패:', e);
      alert('다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsDownloading(false);
    }
  };

  const fetchHistory = async (name: string) => {
    setIsLoadingHistory(true);
    try {
      const url = `${GAS_URL}?action=history&name=${encodeURIComponent(name)}`;
      const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (Array.isArray(data)) setHistory(data);
    } catch (e) {
      console.error('신청내역 조회 실패:', e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const searchBooks = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setResults([]);

    try {
      const gasProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`${GAS_URL}?query=${encodeURIComponent(searchQuery)}`)}`;
      const baseUrl = `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx?ttbkey=${aladinKey}&Query=${encodeURIComponent(searchQuery)}&QueryType=Keyword&MaxResults=10&start=1&SearchTarget=Book&output=js&Version=20131101`;
      const aladinProxyUrl = `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(baseUrl)}`;

      // 1 & 2. GAS + 알라딘 병렬 fetch
      const [gasData, aladinData] = await Promise.all([
        fetch(gasProxyUrl).then(r => r.json()).catch(() => null),
        fetch(aladinProxyUrl).then(r => r.json()).catch(() => null),
      ]);

      // GAS 결과 처리
      let existingBooks: BookInfo[] = [];
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

      // 알라딘 결과 처리
      const aladinItems = (aladinData?.item || []).map((item: any) => ({
        title: item.title.replace(/<[^>]*>?/gm, ''),
        author: item.author.replace(/<[^>]*>?/gm, ''),
        publisher: item.publisher,
        price: item.priceStandard,
        isbn: item.isbn13 || item.isbn,
        coverUrl: item.cover,
        isExisting: false
      }));

      // 3. 데이터 통합: 제목이 완전히 동일한 경우만 중복 처리
      const existingTitleSet = new Set(existingBooks.map(b => normalize(b.title)));
      const combined = [...existingBooks];
      aladinItems.forEach((item: BookInfo) => {
        if (!existingTitleSet.has(normalize(item.title))) {
          combined.push(item);
        }
      });
      setResults(combined);
    } catch (error) {
      console.error("검색 중 오류 발생:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const fetchKdcClass = async (isbn: string): Promise<{ kdcCode: string; kdcName: string; callNo: string }> => {
    if (!nlKey) return { kdcCode: '', kdcName: '', callNo: '' };
    try {
      const apiUrl = `https://www.nl.go.kr/NL/search/openApi/search.do?key=${nlKey}&apiType=json&kwd=${isbn}&isbnYn=Y&pageSize=1`;
      const proxyUrl = `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(apiUrl)}`;
      const res = await fetch(proxyUrl);
      const data = await res.json();
      const item = data?.result?.[0];
      if (!item) return { kdcCode: '', kdcName: '', callNo: '' };
      return {
        kdcCode: item.classNo || '',
        kdcName: item.kdcName1s || '',
        callNo: item.callNo || '',
      };
    } catch (e) {
      console.error('KDC 분류 조회 실패:', e);
      return { kdcCode: '', kdcName: '', callNo: '' };
    }
  };

  const requestBook = async (book: BookInfo) => {
    if (!user) {
      alert("신청을 위해 로그인이 필요합니다.");
      return;
    }

    setIsRequesting(book.isbn);
    try {
      const { kdcCode, kdcName, callNo } = await fetchKdcClass(book.isbn);

      // 중복 신청 체크
      const checkUrl = `${GAS_URL}?action=checkDuplicate&isbn=${encodeURIComponent(book.isbn)}`;
      const checkProxyUrl = `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(checkUrl)}`;
      const checkRes = await fetch(checkProxyUrl);
      const checkResult = await checkRes.json();

      if (checkResult.isDuplicate) {
        alert(`'${book.title}'은(는) 이미 신청된 도서입니다.`);
        return;
      }

      await fetch(GAS_URL, {
        method: 'POST',
        body: JSON.stringify({
          ...book,
          kdcCode,
          kdcName,
          callNo,
          requester: user.name,
          requesterName: user.name,
          requesterRole: user.role
        }),
        mode: 'no-cors'
      });

      alert(`'${book.title}' 희망도서 신청이 완료되었습니다!`);
    } catch (error) {
      console.error("신청 실패:", error);
      alert("신청 중에 오류가 발생했습니다.");
    } finally {
      setIsRequesting(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-24 font-['Pretendard']">

      {/* 로그인 모달 */}
      <AnimatePresence>
        {showLoginModal && (
          <LoginModal
            loginForm={loginForm}
            setLoginForm={setLoginForm}
            onSubmit={handleLoginSubmit}
            onClose={() => setShowLoginModal(false)}
          />
        )}
      </AnimatePresence>

      {/* 고정 헤더 */}
      <header className="sticky top-0 z-40 p-5 bg-white/70 backdrop-blur-xl border-b border-slate-200/50">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-800">MY LAB <span className="text-primary">WEB</span></h1>
          </div>
          {user ? (
            <div onClick={handleLogout} className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-primary/20 cursor-pointer">
              <span className="text-xs font-medium text-primary">{user.name} 님</span>
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <User size={14} className="text-white" />
              </div>
            </div>
          ) : (
            <button onClick={handleLogin} className="text-xs font-bold bg-primary text-white px-4 py-2 rounded-full shadow-lg shadow-sky-200 hover:bg-sky-500 transition-all">
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
              <h2 className="text-2xl font-bold mb-2 text-slate-800">어떤 책을 원하시나요?</h2>
              <p className="text-sm text-slate-500">보유 도서를 검색하고, 없는 책을 신청하세요.</p>
            </motion.div>

            {/* 검색창 */}
            <div className="relative mb-8 group">
              <div className="flex items-center bg-white border border-slate-200 rounded-2xl focus-within:border-primary/50 shadow-sm focus-within:shadow-md transition-all p-1.5">
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
                  className="bg-primary hover:bg-sky-500 text-white h-12 px-6 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-sky-100"
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
                  <BookCard
                    key={book.isbn + idx}
                    book={book}
                    isRequesting={isRequesting}
                    onRequest={requestBook}
                    idx={idx}
                  />
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
          <>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <h2 className="text-2xl font-bold mb-1 text-slate-800">신청현황</h2>
              <p className="text-sm text-slate-500">{user ? `${user.name} 님의 희망도서 신청 내역` : '로그인 후 확인할 수 있어요.'}</p>
            </motion.div>

            {!user ? (
              <div className="py-20 text-center opacity-40">
                <History size={48} className="mx-auto mb-4" />
                <p className="text-sm font-medium">로그인이 필요합니다.</p>
              </div>
            ) : isLoadingHistory ? (
              <div className="py-20 text-center opacity-40">
                <Loader2 size={36} className="mx-auto mb-4 animate-spin" />
                <p className="text-sm font-medium">불러오는 중...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="py-20 text-center opacity-40">
                <History size={48} className="mx-auto mb-4" />
                <p className="text-sm font-medium">신청 내역이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item, idx) => (
                  <HistoryItem key={idx} item={item} idx={idx} />
                ))}
              </div>
            )}
          </>
        )}

        {/* 관리자 탭 */}
        {activeTab === 'admin' && (
          <>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <h2 className="text-2xl font-bold mb-1 text-slate-800">관리자</h2>
              <p className="text-sm text-slate-500">API 키 설정 및 신청목록 다운로드</p>
            </motion.div>

            {!isAdminUnlocked ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Lock size={16} className="text-slate-400" />
                  <span className="text-sm font-bold text-slate-700">관리자 비밀번호</span>
                </div>
                <input
                  type="password"
                  placeholder="비밀번호 입력"
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 focus:bg-white transition-all mb-3"
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdminUnlock()}
                />
                <button
                  onClick={handleAdminUnlock}
                  className="w-full bg-primary text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-sky-200 hover:bg-sky-500 transition-all"
                >
                  확인
                </button>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {/* 신청목록 다운로드 */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-3xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Download size={16} className="text-slate-400" />
                    <span className="text-sm font-bold text-slate-700">신청목록 다운로드</span>
                  </div>
                  <button
                    onClick={handleDownloadExcel}
                    disabled={isDownloading}
                    className="w-full bg-emerald-500 text-white font-bold py-3 rounded-xl text-sm hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
                  >
                    {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                    {isDownloading ? '다운로드 중...' : 'Excel 다운로드'}
                  </button>
                </motion.div>

                {/* API 키 설정 */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass rounded-3xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Key size={16} className="text-slate-400" />
                    <span className="text-sm font-bold text-slate-700">API 키 설정</span>
                  </div>
                  <label className="text-xs text-slate-500 block mb-1.5">알라딘 API 키</label>
                  <input
                    type="text"
                    placeholder={DEFAULT_ALADIN_API_KEY}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 focus:bg-white transition-all mb-4 font-mono"
                    value={aladinKeyInput}
                    onChange={e => setAladinKeyInput(e.target.value)}
                  />
                  <label className="text-xs text-slate-500 block mb-1.5">국립중앙도서관 API 키</label>
                  <input
                    type="text"
                    placeholder={DEFAULT_NL_API_KEY}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 focus:bg-white transition-all mb-4 font-mono"
                    value={nlKeyInput}
                    onChange={e => setNlKeyInput(e.target.value)}
                  />
                  <button
                    onClick={handleSaveKeys}
                    className="w-full bg-primary text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-sky-200 hover:bg-sky-500 transition-all"
                  >
                    저장
                  </button>
                </motion.div>
              </div>
            )}
          </>
        )}
      </main>

      {/* 네이티브 스타일 하단 바 */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white/70 backdrop-blur-2xl border-t border-slate-200/50 flex justify-around items-center px-6 pb-4">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'home' ? 'text-primary' : 'text-slate-400'}`}
        >
          <Home size={activeTab === 'home' ? 24 : 22} />
          <span className="text-[10px] font-bold">홈</span>
        </button>
        <button
          onClick={() => {
            startTransition(() => { setActiveTab('history'); });
            if (user) fetchHistory(user.name);
          }}
          className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'history' ? 'text-primary' : 'text-slate-400'}`}
        >
          <History size={activeTab === 'history' ? 24 : 22} />
          <span className="text-[10px] font-bold">신청현황</span>
        </button>
        <button
          onClick={() => { setActiveTab('admin'); setIsAdminUnlocked(false); }}
          className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'admin' ? 'text-primary' : 'text-slate-400'}`}
        >
          <Settings size={activeTab === 'admin' ? 24 : 22} />
          <span className="text-[10px] font-bold">관리자</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
