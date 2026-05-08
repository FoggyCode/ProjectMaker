import wexpect
import shutil

childs = []

def openPort(host, queue):
    global childs
    import os
    os.environ["PYTHONIOENCODING"] = "utf-8"

    try:
        # Bereits vorhandenen Tunnel zurückgeben
        for c in childs:
            if c["host"] == host:
                queue.put({"error": False, "content": c["url"]})
                return

        password = "DEIN_PASSWORD"

        ssh_path = shutil.which("ssh") or r"C:\Windows\System32\OpenSSH\ssh.exe"

        cmd = f'"{ssh_path}" -p 443 -R 80:{host} a.pinggy.io'

        print(f"Starte Pinggy-Tunnel für Port {host}...")
        child = wexpect.spawn(cmd, encoding="utf-8", errors="replace")

        try:
            index = child.expect(
                ["password:", r"http[s]?://[a-zA-Z0-9.-]+\.pinggy\.link"],
                timeout=10
            )
            if index == 0:
                child.sendline(password)
        except wexpect.TIMEOUT:
            pass

        url_regex = r'(https?://[a-z0-9\-]+\.a\.free\.pinggy\.link)'

        try:
            child.expect(url_regex, timeout=15)
            pinggy_url = child.match.group(1)
        except wexpect.TIMEOUT:
            queue.put({
                "error": True,
                "content": "URL nicht gefunden (Timeout)"
            })
            return

        # Erfolg
        childs.append({
            "host": host,
            "child": child,
            "url": pinggy_url
        })

        queue.put({
            "error": False,
            "content": pinggy_url
        })

    except Exception as e:
        queue.put({
            "error": True,
            "content": "Fataler Fehler: " + str(e)
        })