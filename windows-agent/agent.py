import base64, json, os, tempfile, time, urllib.request, urllib.error
from pathlib import Path

API_URL = "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE"
POLL_SECONDS = 5
SUMATRA_PDF = r"C:\Program Files\SumatraPDF\SumatraPDF.exe"
PRINTER_NAME = ""  # Optional: set exact Windows printer name.

def request_json(url, payload=None):
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type":"application/json"} if data else {})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode())

def print_file(path, copies=1):
    if os.path.exists(SUMATRA_PDF):
        args = [SUMATRA_PDF, "-silent", "-print-to-default" if not PRINTER_NAME else "-print-to", PRINTER_NAME, "-print-settings", f"{copies}x", path]
        if PRINTER_NAME:
            args = [SUMATRA_PDF, "-silent", "-print-to", PRINTER_NAME, "-print-settings", f"{copies}x", path]
        else:
            args = [SUMATRA_PDF, "-silent", "-print-to-default", "-print-settings", f"{copies}x", path]
        import subprocess
        subprocess.run(args, check=True)
    else:
        os.startfile(path, "print")

def main():
    if "PASTE_" in API_URL:
        raise SystemExit("Set API_URL in agent.py first.")
    print("D&D Digital Solutions Auto-Print Agent started.")
    while True:
        try:
            job = request_json(API_URL + "?action=next")
            if job.get("job") is None:
                time.sleep(POLL_SECONDS); continue
            j = job
            suffix = Path(j["fileName"]).suffix or ".bin"
            fd, temp = tempfile.mkstemp(prefix="dd_print_", suffix=suffix)
            os.close(fd)
            Path(temp).write_bytes(base64.b64decode(j["fileData"]))
            try:
                print(f"Printing {j['orderId']} - {j['fileName']}")
                print_file(temp, int(j.get("copies",1)))
                request_json(API_URL, {"action":"complete","orderId":j["orderId"]})
                print("Completed:", j["orderId"])
            except Exception as e:
                request_json(API_URL, {"action":"failed","orderId":j["orderId"],"error":str(e)})
                print("Print failed:", e)
            finally:
                try: os.remove(temp)
                except OSError: pass
        except Exception as e:
            print("Agent error:", e)
            time.sleep(POLL_SECONDS)

if __name__ == "__main__":
    main()
