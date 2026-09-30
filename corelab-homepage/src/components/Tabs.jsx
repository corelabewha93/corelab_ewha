/**
 * 왼쪽 세로 사이드바 형태의 탭 내비게이션 (데스크톱).
 * position: sticky로 스크롤해도 같이 따라 내려오고, 좁은 화면에서는
 * 위쪽 가로 스크롤 탭으로 자동 전환됩니다 (CSS 미디어쿼리 처리).
 * Research / People 페이지에서 재사용합니다.
 *
 * 탭을 누르면 새 탭의 맨 위부터 보이도록 스크롤을 올립니다.
 * (PC에서는 제목과 메뉴가 고정돼 있어, 아래쪽을 보다가 탭을 눌러도 위치가 그대로 남았습니다.)
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
          onClick={() => {
            onChange(tab.key)
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
          }}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
