import * as extras from "../js/extras.js";

let id = null

window.onload = function init(){
    console.log("Init!")
    let args = new URLSearchParams(window.location.search)

    id = args.get("id")
  
    if (id != null){
        fetch("/project?id=" +id).then(resp => resp.json()).then(data => {
            if (data.success){
                fillFromResponse(data.content)
            }else{
                alert("Error")
            }
            
        })
    }
}

window.handleDownload = function handleDownload(){
    fetch("/project/download?id=" + id).then(resp => resp.blob())   
    .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = "projekt.zip";        // Name für den Download
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);      // Speicher freigeben
    })
}


function fillFromResponse(apiResponse) {

    const info = apiResponse.info.content
    const files = apiResponse.files.content
    const project = apiResponse.proj

    const { activeFor, lines, languages } = info;
    let fileCount = info.files
    currentPath = project.path.replace(/\\/g, "/")
    renderFiles(files , currentPath)
    

    document.getElementById("stat-lines").textContent  = lines.toLocaleString("de-DE");
    document.getElementById("stat-files").textContent  = fileCount;
    
    document.getElementById("stat-days").textContent   = activeFor;

 
    document.getElementById("info-files").textContent  = fileCount;
    document.getElementById("info-lines").textContent  = lines.toLocaleString("de-DE");

    const container = document.getElementById("language-bars");
    container.innerHTML = "";

    languages.forEach(lang => {
        const color = extras.getLanguageColor(lang.title);
        container.innerHTML += `
            <div class="language-item">
                <div class="language-header">
                    <span class="language-name">${lang.title}</span>
                    <span class="language-percent">${lang.percent}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width:${lang.percent}%; background:${color};"></div>
                </div>
            </div>`;
    });

    
    console.log(project)

    const ide = IDE_MAP[project.ide] ?? IDE_MAP[0];

    // Header
    document.getElementById("project-name").textContent           = project.name;
    document.querySelector(".share-project-icon img").src         = project.icon || ide.icon;
    document.getElementById("project-last-edited").textContent    = `Zuletzt bearbeitet: ${extras.relativeTimeFrom(project.last_edited)}`;

    // IDE Badge
    const badge = document.getElementById("project-ide-badge");
    badge.textContent = ide.label;
    badge.className   = `ide-badge ${ide.cls}`;

    // Dates
    document.getElementById("share-date").textContent    = formatDate(project.last_edited);
    document.getElementById("info-created").textContent  = formatDate(project.created_at);
    document.getElementById("info-edited").textContent   = formatDate(project.last_edited);
    document.getElementById("info-ide").textContent      = ide.label;

    // Path
    document.getElementById("info-path").textContent     = project.path;

    // Page title
    document.title = `Project Maker – ${project.name}`;
}

const IDE_MAP = {
    0: { label: "IntelliJ IDEA", cls: "intellij", icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/IntelliJ_IDEA_Icon.svg/960px-IntelliJ_IDEA_Icon.svg.png" },
    1: { label: "VS Code",       cls: "vscode",   icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Visual_Studio_Code_1.35_icon.svg/3840px-Visual_Studio_Code_1.35_icon.svg.png" },
    2: { label: "Visual Studio", cls: "vsstudio", icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Visual_Studio_Icon_2022.svg/960px-Visual_Studio_Icon_2022.svg.png" },
};

function formatDate(gmtString) {
    const date = new Date(gmtString);
    return date.toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });
}


let currentPath

async function renderFiles(files , basePath){

  
    let filePrefab = document.querySelector(".file-entry.prefab")
    let fileList = document.querySelector(".file-container")
   
    let loadingIcon = fileList.querySelector(".files-loading");


    fileList.replaceChildren(loadingIcon); 
    loadingIcon.style.display = "none"



    // Back

    if (currentPath != basePath){
        let clone = filePrefab.cloneNode(true)
        clone.classList.remove("prefab")
        clone.querySelector(".file-name").textContent = "Back"
        let location = "?"

        location = currentPath.replace(basePath , "")


        
        clone.querySelector(".file-size").textContent = location
        clone.onclick = () => {
            let splitted = currentPath.split("/")
            currentPath = splitted.slice(0 , splitted.length - 1).join("/")
            renderFiles(files , basePath)
        }
        fileList.appendChild(clone)
    }
    // Back

    files.filter(v => v.root == currentPath).slice(0 , 100).forEach(file => {
        let clone = filePrefab.cloneNode(true)
        clone.path = file.mypath
        clone.classList.remove("prefab")
        clone.querySelector(".file-name").textContent = file.name
        if (file.type == "file"){
            clone.querySelector(".file-size").textContent = extras.formatBytes(file.size) + " Byte"
            clone.querySelector("#file-icon").style.display = "flex"

            if (file.code != null){
                clone.querySelector("#file-icon").style.color = extras.getLanguageColor(file.code)
            }
        }else if (file.type == "folder"){
            clone.querySelector(".file-size").textContent = file.size + " Datein"
            clone.querySelector("#folder-icon").style.display = "flex"
            clone.onclick = () => {
                currentPath = clone.path.replace(/\\/g, "/");
                renderFiles(files , basePath)
            }
        }


        fileList.appendChild(clone)
    });


}

