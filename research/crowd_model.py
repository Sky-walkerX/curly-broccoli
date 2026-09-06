import json,re,statistics as st
from collections import defaultdict

CONSUMER=r'\b(health|women|safety|tourism|tourist|farmer|agricult|student|school|teacher|learn|education|traffic|smart cit|game|garden|herbal|yoga|ayurved|food|nutrition|fitness|sport|culture|heritage|disaster|flood|mental|doctor|patient|hospital|job|career|skill|attendance|library|waste|recycl|chatbot|assistant)\b'
DEEPTECH=r'\b(protocol|firmware|kernel|driver|packet|modulation|waveform|spectral|geotiff|raster|telemetry|satellite|sar\b|lidar|hyperspectral|seismic|hydraulic|topolog|cis benchmark|gpo|stig|ldap|snmp|rtos|fpga|asic|codec|bitstream|entropy|cryptograph|steganog|forensic|malware|rootkit|obfuscat|reverse engineer|binary|assembly|numerical|finite element|solver|ephemeris|orbit|ionospher|troposph|doppler|radiometric|orthorect|photogrammetr|bathymetr|geodetic|datum|assimilat|nowcast|reanalys|argo|buoy|altimet|scatteromet|radiosonde|cyclogenesis|thermohaline|chlorophyll|aerosol|radiance|gnss|interferometr|insar|sonar|acoustic|plasma|magnetosph)\b'
ORG_LOW=r'NTRO|ISRO|DRDO|Bharat Electronics|Ministry of defence|National Technical|Earth Sciences'

def feats(t,org):
    tl=t.lower()
    return dict(
      si=1 if 'student innovation' in tl else 0,
      cons=len(re.findall(CONSUMER,tl)),
      deep=len(re.findall(DEEPTECH,tl)),
      acr=len(re.findall(r'\b[A-Z]{2,6}(?:-[A-Z0-9]+)?\b',t)),
      orglow=1 if re.search(ORG_LOW,org,re.I) else 0)

def bucket(f):
    if f['si']: return 'StudentInnov'
    if f['deep']>=1 or f['acr']>=2: return 'DeepTech'
    if f['cons']>=1: return 'Consumer'
    return 'Neutral'

# calibrated on 2024 actuals
BASE={'StudentInnov':500,'Consumer':300,'Neutral':140,'DeepTech':127}
def predict(f):
    n=BASE[bucket(f)]
    if f['orglow'] and not f['si']: n*=0.80     # defence/space/intel discount (122 vs 166)
    if f['cons']>=2 and not f['si']: n*=1.25    # multiple consumer hooks
    if f['deep']>=2: n*=0.85
    return min(500,round(n))
