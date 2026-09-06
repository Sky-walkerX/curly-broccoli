import json,re
sw=json.load(open('corpus/raw/sih2026_sw_scored.json'))

# --- skill fit for THIS team: AI/ML deep learning + full-stack web/app + cybersecurity/systems (NOT geospatial) ---
CYBER=r'\b(forensic|malware|threat|intrusion|packet|netflow|siem|\blog\b|logs|vpn|tls|ssl|crypto|cryptograph|phish|spoof|\bemail\b|dark ?web|\bsoc\b|vulnerab|pentest|penetration|compliance|hardening|cis benchmark|stig|blockchain|wallet|bitcoin|cyber|attack|ransomware|fraud|deanonym|de-anonym|exfiltrat|ddos|botnet|firewall|network security|authentication|deepfake|voice clon|steganog|osint|attribution)\b'
AIML=r'\b(ai|ml|machine learning|deep learning|neural|nlp|llm|genai|generative|rag|anomaly|classif|detection|prediction|forecast|recommend|chatbot|transformer|gnn|graph neural|computer vision|ocr|segmentation|sentiment|clustering)\b'
FULLSTACK=r'\b(platform|dashboard|portal|web|app\b|application|management system|interface|gui|visuali|api|database|real-time|monitoring)\b'
# ANTI-fit: needs geospatial/RF/physics/hardware/domain this team lacks & has no mentor for
HARD=r'\b(satellite imag|remote sensing|\bsar\b|hyperspectral|sentinel|multispectral|orthorect|photogrammetr|dem\b|raster|geotiff|hydrodynam|hydrolog|meteorolog|weather forecast|nowcast|monsoon|cyclone|ocean|marine|seismic|geolog|\borbit|ephemeris|ionospher|troposph|lidar|point cloud|\.iq|waveform|modulation|demodulat|\bfec\b|rf signal|spectrum|antenna|ansys|thermal comfort|aero.?piston|\bengine\b|combustion|drone video|3d model|slam|ugv|robot|warehouse|hydraulic|dam break|inundation|electronic warfare|radar)\b'

def fit(r):
    t=(r['title']+' '+r['description']).lower()
    cy=len(re.findall(CYBER,t)); ai=len(re.findall(AIML,t)); fs=len(re.findall(FULLSTACK,t)); hd=len(re.findall(HARD,t))
    # base skill fit 0-10
    s=0
    s+=min(4,cy*1.3)          # cyber is their edge + a low-crowd theme
    s+=min(3,ai*0.6)
    s+=min(2,fs*0.5)
    if cy>=2 and ai>=1: s+=1  # cyber+ai combo = bullseye
    s-=min(6,hd*2.2)          # heavy penalty for domain they can't defend without a mentor
    return round(max(0,min(10,s)),1),dict(cy=cy,ai=ai,fs=fs,hd=hd)

# --- crowd score 0-10 (lower crowd -> higher score). pred ranges ~86..500 ---
def crowd_score(p):
    # 100->9, 140->7, 200->5, 300->3, 500->0
    import math
    return round(max(0,min(10, 10 - (p-86)/45)),1)

for r in sw:
    f,parts=fit(r); r['fit']=f; r['fitparts']=parts
    r['crowd']=crowd_score(r['pred'])
    # win-probability composite: crowd 45%, fit 45%, small novelty bump for detail depth 10%
    detail=min(1.0,r['desc_len']/2500)
    r['win']=round(0.45*r['crowd']+0.45*r['fit']+1.0*detail,2)

sw.sort(key=lambda x:-x['win'])
json.dump(sw,open('corpus/raw/sih2026_ranked.json','w'),indent=1,ensure_ascii=False)

print("TOP 22 SOFTWARE PS BY WIN-PROBABILITY (this team)")
print(f"{'rank':>4} {'win':>5} {'crowd':>5} {'fit':>4} {'~teams':>6}  {'PS':9} {'org':22} title")
for i,r in enumerate(sw[:22],1):
    print(f"{i:>4} {r['win']:>5} {r['crowd']:>5} {r['fit']:>4} {r['pred']:>6}  {r['ps_id']:9} {r['org'][:22]:22} {r['title'][:52]}")
print("\n\nBOTTOM 8 (traps for this team):")
for r in sw[-8:]:
    print(f"  win {r['win']:>4} fit {r['fit']:>4} ~{r['pred']:>3}  {r['ps_id']} {r['title'][:60]}")
