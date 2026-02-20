import * as Projects from "./projects.js";
import * as extras from "./extras.js";
import * as settings from "./settings.js";
window.onload = async function init() {
    //let loaded = JSON.parse(localStorage.getItem("projects"))
    let loaded = await fetchProjects();
    settings.init();
    Projects.setProjects(loaded == null ? [] : loaded);
    console.log(Projects.projects);
    overlay("");
    buttons();
    options();
    inputs();
    sortSelect();
    projectUi();
};
function saveProjects() {
    //localStorage.setItem("projects" , JSON.stringify(Projects.projects))
    updateProjects();
}
function inputs() {
    let searchInput = document.querySelector(".search-box");
    searchInput.addEventListener("input", function (event) {
        searchInput = event.target;
        if (searchInput.value == "") {
            filterSearch = null;
        }
        else {
            filterSearch = searchInput.value;
        }
        projectUi();
    });
    // Template
    templateSelect();
}
function overlay(panelActive) {
    let allPanel = ["project-view-modal", "settings-modal", "project-create-modal", "project-add-modal", "template-add-modal", "project-edit-modal"];
    let notNone = false;
    allPanel.forEach(panel => {
        let npanel = document.querySelector("." + panel);
        npanel.style.display = panel == panelActive ? "flex" : "none";
        notNone = panel == panelActive ? true : notNone;
    });
    let overlayPanel = document.querySelector(".modal-overlay");
    overlayPanel.style.display = notNone ? "flex" : "none";
}
function buttons() {
    // Create Project
    let createButton = document.querySelector("#create-project-btn");
    createButton === null || createButton === void 0 ? void 0 : createButton.addEventListener("click", function () {
        overlay("project-create-modal");
    });
    let addButton = document.querySelector("#add-project-btn");
    addButton === null || addButton === void 0 ? void 0 : addButton.addEventListener("click", function () {
        overlay("project-add-modal");
    });
    let addTemplateButton = document.querySelector("#add-template-btn");
    addTemplateButton === null || addTemplateButton === void 0 ? void 0 : addTemplateButton.addEventListener("click", function () {
        overlay("template-add-modal");
    });
    // Close Button
    document.querySelectorAll(".close-btn").forEach(element => {
        element.addEventListener("click", function () { overlay(""); });
    });
    document.querySelectorAll(".close-btn-sec").forEach(element => {
        element.addEventListener("click", function () { overlay(""); });
    });
    // Confirm create 
    document.querySelector(".create-project-confirm").addEventListener("click", function () {
        createProject();
    });
    // Confirm add
    document.querySelector(".add-project-confirm").addEventListener("click", function () {
        addProject();
    });
    // Confirm add
    document.querySelector(".add-template-confirm").addEventListener("click", function () {
        addTemplate();
    });
    // Confirm settings
    document.querySelector(".settings-confirm").addEventListener("click", function () {
        saveSettings();
    });
    document.querySelector("#open-application-folder").addEventListener("click", () => fetch("/explorer?name=application"));
    document.querySelector("#open-templates-folder").addEventListener("click", () => fetch("/explorer?name=templates"));
    // Settings
    document.querySelector("#settings-btn").addEventListener("click", function () {
        overlay("settings-modal");
        settingsView();
    });
    // Locate button
    document.querySelector("#locate-btn").addEventListener("click", function () {
        fetch("/locate").then(resp => resp.json()).then(data => {
            if (data.success) {
                let pathInput = document.querySelector("#project-add-path");
                pathInput.value = data.content;
            }
        });
    });
    // Locate button settings panel
    document.querySelector("#locate-btn-project-folder").addEventListener("click", function () {
        fetch("/locate").then(resp => resp.json()).then(data => {
            if (data.success) {
                let pathInput = document.querySelector("#projects-folder");
                pathInput.value = data.content;
            }
        });
    });
    // Filter
    document.querySelectorAll(".filter-btn").forEach((element) => {
        element.addEventListener("click", function () {
            // Alle normal
            document.querySelectorAll(".filter-btn").forEach((el) => {
                el.classList.remove("active");
            });
            element.classList.add("active");
            let category = parseInt(element.dataset.value);
            if (category == -1) {
                filterIde = null;
            }
            else {
                filterIde = category;
            }
            projectUi();
        });
    });
}
let filterIde = null;
let filterSearch = null;
function editProject(project) {
    document.querySelector(".project-edit-modal .close-btn").onclick = async function () {
        overlay("project-view-modal");
        await projectView(project);
    };
    document.querySelector("#project-edit-name").value = project.name;
    document.querySelectorAll(".ide-option.edit").forEach(element => {
        element.classList.remove("selected");
        if (element.dataset.value == project.ide.toString()) {
            element.classList.add("selected");
        }
    });
    document.querySelector("#project-edit-icon").value = project.icon;
    // Confirm project
    document.querySelector(".project-edit-modal .create-project-confirm").onclick = function () {
        saveProject(project);
    };
}
function saveProject(project) {
    let projectName = document.querySelector("#project-edit-name").value;
    let projectIde = parseInt(document.querySelector(".ide-option.edit.selected").dataset.value);
    let projectIcon = document.querySelector("#project-edit-icon").value;
    // Checken ob standart icon benutzt werden
    icons.forEach(element => {
        if (element.link.toString() == projectIcon.toString() && projectIcon != "") {
            projectIcon = "";
        }
    });
    // Auf standart icon setzten wenn
    if (projectIcon == "") {
        // Default ide icon
        icons.forEach(element => {
            if (element.title == Projects.ideString(projectIde).toLocaleLowerCase()) {
                projectIcon = element.link;
            }
        });
    }
    project.update({ "icon": projectIcon, "name": projectName, "ide": projectIde });
    saveProjects();
    projectUi();
    overlay("project-view-modal");
    projectView(project);
}
function addTemplate() {
    let templateName = document.querySelector("#template-add-name").value;
    let templateDescription = document.querySelector("#template-add-des").value;
    let templateCmd = document.querySelector("#template-add-cmd").value;
    let templateIcon = document.querySelector("#template-icon").value;
    if (templateName.length > 3 && templateDescription.length > 5) {
        let template = {
            name: templateName,
            des: templateDescription,
            icon: templateIcon,
            cmd: templateCmd
        };
        fetch("/templates/create", {
            method: "POST",
            body: JSON.stringify(template),
            headers: { "Content-Type": "application/json" }
        }).then(resp => resp.json()).then(data => {
            if (data.success) {
                setTimeout(() => {
                    window.location.reload();
                }, 200);
            }
            else {
                alert("Template konnte nicht erstellt werden! " + data.content);
            }
        });
    }
    else {
        alert("Name/Beschreibung ist zu kurz!");
    }
}
function options() {
    // Ide options
    let ideOptions = document.querySelectorAll(".ide-option.create");
    ideOptions.forEach(element => {
        element.addEventListener("click", function () {
            ideOptions.forEach(element => {
                element.classList.remove("selected");
            });
            element.classList.add("selected");
        });
    });
    let ideEditOptions = document.querySelectorAll(".ide-option.edit");
    ideEditOptions.forEach(element => {
        element.addEventListener("click", function () {
            console.log(element);
            ideEditOptions.forEach(element => {
                element.classList.remove("selected");
            });
            element.classList.add("selected");
        });
    });
}
async function createProject() {
    let projectInput = document.querySelector("#project-name");
    let projectName = projectInput === null || projectInput === void 0 ? void 0 : projectInput.value;
    if (projectName != undefined) {
        if (projectName.length < 3) {
            alert("Name muss mehr als 3 Zeichen haben!");
            return;
        }
        let ideSelect = document.querySelector(".ide-option.selected");
        let ideNum = parseInt(ideSelect.dataset.value) + 1;
        let ide = ideNum;
        let defaultPath = settings.get("projectsFolder");
        let path = defaultPath + "/" + projectName;
        let category = settings.get("categories") == true ? templateSelected : null;
        await fetch("/projects/new?path=" + path + "&template=" + templateSelected.toString() + "&category=" + category).then(resp => resp.json()).then(data => {
            console.log(data);
            if (data.success) {
                let info = data.content.templateInfo;
                let icon = null;
                // Default ide icon
                icons.forEach(element => {
                    if (element.title == Projects.ideString(ide)) {
                        icon = element.link;
                    }
                });
                // Icon aus json
                if (info != null) {
                    if (info.icon != null) {
                        icon = info.icon;
                    }
                }
                Projects.addProject(projectName, ide, path, icon);
                saveProjects();
                console.log(Projects.projects);
                setTimeout(() => {
                    window.location.reload();
                }, 300);
            }
        });
    }
}
async function openProject(project) {
    await fetch("/projects/open?path=" + project.path + "&ide=" + Projects.ideString(project.ide)).then(resp => resp.json()).then(data => {
        if (data.success) {
        }
    });
}
function deleteProject(project) {
    fetch("/projects/delete?path=" + project.path).then(resp => resp.json()).then(data => {
        if (data.success) {
            projectUi();
        }
        else {
            alert("Fehler beim löschen: " + data.content);
        }
    });
}
function settingsView() {
    let panel = document.querySelector(".settings-modal");
    panel.querySelector("#projects-folder").value = settings.get("projectsFolder");
    panel.querySelector("#use-categories").checked = settings.get("categories");
}
function saveSettings() {
    let panel = document.querySelector(".settings-modal");
    let projectsFolder = panel.querySelector("#projects-folder").value;
    settings.set("projectsFolder", projectsFolder);
    let useCategories = panel.querySelector("#use-categories").checked;
    settings.set("categories", useCategories);
    settings.save();
    overlay("");
}
async function addProject() {
    let pathInput = document.querySelector("#project-add-path");
    let cleanPath = pathInput.value.replace(/[/\\]$/, ""); // Entfernt / oder \ am Ende
    let name = cleanPath.split(/[/\\]/).pop();
    let info = await fetch("/projects/add/evaluate?path=" + pathInput.value).then(resp => resp.json());
    if (info.success) {
        info = info.content;
    }
    else {
        info = [];
    }
    let ide = Projects.ide.VSCODE;
    if (info["ide"] == "sln") {
        ide = Projects.ide.VSSTUDIO;
    }
    if (info["ide"] == "idea") {
        ide = Projects.ide.INTELLIJ;
    }
    let worked = Projects.addProject(name, ide, pathInput.value);
    saveProjects();
    if (worked) {
        setTimeout(() => {
            window.location.reload();
        }, 200);
    }
}
function updateProjects() {
    return fetch("/projects", {
        method: "POST",
        body: JSON.stringify(Projects.projects),
        headers: { "Content-Type": "application/json" }
    }).then(resp => resp.json()).then(data => {
        if (data.success) {
            return data.content;
        }
        else {
            //alert("Error updating projects")
        }
    });
}
async function fetchProjects() {
    return await fetch("/projects").then(resp => resp.json()).then(data => {
        if (data.success) {
            return data.content;
        }
        else {
            alert("Error fetching projects");
        }
    });
}
async function fetchInfo(path) {
    return await fetch("/projects/info?path=" + path).then(resp => resp.json()).then(data => {
        if (data.success) {
            return data.content;
        }
        else {
            alert("Error fetching projects");
            return null;
        }
    });
}
let templates = [];
let templateSelected = "none";
async function templateSelect() {
    await fetch("/templates").then(resp => resp.json()).then(data => {
        if (data.success) {
            templates = data.content;
        }
        else {
            alert("Templates konnten nicht geladen werden!: " + data.content);
        }
    });
    let templateSelect = document.querySelector(".project-template");
    let prefab = templateSelect.querySelector(".option");
    templates.forEach(element => {
        let clone = prefab.cloneNode(true);
        clone.querySelector("h4").textContent = element.title;
        templateSelect.querySelector(".dropdown").appendChild(clone);
        if (element.info.icon != null) {
            clone.querySelector("img").src = element.info.icon;
        }
    });
    templateSelect.addEventListener("click", function (event) {
        let target = event.target;
        if (target.classList.contains("active-option")) {
            templateSelect.querySelector(".dropdown").style.display = "flex";
            templateSelect.style.userSelect = "none";
        }
    });
    templateSelect.querySelectorAll(".option").forEach(option => {
        let text = option.querySelector("h4").textContent;
        option.addEventListener("click", function () {
            templateSelected = text;
            templateSelect.querySelector(".dropdown").style.display = "none";
            templateSelect.style.userSelect = "";
            templateSelect.querySelector(".active-option h4").textContent = templateSelected;
            templateSelect.querySelector(".active-option img").src = option.querySelector("img").src;
        });
    });
}
let sortAfter = "Datum";
async function sortSelect() {
    let sortSelect = document.querySelector(".sort-after");
    sortSelect.addEventListener("click", function (event) {
        let target = event.target;
        if (target.classList.contains("active-option")) {
            sortSelect.querySelector(".dropdown").style.display = "flex";
            sortSelect.style.userSelect = "none";
        }
    });
    sortSelect.querySelector(".active-option h4").textContent = "Sortieren nach: " + sortAfter;
    sortSelect.querySelectorAll(".option").forEach(option => {
        let text = option.querySelector("h4").textContent;
        option.addEventListener("click", function () {
            sortAfter = text;
            sortSelect.querySelector(".dropdown").style.display = "none";
            sortSelect.style.userSelect = "";
            sortSelect.querySelector(".active-option h4").textContent = "Sortieren nach: " + sortAfter;
            projectUi();
        });
    });
}
// Sort after sort-after select
async function projectView(project) {
    document.querySelector(".view-project-name").textContent = project.name;
    document.querySelector(".view-project-ide").textContent = Projects.ideString(project.ide);
    let panel = document.querySelector(".project-view-modal");
    document.querySelector(".view-project-remove").onclick = function () {
        Projects.removeProject(project.id);
        // Deleted
        saveProjects();
        setTimeout(() => {
            window.location.reload();
        }, 100);
    };
    document.querySelector(".view-project-delete").onclick = function () {
        deleteProject(project);
        saveProjects();
        setTimeout(() => {
            window.location.reload();
        }, 200);
    };
    panel.querySelector(".last-edited-detail").textContent = "Zuletzt bearbeitet: " + new Date(project.last_edited).toLocaleString();
    panel.querySelector(".ide-badge").textContent = Projects.ideString(project.ide);
    panel.querySelector(".ide-badge").classList = "ide-badge view-project-ide " + Projects.ideString(project.ide).toLowerCase();
    // Extras
    let info = {
        lines: 0,
        files: 0,
        activeFor: 0,
        languages: [{ title: "Java", percent: 15 }],
        approximate: false
    };
    let fetched = await fetchInfo(project.path);
    info = fetched == null ? info : fetched;
    panel.querySelector(".path-card").onclick = function () {
        fetch("/explorer?path=" + project.path);
    };
    let iconUrl = icons.filter(v => {
        if (v.title == Projects.ideString(project.ide).toLowerCase()) {
            return v;
        }
    })[0].link;
    if (project.icon != null) {
        iconUrl = project.icon;
    }
    panel.querySelector(".current-icon img").src = iconUrl;
    panel.querySelector(".path-value").textContent = project.path;
    panel.querySelector(".active-time").textContent = info.activeFor + "";
    panel.querySelector(".file-count").textContent = info.files + "";
    panel.querySelector(".code-lines").textContent = info.lines + "";
    document.querySelector(".view-project-name").textContent = project.name + (info.approximate ? " - Ungefähr" : "");
    // Edit project
    document.querySelector(".btn-project-edit").onclick = function () {
        overlay("project-edit-modal");
        editProject(project);
    };
    // Languages
    let list = document.querySelector(".language-bars");
    let prefab = document.querySelector(".language-item.prefab");
    list.replaceChildren();
    info.languages.forEach(language => {
        let clone = prefab.cloneNode(true);
        clone.querySelector(".language-percent").textContent = language.percent + "%";
        clone.querySelector(".language-name").textContent = language.title;
        let progressFill = clone.querySelector(".progress-fill");
        if (progressFill) {
            progressFill.style.width = `${language.percent}%`;
            progressFill.style.backgroundColor = extras.getLanguageColor(language.title);
        }
        clone.classList.remove("prefab");
        list.appendChild(clone);
    });
    // Open Project
    let openBtn = document.querySelector(".view-project-open");
    if (openBtn) {
        openBtn.onclick = () => {
            openProject(project);
        };
    }
}
let icons = [
    { title: "vsstudio", link: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Visual_Studio_Icon_2022.svg/960px-Visual_Studio_Icon_2022.svg.png" },
    { title: "vscode", link: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Visual_Studio_Code_1.35_icon.svg/3840px-Visual_Studio_Code_1.35_icon.svg.png" },
    { title: "intellij", link: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/IntelliJ_IDEA_Icon.svg/960px-IntelliJ_IDEA_Icon.svg.png" }
];
function projectUi() {
    let prefab = document.querySelector(".project-card");
    let filtered = Projects.projects;
    if (filterIde != null) {
        filtered = Projects.filterProjects({ "ide": filterIde });
    }
    if (filterSearch != null) {
        filtered = Projects.filterProjects({ "name": filterSearch }, filtered);
    }
    if (sortAfter === "Datum") {
        filtered = filtered.sort((a, b) => new Date(b.last_edited).getTime() - new Date(a.last_edited).getTime());
    }
    else if (sortAfter === "Name") {
        filtered = filtered.sort((a, b) => a.name.localeCompare(b.name));
    }
    else if (sortAfter === "Ide") {
        filtered = filtered.sort((a, b) => a.ide - b.ide);
    }
    document.querySelector(".projects-grid").replaceChildren();
    filtered.forEach(project => {
        let clone = prefab.cloneNode(true);
        clone.addEventListener("click", async function () {
            await projectView(project);
            overlay("project-view-modal");
        });
        if (clone) {
            clone.querySelector(".project-info h3").textContent = project.name;
            clone.querySelector(".project-info .last-edited").textContent = "Zuletzt bearbeitet: " + new Date(project.last_edited).toLocaleString();
            clone.querySelector(".project-info .ide-badge").textContent = Projects.ideString(project.ide);
            clone.querySelector(".project-info .ide-badge").classList.add(Projects.ideString(project.ide).toLowerCase());
            let iconUrl = icons.filter(v => {
                if (v.title == Projects.ideString(project.ide).toLowerCase()) {
                    return v;
                }
            })[0].link;
            if (project.icon != null) {
                iconUrl = project.icon;
            }
            clone.querySelector(".project-icon").src = iconUrl;
            let iconElement = clone.querySelector(".project-icon img");
            iconElement.src = iconUrl;
            clone.classList.remove("prefab");
            document.querySelector(".projects-grid").appendChild(clone);
        }
    });
}
