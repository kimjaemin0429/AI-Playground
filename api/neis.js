// api/neis.js
// Vercel 서버리스 함수: NEIS(나이스) API 프록시
// - 브라우저 CORS 문제를 서버에서 대신 요청해서 해결
// - API 키를 클라이언트 번들에서 완전히 숨김 (환경변수로 관리)
//
// [배포 전 설정]
// Vercel 프로젝트 > Settings > Environment Variables 에서
//   NEIS_API_KEY = f74bba4541c947008a45917f53635a1e   (출시 시 최종 키로 교체)
// 추가 후 재배포 하세요.

export default async function handler(req, res) {
  const { path, ...query } = req.query;

  const ALLOWED_PATHS = ['schoolInfo', 'mealServiceDietInfo'];
  if (!path || !ALLOWED_PATHS.includes(path)) {
    return res.status(400).json({ error: 'invalid path. use schoolInfo or mealServiceDietInfo' });
  }

  const apiKey = process.env.NEIS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'NEIS_API_KEY is not configured on the server' });
  }

  // 명세서 상 pIndex, pSize 는 필수 인자 (기본값 1 / 100) - 클라이언트가 안 보내도 항상 채워서 전달
  const params = new URLSearchParams({
    KEY: apiKey,
    Type: 'json',
    pIndex: '1',
    pSize: '100',
    ...query
  });

  const targetUrl = `https://open.neis.go.kr/hub/${path}?${params.toString()}`;

  try {
    const upstream = await fetch(targetUrl);
    const text = await upstream.text();

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    // 같은 Vercel 도메인에서 호출하는 게 기본이지만, 혹시 몰라 명시적으로 허용
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(upstream.status).send(text);
  } catch (err) {
    console.error('NEIS proxy error:', err);
    res.status(502).json({ error: 'failed to reach NEIS API' });
  }
}
