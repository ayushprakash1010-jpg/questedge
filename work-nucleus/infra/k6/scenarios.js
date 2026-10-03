// k6 load-test scenarios for QuestEdge.
// Run with: BASE=http://localhost:3000 k6 run scenarios.js --env SCENARIO=self_assessment
//
// Targets called out in plan-v2:
//   - 1000 concurrent users running self-assessment
//   - 500 concurrent managers during calibration
//   - 5000 employees opening compensation letters in 5 minutes
//   - 200 concurrent BGV webhook arrivals

import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE || "http://localhost:3000";
const TOKEN = __ENV.TOKEN || "";

const SCENARIOS = {
  self_assessment: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "30s", target: 200 },
      { duration: "1m", target: 1000 },
      { duration: "2m", target: 1000 },
      { duration: "30s", target: 0 },
    ],
    exec: "selfAssessment",
  },
  calibration: {
    executor: "constant-vus",
    vus: 500,
    duration: "2m",
    exec: "calibration",
  },
  comp_letters_burst: {
    executor: "ramping-vus",
    startVUs: 0,
    stages: [
      { duration: "1m", target: 5000 },
      { duration: "4m", target: 5000 },
    ],
    exec: "compLetters",
  },
  bgv_webhooks: {
    executor: "constant-arrival-rate",
    rate: 200,
    timeUnit: "1s",
    duration: "1m",
    preAllocatedVUs: 200,
    exec: "bgvWebhook",
  },
};

const selected = __ENV.SCENARIO;
export const options = selected ? { scenarios: { [selected]: SCENARIOS[selected] } } : { scenarios: SCENARIOS };

const authHeaders = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};

export function selfAssessment() {
  const res = http.get(`${BASE}/api/v2/appraisal/assessments/home`, { headers: authHeaders });
  check(res, { "status 200": (r) => r.status === 200 });
  sleep(1);
}

export function calibration() {
  const res = http.get(`${BASE}/api/v2/appraisal/calibration`, { headers: authHeaders });
  check(res, { "status 200": (r) => r.status === 200 });
  sleep(0.5);
}

export function compLetters() {
  // Simulate candidate viewing offer letter via token (no auth required)
  const token = `loadtest-${Math.floor(Math.random() * 5000)}`;
  http.get(`${BASE}/api/v2/public/offers/${token}`);
  sleep(0.2);
}

export function bgvWebhook() {
  const body = JSON.stringify({
    check_id: `vendor-ref-${Math.floor(Math.random() * 1_000_000)}`,
    status: "completed",
    finding: "clear",
  });
  http.post(`${BASE}/api/v2/webhooks/bgv/authbridge`, body, {
    headers: {
      "Content-Type": "application/json",
      "X-AuthBridge-Signature": "loadtest-signature",
    },
  });
}
