/**
 * 관리자 편집 기능이 커밋을 넣을 GitHub 저장소 정보.
 * 저장소 이름을 바꾸거나, 파일 위치(BASE_PATH)가 달라지면 여기만 고치면 됩니다.
 *
 * 지금은 저장소 구조가 "corelab_ewha 저장소 > corelab-homepage 폴더" 안에
 * 프로젝트 파일들이 들어있는 상태라서 BASE_PATH를 'corelab-homepage'로 두었습니다.
 * 나중에 저장소 루트에 파일을 옮기게 되면 BASE_PATH를 빈 문자열 ''로 바꾸세요.
 */
export const OWNER = 'corelabewha93'
export const REPO = 'corelab_ewha'
export const BRANCH = 'main'
export const BASE_PATH = 'corelab-homepage'

const PREFIX = BASE_PATH ? `${BASE_PATH}/` : ''

/** public/ 폴더의 저장소 내 경로 (예: corelab-homepage/public) */
export const PUBLIC_PATH = `${PREFIX}public`
export const DATA_PATH = `${PUBLIC_PATH}/data`

/** 관리자 모드에서 방금 올린 사진을 배포 전에도 바로 보여주기 위한 주소 */
export const RAW_PUBLIC_URL = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${PUBLIC_PATH}`

// 예전 코드 호환용
export const PEOPLE_JSON_PATH = `${DATA_PATH}/people.json`
export const PEOPLE_IMAGES_PATH = `${PUBLIC_PATH}/images/people`
