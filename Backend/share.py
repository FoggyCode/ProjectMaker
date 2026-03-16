from flask import Flask, request , render_template , jsonify , send_file
import sys, os, time, threading
import requests
from ports import find_free_port

def resource_path(relative_path):
    if getattr(sys, 'frozen', False):
        base_path = sys._MEIPASS
    else:
        base_path = os.path.abspath("../Frontend")
    return os.path.join(base_path, relative_path)

shareServer = Flask(
    __name__,
    static_folder=resource_path("assets"),
    template_folder=resource_path("templates")
)

def success(content):
    return jsonify({"success" : True , "content" : content})

def error(content):
    return jsonify({"success" : False , "content" : content})

import string , random
def random_string(length=16):
    chars = string.ascii_lowercase + string.digits
    return ''.join(random.choice(chars) for _ in range(length))

shared_projects = []

@shareServer.route("/")
def home():
    return render_template("share.html")

flaskPort = None # Port of main flask
port = None # my Port

def shutdown_server():
    func = request.environ.get('werkzeug.server.shutdown')
    if func is None:
        raise RuntimeError("Nicht mit dem Werkzeug Server gestartet")
    func()


def closeProject(project , minutes=30):
    time.sleep(60 * minutes)
    shared_projects.remove(project)

@shareServer.route("/project" , methods = ["GET"])
def getProject():
    id = request.args.get("id")
    if not id : return error("No id was given")
    for proj in shared_projects:
        if proj["id"] == id:

            resp = requests.get("http://127.0.0.1:" + str(flaskPort) + "/projects/info?path=" + proj["path"])
            respList = requests.get("http://127.0.0.1:" + str(flaskPort) + "/projects")
            respFiles = requests.get("http://127.0.0.1:" + str(flaskPort) + "/projects/files?path="+ proj["path"])

            result  = {
                "info" : resp.json()
            }
            if respList.json():
                for projL in respList.json()["content"]:
                    if projL["path"] == proj["path"]:
                        result["proj"] = projL            
                        
            if respFiles.json():
                result["files"] = respFiles.json()

           
            return success(result)

    return error("Error occoured!")
         
@shareServer.route("/project/download" , methods = ["GET"])
def downloadZip():   
    id = request.args.get("id")
    if not id : return error("No id was given")
    for proj in shared_projects:
        resp = requests.get("http://127.0.0.1:" + str(flaskPort) + "/projects/zip?path=" + proj["path"] + "&notOpen=true").json()
        print(resp)
        if (resp["success"]):
            path = resp["content"]
            if not os.path.exists(path):
                return "Datei existiert nicht!", 404

            return send_file(
                path,
                as_attachment=True,  
                download_name="projekt.zip",  
                mimetype="application/zip"
    )



def flask():
    global port
    shareServer.config['TEMPLATES_AUTO_RELOAD'] = True
    shareServer.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
    shareServer.run(host="0.0.0.0", port=port)

def addProject(path):
    project=  {
        "id" :  random_string(10),
        "path" : path
    }
    shared_projects.append(project)
    threading.Thread(target=closeProject, args=(project,30), daemon=True).start()
    return project["id"]

def startShareServer(mainPort):

    global flaskPort
    flaskPort = mainPort
    
    global port


    port = find_free_port()
   
    try :
        threading.Thread(target=flask, daemon=True).start()

    except:
        return None
    
   
    return port