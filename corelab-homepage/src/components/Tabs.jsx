/**
 * 왼쪽 세로 사이드바 형태의 탭 내비게이션 (데스크톱).
 * position: sticky로 스크롤해도 같이 따라 내려오고, 좁은 화면에서는
 * 위쪽 가로 스크롤 탭으로 자동 전환됩니다 (CSS 미디어쿼리 처리).
 * Research / People 페이지에서 재사용합니다.
 */
export default function Tabs({ tabs, current, onChange }) {
  return (
    <nav className="tabs-nav" role="tablist" aria-orientation="vertical">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          role="tab"
          aria-selected={current === tab.key}
          className={`tab-btn${current === tab.key ? ' active' : ''}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
