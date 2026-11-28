// @window 500,900
// Team money: expenses for the team, a race or a car; split equally by default, by seat time or by fixed shares,
// per expense, per race or as the team default; balances, the fewest settle-up payments, edits and deletes.
__run(() => {
  fresh(s => { s.drivers = [{ name: 'Paul', max: 120 }, { name: 'Luc <b>x</b>', max: 120 }, { name: 'Marco', max: 120 }]; s.race.track = 'none'; });
  const [P_, L_, M_] = DB.team.members.map(m => m.id);
  // rounding: parts always add up to the total
  const a = alloc(1000, { a: 1, b: 1, c: 1 });
  expect(a.a + a.b + a.c === 1000 && Math.max(a.a, a.b, a.c) - Math.min(a.a, a.b, a.c) === 1, 'cents split three ways add up exactly: ' + JSON.stringify(a));

  // the Team tab card and the add sheet
  go('team');
  expect($('moneyCard') && /who paid/i.test(txt('moneyCard')), 'Team tab: a Team money card that says what it’s for');
  click('addExpense');
  $('xAmt').value = '120'; $('xAmt').oninput(); $('xCat').value = 'fuel'; $('xNote').value = 'race gas <b>'; $('xBy').value = P_; $('xBy').onchange && $('xBy').onchange();
  expect(/Paul \$40\.00/.test(txt('xPrev')) && /Marco \$40\.00/.test(txt('xPrev')), 'the sheet previews each share (equal by default): ' + txt('xPrev'));
  click('xSave');
  expect(moneyItems().length === 1 && moneyItems()[0].amt === 12000 && moneyItems()[0].by === P_, 'expense saved in cents');
  let b = balances();
  expect(b[P_] === 8000 && b[L_] === -4000 && b[M_] === -4000, 'equal split: Paul is owed 80, Luc and Marco owe 40 each');
  expect(/\$120\.00 logged/.test(txt('moneySum')) && /owes Paul/.test(txt('moneySum')), 'the Team card sums it up: ' + txt('moneySum'));

  // the money screen: balances, settle up, list
  click('openMoney');
  expect($('tab-money').classList.contains('on') && /Paul/.test(txt('moneyBal')) && /settle up/i.test(txt('moneyBal')), 'Team money screen with balances');
  expect(!document.querySelector('#moneyList b b') && /race gas <b>/.test(txt('moneyList')) && /Luc <b>x<\/b>/.test(txt('moneyBal')), 'notes and names are escaped');
  expect(document.querySelectorAll('#moneyBal [data-settle]').length === 2, 'settle up: two payments (Luc → Paul, Marco → Paul)');

  // race weekend split by seat time: a finished race with seat times
  const r = activeRace(); r.status = 'done'; r.summary = { seat: { [P_]: 120, [L_]: 60 }, stops: 2, fuel: 30, laps: 100 }; r.rules.name = 'Saturday'; dbSave();
  $('mFilter').value = 'race:' + r.id; $('mFilter').onchange();
  expect(/How this race’s costs are split/i.test(txt('moneyRule')) && /Team default/i.test(txt('moneyRule')), 'a race view offers its own split rule');
  [...document.querySelectorAll('#mRuleChips [data-rule]')].find(x => x.dataset.rule === 'seat').click();
  expect(ruleFor(r.id) && ruleFor(r.id).m === 'seat', 'the race is set to split by seat time');
  click('mAdd'); expect(val('xFor') === 'race:' + r.id, 'adding from a race view defaults the expense to that race');
  $('xAmt').value = '300'; $('xAmt').oninput(); $('xCat').value = 'entry'; $('xBy').value = L_; click('xSave');
  const entry = moneyItems().find(i => i.cat === 'entry'); let s = splitOf(entry);
  expect(s.m === 'seat' && s.src === 'race' && s.parts[P_] === 20000 && s.parts[L_] === 10000 && !s.parts[M_], 'race rule: entry split by seat time 2:1, Marco (didn’t drive) pays nothing');
  expect(/each person’s share of this race/i.test(txt('moneyBody')) && /2:00:00 driven/.test(txt('moneyBody')), 'race view shows each person’s share with seat time');
  // one expense can still choose its own split
  click('mAdd'); $('xAmt').value = '90'; $('xAmt').oninput(); $('xCat').value = 'food'; $('xBy').value = M_; $('xSplit').value = 'equal'; $('xSplit').onchange(); click('xSave');
  s = splitOf(moneyItems().find(i => i.cat === 'food'));
  expect(s.m === 'equal' && s.src === 'own' && s.parts[M_] === 3000, 'an expense’s own split (equally) beats the race rule');
  // an unfinished race: seat time not known yet, split equally with a note
  const nr = newRaceObj({ series: 'luckydog', rules: Object.assign(clone(r.rules), { name: 'Sunday' }), carId: r.carId, drivers: clone(r.drivers) }); DB.races.push(nr); dbSave();
  const fx = moneyAdd({ k: 'exp', amt: 6000, by: P_, cat: 'tyres', race: nr.id, date: todayISO(), split: { m: 'seat', who: null, sh: {} } });
  s = splitOf(fx); expect(Object.values(s.parts).every(v => v === 2000) && /once the race is finished/.test(s.note), 'seat time before the race is done: equal, and it says why');
  moneyVoid(fx.id);

  // team default: fixed shares (car owner 50%, two renters 25%)
  $('mFilter').value = 'all'; $('mFilter').onchange();
  [...document.querySelectorAll('#mRuleChips [data-rule]')].find(x => x.dataset.rule === 'shares').click();
  document.querySelector(`[data-rsh="${P_}"]`).value = '2'; document.querySelector(`[data-rsh="${L_}"]`).value = '1'; document.querySelector(`[data-rsh="${M_}"]`).value = '1'; click('mRuleSave');
  s = splitOf(moneyItems().find(i => i.cat === 'fuel'));
  expect(ruleFor('team').m === 'shares' && s.src === 'team' && s.parts[P_] === 6000 && s.parts[L_] === 3000, 'team default switched to fixed shares 2/1/1: the general fuel bill follows it');
  s = splitOf(entry); expect(s.src === 'race' && s.m === 'seat', '…while the race keeps its own seat-time rule');
  // car view: its own costs plus its races
  const cx = moneyAdd({ k: 'exp', amt: 25000, by: P_, cat: 'repairs', car: r.carId, date: todayISO(), split: { m: 'auto' } });
  expect(moneyScope('car:' + r.carId).length === 3 && moneyScope('team').length === 1, 'a car’s spending includes its repairs and its races’ costs');
  renderMoney(); expect(/Repairs/.test(txt('moneyBody')) && /By race \/ car/.test(txt('moneyBody')), 'season view: by category and by race / car');

  // settle up squares everyone
  b = balances(); const st = settleUp(b);
  expect(Object.values(b).reduce((x, y) => x + y, 0) === 0 && st.length <= 2, 'balances sum to zero; at most n−1 payments: ' + st.map(x => nameOf(x.from) + '→' + nameOf(x.to) + ' ' + x.amt).join(', '));
  document.querySelectorAll('#moneyBal [data-settle]').forEach(btn => btn.click());
  expect(Object.values(balances()).every(v => v === 0) && /square/.test(txt('moneyBal')), 'tapping Paid on each settle-up squares everyone');

  // edit and delete
  const nItems = moneyItems().length;
  document.querySelector(`#moneyList [data-eid="${cx.id}"]`).click(); expect($('xAmt').value === '250.00', 'tapping an expense opens it for editing');
  $('xAmt').value = '275'; click('xSave');
  expect(moneyItems().length === nItems && !moneyItems().some(i => i.id === cx.id) && moneyItems().some(i => i.amt === 27500 && i.cat === 'repairs'), 'an edit replaces the entry (void + new)');
  const ed = moneyItems().find(i => i.amt === 27500); document.querySelector(`#moneyList [data-eid="${ed.id}"]`).click();
  [...document.querySelectorAll('#sheetF button')].find(x => x.textContent === 'Delete').click(); expect(!moneyItems().some(i => i.id === ed.id), 'delete removes it');

  // currency and persistence
  $('mCur').value = '€'; $('mCur').onchange(); expect(/€/.test(txt('moneyBal')) && ruleFor('team').m === 'shares', 'currency symbol changes, the split rule stays');
  const back = normalizeDB(JSON.parse(localStorage.getItem('pitdog_db')));
  expect(back.ledger.items.length === moneyItems().length && back.ledger.items.some(i => i.k === 'rule'), 'everything is saved on the device');
  expect(cleanMoneyItem({ id: 'x1', k: 'exp', amt: -5, by: P_ }) === null && cleanMoneyItem({ id: 'x2', k: 'pay', amt: 5, from: P_, to: P_ }) === null, 'bad entries are rejected (negative amount, paying yourself)');
  // a shared team: a viewer reads everything but edits only their own
  DB.team.sid = uuid(); DB.team.role = 'viewer'; SYNC.user = { id: '22222222-2222-4222-8222-222222222222' };
  expect(!canEditMoney({ u: '11111111-1111-4111-8111-111111111111' }) && canEditMoney({ u: SYNC.user.id }) && !canPlan(), 'a viewer can’t edit someone else’s entry or the rules');
  renderMoney(); expect([...document.querySelectorAll('#mRuleChips button')].every(x => x.disabled), 'rule buttons are disabled for a viewer');
  delete DB.team.sid; delete DB.team.role; SYNC.user = null;
});
