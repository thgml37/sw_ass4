export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  const serviceKey = process.env.AIRKOREA_KEY;
  if (!serviceKey) {
    return res.status(500).json({
      error: "서버에 AIRKOREA_KEY가 설정되지 않았어요. Vercel 환경변수 또는 로컬 .env.local을 확인해 주세요."
    });
  }

  const sido = typeof req.query.sido === "string" ? req.query.sido : "서울";
  const allowedRegions = [
    "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
    "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"
  ];
  if (!allowedRegions.includes(sido)) {
    return res.status(400).json({ error: "지원하지 않는 지역이에요." });
  }

  const url = new URL("https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty");
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("returnType", "json");
  url.searchParams.set("sidoName", sido);
  url.searchParams.set("numOfRows", "100");
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("ver", "1.3");

  try {
    const apiResponse = await fetch(url);
    const rawText = await apiResponse.text();

    if (!apiResponse.ok) {
      return res.status(502).json({ error: `에어코리아 API 요청에 실패했어요. (HTTP ${apiResponse.status})` });
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch {
      return res.status(502).json({
        error: "에어코리아에서 JSON이 아닌 응답을 받았어요. 인증키가 올바른지, 활용 신청이 승인됐는지 확인해 주세요."
      });
    }

    const header = data?.response?.header;
    if (header?.resultCode && header.resultCode !== "00") {
      return res.status(502).json({
        error: `에어코리아 응답 오류: ${header.resultMsg || header.resultCode}`
      });
    }

    const items = data?.response?.body?.items;
    if (!Array.isArray(items)) {
      return res.status(502).json({ error: "API 응답에서 측정소 목록을 찾지 못했어요." });
    }

    return res.status(200).json({ items });
  } catch (error) {
    return res.status(500).json({ error: "에어코리아에 연결하지 못했어요. 네트워크 상태를 확인해 주세요." });
  }
}
