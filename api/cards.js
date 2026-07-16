// /api/cards.js
// 아빠꺼 카드 목록을 저장하는 Vercel 서버리스 함수입니다.
// 저장소로 GitHub Gist를 사용합니다 (완전 무료, 별도 결제수단 등록도 필요 없음).
//
// 사전 준비 (한 번만 하면 됩니다) - 자세한 단계는 채팅 설명을 참고하세요:
// 1) gist.github.com 에서 파일명 cards.json, 내용 [] 인 Secret Gist 만들기 -> Gist ID 확보
// 2) github.com -> Settings -> Developer settings -> Personal access tokens (classic)
//    -> "gist" 권한만 체크해서 토큰 발급
// 3) Vercel 프로젝트 -> Settings -> Environment Variables 에 아래 두 개 추가
//    GITHUB_TOKEN = 방금 발급한 토큰
//    GIST_ID      = 방금 만든 Gist의 ID
// 4) 이 파일을 프로젝트의 /api/cards.js 로 배포 (별도 npm 패키지 설치 불필요)

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GIST_ID = process.env.GIST_ID;
const FILE_NAME = 'cards.json';

// 처음 한 번도 저장된 적이 없을 때 보여줄 기본 카드 (기존 6개와 동일)
const DEFAULT_CARDS = [
  { id: 'blog',      icon: '✍️', title: '블로그',     desc: '글감 정리 & 초안',     url: '' },
  { id: 'cleaning',  icon: '🥐', title: '클리닝타임',  desc: '빵 & 카페 투어 기록',  url: '' },
  { id: 'kbo',       icon: '⚾', title: 'KBO 데이터',  desc: '기록 & 분석 노트',     url: '' },
  { id: 'garden',    icon: '🌱', title: '홈 가드닝',   desc: '참외 등 재배 기록',    url: '' },
  { id: 'appintoss', icon: '📱', title: '앱인토스',    desc: '미니앱 현황 & DAU',    url: '' },
  { id: 'todo',      icon: '✅', title: '할 일',       desc: '업무 & 개인 체크리스트', url: '' },
];

async function readCardsFromGist() {
  const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (!res.ok) throw new Error('gist-get-http-' + res.status);
  const data = await res.json();
  const file = data.files && data.files[FILE_NAME];
  if (!file || !file.content) return null;
  try {
    const parsed = JSON.parse(file.content);
    return Array.isArray(parsed) ? parsed : null;
  } catch (err) {
    return null;
  }
}

async function writeCardsToGist(cards) {
  const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: {
        [FILE_NAME]: { content: JSON.stringify(cards, null, 2) },
      },
    }),
  });
  if (!res.ok) throw new Error('gist-patch-http-' + res.status);
}

export default async function handler(req, res) {
  if (!GITHUB_TOKEN || !GIST_ID) {
    return res.status(500).json({
      error: 'GITHUB_TOKEN / GIST_ID 환경변수가 설정되지 않았어요. Vercel 프로젝트 설정에서 추가해 주세요.',
    });
  }

  try {
    if (req.method === 'GET') {
      let cards = await readCardsFromGist();
      if (!cards) {
        cards = DEFAULT_CARDS;
        await writeCardsToGist(cards);
      }
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ cards });
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const body = req.body || {};
      const cards = Array.isArray(body.cards) ? body.cards : null;
      if (!cards) {
        return res.status(400).json({ error: 'cards must be an array' });
      }
      await writeCardsToGist(cards);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  } catch (err) {
    console.error('cards api error:', err);
    // 임시 디버그: 원인 확인되면 이 줄은 다시 { error: 'server error' } 로 되돌릴 것
    return res.status(500).json({ error: 'server error', debug: String(err && err.message || err) });
  }
}
