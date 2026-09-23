import { useData } from '../../hooks/useData'
import { useQueryTab } from '../../router/useHashRoute'
import Tabs from '../../components/Tabs'
import Publications from './Publications'
import Projects from './Projects'
import Patents from './Patents'
import Tools from './Tools'

const TABS = [
  { key: 'publications', label: 'Publications' },
  { key: 'projects', label: 'Projects' },
  { key: 'patents', label: 'Patents' },
  { key: 'tools', label: 'Systems & Tools' },
]

export default function Research() {
  const { data, error, loading } = useData('research.json')
  const [tab, setTab] = useQueryTab('/research', TABS.map((t) => t.key), 'publications')

  return (
    <div className="page container">
      <h1 className="section-title">Research</h1>

      <div className="tabs-layout">
        <Tabs tabs={TABS} current={tab} onChange={setTab} />

        <div className="tabs-content">
          {loading && <div>불러오는 중...</div>}
          {error && <div className="error-state">{error}</div>}

          {data && (
            <>
              {tab === 'publications' && <Publications items={data.publications} />}
              {tab === 'projects' && <Projects items={data.projects} />}
              {tab === 'patents' && <Patents items={data.patents} />}
              {tab === 'tools' && <Tools items={data.tools} />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
