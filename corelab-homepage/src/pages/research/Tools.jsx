import SafeImage, { resolveImageSrc } from '../../components/SafeImage'
import { EditButton } from '../../components/admin/AdminControls'
import { useAdminAuth } from '../../admin/AdminAuthContext'
import { useLang } from '../../i18n/LangContext'
import TOOLS_SEED from './toolsSeed'
import '../../styles/tools.css'

/**
 * Systems & Tools: 시스템 하나를 한 줄 전체 카드로 보여줍니다.
 * 이름(+바로가기) → 개발자 → 개발 배경 → 설명 → 화면 사진(최대 2장, 사진 설명) → 태그
 * research.json의 tools가 비어 있으면 기본 항목(toolsSeed.js)을 보여줍니다.
 */
export default function Tools({ items = [], onEdit }) {
  const { tr, loc } = useLang()
  const { isAdmin } = useAdminAuth()
  const list = items.length > 0 ? items : TOOLS_SEED
  if (list.length === 0) return <p className="empty-state">{tr('등록된 시스템/도구가 없습니다.', 'No systems or tools yet.')}</p>

  return (
    <div className="tools-list">
      {list.map((raw) => {
        const tool = loc(raw, 'tools')
        const figs = [
          [tool.image, tool.imageCaption],
          [tool.image2, tool.image2Caption],
        ].filter(([src]) => src)
        return (
          <article key={tool.id} className="card tool-feature admin-item">
            <EditButton onClick={() => onEdit(raw)} />
            <div className="tool-head">
              <h3 className="tool-name">{tool.name}</h3>
              {tool.link && (
                <a className="tool-link" href={tool.link} target="_blank" rel="noreferrer">
                  {tr('바로가기', 'Visit')} <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
            {tool.developers && (
              <p className="tool-devs">
                <span className="tool-devs-k">{tr('개발', 'Developed by')}</span>
                {tool.developers}
              </p>
            )}
            {tool.source && <p className="tool-source">{tool.source}</p>}
            {tool.description && <p className="tool-desc">{tool.description}</p>}
            {figs.length > 0 && (
              <div className={`tool-figs tool-figs-${figs.length}`}>
                {figs.map(([src, cap], i) => (
                  <figure key={i} className="tool-fig">
                    <a href={resolveImageSrc(src, isAdmin) ?? undefined} target="_blank" rel="noreferrer">
                      <SafeImage src={src} alt={cap || tool.name} fallback={<span />} />
                    </a>
                    {cap && <figcaption>{cap}</figcaption>}
                  </figure>
                ))}
              </div>
            )}
            {tool.acknowledgement && <p className="tool-ack">{tool.acknowledgement}</p>}
            {(tool.tags ?? []).length > 0 && (
              <div className="tool-tags">
                {tool.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
