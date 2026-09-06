import json
sw={r['ps_id']:r for r in json.load(open('corpus/raw/sih2026_ranked.json'))}

# Hand-read adjustments from reading full descriptions.
# demo: 0-10 how strong/legible the live "magic moment" is on a projector
# build: 0-10 buildable to working prototype in the internal-hackathon window by THIS team
# defend: 0-10 how well team can defend in expert Q&A WITHOUT a domain mentor
# data: 0-10 availability of a usable public/synthetic dataset
# note: short verdict
ADJ = {
 'SIH26145': (8,9,8,8,"Passive NetFlow/PCAP anomaly detection. Scary 'data diode' framing keeps crowd low; underneath it's classic ML they can nail. Public IDS datasets. Streaming dashboard = clean demo."),
 'SIH26155': (10,9,8,9,"Upload a Cisco/Juniper config -> instant CIS/NIST pass-fail + one-click remediation PDF + a GUI that 'learns' unknown vendors. Best projector demo in the pool. Configs are everywhere."),
 'SIH26159': (8,9,8,8,"PCAP -> reconstruct TLS handshakes -> flag weak crypto -> risk dashboard. Tight scope, pure cyber+ML, public captures. Niche but very defensible."),
 'SIH26102': (8,9,7,7,"MPLADS fund-fraud analytics: tabular anomaly + duplicate-work detection on a map/dashboard. Buildable, strong civic story. 'Anomaly detection' is common, so lean hard on explainability to stand out."),
 'SIH26183': (9,8,7,8,"Paste a victim's wallet -> trace on-chain -> name the exchange/VASP -> investigator report. High-impact 'recover the money' narrative + graph viz. Crypto draws a slightly bigger crowd."),
 'SIH26106': (9,9,7,8,"Email header forensics + SPF/DKIM + IP geolocation trace map. Very visual, buildable, public phishing corpora. AICTE (not defence) so crowd a touch higher."),
 'SIH26104': (9,8,7,7,"Live voice-clone detector: clone a teammate's voice on stage, system flags it in real time. Killer demo, hot topic. Public deepfake-audio datasets. Medium crowd."),
 'SIH26156': (6,8,7,7,"'Universal log preprocessor' looks like plumbing (keeps crowd LOW = arbitrage) and is genuinely buildable, but the wow-moment is weaker. Great safe second pick, not a showstopper."),
 'SIH26034': (8,9,8,7,"Scan a product label -> validate Legal Metrology declarations -> compliance report. Simple, buildable, clear demo. Consumer-friendly so real crowd may exceed the estimate."),
 'SIH26151': (6,6,6,5,"Dark-web actor de-anonymization: irresistible topic, but Tor de-anon is hard to demo convincingly and real data access is limited. High story, high risk."),
 'SIH26146': (8,8,7,8,"Bitcoin tx graph + anomaly/clustering, synthetic data provided. Buildable and visual, but Bitcoin is a magnet ~240 teams -> ~2x the crowd of the arbitrage picks."),
 'SIH26187': (8,8,6,7,"Multi-camera border video analytics. CV-heavy, buildable, but 'border surveillance' framing and expert MHA judges raise the defence bar."),
 'SIH26150': (6,5,6,6,"DVR/NVR forensic tool needs proprietary Dahua/Hikvision formats you can't easily get without the hardware. Low crowd, but real demo risk. Only if you have the gear."),
 'SIH26157': (5,6,5,6,"NCIIPC SOC supervisory analytics — abstract 'execution gaps / negative space' audit tool, air-gapped, expert judges. Scores high on paper but weak wow-moment and tough to defend first-time."),
 'SIH26148': (3,2,4,4,"New polymorphic language to bypass antivirus + BYOVD. Multi-month research, offensive tooling, no clean demo. Model overrates it — avoid."),
 'SIH26141': (5,4,3,5,"Quantum Digital Signature security — explicitly BANS AI/ML and needs real quantum mechanics. Your core edge is disallowed here. Avoid."),
}
rows=[]
for pid,(demo,build,defend,data,note) in ADJ.items():
    r=sw[pid]
    # final = 40% crowd-arbitrage, 25% skill/defend, 20% demo, 15% build&data
    final = 0.040*(r['crowd']*10) + 0.25*((r['fit']+defend)/2) + 0.20*demo + 0.075*build + 0.075*data
    r['final']=round(final,2); r['demo']=demo; r['build']=build; r['defend']=defend; r['note']=note
    rows.append(r)
rows.sort(key=lambda x:-x['final'])
print(f"{'#':>2} {'score':>5} {'~teams':>6} {'demo':>4} {'build':>5} {'PS':9} {'org':16} title")
for i,r in enumerate(rows,1):
    print(f"{i:>2} {r['final']:>5} {r['pred']:>6} {r['demo']:>4} {r['build']:>5}  {r['ps_id']:9} {r['org'][:16]:16} {r['title'][:44]}")
json.dump(rows,open('corpus/raw/sih2026_final12.json','w'),indent=1,ensure_ascii=False)
