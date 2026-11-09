// メンバー比較ツール。assets/compare.json を読み込んで、2人の記録を並べる
(async function () {
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const lab = k => k === "i1" ? "インディーズ1" : k === "i2" ? "インディーズ2" : (n => n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th")))(+k);
  const out = document.getElementById("cout");
  let D;
  try { D = await (await fetch("../assets/compare.json")).json(); }
  catch (e) { out.innerHTML = '<p class="muted">データを読み込めませんでした。ページを読み込み直してください。</p>'; return; }
  const names = Object.keys(D.members);
  document.getElementById("mlist").innerHTML = names.map(n => `<option value="${esc(n)}">`).join("");
  const ia = document.getElementById("ca"), ib = document.getElementById("cb");
  const q = new URLSearchParams(location.search);
  ia.value = q.get("a") || ""; ib.value = q.get("b") || "";
  const ymd = d => d ? d.replaceAll("-", "/") : "—";
  const yrs = mo => mo ? `${Math.floor(mo / 12)}年${mo % 12}か月` : "—";  // stay は月数
  const age = (b, d) => { if (!b || !d) return "—"; const [y0, m0, d0] = b.split("-").map(Number), [y1, m1, d1] = d.split("-").map(Number); return `${y1 - y0 - ((m1 < m0 || (m1 === m0 && d1 < d0)) ? 1 : 0)}歳`; };
  const link = n => `<a href="../members/${encodeURIComponent(n)}/">${esc(n)}</a>`;
  function render() {
    const a = ia.value.trim(), b = ib.value.trim();
    history.replaceState(null, "", `?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}`);
    const A = D.members[a], B = D.members[b];
    if (!A || !B) { out.innerHTML = `<p class="muted">${!a || !b ? "2人の名前を入れてください。" : "名前が見つかりません。候補から選んでください。"}</p>`; return; }
    const S = D.singles;
    const best = m => m.el.length ? Math.min(...m.el.map(x => x[1])) + "位" : "—";
    const firstAge = m => m.s.length ? age(m.b, S[m.s[0]][2]) : "—";
    const rows = [
      ["期", esc(A.g), esc(B.g)],
      ["状態", A.cur ? "在籍中" : "卒業・辞退", B.cur ? "在籍中" : "卒業・辞退"],
      ["在籍期間", yrs(A.stay), yrs(B.stay)],
      ["表題曲の選抜", A.s.length + "回", B.s.length + "回"],
      ["センター", A.c.length + "回", B.c.length + "回"],
      ["フロント(1列目・17作)", (A.f || []).length + "回", (B.f || []).length + "回"],
      ["初選抜", A.s.length ? lab(S[A.s[0]][0]) : "—", B.s.length ? lab(S[B.s[0]][0]) : "—"],
      ["初選抜の年齢", firstAge(A), firstAge(B)],
      ["最長の連続選抜", A.st ? A.st + "作" : "—", B.st ? B.st + "作" : "—"],
      ["参加した曲", A.so.length + "曲", B.so.length + "曲"],
      ["総選挙ランクイン", A.el.length + "回", B.el.length + "回"],
      ["総選挙の最高順位", best(A), best(B)],
    ];
    // どちらが多いかを太字に
    const num = v => parseFloat(String(v)) || 0;
    const tr = rows.map(([k, x, y], i) => {
      const lower = k === "総選挙の最高順位" || k === "初選抜の年齢";
      const nx = num(x), ny = num(y), win = (i >= 3 && nx !== ny && x !== "—" && y !== "—") ? ((lower ? nx < ny : nx > ny) ? "a" : "b") : "";
      return `<tr><th>${k}</th><td class="${win === "a" ? "win" : ""}">${x}</td><td class="${win === "b" ? "win" : ""}">${y}</td></tr>`;
    }).join("");
    // 同じシングルの選抜
    const bothS = A.s.filter(i => B.s.includes(i));
    const bothSo = A.so.filter(i => B.so.includes(i));
    // 総選挙を同じ回で
    const elRows = [...new Set([...A.el, ...B.el].map(x => x[0]))].sort((x, y) => x - y).map(no => {
      const x = A.el.find(e => e[0] === no), y = B.el.find(e => e[0] === no);
      return `<tr><th><a href="../elections/${no}/">第${no}回</a></th><td>${x ? x[1] + "位" : "—"}</td><td>${y ? y[1] + "位" : "—"}</td></tr>`;
    }).join("");
    // 選抜の帯(上がA、下がB)
    const bar = m => `<div class="bar" style="--n:${S.length}">${S.map((s, i) => `<i class="${m.c.includes(i) ? "c" : (m.f || []).includes(i) ? "f" : m.s.includes(i) ? "s" : ""}" title="${esc(lab(s[0]) + " " + s[1])}"></i>`).join("")}</div>`;
    out.innerHTML = `<div class="tbl"><table class="cmp"><thead><tr><th></th><th>${link(a)}</th><th>${link(b)}</th></tr></thead><tbody>${tr}</tbody></table></div>
<h2>選抜の記録</h2><p class="muted">上が${esc(a)}、下が${esc(b)}。1マスがシングル1作です。</p>${bar(A)}<div style="height:4px"></div>${bar(B)}
<h2>2人そろって選抜に入ったシングル</h2><p class="muted">${bothS.length}作</p><p class="chips">${bothS.map(i => `<a href="../singles/${S[i][0]}/">${lab(S[i][0])} ${esc(S[i][1])}</a>`).join("") || ""}</p>
<h2>2人で一緒に歌った曲</h2><p class="muted">${bothSo.length}曲</p><p class="chips">${bothSo.map(i => `<a href="../songs/${i}/">${esc(D.songs[i])}</a>`).join("")}</p>
${elRows ? `<h2>選抜総選挙</h2><div class="tbl"><table class="cmp"><thead><tr><th></th><th>${esc(a)}</th><th>${esc(b)}</th></tr></thead><tbody>${elRows}</tbody></table></div>` : ""}`;
  }
  ia.addEventListener("change", render); ib.addEventListener("change", render);
  ia.addEventListener("input", () => { if (D.members[ia.value.trim()]) render(); });
  ib.addEventListener("input", () => { if (D.members[ib.value.trim()]) render(); });
  render();
})();
