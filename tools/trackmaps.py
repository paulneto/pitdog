#!/usr/bin/env python3
"""Build the track outlines baked into app/index.html (TRACKMAP) from OpenStreetMap (© OpenStreetMap contributors, ODbL).

For each track in TRACKS it asks Overpass for highway=raceway ways near the track, stitches the main circuit into one loop,
picks out the pit lane, simplifies both and projects them to a 0..1000 grid. Prints a JS object literal.
Usage: python3 tools/trackmaps.py [key ...]  (cached in tools/.osm/, so re-runs don't hit Overpass)
"""
import json, math, os, re, sys, time, urllib.request, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__)); CACHE = os.path.join(HERE, '.osm'); os.makedirs(CACHE, exist_ok=True)
src = open(os.path.join(HERE, '..', 'app', 'index.html')).read()
TR = {k: (n, float(a), float(b)) for k, n, a, b in re.findall(r"(\w+):\['([^']+)',(-?[\d.]+),(-?[\d.]+)\]", src[src.index('const TRACKS='):src.index('const WMO=')])}

def fetch(k, lat, lon):
    f = os.path.join(CACHE, k + '.json')
    if os.path.exists(f): return json.load(open(f))
    q = f'[out:json][timeout:25];way[highway=raceway](around:3000,{lat},{lon});out geom tags;'
    for url in ('https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'):
        try:
            req = urllib.request.Request(url, data=urllib.parse.urlencode({'data': q}).encode(), headers={'User-Agent': 'pitdog-trackmaps'})
            d = json.loads(urllib.request.urlopen(req, timeout=60).read()); json.dump(d, open(f, 'w')); time.sleep(3); return d
        except Exception as e: print(f'  {k}: {url} failed: {e}', file=sys.stderr); time.sleep(5)
    return None

def xy(p, lat0): return (p['lon'] * math.cos(math.radians(lat0)) * 111320, p['lat'] * 110540)
def length(pts): return sum(math.dist(a, b) for a, b in zip(pts, pts[1:]))
def key(p): return (round(p[0], 1), round(p[1], 1))

def stitch(ways):
    """The longest closed loop through the raceway ways (the full circuit, not a short configuration). Falls back to
    the longest open chain when nothing closes. Graphs are tiny (a few dozen ways), so a bounded DFS is fine."""
    ways = [w for w in ways if len(w) > 1]; adj = {}
    for i, w in enumerate(ways): adj.setdefault(key(w[0]), []).append((i, False)); adj.setdefault(key(w[-1]), []).append((i, True))
    L = [length(w) for w in ways]; best = {'cyc': (0, []), 'open': (0, [])}; budget = [200000]
    def dfs(start, node, used, seq, tot):
        budget[0] -= 1
        if budget[0] < 0: return
        if tot > best['open'][0]: best['open'] = (tot, list(seq))
        for i, rev in adj.get(node, []):
            if i in used: continue
            w = ways[i][::-1] if rev else ways[i]; end = key(w[-1])
            if end == start and tot + L[i] > best['cyc'][0]: best['cyc'] = (tot + L[i], seq + [(i, rev)])
            if end in {key((ways[j][::-1] if r else ways[j])[0]) for j, r in seq}: continue    # simple path only
            used.add(i); seq.append((i, rev)); dfs(start, end, used, seq, tot + L[i]); seq.pop(); used.discard(i)
    for i in sorted(range(len(ways)), key=lambda i: -L[i])[:6]:
        dfs(key(ways[i][0]), key(ways[i][-1]), {i}, [(i, False)], L[i])
    tot, seq = best['cyc'] if best['cyc'][0] > 500 else best['open']
    loop = []
    for i, rev in seq: w = ways[i][::-1] if rev else ways[i]; loop += w if not loop else w[1:]
    return loop

def simplify(pts, eps):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; dx, dy = b[0] - a[0], b[1] - a[1]; n = math.hypot(dx, dy) or 1e-9
    d = [abs(dy * (p[0] - a[0]) - dx * (p[1] - a[1])) / n if n > 1e-6 else math.dist(p, a) for p in pts]
    i = max(range(len(d)), key=d.__getitem__)
    if d[i] <= eps: return [a, b]
    return simplify(pts[:i + 1], eps)[:-1] + simplify(pts[i:], eps)

SKIP_SHORT = {'amp'}   # OSM has only part of the circuit
out = {}
for k in (sys.argv[1:] or [k for k, v in TR.items()]):
    if k not in TR: continue
    name, lat, lon = TR[k]; d = fetch(k, lat, lon)
    if not d: continue
    main, pit = [], []
    for w in d['elements']:
        t = w.get('tags', {}); g = [xy(p, lat) for p in w['geometry']]; nm = (t.get('name', '') + ' ' + t.get('service', '')).lower()
        if 'kart' in nm or t.get('sport') == 'karting' or t.get('area') == 'yes': continue
        (pit if 'pit' in nm else main).append(g)
    if not main: print(f'  {k}: no circuit', file=sys.stderr); continue
    loop = stitch(main); closed = key(loop[0]) == key(loop[-1])
    near = lambda w: min(math.dist(a, b) for a in (w[0], w[-1]) for b in loop[::2]) < 80     # a pit lane joins the circuit
    pit = [w for w in pit if near(w)]; pitl = max(pit, key=length) if pit else []
    if length(loop) < 2000 and k in SKIP_SHORT: print(f'  {k}: circuit incomplete in OSM, skipped', file=sys.stderr); continue
    allp = loop + pitl; x0 = min(p[0] for p in allp); y1 = max(p[1] for p in allp)
    span = max(max(p[0] for p in allp) - x0, y1 - min(p[1] for p in allp))
    g = lambda pts: [(round((p[0] - x0) / span * 1000), round((y1 - p[1]) / span * 1000)) for p in simplify(pts, span / 400)]
    enc = lambda pts: ' '.join(f'{a},{b}' for a, b in g(pts))
    out[k] = {'l': enc(loop), 'p': enc(pitl) if pitl else '', 'km': round(length(loop) / 1000, 2), 'c': int(closed)}
    print(f'  {k:13s} {name:28s} {out[k]["km"]:5.2f} km  {"closed" if closed else "OPEN"}  {len(g(loop))} pts  pit {"yes" if pitl else "no"}', file=sys.stderr)
print('const TRACKMAP=' + json.dumps(out, separators=(',', ':')) + ';')
