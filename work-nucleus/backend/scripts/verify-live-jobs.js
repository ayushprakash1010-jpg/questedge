const https = require('https');

const targets = [
  { slug: 'mongodb', titleMatch: 'Lead, Candidate Experience' },
  { slug: 'gitlab', titleMatch: 'Customer Success' },
  { slug: 'instacart', titleMatch: 'Sr Software Engineer II' },
  { slug: 'druva', titleMatch: 'Solution Architect' },
  { slug: 'contentful', titleMatch: 'Solution Engineer' }
];

async function run() {
  console.log('--- STARTING AUDIT OF TARGET ATS JOB FEEDS ---');
  for (const t of targets) {
    try {
      const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${t.slug}/jobs?content=true`;
      const res = await fetch(apiUrl);
      if (!res.ok) {
        console.log(`Failed to fetch ${t.slug}: ${res.status}`);
        continue;
      }
      const data = await res.json();
      const jobs = data.jobs || [];
      console.log(`\n========================================`);
      console.log(`Company: ${t.slug.toUpperCase()} | Total Live Greenhouse Positions: ${jobs.length}`);
      
      const matched = jobs.filter(j => j.title.toLowerCase().includes(t.titleMatch.toLowerCase()));
      console.log(`Matched roles matching "${t.titleMatch}": ${matched.length}`);
      
      for (const job of (matched.length > 0 ? matched.slice(0, 3) : jobs.slice(0, 2))) {
        console.log(`\n  * Job Title: "${job.title}"`);
        console.log(`    Internal ID: ${job.id}`);
        console.log(`    Location: ${job.location?.name || 'N/A'}`);
        console.log(`    Apply URL: ${job.absolute_url}`);
        console.log(`    Updated At: ${job.updated_at}`);

        // Live check apply URL
        try {
          const probe = await fetch(job.absolute_url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            redirect: 'follow'
          });
          console.log(`    [URL PROBE]: HTTP ${probe.status} ${probe.statusText}`);
          console.log(`    [FINAL DESTINATION]: ${probe.url}`);
          console.log(`    [VERIFICATION STATUS]: ${probe.status === 200 ? '✅ 100% ACTIVE & WORKING' : '⚠️ UNEXPECTED STATUS ' + probe.status}`);
        } catch (err) {
          console.log(`    [URL PROBE FAILED]: ❌ ${err.message}`);
        }
      }
    } catch (err) {
      console.error(`Error querying ${t.slug}:`, err.message);
    }
  }
}

run();

