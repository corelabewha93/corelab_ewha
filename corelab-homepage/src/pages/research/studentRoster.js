/**
 * 연구과제별 학생연구원 명단 (2026-10 학생연구원 자료 기준, 엑셀 그대로).
 *
 * - 과제 id(research.json 의 projects[].id)로 찾아서, 아래 명단이 있는 과제는
 *   "학생연구원" 줄을 이 명단으로 보여줍니다. (홈페이지에 있던 학생연구원 중 명단에 없는 분은 빠집니다)
 * - 박사후연구원은 관리자 화면에서 입력된 그대로 유지됩니다. 박사후연구원인 분은 학생연구원 줄에 중복되지 않습니다.
 * - 여기에 없는 과제(새로 등록한 과제 등)는 관리자 화면에서 입력한 참여연구진이 그대로 나옵니다.
 * - 이 과제들의 학생연구원을 고치려면 이 파일의 명단을 수정해야 합니다.
 */
export const STUDENT_ROSTER = {
  'proj-2024-teacher-ai': ['박주은', '김선영', '김재현', '정유진'],
  'proj-2023-cla-platform': [
    '박주은', '김재현', '윤이슬', '전효정', '김다현', '김혜준', '이다혜', '이주원',
    '정유진', '진명화', '태지원', '박은주', '박하은', '차수민',
  ],
  'proj-2021-srl-feedback': ['김혜준', '이다혜', '이주원', '진명화', '박하은', '차수민', '박지우'],
  'proj-2020-sw-ai': [
    '김혜준', '이다혜', '이주원', '진명화', '박은주', '박하은', '차수민', '박지우',
    '박하나', '임지영', '정성희', '김윤진', '어정인',
  ],
  'proj-2019-digital-literacy': ['김혜준', '진명화', '박하나', '임지영', '최지수'],
  'proj-2017-coregulation': ['임지영', '최지수', '이지현'],
  'proj-2017-dashboard': [
    '김혜준', '임지영', '김윤진', '어정인', '최지수', '이지현', '한가형', 'Emilova',
    '김영주', '은주희', '박민정', '정윤주',
  ],
  'proj-2015-cps-scaffolding': ['김혜준', '임지영', '김영주', '은주희', '박민정', '정윤주', '김예진', '김주연'],
  'proj-2013-visual-feedback': ['박하나', '김시원', '김희준', '박효선', '정윤하'],
}

/** 과제의 참여연구진(members)에 학생연구원 명단을 적용해 돌려줍니다. */
export function withStudentRoster(projectId, members = [], isStudentRole) {
  const roster = STUDENT_ROSTER[projectId]
  if (!roster) return members
  const others = members.filter((m) => m?.name && !isStudentRole(m.role))
  const taken = new Set(others.map((m) => m.name))
  const students = roster.filter((n) => !taken.has(n)).map((name) => ({ name, role: '학생연구원' }))
  return [...others, ...students]
}
