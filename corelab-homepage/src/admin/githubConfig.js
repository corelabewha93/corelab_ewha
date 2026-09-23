/**
 * 관리자 등록/수정 기능이 커밋을 넣을 GitHub 저장소 정보.
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

export const PEOPLE_JSON_PATH = `${BASE_PATH}/public/data/people.json`
export const PEOPLE_IMAGES_PATH = `${BASE_PATH}/public/images/people`
