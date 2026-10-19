import type { Page } from '@playwright/test';
import type { Comparison } from '../src/thisThat/api';
import { mockQuizApi, mockSignedIn } from './fixtures';
export const pickOwner = '00000000-0000-4000-8000-000000000002';
export async function pickFixture(page: Page, options: { signedIn?: boolean; games?: Map<string, Comparison> } = {}) {
  const epoch = new Date('2026-10-19T18:00:00Z'); await page.clock.install({ time: epoch }); await page.clock.pauseAt(new Date(epoch.getTime() + 1000));
  const calls = await mockQuizApi(page); if (options.signedIn) await mockSignedIn(page, pickOwner);
  const games = options.games ?? new Map<string, Comparison>();
  const d = { calls, games, accepted: 0, failChoose: false, loseChoose: false, failNext: false, loseNext: false, failCatalog: false, failTop: false, failRank: false, holdChoose: null as Promise<void> | null, top: [] as unknown[], imported: [] as unknown[], ranking: { total: 0, candidates: 200, updated_at: null, rows: [] } as unknown };
  const round = (number: number, series: number): NonNullable<Comparison['round']> => ({ id: `00000000-0000-4000-8000-${String(series * 100 + number).padStart(12, '0')}`, number, cards: [{ id: number * 2 - 1, name: `Actor ${number * 2 - 1}`, image_url: `actors/pick-${number * 2 - 1}.webp`, revision: 1 }, { id: number * 2, name: `Actor ${number * 2}`, image_url: `actors/pick-${number * 2}.webp`, revision: 1 }], outcome: null, winner: null, next_at: null, settled_at: null, public_status: null, community: null });
  await page.route('**/functions/v1/this-that-ranking', route => d.failRank ? route.fulfill({ status: 503, json: {} }) : route.fulfill({ json: d.ranking }));
  await page.route('**/rest/v1/rpc/this_that_*', async route => {
    const name = new URL(route.request().url()).pathname.split('/').pop()!, p = route.request().postDataJSON() ?? {};
    calls.push({ name, payload: p });
    if (name === 'this_that_catalog') return d.failCatalog ? route.fulfill({ status: 503, json: {} }) : route.fulfill({ json: { boards: [{ key: 'actors', name: 'Actors', people: 200, pairs: 19900 }] } });
    if (name === 'this_that_top') return d.failTop ? route.fulfill({ status: 503, json: {} }) : route.fulfill({ json: d.top });
    if (name === 'this_that_import') { d.imported.push(p.p_choices); return route.fulfill({ json: null }); }
    if (name === 'this_that_active') return route.fulfill({ json: [...games.values()].find(g => g.owner === pickOwner) ?? null });
    const t = await page.evaluate(() => Date.now());
    let g = games.get(p.p_id);
    if (name === 'this_that_open' && !g) {
      g = { id: p.p_id, owner: options.signedIn ? pickOwner : null, board: 'actors', version: 1, series: 1, cycle: 1, server_now: new Date(t).toISOString(), complete: false, summary: { choices: 0, settled: 0 }, round: round(1, 1) };
      games.set(g.id, g);
    }
    if (!g) return route.fulfill({ status: 403, json: { message: 'Comparison unavailable' } });
    g.server_now = new Date(t).toISOString();
    if (name === 'this_that_choose') {
      if (d.holdChoose) await d.holdChoose;
      if (d.failChoose) return route.fulfill({ status: 503, json: {} });
      if (g.round?.id === p.p_round && g.round.outcome === null) {
        g.round.outcome = p.p_choice; g.round.winner = p.p_choice === 'left' ? g.round.cards[0].id : p.p_choice === 'right' ? g.round.cards[1].id : null;
        g.round.public_status = g.owner ? 'recorded' : 'guest'; g.round.settled_at = new Date(t).toISOString(); g.round.next_at = new Date(t + 1200).toISOString(); g.version++; g.summary.settled++; if (g.round.winner) g.summary.choices++; g.complete = g.round.number === 10; d.accepted++;
      }
      if (d.loseChoose) { d.loseChoose = false; return route.abort(); }
    }
    if (name === 'this_that_next') {
      if (d.failNext) return route.fulfill({ status: 503, json: {} });
      if (g.round?.id === p.p_previous && g.round.outcome && t >= Date.parse(g.round.next_at!)) {
        if (!g.complete) { g.round = round(g.round.number + 1, g.series); g.version++; }
        else if (p.p_more) { g.series++; g.complete = false; g.summary = { choices: 0, settled: 0 }; g.round = round(1, g.series); g.version++; }
      }
      if (d.loseNext) { d.loseNext = false; return route.abort(); }
    }
    return route.fulfill({ json: g });
  });
  return d;
}
