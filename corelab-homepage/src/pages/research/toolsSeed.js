/**
 * Systems & Tools 첫 화면용 기본 항목.
 * research.json의 tools가 비어 있을 때만 보입니다(관리자 데이터를 덮어쓰지 않기 위해 따로 둠).
 * 관리자 화면에서 이 항목을 "수정 → 저장"하면 research.json에 같은 id로 저장되고,
 * 그다음부터는 research.json의 내용이 그대로 보입니다.
 */
const TOOLS_SEED = [
  {
    id: 'tool-scola',
    name: 'ScoLA — 적응적 CSCL 플랫폼',
    nameEn: 'ScoLA — Adaptive CSCL Platform',
    developers: '진명화, 임규연',
    developersEn: 'Myunghwa Jin, Kyu Yon Lim',
    description:
      '온라인 협력 토론에서 오가는 채팅 메시지를 실시간으로 분석해, 그룹의 인지적 참여 수준, 참여도와 참여 균등성, 상호작용 정도를 시각화하고 그룹 상황에 맞춘 적응적 피드백을 제공하는 플랫폼입니다. 학습자는 채팅과 공유문서로 토론하며, 정해진 간격으로 안내되는 피드백을 확인해 협력 과정을 스스로 조절합니다.',
    descriptionEn:
      'A platform that analyzes chat messages in online collaborative discussions in real time, visualizes each group’s level of cognitive engagement, participation and its equality, and degree of interaction, and provides adaptive feedback tailored to the group’s situation. Learners discuss through a chat and a shared document, and regulate their collaboration by checking feedback prompted at set intervals.',
    image: 'images/tools/scola-discussion.jpg',
    imageCaption: '온라인 토론 화면 — 채팅·공유문서와 피드백 알림',
    imageCaptionEn: 'Online discussion — chat, shared document, and feedback alert',
    image2: 'images/tools/scola-feedback.jpg',
    image2Caption: '적응적 피드백 화면 — 인지적 참여 수준 · 참여도와 참여 균등성 · 상호작용 정도',
    image2CaptionEn: 'Adaptive feedback — cognitive engagement, participation and equality, interaction',
    link: 'https://scola.pages.dev/',
    source: '진명화(2024) 박사학위논문에서 개발',
    sourceEn: 'Developed in Myunghwa Jin’s doctoral dissertation (2024)',
    tags: ['CSCL', 'Learning Analytics', 'Adaptive Feedback'],
  },
]

export default TOOLS_SEED
