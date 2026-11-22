"""VitaCare domain operations and HTTP API, independent of the web interface."""
import hashlib
import hmac
import os
import re
import secrets
import sqlite3
import time
from contextlib import contextmanager
from datetime import date
from pathlib import Path
from urllib.parse import quote

from cryptography.fernet import Fernet
from fastapi import APIRouter, HTTPException, Request, Response
from starlette.concurrency import run_in_threadpool

ROOT = Path(__file__).resolve().parent.parent
DATA = Path(os.environ.get("VITA_DATA", ROOT / "private"))
DATA.mkdir(mode=0o700, parents=True, exist_ok=True)
PUBLIC = os.getenv("VITA_HTTPS") == "1"
router = APIRouter()
MAX_FILE = 8 * 1024 * 1024
CATEGORIES = ("Analyse", "Imagerie", "Ordonnance", "Compte rendu", "Autre")
DB = DATA / "vita.sqlite3"

@contextmanager
def database(write=False):
    db = sqlite3.connect(DB, timeout=15)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    try:
        db.execute("BEGIN IMMEDIATE" if write else "BEGIN")
        yield db
        db.commit()
    finally:
        db.close()

def init():
    DB.touch(mode=0o600, exist_ok=True)
    with database(True) as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('patient','doctor')), pw TEXT, bio TEXT DEFAULT '');
        CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, uid INTEGER REFERENCES users, expiry INTEGER);
        CREATE TABLE IF NOT EXISTS limits(key TEXT PRIMARY KEY, count INTEGER, expiry INTEGER);
        CREATE TABLE IF NOT EXISTS links(patient INTEGER REFERENCES users, doctor INTEGER REFERENCES users,
          sender INTEGER REFERENCES users, active INTEGER DEFAULT 0, PRIMARY KEY(patient,doctor));
        CREATE TABLE IF NOT EXISTS docs(id INTEGER PRIMARY KEY, patient INTEGER REFERENCES users,
          title TEXT, category TEXT, ext TEXT, size INTEGER, content BLOB);
        CREATE TABLE IF NOT EXISTS grants(doc INTEGER REFERENCES docs ON DELETE CASCADE,
          doctor INTEGER REFERENCES users, PRIMARY KEY(doc,doctor));
        CREATE TABLE IF NOT EXISTS tasks(id INTEGER PRIMARY KEY, patient INTEGER REFERENCES users,
          doctor INTEGER REFERENCES users,title TEXT,instructions TEXT,due TEXT,done INTEGER DEFAULT 0);
        CREATE TABLE IF NOT EXISTS diary(patient INTEGER PRIMARY KEY REFERENCES users, version INTEGER, body BLOB);
        """)
    # Publish a complete key atomically, including when two workers start together.
    keyfile = DATA / "documents.key"
    if not keyfile.exists():
        tmp = DATA / secrets.token_hex(16)
        with os.fdopen(os.open(tmp, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600), "wb") as f:
            f.write(Fernet.generate_key())
        try:
            os.link(tmp, keyfile)
        except FileExistsError:
            pass
        finally:
            tmp.unlink()
    return Fernet(keyfile.read_bytes())

cipher = init()
def fail(code, msg):
    raise HTTPException(code, msg)

def string(data, key, maximum, optional=False):
    v = data.get(key, "")
    if not isinstance(v, str) or len(v.strip()) > maximum or (not optional and not v.strip()):
        fail(400, "Champ incorrect : " + key)
    return v.strip()

def email_of(d):
    value = string(d, "email", 254).casefold()
    if not re.fullmatch(r"[^\s@<>\x00-\x1f]+@[^\s@<>\x00-\x1f]+\.[^\s@<>\x00-\x1f]+", value):
        fail(400, "Adresse e-mail incorrecte.")
    return value

def ident(d, k):
    n = d.get(k)
    if type(n) is not int or not 0 < n <= 2**53-1:
        fail(400, "Identifiant incorrect.")
    return n

def hashed(s):
    return hashlib.sha256(s.encode()).hexdigest()

def password(p, salt):
    return hashlib.scrypt(p.encode(), salt=bytes.fromhex(salt), n=2**15, r=8, p=1, maxmem=64*1024**2).hex()

def user(db, token):
    row = db.execute("SELECT u.* FROM users u JOIN sessions s ON s.uid=u.id WHERE s.token=? AND s.expiry>?", (hashed(token), time.time())).fetchone()
    if not row:
        fail(401, "Connectez-vous pour continuer.")
    return row

def role(u, requested):
    if u['role'] != requested:
        fail(403, "Action non autorisée.")

def rate(key, maximum, interval):
    with database(True) as db:
        now = int(time.time())
        db.execute("DELETE FROM limits WHERE expiry<=?", (now,))
        db.execute("INSERT INTO limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1", (hashed(key), now+interval))
        if db.execute("SELECT count FROM limits WHERE key=?", (hashed(key),)).fetchone()[0] > maximum:
            fail(429, "Trop de tentatives. Réessayez plus tard.")

def rows(db, sql, args):
    return [dict(r) for r in db.execute(sql, args)]

def relation(db, u, peer, active=False):
    pair=(u['id'],peer) if u['role']=='patient' else (peer,u['id'])
    row=db.execute("SELECT * FROM links WHERE patient=? AND doctor=?",pair).fetchone()
    if not row or (active and not row['active']):
        fail(403, "Connexion non autorisée.")
    return row

def state(db,u):
    patient=u['role']=='patient'
    own, other=('patient','doctor') if patient else ('doctor','patient')
    links=rows(db,f"SELECT u.id,u.name,u.email,l.active,l.sender FROM links l JOIN users u ON u.id=l.{other} WHERE l.{own}=? ORDER BY u.name",(u['id'],))
    cols="d.id,d.patient,d.title,d.ext,d.category,d.size"
    if patient:
        docs=rows(db,"SELECT "+cols+" FROM docs d WHERE patient=? ORDER BY id DESC",(u['id'],))
        grants=rows(db,"SELECT g.* FROM grants g JOIN docs d ON d.id=g.doc WHERE patient=?",(u['id'],))
        tasks=rows(db,"SELECT t.*,u.name AS clinician FROM tasks t JOIN users u ON u.id=t.doctor WHERE patient=? ORDER BY done,due='',due,t.id",(u['id'],))
    else:
        docs=rows(db,"SELECT "+cols+" FROM docs d JOIN grants g ON g.doc=d.id JOIN links l ON l.patient=d.patient AND l.doctor=g.doctor WHERE l.active=1 AND g.doctor=? ORDER BY d.id DESC",(u['id'],))
        grants=[]
        tasks=rows(db,"SELECT t.* FROM tasks t JOIN links l USING(patient,doctor) WHERE l.active=1 AND t.doctor=? ORDER BY done,due='',due,t.id",(u['id'],))
    return dict(me={k:u[k] for k in ('id','role','email','name','bio')},links=links,docs=docs,grants=grants,tasks=tasks)

def actions(action,d,token,response,ip,cookie_path):
    import json
    if action in ('register','login','provision','find'):
        rate(ip+':'+action,100 if action=='find' else 45,900)
    if action in ('register','provision'):
        rate(action+email_of(d),5,900)
    with database(action not in ('state','find','diary-read')) as db:
        if action in ('register','login'):
            email=email_of(d)
            record=db.execute("SELECT * FROM users WHERE email=?",(email,)).fetchone()
            r=d.get('role')
            if r not in ('patient','doctor'):
                fail(400,"Choisissez un rôle.")
            pw=d.get('password','')
            if not isinstance(pw,str) or len(pw)>256:
                fail(400,"Mot de passe incorrect.")
            if action=='register':
                if record and record['pw']:
                    fail(409,"Cette adresse possède déjà un compte. Connectez-vous.")
                if record and record['role'] != r:
                    fail(409,"Une invitation patient existe pour cette adresse. Choisissez Patient.")
                if len(pw)<12:
                    fail(400,"Choisissez au moins 12 caractères.")
                name=string(d,'name',100)
                salt=secrets.token_hex(16)
                digest=salt+':'+password(pw,salt)
                if record:
                    db.execute("UPDATE users SET name=?,pw=? WHERE id=? AND pw IS NULL",(name,digest,record['id']))
                else:
                    db.execute("INSERT INTO users(email,name,role,pw) VALUES(?,?,?,?)",(email,name,r,digest))
                record=db.execute("SELECT * FROM users WHERE email=?",(email,)).fetchone()
            else:
                salt,digest=(record['pw'] if record and record['pw'] else '00'*16+':'+'00'*64).split(':')
                if not hmac.compare_digest(password(pw,salt),digest) or record['role']!=r:
                    fail(401,"Identifiants ou type de compte incorrects.")
            sid=secrets.token_urlsafe(32)
            db.execute("DELETE FROM sessions WHERE expiry<=? OR token=?",(time.time(),hashed(token)))
            db.execute("INSERT INTO sessions VALUES(?,?,?)",(hashed(sid),record['id'],time.time()+28800))
            response.set_cookie("vita_session",sid,path=cookie_path,httponly=True,secure=PUBLIC,samesite="strict",max_age=28800)
            return {}
        u=user(db,token)
        uid=u['id']
        if action=='state':
            return state(db,u)
        if action=='logout':
            db.execute("DELETE FROM sessions WHERE token=?",(hashed(token),))
            response.delete_cookie("vita_session",path=cookie_path,httponly=True,secure=PUBLIC,samesite="strict")
        elif action=='profile':
            db.execute("UPDATE users SET name=?,bio=? WHERE id=?",(string(d,'name',100),string(d,'bio',500,True),uid))
        elif action in ('find','provision'):
            email=email_of(d)
            peer=db.execute("SELECT id,name,role,pw IS NOT NULL AS ready FROM users WHERE email=?",(email,)).fetchone()
            if action=='find':
                return {'match':dict(id=peer['id'],name=peer['name']) if peer and peer['ready'] and peer['role']!=u['role'] else None}
            role(u,'doctor')
            if peer and peer['role']!='patient':
                fail(409,"Cette adresse ne correspond pas à un compte patient.")
            if not peer:
                pid=db.execute("INSERT INTO users(email,name,role) VALUES(?,?,'patient')",(email,string(d,'name',100))).lastrowid
            else:
                pid=peer['id']
            db.execute("INSERT OR IGNORE INTO links(patient,doctor,sender) VALUES(?,?,?)",(pid,uid,uid))
        elif action=='invite':
            peer=ident(d,'peer')
            target=db.execute("SELECT * FROM users WHERE id=? AND pw IS NOT NULL",(peer,)).fetchone()
            if not target or target['role']==u['role']:
                fail(404,"Compte indisponible.")
            p,dr=(uid,peer) if u['role']=='patient' else (peer,uid)
            db.execute("INSERT OR IGNORE INTO links(patient,doctor,sender) VALUES(?,?,?)",(p,dr,uid))
        elif action in ('approve','disconnect'):
            l=relation(db,u,ident(d,'peer'))
            pair=(l['patient'],l['doctor'])
            if action=='approve':
                if l['sender']==uid:
                    fail(403,"Seul le destinataire peut accepter.")
                db.execute("UPDATE links SET active=1 WHERE patient=? AND doctor=?",pair)
            else:
                db.execute("DELETE FROM grants WHERE doc IN(SELECT id FROM docs WHERE patient=?) AND doctor=?",pair)
                db.execute("DELETE FROM links WHERE patient=? AND doctor=?",pair)
        elif action in ('share','unshare','organize','delete-doc'):
            role(u,'patient')
            doc=ident(d,'doc')
            if not db.execute("SELECT id FROM docs WHERE id=? AND patient=?",(doc,uid)).fetchone():
                fail(404,"Document introuvable.")
            if action in ('share','unshare'):
                dr=ident(d,'doctor')
                relation(db,u,dr,True)
                if action=='share':
                    db.execute("INSERT OR IGNORE INTO grants VALUES(?,?)",(doc,dr))
                else:
                    db.execute("DELETE FROM grants WHERE doc=? AND doctor=?",(doc,dr))
            elif action=='delete-doc':
                db.execute("DELETE FROM docs WHERE id=?",(doc,))
            else:
                db.execute("UPDATE docs SET title=?,category=? WHERE id=?",(string(d,'title',120),category(d),doc))
        elif action in ('task','edit-task'):
            role(u,'doctor')
            pid=ident(d,'patient')
            relation(db,u,pid,True)
            due=string(d,'due',10,True)
            if due:
                try:
                    due=date.fromisoformat(due).isoformat()
                except ValueError:
                    fail(400,"Date incorrecte.")
            fields=(string(d,'title',140),string(d,'instructions',1200,True),due,pid,uid)
            if action=='task':
                db.execute("INSERT INTO tasks(title,instructions,due,patient,doctor) VALUES(?,?,?,?,?)",fields)
            elif not db.execute("UPDATE tasks SET title=?,instructions=?,due=? WHERE patient=? AND doctor=? AND id=? AND done=0",fields+(ident(d,'task'),)).rowcount:
                fail(404,"Tâche indisponible.")
        elif action=='complete':
            role(u,'patient')
            if not db.execute("UPDATE tasks SET done=1 WHERE id=? AND patient=?",(ident(d,'task'),uid)).rowcount:
                fail(404,"Tâche indisponible.")
        elif action in ('diary-read','diary-save'):
            role(u,'patient')
            row=db.execute("SELECT * FROM diary WHERE patient=?",(uid,)).fetchone()
            version=row['version'] if row else 0
            if action=='diary-read':
                return dict(version=version,data=json.loads(cipher.decrypt(row['body'])) if row else None)
            if d.get('version')!=version:
                fail(409,"Les dépenses ont changé. Rechargez la page.")
            body=json.dumps(valid_diary(d.get('data'))).encode()
            if len(body)>180000:
                fail(400,"Limite du carnet atteinte.")
            db.execute("INSERT OR REPLACE INTO diary VALUES(?,?,?)",(uid,version+1,cipher.encrypt(body)))
            return dict(version=version+1)
        else:
            fail(404,"Action inconnue.")
    return {}

def valid_diary(data):
    if not isinstance(data,dict) or data.get('lang') not in ('ar','fr','en') or data.get('size') not in (1,2,3):
        fail(400,"Préférences invalides.")
    rate=data.get('rate')
    if type(rate) is not int or not 0<=rate<=100 or not isinstance(data.get('items'),list):
        fail(400,"Carnet invalide.")
    items=[]
    ids=set()
    for it in data['items']:
        if not isinstance(it,dict):
            fail(400,"Dépense invalide.")
        n=ident(it,'id')
        if n in ids or it.get('cat') not in ('consult','tests','imaging','medication','other') or it.get('claim') not in ('none','sent','refunded'):
            fail(400,"Dépense invalide.")
        ids.add(n)
        try:
            day=date.fromisoformat(string(it,'date',10)).isoformat()
        except ValueError:
            fail(400,"Date invalide.")
        for k in ('est','paid'):
            if type(it.get(k)) not in (float,int) or not 0<=it[k]<=1e12:
                fail(400,"Montant invalide.")
        items.append(dict(id=n,cat=it['cat'],title=string(it,'title',500),date=day,claim=it['claim'],est=it['est'],paid=it['paid'],custom=True,status='done',reimb=it['cat']!='other',step=False))
    return dict(lang=data['lang'],size=data['size'],rate=rate,items=items)

def category(d):
    if d.get('category') not in CATEGORIES:
        fail(400,"Catégorie incorrecte.")
    return d['category']

async def payload(request,limit):
    if request.headers.get('X-Vita-Request')!='1':
        fail(403,"Origine non autorisée.")
    body=bytearray()
    async for part in request.stream():
        if len(body)+len(part)>limit:
            fail(413,"Fichier ou requête trop volumineux.")
        body.extend(part)
    return bytes(body)

@router.post("/api/documents")
async def upload(request:Request):
    from urllib.parse import unquote
    token=request.cookies.get('vita_session','')
    with database() as db:
        role(user(db,token),'patient')
    content=await payload(request,MAX_FILE)
    def store():
        h=request.headers
        ext=next((ext for sig,ext in [(b'%PDF-','pdf'),(b'\x89PNG\r\n\x1a\n','png'),(b'\xff\xd8\xff','jpg')] if content.startswith(sig)),None)
        if not ext:
            fail(400,"Formats acceptés : PDF, PNG et JPEG.")
        with database(True) as db:
            u=user(db,token)
            role(u,'patient')
            total=db.execute("SELECT coalesce(sum(size),0) FROM docs WHERE patient=?",(u['id'],)).fetchone()[0]
            if total+len(content)>128*1024**2:
                fail(413,"Espace personnel de 128 Mio rempli.")
            title=string({'title':unquote(h.get('X-Title',''))},'title',120)
            cat=category({'category':unquote(h.get('X-Category',''))})
            db.execute("INSERT INTO docs(patient,title,category,ext,size,content) VALUES(?,?,?,?,?,?)",(u['id'],title,cat,ext,len(content),cipher.encrypt(content)))
        return {}
    return await run_in_threadpool(store)

@router.get("/api/document/{doc}")
def download(doc:int,request:Request):
    with database() as db:
        u=user(db,request.cookies.get('vita_session',''))
        row=db.execute("""SELECT d.* FROM docs d WHERE d.id=? AND (d.patient=? OR EXISTS
          (SELECT 1 FROM grants g JOIN links l ON l.doctor=g.doctor AND l.patient=d.patient
           WHERE g.doc=d.id AND g.doctor=? AND l.active=1))""",(doc,u['id'],u['id'])).fetchone()
        if not row:
            fail(404,"Document introuvable.")
        filename=quote(row['title']+'.'+row['ext'],safe='')
        return Response(cipher.decrypt(row['content']),media_type='application/octet-stream',headers={'Content-Disposition':"attachment; filename*=UTF-8''"+filename})

@router.post("/api/{action}")
async def api(action:str,request:Request,response:Response):
    import json
    raw=await payload(request,200000)
    try:
        data=json.loads(raw)
    except (ValueError,UnicodeError):
        fail(400,"Requête invalide.")
    if not isinstance(data,dict):
        fail(400,"Requête invalide.")
    return await run_in_threadpool(actions,action,data,request.cookies.get('vita_session',''),response,request.client.host if request.client else 'local',
                                   request.scope.get('root_path','').rstrip('/')+'/')

