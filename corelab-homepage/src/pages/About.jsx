import { Fragment, useEffect, useRef, useState } from 'react'
import { useData } from '../hooks/useData'
import { useAdminAuth } from '../admin/AdminAuthContext'
import { saveData } from '../admin/dataStore'
import { siteIntroFields } from '../admin/schemas'
import EditModal from '../components/admin/LazyEditModal'
import { EditButton } from '../components/admin/AdminControls'
import SafeImage from '../components/SafeImage'
import Link from '../router/Link'
import { useHashRoute, newsHref } from '../router/useHashRoute'
import { scrollToSection } from '../router/scrollToSection'
import HeroIntro from '../components/HeroIntro'
import SoftJustify from '../components/SoftJustify'
import { fixLabName, fixLabNameDeep } from '../utils/labName'
import { useLang, fillSeed } from '../i18n/LangContext'

// 메인 화면의 소속 문구. 관리자 화면에 영문으로 저장된 세 줄(대학교 / 학과 / 교수)이 기본값 그대로일 때만
// 화면용 문구로 바꿔 보여 주고, 직접 고쳐 쓴 문구는 입력한 그대로 보입니다.
//   한글: 이화여자대학교 사범대학 교육공학과 (강조) / 임규연 교수 연구실
//   영어: Ewha Womans University · College of Education · Educational Technology (강조) / Prof. Kyu Yon Lim's Lab
const HERO_AFF_DEFAULT = ['ewha womans university', 'department of educational technology', 'prof. kyu yon lim']
const HERO_AFF_KO = {
  'ewha womans university': '이화여자대학교',
  'department of educational technology': '교육공학과',
  'prof. kyu yon lim': '임규연 교수 연구실',
}
function heroAffiliationFor(en, lines) {
  const norm = lines.map((l) => String(l).trim().toLowerCase())
  const isDefault = norm.length === 3 && norm.every((l, i) => l === HERO_AFF_DEFAULT[i])
  if (isDefault) {
    return en
      ? { lines: ['Ewha Womans University · College of Education · Educational Technology', "Prof. Kyu Yon Lim's Lab"], strong: 0 }
      : { lines: ['이화여자대학교 사범대학 교육공학과', '임규연 교수 연구실'], strong: 0 }
  }
  return { lines: en ? lines : lines.map((l, i) => HERO_AFF_KO[norm[i]] ?? l), strong: 1 }
}

function NewsPreview() {
  const { data } = useData('news.json')
  const { tr, loc } = useLang()
  // 숨긴 소식은 홈 화면 미리보기에 넣지 않습니다.
  const items = (data ?? []).filter((i) => !i.hidden).slice(0, 4)

  if (items.length === 0) return null

  return (
    <section className="section news-preview">
      <div className="news-preview-head">
        <h2 className="section-title">Latest News</h2>
        <Link to="/news" className="news-preview-more">
          {tr('News 더보기 →', 'More news →')}
        </Link>
      </div>
      <div className="news-preview-grid">
        {items.map((item) => {
          const thumb = Array.isArray(item.images) ? item.images[0] : item.images || item.thumbnail
          const it = loc(item, 'news')
          return (
            <Link key={item.id} to={newsHref(item.id)} className="news-preview-card">
              <div className="news-preview-thumb">
                <SafeImage src={thumb} alt="" fallback={<span />} />
              </div>
              <h3 className="title">{it.title}</h3>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export default function About() {
  const { data, error, loading } = useData('site.json')
  const { token } = useAdminAuth()
  const [editing, setEditing] = useState(false)
  const { query } = useHashRoute()
  const { en, tr, loc, seedOf } = useLang()
  const ready = !(loading && !data)
  const overviewRef = useRef(null)
  // (모바일 양쪽 정렬 다듬기 훅은 모바일을 왼쪽 정렬로 바꾸면서 쓰지 않습니다)

  // 다른 페이지에서 About을 눌러 들어오면(/?section=overview) Lab Overview로 내려갑니다.
  // (페이지가 바뀔 때 App이 맨 위로 올리는 동작이 끝난 뒤에 이동하도록 잠깐 기다립니다.)
  useEffect(() => {
    if (!ready || query.section !== 'overview') return
    const t = setTimeout(() => scrollToSection('overview'), 80)
    return () => clearTimeout(t)
  }, [ready, query.section])

  if (loading && !data) return <div className="page container">{tr('불러오는 중...', 'Loading...')}</div>
  if (error) return <div className="page container error-state">{error}</div>

  const { labName = '', labTagline: rawTagline = '', mottoKr, mottoEn, heroAffiliation = [], overview: rawOverview = [], researchAreas = [] } =
    loc(data ?? {}, 'site')
  // 정식 영문명은 교수님 확정안("Collaborative Learning Research Lab")으로 보이게 합니다 (labName.js)
  const labTagline = fixLabName(rawTagline)
  const overview = fixLabNameDeep(rawOverview)

  const aff = heroAffiliationFor(en, heroAffiliation)

  const handleSave = (values) =>
    saveData(token, 'site.json', (d) => ({ ...d, ...values }), '홈 소개글 수정')

  return (
    <div className="page page-home container">
      <div className="admin-item">
        <EditButton onClick={() => setEditing(true)} label="소개 내용 수정" />

        <HeroIntro
          labName={labName}
          tagline={labTagline}
          affiliation={aff.lines}
          affStrong={aff.strong}
          motto={mottoEn}
        />

        <section className="section" id="overview" ref={overviewRef}>
          <h2 className="section-title">Lab Overview</h2>

          {(mottoKr || mottoEn) &&
            (en ? (
              // 영어 화면: 영문 모토를 큰 글씨로 한 번만
              <div className="lab-motto">
                <p className="lab-motto-kr lab-motto-en-main">{mottoEn || mottoKr}</p>
              </div>
            ) : (
              // 한국어 화면: 한글 모토만 (영문 모토는 위 메인 화면에 이미 있어 반복하지 않음)
              <div className="lab-motto">
                <p className="lab-motto-kr">{mottoKr || mottoEn}</p>
              </div>
            ))}

          {overview.map((paragraph, i) => (
            <SoftJustify key={i} text={String(paragraph)} />
          ))}

          {researchAreas.length > 0 && (
            // 연구 키워드: 칩 대신 가운뎃점으로 이은 한 줄 (키워드 하나는 중간에서 줄이 바뀌지 않고,
            // 줄이 바뀐 자리의 맨 앞 가운뎃점은 보이지 않게 숨깁니다 — polish.css)
            <div className="lab-keywords">
              <div className="lab-keywords-in">
                {researchAreas.map((area, i) => (
                  <Fragment key={area}>
                    {i > 0 && ' '}
                    <span className="lab-keyword">{area}</span>
                  </Fragment>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <NewsPreview />

      {editing && (
        <EditModal
          title="홈 소개 내용 수정"
          fields={siteIntroFields}
          initial={fillSeed(data, seedOf(data, 'site'))}
          onSave={handleSave}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  )
}
