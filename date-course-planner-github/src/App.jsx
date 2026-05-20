import { useState, useEffect } from "react";

const uid = () => Math.random().toString(36).slice(2, 10);

const STORAGE_KEY = "date-course-planner-v2";

const loadCourses = async () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const saveCourses = async (courses) => {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(courses)); }
  catch (e) { console.error("Storage error:", e); }
};

// Extract place name from Naver map URL path
function extractNameFromURL(url) {
  try {
    const decoded = decodeURIComponent(url);
    // map.naver.com/v5/search/장소이름/...
    const searchMatch = decoded.match(/\/search\/([^/?#]+)/);
    if (searchMatch) return searchMatch[1].replace(/\+/g, " ");
    // Try query param 'query'
    const u = new URL(url);
    const q = u.searchParams.get("query");
    if (q) return q;
    return null;
  } catch { return null; }
}

function isNaverMapLink(url) {
  try {
    const u = new URL(url);
    return (
      u.hostname.includes("naver.me") ||
      u.hostname.includes("map.naver.com") ||
      u.hostname.includes("place.naver.com") ||
      u.hostname.includes("pcmap.place.naver.com") ||
      u.hostname.includes("m.place.naver.com")
    );
  } catch { return false; }
}

// ── Icons as simple SVG components ──
function IconPlus({ size = 18, color = "currentColor" }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>);
}
function IconBack({ size = 20, color = "currentColor" }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>);
}
function IconEdit({ size = 15, color = "currentColor" }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>);
}
function IconTrash({ size = 15, color = "currentColor" }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>);
}
function IconMap({ size = 14, color = "currentColor" }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>);
}
function IconChevron({ size = 18, color = "currentColor" }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>);
}
function IconLink({ size = 14, color = "currentColor" }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>);
}
function IconGrip({ size = 16, color = "#C8B8A8" }) {
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill={color}><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>);
}

// ── Place Form Modal ──
function PlaceFormModal({ place, onSave, onCancel }) {
  const [link, setLink] = useState(place?.link || "");
  const [name, setName] = useState(place?.name || "");
  const [startTime, setStartTime] = useState(place?.startTime || "");
  const [endTime, setEndTime] = useState(place?.endTime || "");
  const [memo, setMemo] = useState(place?.memo || "");
  const [linkError, setLinkError] = useState("");
  const [needsName, setNeedsName] = useState(!!place?.name && !place?.autoName);

  const handleLinkChange = (val) => {
    setLink(val);
    setLinkError("");
    if (val.trim() && isNaverMapLink(val.trim())) {
      const extracted = extractNameFromURL(val.trim());
      if (extracted) {
        setName(extracted);
        setNeedsName(false);
      } else {
        setNeedsName(true);
        if (!place) setName("");
      }
    } else if (val.trim()) {
      setLinkError("네이버 지도 링크를 넣어주세요");
    }
  };

  const canSave = link.trim() && isNaverMapLink(link.trim()) && name.trim();

  return (
    <div style={S.overlay} onClick={onCancel}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <h3 style={S.modalTitle}>{place ? "장소 수정" : "장소 추가"}</h3>

        <label style={S.label}>네이버 지도 링크</label>
        <div style={{ position: "relative" }}>
          <input
            style={{ ...S.input, paddingLeft: 36 }}
            placeholder="네이버 지도에서 링크 복사 후 붙여넣기"
            value={link}
            onChange={e => handleLinkChange(e.target.value)}
            autoFocus
          />
          <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", opacity: 0.4 }}>
            <IconLink size={16} color="#8A7A6A" />
          </div>
        </div>
        {linkError && <p style={{ color: "#D4836A", fontSize: 12, margin: "4px 0 0" }}>{linkError}</p>}

        {(needsName || name) && (
          <>
            <label style={S.label}>
              장소 이름
              {!needsName && <span style={{ fontWeight: 400, color: "#B0A090", marginLeft: 6 }}>자동 추출됨</span>}
            </label>
            <input
              style={S.input}
              placeholder="장소 이름 입력"
              value={name}
              onChange={e => setName(e.target.value)}
              readOnly={!needsName}
            />
          </>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={S.label}>시작</label>
            <input style={S.input} type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={S.label}>종료</label>
            <input style={S.input} type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
          </div>
        </div>

        <label style={S.label}>메모</label>
        <textarea
          style={{ ...S.input, minHeight: 72, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
          placeholder="분위기, 꿀팁, 추천 메뉴 등"
          value={memo}
          onChange={e => setMemo(e.target.value)}
        />

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button style={S.btnGhost} onClick={onCancel}>취소</button>
          <button
            style={{ ...S.btnFill, opacity: canSave ? 1 : 0.45 }}
            disabled={!canSave}
            onClick={() => onSave({
              id: place?.id || uid(),
              link: link.trim(),
              name: name.trim(),
              autoName: !needsName,
              startTime, endTime,
              memo: memo.trim(),
            })}
          >저장</button>
        </div>
      </div>
    </div>
  );
}

// ── Course Form Modal ──
function CourseFormModal({ course, onSave, onCancel }) {
  const [name, setName] = useState(course?.name || "");
  const [date, setDate] = useState(course?.date || "");

  return (
    <div style={S.overlay} onClick={onCancel}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <h3 style={S.modalTitle}>{course ? "코스 수정" : "새 코스"}</h3>

        <label style={S.label}>코스 이름</label>
        <input style={S.input} placeholder="예: 성수동 주말 데이트" value={name} onChange={e => setName(e.target.value)} autoFocus />

        <label style={S.label}>날짜 (선택)</label>
        <input style={S.input} type="date" value={date} onChange={e => setDate(e.target.value)} />

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button style={S.btnGhost} onClick={onCancel}>취소</button>
          <button
            style={{ ...S.btnFill, opacity: name.trim() ? 1 : 0.45 }}
            disabled={!name.trim()}
            onClick={() => onSave({
              id: course?.id || uid(),
              name: name.trim(),
              date,
              places: course?.places || [],
            })}
          >저장</button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm ──
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div style={S.overlay} onClick={onCancel}>
      <div style={{ ...S.modal, textAlign: "center" }} onClick={e => e.stopPropagation()}>
        <p style={{ color: "#5A4A3A", fontSize: 15, lineHeight: 1.7, margin: "0 0 24px" }}>{message}</p>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={S.btnGhost} onClick={onCancel}>취소</button>
          <button style={{ ...S.btnFill, background: "#C9785C" }} onClick={onConfirm}>삭제</button>
        </div>
      </div>
    </div>
  );
}

// ── Timeline Place Card ──
function PlaceCard({ place, index, total, onEdit, onDelete, onDragStart, onDragOver, onDragEnd, isDragging }) {
  const fmt = (t) => {
    if (!t) return "";
    const [h, m] = t.split(":");
    const hr = parseInt(h);
    return `${hr < 12 ? "오전" : "오후"} ${hr === 0 ? 12 : hr > 12 ? hr - 12 : hr}:${m}`;
  };
  const time = place.startTime && place.endTime
    ? `${fmt(place.startTime)} — ${fmt(place.endTime)}`
    : place.startTime ? `${fmt(place.startTime)} ~` : "";

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      style={{ opacity: isDragging ? 0.4 : 1, cursor: "grab" }}
    >
      <div style={{ display: "flex", gap: 16 }}>
        {/* Timeline rail */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 24, flexShrink: 0 }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: "#C9A87C", border: "2.5px solid #E8D8C4",
            boxShadow: "0 0 0 4px #F5EDE4", zIndex: 2,
          }} />
          {index < total - 1 && (
            <div style={{ width: 1.5, flex: 1, background: "#E0D4C4", marginTop: 4 }} />
          )}
        </div>

        {/* Card */}
        <div style={S.placeCard}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <div style={{ marginTop: 2, opacity: 0.3, cursor: "grab" }}><IconGrip /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <a
                href={place.link}
                target="_blank"
                rel="noopener noreferrer"
                style={S.placeLink}
              >
                <IconMap size={13} color="#C9A87C" />
                <span>{place.name}</span>
              </a>
              {time && <div style={S.placeTime}>{time}</div>}
              {place.memo && <div style={S.placeMemo}>{place.memo}</div>}
            </div>
            <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
              <button style={S.tinyBtn} onClick={onEdit}><IconEdit color="#B0A090" /></button>
              <button style={S.tinyBtn} onClick={onDelete}><IconTrash color="#B0A090" /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main App ──
export default function App() {
  const [courses, setCourses] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editCourse, setEditCourse] = useState(null);
  const [showPlaceForm, setShowPlaceForm] = useState(false);
  const [editPlace, setEditPlace] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dragIdx, setDragIdx] = useState(null);

  useEffect(() => { loadCourses().then(d => { setCourses(d); setLoading(false); }); }, []);
  useEffect(() => { if (!loading) saveCourses(courses); }, [courses, loading]);

  const active = courses.find(c => c.id === activeId);

  const saveCourse = (c) => {
    setCourses(prev => {
      const i = prev.findIndex(x => x.id === c.id);
      if (i >= 0) { const n = [...prev]; n[i] = { ...n[i], name: c.name, date: c.date }; return n; }
      return [...prev, c];
    });
    setShowCourseForm(false); setEditCourse(null);
  };
  const deleteCourse = (id) => {
    setCourses(prev => prev.filter(c => c.id !== id));
    if (activeId === id) setActiveId(null);
    setConfirm(null);
  };
  const savePlace = (p) => {
    setCourses(prev => prev.map(c => {
      if (c.id !== activeId) return c;
      const i = c.places.findIndex(x => x.id === p.id);
      if (i >= 0) { const n = [...c.places]; n[i] = p; return { ...c, places: n }; }
      return { ...c, places: [...c.places, p] };
    }));
    setShowPlaceForm(false); setEditPlace(null);
  };
  const deletePlace = (pid) => {
    setCourses(prev => prev.map(c => c.id !== activeId ? c : { ...c, places: c.places.filter(p => p.id !== pid) }));
    setConfirm(null);
  };
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setCourses(prev => prev.map(c => {
      if (c.id !== activeId) return c;
      const ps = [...c.places]; const [m] = ps.splice(dragIdx, 1); ps.splice(idx, 0, m);
      return { ...c, places: ps };
    }));
    setDragIdx(idx);
  };

  const formatDate = (d) => {
    if (!d) return "";
    const [y, m, day] = d.split("-");
    const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
    const dt = new Date(d);
    return `${parseInt(m)}월 ${parseInt(day)}일 (${weekdays[dt.getDay()]})`;
  };

  if (loading) return (
    <div style={S.container}>
      <div style={{ textAlign: "center", paddingTop: 120, color: "#B0A090", fontSize: 14 }}>불러오는 중...</div>
    </div>
  );

  // ═══ COURSE LIST ═══
  if (!activeId) return (
    <div style={S.container}>
      <div style={S.header}>
        <h1 style={S.headerTitle}>데이트 플래너</h1>
        <p style={S.headerSub}>소중한 하루를 계획해보세요</p>
      </div>

      <div style={{ padding: "0 20px 100px" }}>
        {courses.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.5 }}>♡</div>
            <p style={{ color: "#B0A090", fontSize: 14, margin: 0 }}>아직 코스가 없어요</p>
            <p style={{ color: "#C8B8A8", fontSize: 12.5, margin: "4px 0 0" }}>아래 버튼으로 첫 코스를 만들어보세요</p>
          </div>
        ) : (
          courses.map(c => (
            <div key={c.id} style={S.courseRow} onClick={() => setActiveId(c.id)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.courseName}>{c.name}</div>
                <div style={S.courseMeta}>
                  {c.date ? formatDate(c.date) : "날짜 미정"}
                  <span style={{ margin: "0 6px", opacity: 0.3 }}>·</span>
                  {c.places.length}개 장소
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 2 }} onClick={e => e.stopPropagation()}>
                <button style={S.tinyBtn} onClick={() => { setEditCourse(c); setShowCourseForm(true); }}><IconEdit color="#B0A090" /></button>
                <button style={S.tinyBtn} onClick={() => setConfirm({ type: "course", id: c.id, name: c.name })}><IconTrash color="#B0A090" /></button>
                <div style={{ marginLeft: 4, opacity: 0.3 }}><IconChevron color="#8A7A6A" /></div>
              </div>
            </div>
          ))
        )}
      </div>

      <button style={S.fab} onClick={() => { setEditCourse(null); setShowCourseForm(true); }}>
        <IconPlus size={18} color="#fff" /> <span>새 코스</span>
      </button>

      {showCourseForm && <CourseFormModal course={editCourse} onSave={saveCourse} onCancel={() => { setShowCourseForm(false); setEditCourse(null); }} />}
      {confirm && <ConfirmDialog message={`"${confirm.name}" 코스를 삭제할까요?`} onConfirm={() => deleteCourse(confirm.id)} onCancel={() => setConfirm(null)} />}
    </div>
  );

  // ═══ TIMELINE VIEW ═══
  return (
    <div style={S.container}>
      <div style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button style={S.backBtn} onClick={() => setActiveId(null)}><IconBack color="#7A6A5A" /></button>
          <div>
            <h1 style={{ ...S.headerTitle, fontSize: 18 }}>{active?.name}</h1>
            <p style={S.headerSub}>
              {active?.date ? formatDate(active.date) : "날짜 미정"}
              <span style={{ margin: "0 6px", opacity: 0.3 }}>·</span>
              {active?.places.length || 0}개 장소
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding: "24px 20px 100px" }}>
        {active?.places.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 28, marginBottom: 10, opacity: 0.4 }}>📍</div>
            <p style={{ color: "#B0A090", fontSize: 14, margin: 0 }}>아직 장소가 없어요</p>
            <p style={{ color: "#C8B8A8", fontSize: 12.5, margin: "4px 0 0" }}>네이버 지도 링크로 장소를 추가해보세요</p>
          </div>
        ) : (
          active.places.map((p, i) => (
            <PlaceCard
              key={p.id} place={p} index={i} total={active.places.length}
              onEdit={() => { setEditPlace(p); setShowPlaceForm(true); }}
              onDelete={() => setConfirm({ type: "place", id: p.id, name: p.name })}
              onDragStart={() => setDragIdx(i)}
              onDragOver={e => handleDragOver(e, i)}
              onDragEnd={() => setDragIdx(null)}
              isDragging={dragIdx === i}
            />
          ))
        )}
      </div>

      <button style={S.fab} onClick={() => { setEditPlace(null); setShowPlaceForm(true); }}>
        <IconPlus size={18} color="#fff" /> <span>장소 추가</span>
      </button>

      {showPlaceForm && <PlaceFormModal place={editPlace} onSave={savePlace} onCancel={() => { setShowPlaceForm(false); setEditPlace(null); }} />}
      {confirm && <ConfirmDialog
        message={`"${confirm.name}"${confirm.type === "course" ? " 코스를" : " 장소를"} 삭제할까요?`}
        onConfirm={() => confirm.type === "course" ? deleteCourse(confirm.id) : deletePlace(confirm.id)}
        onCancel={() => setConfirm(null)}
      />}
    </div>
  );
}

// ── Styles ──
const S = {
  container: {
    maxWidth: 480, margin: "0 auto", minHeight: "100vh",
    background: "linear-gradient(180deg, #FAF6F1 0%, #F5EDE4 100%)",
    fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    position: "relative",
  },
  header: {
    padding: "28px 20px 18px",
    borderBottom: "1px solid #EDE4D8",
    position: "sticky", top: 0, zIndex: 10,
    background: "rgba(250,246,241,0.92)", backdropFilter: "blur(12px)",
  },
  headerTitle: {
    margin: 0, fontSize: 21, fontWeight: 700, color: "#4A3A2A",
    letterSpacing: "-0.3px",
  },
  headerSub: {
    margin: "3px 0 0", fontSize: 12.5, color: "#A89888", fontWeight: 500,
  },
  backBtn: {
    background: "none", border: "none", cursor: "pointer", padding: 6,
    borderRadius: 10, display: "flex", alignItems: "center",
  },
  empty: {
    textAlign: "center", padding: "56px 20px",
  },
  courseRow: {
    display: "flex", alignItems: "center",
    background: "#fff", borderRadius: 14, padding: "16px 16px",
    marginBottom: 8, border: "1px solid #EDE4D8",
    boxShadow: "0 1px 4px rgba(74,58,42,0.04)",
    cursor: "pointer", transition: "box-shadow 0.15s",
  },
  courseName: {
    fontWeight: 650, color: "#4A3A2A", fontSize: 15.5,
  },
  courseMeta: {
    fontSize: 12, color: "#A89888", marginTop: 3, fontWeight: 500,
  },
  placeCard: {
    flex: 1, background: "#fff", borderRadius: 14,
    padding: "14px 14px 14px 10px", marginBottom: 16,
    border: "1px solid #EDE4D8",
    boxShadow: "0 1px 4px rgba(74,58,42,0.04)",
  },
  placeLink: {
    display: "inline-flex", alignItems: "center", gap: 5,
    fontSize: 15, fontWeight: 650, color: "#4A3A2A",
    textDecoration: "none", cursor: "pointer",
    borderBottom: "1.5px dashed #D4C4B0",
    paddingBottom: 1, transition: "color 0.15s",
  },
  placeTime: {
    marginTop: 6, fontSize: 12.5, color: "#A89888", fontWeight: 500,
  },
  placeMemo: {
    marginTop: 8, fontSize: 13, color: "#6A5A4A", lineHeight: 1.65,
    background: "#FAF6F1", borderRadius: 10, padding: "10px 12px",
    borderLeft: "2.5px solid #D4C4B0",
  },
  fab: {
    position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
    background: "#B09070", color: "#fff", border: "none",
    borderRadius: 50, padding: "13px 26px",
    fontSize: 14, fontWeight: 650, cursor: "pointer",
    boxShadow: "0 4px 16px rgba(140,110,80,0.3)",
    zIndex: 20, fontFamily: "inherit",
    display: "flex", alignItems: "center", gap: 6,
  },
  tinyBtn: {
    background: "none", border: "none", cursor: "pointer",
    padding: 6, borderRadius: 8, display: "flex", alignItems: "center",
  },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(74,58,42,0.2)",
    backdropFilter: "blur(4px)", display: "flex",
    alignItems: "center", justifyContent: "center",
    zIndex: 100, padding: 20,
  },
  modal: {
    background: "#FEFCF9", borderRadius: 20, padding: "28px 24px",
    width: "100%", maxWidth: 400,
    boxShadow: "0 8px 40px rgba(74,58,42,0.12)",
    border: "1px solid #EDE4D8",
  },
  modalTitle: {
    margin: "0 0 20px", fontSize: 18, fontWeight: 700, color: "#4A3A2A",
  },
  label: {
    display: "block", fontSize: 12.5, fontWeight: 600, color: "#8A7A6A",
    marginBottom: 6, marginTop: 16,
  },
  input: {
    width: "100%", padding: "11px 14px", borderRadius: 12,
    border: "1.5px solid #E4D8C8", fontSize: 14, color: "#4A3A2A",
    outline: "none", background: "#FEFCF9", boxSizing: "border-box",
    fontFamily: "inherit", transition: "border-color 0.15s",
  },
  btnFill: {
    flex: 1, padding: "12px 0", borderRadius: 12, border: "none",
    background: "#B09070", color: "#fff", fontSize: 14,
    fontWeight: 650, cursor: "pointer", fontFamily: "inherit",
  },
  btnGhost: {
    flex: 1, padding: "12px 0", borderRadius: 12,
    border: "1.5px solid #E4D8C8", background: "transparent",
    color: "#8A7A6A", fontSize: 14, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
  },
};
