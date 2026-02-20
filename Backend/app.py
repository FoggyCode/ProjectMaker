from flask import Flask ,render_template , redirect ,request , jsonify
import webview , json ,os
from collections import defaultdict
import tkinter as tk
from tkinter import filedialog
import subprocess , shutil , threading
import sys 
import os
from typing import List, Dict
from datetime import datetime
import time



def resource_path(relative_path):

    if getattr(sys, 'frozen', False):
        base_path = sys._MEIPASS
    else:

        base_path = os.path.abspath("../Frontend")

    return os.path.join(base_path, relative_path)

server = Flask(
    __name__,
    static_folder=resource_path("assets"),
    template_folder=resource_path("templates")
)


appdataPath = os.path.join(os.getenv('APPDATA') , "ProjectMaker")
templatesPath = os.path.join(os.getenv('APPDATA') , "ProjectMaker" , "templates")



@server.route("/")
def home():
    return render_template("index.html")

def success(content):
    return jsonify({"success" : True , "content" : content})

def error(content):
    return jsonify({"success" : False , "content" : content})

@server.route("/projects" , methods = ["GET"])
def getProjects():
    path = os.path.join(appdataPath , "projects.json")
    if os.path.exists(path):
        with open(path , "r") as f:
            projects = json.load(f)
            projects = [p for p in projects if os.path.exists(p["path"])]
            for p in projects:
                p["last_edited"] = get_last_modified(p["path"])
                p["created_at"] = get_creation_date(p["path"])
            
            return success(projects)
    return error("projects.json does not exists in %AppData%")

@server.route("/projects/add/evaluate" , methods = ["GET"])
def evaluateProject():
    path = request.args.get("path")

    info = {
        "ide" : "code"
    }
    if findFile(path ,"*.sln") != None:
        info["ide"] = "sln"

    idea_path = Path(path) / ".idea" 
    if idea_path.exists() and idea_path.is_dir():
        info["ide"] = "idea"


    return success(info)

@server.route("/projects/new" , methods = ["GET"])
def newProject():
    path = request.args.get("path")
    name = os.path.basename(path)
    template = request.args.get("template")
    print(template)


    if not os.path.exists(path):
        os.makedirs(path)
        
        info = {}
        templatePath = os.path.join(appdataPath , "templates" , template)
        if os.path.exists(templatePath):
            thread = threading.Thread(
                target=copyTemplate,
                args=(templatePath, path , name),
                daemon=True 
            )
            thread.start()



                
            templateInfoPath = os.path.join(templatePath , "template.pmk")
            if os.path.exists(templateInfoPath):
                with open(templateInfoPath , "r") as f:
                    info = json.load(f)

                    if "command" in info:
                        try:
                            info["command"] = info["command"].replace("<name>", name.replace(" ", "-"))
                            info["command"] = info["command"].replace("<path>", path)
                
                        
                            subprocess.Popen(
                                info["command"],
                                shell=True,
                                cwd=path
                            )
                        except Exception as e:
                            return error(str(e))
        return success({"templateInfo" : info})
    return error(False)

def get_last_modified(path):

    try:
        timestamp = os.path.getmtime(path)
        return datetime.fromtimestamp(timestamp)
    except FileNotFoundError:
        return None
    
def copyTemplate(templatePath , path , projectName):

            
    shutil.copytree(templatePath, path , dirs_exist_ok=True)
                
    clonedTemplateFile = os.path.join(path , "template.pmk")

    
    if os.path.exists(clonedTemplateFile):
        os.remove(clonedTemplateFile)


from pathlib import Path

def findFile(path ,file):
    searchpath = Path(path)
    return next(searchpath.glob(file), None)


@server.route("/projects/open" , methods = ["GET"])
def openProject():
    path = request.args.get("path")
    ide = request.args.get("ide")

    print(ide)
    
    if ide == "VSCODE":
        cmd = shutil.which("code") 
        subprocess.Popen([cmd, path] , shell=True)
    elif ide == "VSSTUDIO":
        cmd = "devenv"
        if findFile(path,"*.sln"):
            path = findFile(path,"*.sln")
        subprocess.Popen(["start", cmd, path], shell=True)
    elif ide == "INTELLIJ":
        idea_path = Path(path) / ".idea"
        
        if idea_path.exists() and idea_path.is_dir():
            print("exist")
            cmd = shutil.which("idea64") or shutil.which("idea")
            
            if cmd:
                subprocess.Popen([cmd, path])
            else:
                subprocess.Popen(["start", "idea64", path], shell=True)
        else:
            print("nonexist")
            subprocess.Popen(["start", "idea64", path], shell=True)
    else:
        return error(f"IDE {ide} not supported")


    return success(False)

@server.route("/projects" , methods = ["POST"])
def updateProjects():
    obj = request.json
    path = os.path.join(appdataPath , "projects.json")
    try:
        with open(path , "w") as f:
            projects = json.dump(obj , f)

            projects = [p for p in projects if os.path.exists(p["path"])]


            with open('data.json', 'w') as f:
                json.dump(projects, f, indent=4)
                
            return success("Updated!")
        
    except Exception as e:
        return error("Cant update! " + str(e))
    

LANG_EXTENSIONS = {
    ".py": "Python",
    ".js": "JavaScript",
    ".ts": "TypeScript",
    ".java": "Java",
    ".html": "HTML",
    ".css": "CSS",
    ".json": "JSON",
    ".cpp": "C++",
    ".c": "C",
    ".cs": "C#"
}

folders = {
    "application" : appdataPath,
    "templates" : templatesPath
}

@server.route("/explorer" , methods = ["GET"])
def openExplorer():
    path = request.args.get("path")
    name = request.args.get("name")

    FILEBROWSER_PATH = os.path.join(os.getenv('WINDIR'), 'explorer.exe')
    if path:
        path = os.path.normpath(path)
        subprocess.run([FILEBROWSER_PATH, path])
        return success("Opened!")
    elif name:
        if name in folders:
            subprocess.run([FILEBROWSER_PATH, os.path.normpath(folders[name])])
            return success("Opened!")
    else:
        return error("No path was given!")

@server.route("/settings" , methods = ["GET"])
def getSettings():
    path = os.path.join(appdataPath , "settings.json")
    if os.path.exists(path):
        with open(path , "r") as f:
            return success(json.load(f))
    return error(None)

@server.route("/projects/delete" , methods = ["GET"])
def deleteProject():
    path = request.args.get("path")

    if (not path): return error("Kein pfad!")


    if os.path.exists(path):
        thread = threading.Thread(
            target=deleteFolder,
            args=(path,),
            daemon=True 
        )
        thread.start()
        return success("Ordner gelöscht!")
    else:
        return error("Ordner exestiert nicht " + path)
    
    
def deleteFolder(path):
    shutil.rmtree(path)

@server.route("/settings" , methods = ["POST"])
def setSettings():
    path = os.path.join(appdataPath , "settings.json")
    data = request.json

    try:
        with open(path , "w") as f:
            json.dump(data ,f)
            return success("File saved!")
    except Exception as e:
        return error(e)


def get_creation_date(path):

    p = Path(path)
    if not p.exists():
        return None
    
    if sys.platform.startswith('win'):
        return datetime.fromtimestamp(p.stat().st_ctime)
    else:
        try:
            return datetime.fromtimestamp(p.stat().st_birthtime)  
        except AttributeError:
            return datetime.fromtimestamp(p.stat().st_ctime)

MAX_FILES = 1000      
FAST_FILE_SAMPLE = 500   
# Performance für riesige Ordner

@server.route("/projects/info", methods=["GET"])
def projectInfo():
    path = request.args.get("path")

    if not path or not os.path.exists(path):
        return error("Invalid path")

    files_count = 0
    lines_count = 0
    lang_lines = defaultdict(int)

    sampled_files = 0
    approximate = False

    for root, dirs, files in os.walk(path):
        for file in files:

            if file.endswith(".min.js"):
                continue

            ext = os.path.splitext(file)[1].lower()
            if ext not in LANG_EXTENSIONS:
                continue

            file_path = os.path.join(root, file)
            files_count += 1


            if files_count > MAX_FILES:
                approximate = True
                break


            if sampled_files >= FAST_FILE_SAMPLE:
                continue

            try:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    lines = sum(1 for line in f if line.strip())
                    lines_count += lines
                    lang_lines[LANG_EXTENSIONS[ext]] += lines
                    sampled_files += 1
            except Exception:
                pass

        if approximate:
            break
    print("loading")

    if approximate and sampled_files > 0:
        scale_factor = files_count / sampled_files
        lines_count = int(lines_count * scale_factor)

        for lang in lang_lines:
            lang_lines[lang] = int(lang_lines[lang] * scale_factor)

    languages = []
    for lang, lines in sorted(lang_lines.items(), key=lambda x: x[1], reverse=True):
        percent = round((lines / lines_count) * 100, 1) if lines_count else 0
        languages.append({
            "title": lang,
            "percent": percent
        })

    info = {
        "lines": lines_count,
        "files": files_count,
        "activeFor": 0,
        "languages": languages,
        "approximate": approximate   
    }

    return success(info)

@server.route("/templates/create" , methods = ["POST"])
def createTemplate():
    template = request.json

    if (template["des"] == None or template["name"] == None): return error("Bad Request")
    templateFolder = os.path.join(appdataPath , "templates"  , template["name"])
    if os.path.exists(templateFolder): return error("Template with that name already exists")

    os.makedirs(templateFolder)


    pmkFile = os.path.join(templateFolder , "template.pmk")
    with open(pmkFile , "w") as f:
        data = {
            "description" : template["des"],
            "icon" : template["icon"],
            "command" : template["cmd"]
        }
        json.dump(data ,f)
    return success("Template created!")


@server.route("/templates" , methods = ["GET"])
def getTemplates():
    list = []
    templateFolder = os.path.join(appdataPath , "templates")
    for file in os.listdir(templateFolder):
        if os.path.isdir(os.path.join(templateFolder , file)):
            templateInfoPath = os.path.join(templateFolder , file ,"template.pmk")

            info = {
                "icon" : None
            }
            if os.path.exists(templateInfoPath):
                with open(templateInfoPath , "r") as f:
                    info = json.load(f)
                    


            list.append({"title" : file , "path" : os.path.join(templateFolder , file), "info" : info})
    return success(list)

@server.route("/templates/delete" , methods = ["GET"])
def deleteTemplate():
    path = request.args.get("path")
    if not path : return error("No path was given!")
    try:
        shutil.rmtree(path)
        return success("Template deleted!")
    except Exception as e:
        return error("Cant delete: " + str(e))

@server.route("/templates/edit" , methods = ["POST"])
def editTemplate():
    template = request.json
    template["path"] = request.args.get("path")

    if not template["path"] : return error("No path was given!")

    pmkpath = os.path.join(template["path"], "template.pmk")
    if not os.path.exists(pmkpath): return error("template.pmk does not exists!")

    with open(pmkpath , "w") as f:
        json.dump(template ,f)
        return success("Edited template!")
    
def count_files_and_dirs(path: str):
    files = 0
    dirs = 0
    stack = [path]

    while stack:
        current = stack.pop()

        try:
            with os.scandir(current) as it:
                for entry in it:
                    if entry.is_dir(follow_symlinks=False):
                        dirs += 1
                        stack.append(entry.path)
                    else:
                        files += 1
        except (PermissionError, FileNotFoundError):
            pass

    return files + dirs

scan = None
@server.route("/scan/prepare", methods = ["GET"])
def scanInfo():
    global scan
    path = request.args.get("path")
    if not path: return error("No path was given!")

    try :
        total_entries = count_files_and_dirs(path)

        info = {
            "prepared" : True,
            "path": path,
            "entries" : total_entries,
        }
        scan = info
        return success(info)
    except Exception as e:
        return error("Scan error: " + str(e))

@server.route("/scan/start"  , methods = ["GET"])
def startScan():
    if not scan : return error("No scan is prepared!")

    print(scan)

    scanThread = threading.Thread(target=scan_with_eta , args=(scan["path"],))
    
    scanThread.start()
    return success(scan)

@server.route("/scan/info"  , methods = ["GET"])
def scanOngoingInfo():
    if not scan : return error("No scan is ongoing!")

    return success(scan)


def scan_with_eta(base_path: str) -> Dict[str, float]:
    global scan

    print("1")
    if not scan["prepared"] : return None

    total_entries = scan["entries"]

    print(f"Gesamtanzahl Einträge: {total_entries}")

    processed = 0
    start_time = time.perf_counter()

    found_projects = []
    for root, dirs, files in os.walk(base_path):

        processed += len(dirs) + len(files)

        elapsed = time.perf_counter() - start_time
        progress = processed / total_entries

        if progress > 0:
            estimated_total = elapsed / progress
            eta = estimated_total - elapsed
        else:
            eta = 0


        if ".idea" in dirs:
            found_projects.append({
                "type": "INTELLIJ",
                "name" : os.path.basename(root),
                "path": root
            })

        # VS Code (.vscode Ordner)
        if ".vscode" in dirs:
            found_projects.append({
                "type": "VSCODE",
                "name" : os.path.basename(root),
                "path": root
            })

        # Visual Studio (.sln Datei)
        for file in files:
            if file.endswith(".sln"):
                found_projects.append({
                    "type": "VSSTUDIO",
                    "name" : os.path.basename(root),
                    "path": root
                })



        scan = {
            "progress" : progress*100,
            "found" : found_projects,
            "processed" : processed/total_entries,
            "eta": eta
        }

    duration = time.perf_counter() - start_time
    time_per_entry = duration / total_entries

    print("\nScan abgeschlossen.")

    scan = {
        "total_entries": total_entries,
        "found" : found_projects,
        "duration": duration,
        "time_per_entry": time_per_entry,
        "finished": True
    }

def init():
    appDataFolder()
    templateFolder()

def templateFolder():
    path = os.path.join(appdataPath , "templates")
    if not os.path.exists(path):
        os.makedirs(path)

def appDataFolder():
    path = os.path.join(appdataPath)
    if not os.path.exists(path):
        os.makedirs(path)

@server.route("/locate", methods=["GET"])
def choose_dir():
    root = tk.Tk()
    root.withdraw()
    path = filedialog.askdirectory()
    root.destroy()
    return success(path)

if __name__ == '__main__':
    init()
    server.config['TEMPLATES_AUTO_RELOAD'] = True
    server.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
    webview.create_window('Project Maker', server , width=1200 , height=800 )
    webview.start(debug=True , http_server=True)
    #webview.start()


