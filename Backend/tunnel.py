
import wexpect
from pyngrok import ngrok
childs = []

def openPort(host , queue):
    global childs

    for c in childs:
        if c["host"] == host:
            queue.put(c["url"])

            
    password = "DEIN_PASSWORD" 

    cmd = f"ssh -p 443 -R 80:{host} a.pinggy.io"
    
    print(f"🚀 Starte Pinggy-Tunnel für Port {host}...")
    child = wexpect.spawn(cmd)
    

    try:
        index = child.expect(["password:", "http[s]?://[a-zA-Z0-9.-]+\.pinggy\.link"], timeout=10)
        if index == 0:
            child.sendline(password)
    except wexpect.TIMEOUT:
        pass 


    url_regex = r'(https?://[a-z0-9\-]+\.a\.free\.pinggy\.link)'
    pinggy_url = None

    try:
        child.expect(url_regex, timeout=20)
        pinggy_url = child.match.group(1)
    except wexpect.TIMEOUT:
        print("❌ URL wurde nicht gefunden! Prüfe deine Internetverbindung oder das Passwort.")
    
    if pinggy_url:
        childs.append({"host": host, "child": child, "url": pinggy_url})
    
    queue.put(pinggy_url)

