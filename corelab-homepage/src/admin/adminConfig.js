/**
 * 관리자 등록 폼을 잠그는 비밀번호(해시)입니다.
 *
 * 기본 비밀번호는 "corelab2026" 입니다. 반드시 바꿔서 쓰세요.
 *
 * ⚠️ 참고: 이건 정식 로그인 시스템이 아니라, 아무나 등록 폼을 열지 못하게
 * 막아주는 정도의 "문단속" 수준입니다. 이 홈페이지는 서버가 없는 정적
 * 사이트라서, 브라우저 안에서 확인하는 비밀번호는 코드를 열어보면 원리상
 * 알아낼 수 있습니다(해시라서 원문이 바로 보이진 않지만, 무제한으로 시도해볼
 * 수는 있어요). 그러니 민감한 정보를 다루는 용도로는 쓰지 말고,
 * "학생/졸업생 소개 등록" 같은 가벼운 용도로만 사용해주세요.
 *
 * 비밀번호를 바꾸려면:
 * 1. 새 비밀번호를 정합니다.
 * 2. 아래 명령을 터미널(개발자용 PC)에서 실행해 해시값을 만듭니다.
 *      node -e "console.log(require('crypto').createHash('sha256').update('새비밀번호','utf8').digest('hex'))"
 * 3. 출력된 값을 ADMIN_PASSWORD_HASH에 붙여넣습니다.
 */
export const ADMIN_PASSWORD_HASH =
  '56af3520fe7a84764629b467a905ddddf401cf044666924a2e1a1a111a83c097'

export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
