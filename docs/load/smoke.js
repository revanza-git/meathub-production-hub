import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:8080";

export const options = { vus: 1, duration: "30s" };

export default function () {
  for (const path of ["/", "/auth", "/manifest.webmanifest", "/robots.txt"]) {
    const res = http.get(`${BASE}${path}`);
    check(res, { [`${path} 200`]: (r) => r.status === 200 });
    sleep(0.5);
  }
}
