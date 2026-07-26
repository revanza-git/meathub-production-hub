// Checkout loop — skeleton.
// Wire to real product IDs from a seeded load-test dataset before running.
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE_URL || "http://localhost:8080";
const EMAIL = __ENV.BUYER_EMAIL;
const PASSWORD = __ENV.BUYER_PASSWORD;

export const options = {
  vus: 5,
  duration: "3m",
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<1200"],
  },
};

export function setup() {
  if (!EMAIL || !PASSWORD) throw new Error("Set BUYER_EMAIL and BUYER_PASSWORD");
  // TODO: exchange for Supabase access token via /auth/v1/token?grant_type=password
  return { token: "TODO" };
}

export default function () {
  const res = http.get(`${BASE}/buyer/cart`);
  check(res, { "cart 200": (r) => r.status === 200 });
  sleep(2);
}
