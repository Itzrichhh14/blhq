import http from "http";

function get(path) {
  return new Promise((res) => {
    http
      .get("http://localhost:3000" + path, (r) => {
        let d = "";
        r.on("data", (c) => (d += c));
        r.on("end", () => {
          try {
            const j = JSON.parse(d);
            res({
              status: r.statusCode,
              success: j.success,
              code: j.error?.code,
              extra:
                j.data?.pagination?.total ??
                (Array.isArray(j.data) ? j.data.length : null),
            });
          } catch {
            res({ status: r.statusCode, parseErr: true, raw: d.slice(0, 80) });
          }
        });
      })
      .on("error", (e) => res({ err: e.message }));
  });
}

const routes = [
  "/api/players?page=1&pageSize=2",
  "/api/rankings?page=1&pageSize=2",
  "/api/matches?page=1&pageSize=2",
  "/api/tournaments?page=1&pageSize=2",
  "/api/seasons",
  "/api/teams",
  "/api/achievements",
  "/api/maps",
  "/api/news?page=1&pageSize=2",
  "/api/records",
  "/api/search?q=ka",
  "/api/admin/kage",
  "/api/me",            // expects 401
  "/api/notifications", // expects 401
  "/api/challenges",    // expects 401
];

for (const r of routes) {
  const x = await get(r);
  const tag = x.err
    ? "ERR "
    : x.parseErr
    ? "PERR"
    : !x.success
    ? "FAIL"
    : "OK  ";
  const info = x.err ?? x.raw ?? (x.success ? "n=" + x.extra : x.code);
  console.log(tag, r.padEnd(48), info);
}
