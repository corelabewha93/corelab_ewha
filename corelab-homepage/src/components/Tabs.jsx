/**
 * 공용 탭 UI. Research / People 페이지에서 재사용합니다.
 * tabs: [{ key, label }], current: 현재 선택된 key, onChange: (key) => void
 */
export default function Tabs({ tabs, current, onChange }) {
  return (
    <div className="tabs" role="tablist">
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
    </div>
  )
}
