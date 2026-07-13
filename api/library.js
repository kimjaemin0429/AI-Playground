// api/library.js
// Vercel 서버리스 함수: 도서관정보나루(data4library.kr) API 프록시
// - 클라이언트가 임의 URL을 넣을 수 없도록 action 파라미터로만 동작 (열린 프록시 아님)
// - API 키를 클라이언트 번들에서 완전히 숨김 (환경변수로 관리)
//
// [배포 전 설정]
// Vercel 프로젝트 > Settings > Environment Variables 에서
//   LIBRARY_API_KEY = (도서관정보나루에서 발급받은 인증키)
// 추가 후 재배포 하세요.
//
// [지원 action]
// - action=search : 책 검색 (data4library의 srchBooks)
//     쿼리: title, pageSize, pageNo
// - action=exist  : 특정 도서관 소장/대출가능 여부 확인 (bookExist)
//     쿼리: libCode, isbn13

export default async function handler(req, res) {
  const { action, ...query } = req.query;

  const apiKey = process.env.LIBRARY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'LIBRARY_API_KEY is not configured on the server' });
  }

  let path;
  let params;

  if (action === 'search') {
    path = 'srchBooks';
    params = new URLSearchParams({
      authKey: apiKey,
      format: 'json',
      title: query.title || '',
      pageSize: query.pageSize || '8',
      pageNo: query.pageNo || '1'
    });
  } else if (action === 'exist') {
    path = 'bookExist';
    params = new URLSearchParams({
      authKey: apiKey,
      format: 'json',
      libCode: query.libCode || '',
      isbn13: query.isbn13 || ''
    });
  } else {
    return res.status(400).json({ error: 'invalid action. use action=search or action=exist' });
  }

  // 목적지는 항상 data4library.kr 로 고정되고, 클라이언트는 URL 자체를 지정할 수 없습니다.
  const targetUrl = `https://data4library.kr/api/${path}?${params.toString()}`;

  try {
    const upstream = await fetch(targetUrl);
    const text = await upstream.text();

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(upstream.status).send(text);
  } catch (err) {
    console.error('library proxy error:', err);
    res.status(502).json({ error: 'failed to reach data4library' });
  }
}
