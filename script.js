const regionSelect = document.querySelector("#region");
const refreshButton = document.querySelector("#refresh");
const statusEl = document.querySelector("#status");
const stationList = document.querySelector("#stationList");

const gradeNames = { 1: "좋음", 2: "보통", 3: "나쁨", 4: "매우나쁨" };

function numeric(value) {
  if (value === null || value === undefined || value === "" || value === "-") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function pm10Level(value) {
  if (value === null) return 0;
  if (value <= 30) return 1;
  if (value <= 80) return 2;
  if (value <= 150) return 3;
  return 4;
}

function pm25Level(value) {
  if (value === null) return 0;
  if (value <= 15) return 1;
  if (value <= 35) return 2;
  if (value <= 75) return 3;
  return 4;
}

function levelFromApi(value, fallback) {
  const n = numeric(value);
  return n !== null && n >= 1 && n <= 4 ? n : fallback;
}

function overallLevel(item) {
  const p10 = numeric(item.pm10Value);
  const p25 = numeric(item.pm25Value);
  const api10 = levelFromApi(item.pm10Grade1h, levelFromApi(item.pm10Grade, pm10Level(p10)));
  const api25 = levelFromApi(item.pm25Grade1h, levelFromApi(item.pm25Grade, pm25Level(p25)));
  const levels = [api10, api25].filter(v => v > 0);
  return levels.length ? Math.max(...levels) : 0;
}

function gradeLabel(level) {
  return gradeNames[level] || "측정 정보 없음";
}

function setGradeStyle(element, level) {
  element.className = `pill level-${level}`;
  element.textContent = gradeLabel(level);
}

function guideFor(level) {
  const guides = {
    1: ["☀", "산뜻하게 외출해요", "대기질이 좋아요. 가벼운 산책이나 야외 활동을 즐겨 보세요."],
    2: ["🌿", "평소처럼 활동해도 좋아요", "대체로 무난한 대기질이에요. 민감한 분은 몸 상태를 살펴주세요."],
    3: ["😷", "외출 시간을 조절해요", "장시간 야외 활동은 줄이고, 외출할 때는 보건용 마스크를 고려해 주세요."],
    4: ["🏠", "야외 활동을 줄여주세요", "가능하면 외출을 자제하고, 실내에서도 환기와 공기질에 유의해 주세요."],
    0: ["⌁", "측정 정보를 확인할 수 없어요", "선택한 지역의 측정값이 제공되지 않거나 관측이 지연되고 있어요."]
  };
  return guides[level] || guides[0];
}

function setMain(item) {
  const level = overallLevel(item);
  const p10 = numeric(item.pm10Value);
  const p25 = numeric(item.pm25Value);
  document.querySelector("#stationName").textContent = item.stationName || "측정소 정보 없음";
  document.querySelector("#gradeText").textContent = gradeLabel(level);
  document.querySelector("#gradeText").style.color = ({1:"#4389d5",2:"#438b5c",3:"#d68a2d",4:"#d95853"})[level] || "#819088";
  document.querySelector("#gradeMessage").textContent = ({
    1:"맑고 쾌적한 공기예요.", 2:"대체로 무난한 공기예요.", 3:"민감한 분은 야외 활동에 주의해 주세요.", 4:"건강을 위해 야외 활동을 줄여주세요."
  })[level] || "현재 제공되는 등급 정보가 없어요.";
  document.querySelector("#updatedAt").textContent = `측정 시각 ${item.dataTime || "정보 없음"}`;
  document.querySelector("#pm10Value").innerHTML = `${p10 ?? "--"} <small>㎍/㎥</small>`;
  document.querySelector("#pm25Value").innerHTML = `${p25 ?? "--"} <small>㎍/㎥</small>`;
  setGradeStyle(document.querySelector("#pm10Grade"), pm10Level(p10));
  setGradeStyle(document.querySelector("#pm25Grade"), pm25Level(p25));
  document.querySelector("#trafficLight").dataset.level = String(level);
  const [icon, title, text] = guideFor(level);
  document.querySelector("#guideIcon").textContent = icon;
  document.querySelector("#guideTitle").textContent = title;
  document.querySelector("#guideText").textContent = text;
}

function renderStations(items) {
  document.querySelector("#stationCount").textContent = `${items.length}개 측정소`;
  if (!items.length) {
    stationList.innerHTML = '<div class="empty-row">표시할 측정소 정보가 없어요.</div>';
    return;
  }
  stationList.innerHTML = items.slice(0, 12).map(item => {
    const p10 = numeric(item.pm10Value);
    const p25 = numeric(item.pm25Value);
    const level = overallLevel(item);
    return `<div class="station-row">
      <span class="name">${escapeHtml(item.stationName || "측정소 미상")}</span>
      <span class="value">${p10 === null ? "--" : p10}</span>
      <span class="value">${p25 === null ? "--" : p25}</span>
      <span class="pill level-${level}">${gradeLabel(level)}</span>
    </div>`;
  }).join("");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  })[char]);
}

async function loadAirQuality() {
  const sido = regionSelect.value;
  refreshButton.disabled = true;
  refreshButton.textContent = "불러오는 중...";
  statusEl.className = "status";
  statusEl.textContent = `${sido} 지역의 대기질 정보를 불러오고 있어요.`;
  stationList.innerHTML = '<div class="empty-row">측정소 정보를 불러오고 있어요.</div>';

  try {
    const response = await fetch(`/api/dust?sido=${encodeURIComponent(sido)}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "대기질 정보를 가져오지 못했어요.");
    const items = result.items || [];
    if (!items.length) throw new Error("해당 지역에서 제공되는 측정소 정보가 없어요. 잠시 후 다시 시도해 주세요.");

    const sorted = [...items].sort((a, b) => {
      const aScore = (numeric(a.pm10Value) === null ? 1 : 0) + (numeric(a.pm25Value) === null ? 1 : 0);
      const bScore = (numeric(b.pm10Value) === null ? 1 : 0) + (numeric(b.pm25Value) === null ? 1 : 0);
      return aScore - bScore;
    });
    setMain(sorted[0]);
    renderStations(sorted);
    statusEl.textContent = `${sido} 지역 ${items.length}개 측정소의 정보를 확인했어요.`;
  } catch (error) {
    statusEl.className = "status error";
    statusEl.textContent = error.message || "오류가 발생했어요. 잠시 후 다시 시도해 주세요.";
    stationList.innerHTML = '<div class="empty-row">측정소 정보를 표시할 수 없어요.</div>';
    document.querySelector("#stationName").textContent = "측정소 정보 없음";
    document.querySelector("#gradeText").textContent = "정보 없음";
    document.querySelector("#gradeMessage").textContent = "API 연결 상태와 인증키를 확인해 주세요.";
    document.querySelector("#updatedAt").textContent = "측정 시각 -";
    document.querySelector("#pm10Value").innerHTML = '-- <small>㎍/㎥</small>';
    document.querySelector("#pm25Value").innerHTML = '-- <small>㎍/㎥</small>';
    document.querySelector("#trafficLight").dataset.level = "0";
    const [icon, title, text] = guideFor(0);
    document.querySelector("#guideIcon").textContent = icon;
    document.querySelector("#guideTitle").textContent = title;
    document.querySelector("#guideText").textContent = text;
  } finally {
    refreshButton.disabled = false;
    refreshButton.innerHTML = '<span aria-hidden="true">↻</span> 새로고침';
  }
}

regionSelect.addEventListener("change", loadAirQuality);
refreshButton.addEventListener("click", loadAirQuality);
loadAirQuality();
