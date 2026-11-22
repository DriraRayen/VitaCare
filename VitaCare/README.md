# VitaCare

VitaCare runs the French patient and doctor dashboards through one Python service. The server stores accounts, invitations, care tasks, sharing permissions, medical documents and the patient's expense notebook in a private SQLite database.

## Start locally

Install Python 3.12 and extract the ZIP. Open a terminal in the folder that contains server.py and run

```sh
python -m venv .venv
```

Activate the environment with `.venv\Scripts\activate` on Windows or `source .venv/bin/activate` on macOS/Linux. Then run

```sh
python -m pip install -r requirements.txt
python server.py
```

Open http://127.0.0.1:8000. Use the same address for each account. Separate browser profiles let you keep a doctor and patient signed in simultaneously.

## Integrate with an existing website

Copy the whole `vitacare/` directory into the host project and install `requirements.txt` in the Python service's environment. `vitacare/service.py` implements the JSON and file APIs. `vitacare/application.py` combines them with the interface in `vitacare/web/`. The standalone launcher and host both use this same application.

**Python ASGI host.** Add these lines to the host's startup code, before any catch-all route. Here `app` is the host's existing FastAPI or Starlette application.

```python
from vitacare import app as vitacare_app

app.mount("/care", vitacare_app)
```

Set `VITA_HOSTS` to the host's actual hostname and `VITA_DATA` to the private data directory before importing VitaCare. For an upgrade, point it at the existing directory containing **both** `vita.sqlite3` and `documents.key`. Use `VITA_HTTPS=1` on HTTPS sites. Each user signs in through VitaCare.

**Other host stacks.** Run VitaCare as a separate Python service behind the site's reverse proxy. For the example mount, run `python -m uvicorn vitacare:app --host 127.0.0.1 --port 8000 --root-path /care`. Forward requests beginning with `/care/` to that service, stripping the `/care` prefix and preserving the public Host header. Keep the host page and VitaCare on the same origin.

**Use the existing screens.** Add `<a href="/care/">Ouvrir VitaCare</a>` anywhere on the host. To display the screens inside a page, set `VITA_EMBED=1` before starting the service, then insert

```html
<iframe src="/care/" title="VitaCare" style="width:100%;height:85vh;border:0"></iframe>
```

Both methods load VitaCare's styles in their own document. Only trusted pages and scripts should share this origin. Reserve the `vita_session` cookie name for VitaCare. When mounted, its cookie path follows the selected mount.

**Use the functionality with your own interface.** Import the browser client as an ES module. It locates the API relative to its own URL and uses the signed-in user's session. A session failure rejects with `error.status === 401`.

```html
<script type="module">
  import {createVitaCareClient} from "/care/ui/client.js";
  const care = createVitaCareClient();
  try {
    const {me, tasks} = await care.call("state");
    document.querySelector("#care-summary").textContent =
      me.name + " · " + tasks.length + " tâche(s)";
  } catch (error) {
    if (error.status === 401) location.assign("/care/");
    else throw error;
  }
</script>
<p id="care-summary"></p>
```

| Operation | Example call |
| --- | --- |
| Sign in / register | `care.call("login", {role, email, password})` or `care.call("register", {role, email, name, password})`. Roles are `patient` and `doctor`. |
| Search and connect | `care.call("find", {email})`, then `care.call("invite", {peer: id})`. The recipient calls `approve` with the sender's ID. Either party can call `disconnect` with the other person's ID. |
| Manage patients and tasks | Doctors call `provision` with `{email, name}` or `task` with `{patient, title, instructions, due}`. Patients call `complete` with `{task: id}`. |
| Manage documents | Patients call `care.uploadDocument(file, title, "Analyse")` and `care.call("share", {doc, doctor})`. Use `unshare` to revoke the grant. `care.documentURL(id)` returns the permission-checked download URL. |
| End session | `care.call("logout")` |

For direct HTTP use, send JSON to `POST <mount>/api/<action>` with the session cookie and `X-Vita-Request: 1`. The client also handles binary uploads. The server checks roles, connections and document grants on each relevant operation.

## Storage and deployment

Local configuration uses loopback HTTP and a private database for development with fictitious records.

For network deployment, put an HTTPS reverse proxy in front of the loopback service. Configure these environment variables before starting it.

| Variable | Purpose |
| --- | --- |
| VITA_HTTPS | Set to 1 to issue Secure session cookies. |
| VITA_HOSTS | Comma-separated hostnames accepted by the service, such as care.example.org. Configure the proxy to preserve the Host header. |
| VITA_DATA | Private persistent directory for the database and document encryption key. Defaults to private/ beside server.py. |
| VITA_PORT | Local HTTP port. Defaults to 8000. |

Limit filesystem access to the service account, including on Windows. Back up both the database and documents.key to protected storage. Uploaded file contents and expense notebooks use authenticated encryption. SQLite also contains profile information, task text, document titles and sharing metadata, so deployment storage and backups need protection. Sessions expire after eight hours.

Email addresses are self-reported sign-in identifiers. Registration does not verify ownership of a mailbox. Professional-license verification and clinical deployment review are outside this implementation. Use a local prototype with fictitious records until the deployment and clinician enrollment process have been reviewed.

## Run the integration tests

```sh
python -m pip install httpx==0.28.1
python -m unittest -v test_workflows
```

The tests use a temporary database and exercise both invitation directions, patient provisioning, sign-in, profile updates, document sharing, task completion, revocation, duplicate prevention and access separation.
