"""Run against a temporary private database: python -m unittest -v test_workflows."""
import os
import tempfile
import unittest

sandbox=tempfile.TemporaryDirectory()
os.environ['VITA_DATA']=sandbox.name
os.environ.pop('VITA_HTTPS',None)
os.environ['VITA_HOSTS']='testserver'
from fastapi.testclient import TestClient
import server

class CareWorkflow(unittest.TestCase):
    def client(self):
        return TestClient(server.app,headers={'X-Vita-Request':'1'})

    def post(self,client,action,expected=200,**data):
        r=client.post('/api/'+action,json=data)
        self.assertEqual(r.status_code,expected,(action,r.text))
        return r.json()

    def account(self,name,kind):
        c=self.client()
        email=name+'@vitacare.test'
        self.post(c,'register',email=email,name=name,role=kind,password='sample-password-123')
        return c,self.post(c,'state')['me']['id']

    def test_linking_documents_and_tasks(self):
        p,pid=self.account('patient','patient')
        d,did=self.account('doctor','doctor')
        other,oid=self.account('other','doctor')
        stranger,_=self.account('stranger','patient')
        self.post(p,'profile',name='Patient A',bio='Profil')
        self.assertEqual(self.post(d,'find',email='PATIENT@VITACARE.TEST')['match']['id'],pid)
        self.post(d,'invite',peer=pid)
        self.post(d,'approve',403,peer=pid)
        self.post(d,'task',403,patient=pid,title='Tâche')
        self.post(p,'approve',peer=did)
        self.post(p,'invite',peer=oid)
        self.post(other,'approve',peer=pid)
        self.assertEqual(len(self.post(p,'state')['links']),2)
        content=b'%PDF-1.7\nPatient test content'
        response=p.post('/api/documents',content=content,headers={'X-Title':'Bilan','X-Category':'Analyse'})
        self.assertEqual(response.status_code,200,response.text)
        doc=self.post(p,'state')['docs'][0]['id']
        url='/api/document/'+str(doc)
        self.assertEqual(d.get(url).status_code,404)
        self.post(p,'share',doc=doc,doctor=did)
        self.assertEqual(d.get(url).content,content)
        self.assertEqual(other.get(url).status_code,404)
        self.assertEqual(stranger.get(url).status_code,404)
        self.post(d,'share',403,doc=doc,doctor=oid)
        self.post(p,'organize',doc=doc,title='Ordonnance',category='Ordonnance')
        self.post(d,'task',patient=pid,title='Préparer le dossier',instructions='Copie',due='2027-01-02')
        task=self.post(p,'state')['tasks'][0]['id']
        self.post(other,'edit-task',404,task=task,patient=pid,title='X',due='')
        self.post(d,'edit-task',task=task,patient=pid,title='Apporter le dossier',due='')
        self.post(stranger,'complete',404,task=task)
        self.post(p,'complete',task=task)
        self.assertEqual(self.post(d,'state')['tasks'][0]['done'],1)
        self.post(p,'unshare',doc=doc,doctor=did)
        self.assertEqual(d.get(url).status_code,404)
        self.post(p,'share',doc=doc,doctor=did)
        self.post(d,'disconnect',peer=pid)
        self.assertEqual(d.get(url).status_code,404)
        self.assertEqual(self.post(d,'state')['tasks'],[])
        self.post(p,'invite',peer=did)
        self.post(d,'approve',peer=pid)
        self.assertEqual(d.get(url).status_code,404)
        self.post(p,'disconnect',peer=did)
        self.post(p,'delete-doc',doc=doc)
        self.assertEqual(p.get(url).status_code,404)

    def test_doctor_created_signup_and_duplicate_prevention(self):
        d,did=self.account('provisioner','doctor')
        email='new@vitacare.test'
        self.post(d,'provision',email=email,name='New')
        p,pid=self.account('new','patient')
        self.assertFalse(self.post(d,'state')['links'][0]['active'])
        self.post(p,'approve',peer=did)
        self.post(d,'provision',email=email.upper(),name='Duplicate')
        self.assertEqual(len(self.post(d,'state')['links']),1)
        self.post(p,'logout')
        self.post(p,'state',401)
        self.post(p,'login',401,email=email,role='doctor',password='sample-password-123')
        self.post(p,'login',email=email.upper(),role='patient',password='sample-password-123')
        self.assertEqual(self.post(p,'state')['me']['id'],pid)
        self.post(self.client(),'register',409,email=email.upper(),role='patient',name='Duplicate',password='new-password-123')
        self.post(self.client(),'login',401,email=email,role='patient',password='new-password-123')
        self.assertEqual(p.post('/api/profile',json={'name':'x'},headers={'X-Vita-Request':''}).status_code,403)
        self.assertEqual(p.post('/api/documents',content=b'not a medical file',headers={'X-Title':'Invalid','X-Category':'Autre'}).status_code,400)
        data={'lang':'fr','size':1,'rate':70,'items':[]}
        self.post(p,'diary-save',data=data,version=0)
        self.post(p,'diary-save',409,data=data,version=0)
        self.post(d,'diary-read',403)
        self.assertEqual(self.post(p,'diary-read')['data'],data)

class MountedWorkflow(unittest.TestCase):
    def test_mount_assets_sessions_and_permissions(self):
        from fastapi import FastAPI
        from urllib.parse import urljoin
        from html.parser import HTMLParser

        class Assets(HTMLParser):
            def __init__(self):
                super().__init__()
                self.urls = []

            def handle_starttag(self, tag, attrs):
                attributes = dict(attrs)
                if tag in ("script", "link"):
                    self.urls.append(attributes.get("src") or attributes["href"])

        host = FastAPI()
        prefix = "/portal/care"
        host.mount(prefix, server.app)
        client = TestClient(host, headers={"X-Vita-Request":"1"})
        for route in ("/", "/parcours"):
            page = client.get(prefix + route)
            self.assertEqual(page.status_code, 200)
            assets = Assets()
            assets.feed(page.text)
            self.assertTrue(assets.urls)
            for ref in assets.urls:
                url = urljoin(str(page.url), ref)
                self.assertIn(prefix + "/ui/", url)
                self.assertEqual(client.get(url).status_code, 200)
        self.assertEqual(client.get(prefix + "/ui/client.js").status_code, 200)
        api = prefix + "/api/"
        registration = client.post(api+"register", json=dict(email="mounted@vita.test", role="patient",name="Mounted",password="example-test-pass"))
        self.assertEqual(registration.status_code,200)
        self.assertIn("Path="+prefix+"/", registration.headers["set-cookie"])
        self.assertEqual(client.post(api+"state", json={}).json()["me"]["name"], "Mounted")
        self.assertNotIn("cookie", client.build_request("GET","/another-page").headers)
        self.assertEqual(client.post(api+"state", json={}, headers={"Origin":"https://unrelated.test"}).status_code,403)
        self.assertEqual(client.post(api+"logout",json={}).status_code,200)
        self.assertEqual(client.post(api+"state",json={}).status_code,401)

if __name__=='__main__':
    unittest.main()
