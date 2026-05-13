import * as Projects from "./projects.js";
import * as extras from "./extras.js";
import * as settings from "./settings.js";
import * as windows from "./windows.js";
import * as keys from "./keys.js";

window.onload = async function init() {
    let loaded = await fetchProjects();
    settings.init();
    Projects.setProjects(loaded == null ? [] : loaded);
    await loadFolders();
    overlay("");
    buttons();
    options();
    inputs();
    sortSelect();
    projectUi();
    keys.listeners();
    checkForUpdate();
    prefetchLanguages();
};

async function prefetchLanguages() {
    const uncached = Projects.projects.filter(p => !localStorage.getItem("lang_" + p.path));
    if (uncached.length === 0) return;
    let updated = false;
    await Promise.all(uncached.map(async p => {
        const info = await fetchInfo(p.path);
        if (info?.languages?.length > 0) {
            localStorage.setItem("lang_" + p.path, JSON.stringify(info.languages.slice(0, 2)));
            updated = true;
        }
    }));
    if (updated) projectUi();
}

// ── Persist ────────────────────────────────────────────────────────────────────

function saveProjects() {
    updateProjects();
}

// ── Folders state ──────────────────────────────────────────────────────────────

let folders = [];
let currentFolderId = null;
let selectedFolderColor = "#4a9eff";
let editingFolderId = null;

async function loadFolders() {
    const data = await fetch("/folders").then(r => r.json());
    if (data.success) folders = data.content;
    else folders = [];
}

function saveFolders() {
    fetch("/folders", {
        method: "POST",
        body: JSON.stringify(folders),
        headers: { "Content-Type": "application/json" }
    });
}

function createFolder(name, color) {
    const id = "f_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
    folders.push({ id, name, color });
    saveFolders();
    projectUi();
}

function deleteFolder(id) {
    folders = folders.filter(f => f.id !== id);
    Projects.projects.forEach(p => { if (p.folder_id === id) p.folder_id = null; });
    saveFolders();
    saveProjects();
    if (currentFolderId === id) {
        currentFolderId = null;
        hideBreadcrumb();
    }
    projectUi();
}

function editFolder(folder) {
    editingFolderId = folder.id;
    selectedFolderColor = folder.color;
    document.getElementById("folder-create-name").value = folder.name;
    document.querySelectorAll(".folder-color-btn").forEach(b => {
        b.classList.toggle("active", b.dataset.color === folder.color);
    });
    overlay("folder-create-modal");
}

function moveProjectsToFolder(projectNames, folderId) {
    Projects.projects.forEach(p => {
        if (projectNames.includes(p.name)) p.folder_id = folderId;
    });
    saveProjects();
    projectUi();
}

function showBreadcrumb(folder) {
    const bc = document.getElementById("folder-breadcrumb");
    document.getElementById("folder-breadcrumb-name").textContent = folder.name;
    bc.style.display = "flex";
}

function hideBreadcrumb() {
    document.getElementById("folder-breadcrumb").style.display = "none";
}

// ── Selection state ────────────────────────────────────────────────────────────

let selectionMode = false;
let selectedProjects = new Set();

function enterSelectionMode() {
    selectionMode = true;
    selectedProjects.clear();
    document.getElementById("selection-toolbar").style.display = "flex";
    document.getElementById("selection-mode-btn").classList.add("active");
    updateSelectionCount();
    projectUi();
}

function exitSelectionMode() {
    selectionMode = false;
    selectedProjects.clear();
    document.getElementById("selection-toolbar").style.display = "none";
    document.getElementById("selection-mode-btn").classList.remove("active");
    projectUi();
}

function toggleProjectSelection(name) {
    if (selectedProjects.has(name)) selectedProjects.delete(name);
    else selectedProjects.add(name);
    updateSelectionCount();
    projectUi();
}

function updateSelectionCount() {
    document.getElementById("selection-count").textContent = selectedProjects.size + " ausgewählt";
}

// ── Update check ───────────────────────────────────────────────────────────────

async function checkForUpdate() {
    try {
        const data = await fetch("/check-update").then(r => r.json());
        if (!data.success || !data.content.update) return;
        const info = data.content;
        const dismissed = localStorage.getItem("dismissed_update");
        if (dismissed === info.version) return;
        const banner = document.getElementById("update-banner");
        document.getElementById("update-banner-text").textContent =
            `🚀 Version ${info.version} ist verfügbar!`;
        banner.style.display = "flex";
        document.body.classList.add("has-banner");
        document.getElementById("update-banner-btn").onclick = async () => {
            const btn = document.getElementById("update-banner-btn");
            btn.disabled = true;
            btn.textContent = "Wird heruntergeladen...";
            await fetch("/do-update");
            const poll = setInterval(async () => {
                const res = await fetch("/update-status").then(r => r.json()).catch(() => null);
                if (!res?.success) return;
                const s = res.content;
                if (s.state === "restarting") {
                    btn.textContent = "Neustart läuft...";
                    clearInterval(poll);
                } else if (s.state === "error") {
                    clearInterval(poll);
                    btn.disabled = false;
                    btn.textContent = "Jetzt aktualisieren";
                    alert("Update fehlgeschlagen: " + s.error + "\n\nBitte manuell aktualisieren.");
                    fetch("/browser?url=" + encodeURIComponent(info.url));
                }
            }, 1000);
        };
        document.getElementById("update-banner-dismiss").onclick = () => {
            banner.style.display = "none";
            document.body.classList.remove("has-banner");
            localStorage.setItem("dismissed_update", info.version);
        };
    } catch (_) {}
}

// ── Inputs ────────────────────────────────────────────────────────────────────

function inputs() {
    let searchInput = document.querySelector(".search-box");
    searchInput.addEventListener("input", function (event) {
        searchInput = event.target;
        filterSearch = searchInput.value === "" ? null : searchInput.value;
        projectUi();
    });
    windows.setView("projects");
    templateSelect();
}

// ── Overlay ───────────────────────────────────────────────────────────────────

window.overlay = function overlay(panelActive) {
    const allPanel = [
        "project-view-modal", "project-share-modal", "settings-modal",
        "scan-projects-modal", "project-create-modal", "project-add-modal",
        "template-add-modal", "project-edit-modal", "template-view-modal",
        "project-delete-modal", "folder-create-modal", "move-to-folder-modal"
    ];
    let notNone = false;
    allPanel.forEach(panel => {
        let npanel = document.querySelector("." + panel);
        npanel.style.display = panel === panelActive ? "flex" : "none";
        if (panel === panelActive) notNone = true;
    });
    document.querySelector(".dashboard").style.pointerEvents = notNone ? "none" : "all";
    document.querySelector(".modal-overlay").style.display = notNone ? "flex" : "none";
};

// ── Buttons ───────────────────────────────────────────────────────────────────

function buttons() {
    document.querySelector("#create-project-btn")?.addEventListener("click", () => {
        selectedCreateFolderId = currentFolderId;
        populateCreateFolderDropdown();
        overlay("project-create-modal");
    });
    document.querySelector("#add-project-btn")?.addEventListener("click", () => overlay("project-add-modal"));
    document.querySelector("#add-template-btn")?.addEventListener("click", () => overlay("template-add-modal"));

    document.querySelectorAll(".close-btn").forEach(el => el.addEventListener("click", () => overlay("")));
    document.querySelectorAll(".close-btn-sec").forEach(el => el.addEventListener("click", () => overlay("")));

    document.querySelector(".create-project-confirm").addEventListener("click", () => createProject());
    document.querySelector(".add-project-confirm").addEventListener("click", () => addProject());
    document.querySelector("#scan-projects-btn").addEventListener("click", () => overlay("scan-projects-modal"));
    document.querySelector(".add-template-confirm").addEventListener("click", () => addTemplate());
    document.querySelector("#show-templates-btn").addEventListener("click", () => { windows.setView("templates"); templateUI(); });
    document.querySelector("#show-projects-btn").addEventListener("click", () => windows.setView("projects"));
    document.querySelector(".scan-start-btn").addEventListener("click", () => startScan());
    document.querySelector(".settings-confirm").addEventListener("click", () => saveSettings());
    document.querySelector("#open-application-folder").addEventListener("click", () => fetch("/explorer?name=application"));
    document.querySelector("#open-templates-folder").addEventListener("click", () => fetch("/explorer?name=templates"));
    document.querySelector("#settings-btn").addEventListener("click", () => { overlay("settings-modal"); settingsView(); });

    document.querySelector("#locate-btn").addEventListener("click", () => {
        fetch("/locate").then(r => r.json()).then(d => {
            if (d.success) document.querySelector("#project-add-path").value = d.content;
        });
    });
    document.querySelector("#locate-scan-btn").addEventListener("click", () => {
        fetch("/locate").then(r => r.json()).then(d => {
            if (d.success) { document.querySelector("#scan-projects-path").value = d.content; scanPrepare(); }
        });
    });
    document.querySelector("#locate-btn-project-folder").addEventListener("click", () => {
        fetch("/locate").then(r => r.json()).then(d => {
            if (d.success) document.querySelector("#projects-folder").value = d.content;
        });
    });

    document.querySelectorAll(".filter-btn").forEach(el => {
        el.addEventListener("click", () => {
            document.querySelectorAll(".filter-btn").forEach(e => e.classList.remove("active"));
            el.classList.add("active");
            const cat = parseInt(el.dataset.value);
            filterIndex = cat === -1 ? null : cat;
            projectUi();
        });
    });

    // Selection mode
    document.getElementById("selection-mode-btn").addEventListener("click", () => {
        selectionMode ? exitSelectionMode() : enterSelectionMode();
    });
    document.getElementById("select-all-btn").addEventListener("click", () => {
        getVisibleProjects().forEach(p => selectedProjects.add(p.name));
        updateSelectionCount();
        projectUi();
    });
    document.getElementById("select-none-btn").addEventListener("click", () => {
        selectedProjects.clear();
        updateSelectionCount();
        projectUi();
    });
    document.getElementById("delete-selected-btn").addEventListener("click", () => deleteSelected());
    document.getElementById("move-to-folder-btn").addEventListener("click", () => openMoveToFolderModal());

    // Folders
    document.getElementById("new-folder-btn").addEventListener("click", () => {
        selectedFolderColor = "#4a9eff";
        document.querySelectorAll(".folder-color-btn").forEach(b => b.classList.remove("active"));
        document.querySelector('.folder-color-btn[data-color="#4a9eff"]').classList.add("active");
        document.getElementById("folder-create-name").value = "";
        overlay("folder-create-modal");
    });
    document.querySelectorAll(".folder-color-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".folder-color-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            selectedFolderColor = btn.dataset.color;
        });
    });
    document.querySelector(".folder-create-confirm").addEventListener("click", () => {
        const name = document.getElementById("folder-create-name").value.trim();
        if (name.length < 1) { alert("Bitte einen Ordnernamen eingeben!"); return; }
        if (editingFolderId) {
            const f = folders.find(x => x.id === editingFolderId);
            if (f) { f.name = name; f.color = selectedFolderColor; saveFolders(); projectUi(); }
            editingFolderId = null;
        } else {
            createFolder(name, selectedFolderColor);
        }
        overlay("");
    });

    // Folder back button
    document.getElementById("folder-back-btn").addEventListener("click", () => {
        currentFolderId = null;
        hideBreadcrumb();
        projectUi();
    });

    // Move to folder — "no folder" button
    document.querySelector(".move-to-none-btn").addEventListener("click", () => {
        moveProjectsToFolder([...selectedProjects], null);
        overlay("");
        exitSelectionMode();
    });
}

function getVisibleProjects() {
    let list = Projects.projects;
    if (currentFolderId !== null) {
        list = list.filter(p => p.folder_id === currentFolderId);
    } else {
        list = list.filter(p => !p.folder_id);
    }
    if (filterIndex !== null) {
        if (filterIndex === 3) list = Projects.filterProjects({ favourite: true }, list);
        else list = Projects.filterProjects({ ide: filterIndex }, list);
    }
    if (filterSearch !== null) list = Projects.filterProjects({ name: filterSearch }, list);
    return list;
}

function deleteSelected() {
    if (selectedProjects.size === 0) return;
    const names = [...selectedProjects];
    overlay("project-delete-modal");
    document.querySelector("#project-delete-info").textContent = "ALLE LÖSCHEN";
    document.querySelector(".project-delete-confirm").onclick = () => {
        if (document.querySelector("#project-delete-name").value !== "ALLE LÖSCHEN") {
            alert("Bitte genau „ALLE LÖSCHEN" eingeben!");
            return;
        }
        const toDelete = Projects.projects.filter(p => names.includes(p.name));
        toDelete.forEach(p => {
            fetch("/projects/delete?path=" + p.path);
            Projects.removeProject(p.id);
        });
        saveProjects();
        exitSelectionMode();
        setTimeout(() => window.location.reload(), 300);
    };
}

function openMoveToFolderModal() {
    if (selectedProjects.size === 0) return;
    const list = document.getElementById("move-folder-list");
    list.replaceChildren();
    folders.forEach(f => {
        const item = document.createElement("div");
        item.className = "move-folder-item";
        item.innerHTML = `<div class="move-folder-dot" style="background:${f.color}"></div><span>${f.name}</span>`;
        item.onclick = () => {
            moveProjectsToFolder([...selectedProjects], f.id);
            overlay("");
            exitSelectionMode();
        };
        list.appendChild(item);
    });
    overlay("move-to-folder-modal");
}

// ── Filters ───────────────────────────────────────────────────────────────────

let filterIndex = null;
let filterSearch = null;

// ── Create folder select ──────────────────────────────────────────────────────

let selectedCreateFolderId = null;

function populateCreateFolderDropdown() {
    const list = document.getElementById("create-folder-dropdown");
    list.replaceChildren();

    const noneItem = document.createElement("div");
    noneItem.className = "folder-select-item" + (!selectedCreateFolderId ? " active" : "");
    noneItem.dataset.folderId = "";
    noneItem.innerHTML = `<div class="folder-select-dot" style="background:#555"></div><span>Kein Ordner</span>`;
    noneItem.onclick = () => { selectedCreateFolderId = null; highlightFolderItem(list, noneItem); };
    list.appendChild(noneItem);

    folders.forEach(f => {
        const item = document.createElement("div");
        item.className = "folder-select-item" + (selectedCreateFolderId === f.id ? " active" : "");
        item.dataset.folderId = f.id;
        item.innerHTML = `<div class="folder-select-dot" style="background:${f.color}"></div><span>${f.name}</span>`;
        item.onclick = () => { selectedCreateFolderId = f.id; highlightFolderItem(list, item); };
        list.appendChild(item);
    });
}

function highlightFolderItem(list, active) {
    list.querySelectorAll(".folder-select-item").forEach(i => i.classList.remove("active"));
    active.classList.add("active");
}

// ── Edit Project ──────────────────────────────────────────────────────────────

function editProject(project) {
    document.querySelector(".project-edit-modal .close-btn").onclick = async () => {
        overlay("project-view-modal");
        await projectView(project);
    };
    document.querySelector("#project-edit-name").value = project.name;
    document.querySelectorAll(".ide-option.edit").forEach(el => {
        el.classList.remove("selected");
        if (el.dataset.value === project.ide.toString()) el.classList.add("selected");
    });
    initIconPicker(project.icon ?? "");
    document.querySelector(".project-edit-modal .create-project-confirm").onclick = () => saveProject(project);
}

function saveProject(project) {
    const projectName = document.querySelector("#project-edit-name").value;
    const projectIde = parseInt(document.querySelector(".ide-option.edit.selected").dataset.value);
    let projectIcon = _iconPickerValue || document.querySelector("#project-edit-icon").value.trim();
    if (!projectIcon) {
        icons.forEach(el => { if (el.title === Projects.ideString(projectIde).toLowerCase()) projectIcon = el.link; });
    }
    project.update({ icon: projectIcon, name: projectName, ide: projectIde });
    saveProjects();
    projectUi();
    overlay("project-view-modal");
    projectView(project);
}

// ── Scan ──────────────────────────────────────────────────────────────────────

let scan = null;

async function scanPrepare() {
    const scanPath = document.querySelector("#scan-projects-path").value;
    document.querySelector(".scan-prepare-count").textContent = "Verzeichnis scannen...";
    document.querySelector(".scan-start-btn").style.display = "none";
    const info = await fetch("/scan/prepare?path=" + scanPath).then(r => r.json());
    if (info.success) {
        scan = info.content;
        document.querySelector(".scan-prepare-count").textContent = "Dateien/Ordner zu scannen: " + scan.entries;
        document.querySelector(".scan-start-btn").style.display = "flex";
    } else {
        alert(info.content);
    }
}

function startScan() {
    if (!scan) { alert("No scan prepared!"); return; }
    fetch("/scan/start").then(r => r.json());
    const scanPreparePanel = document.querySelector("#scan-prepare");
    const scanOngoingPanel = document.querySelector("#scan-ongoing");
    document.querySelector(".scan-add-btn").style.display = "none";
    document.querySelector(".stop-scan-btn").style.display = "flex";
    document.querySelector("#scan-progress").style.width = "0%";
    scanPreparePanel.style.display = "none";
    scanOngoingPanel.style.display = "flex";

    const scanInterval = setInterval(() => {
        fetch("/scan/info").then(r => r.json()).then(data => {
            if (data.success) {
                scan = data.content;
                if (scan.finished) {
                    clearInterval(scanInterval);
                    document.querySelector(".scan-ongoing-status").textContent = "Scan fertig";
                    document.querySelector(".scan-ongoing-found").textContent = "Projekte gefunden: " + scan.found.length;
                    document.querySelector("#scan-progress").style.width = "100%";
                    document.querySelector(".scan-add-btn").style.display = "flex";
                    document.querySelector(".scan-add-btn").onclick = () => {
                        let added = 0;
                        scan.found.forEach(project => {
                            let ide = Projects.ide.VSCODE;
                            if (project.type === "VSSTUDIO") ide = Projects.ide.VSSTUDIO;
                            if (project.type === "INTELLIJ") ide = Projects.ide.INTELLIJ;
                            if (Projects.addProject(project.name, ide, project.path)) added++;
                        });
                        saveProjects();
                        alert(added + "/" + scan.found.length + " Projekte wurden hinzugefügt!");
                        scanPreparePanel.style.display = "block";
                        scanOngoingPanel.style.display = "none";
                        overlay("");
                        projectUi();
                    };
                    document.querySelector(".scan-prepare-count").textContent = "Verzeichnis auswählen...";
                    document.querySelector(".stop-scan-btn").style.display = "none";
                } else {
                    document.querySelector(".scan-ongoing-status").textContent =
                        Math.round(scan.progress) + "% | " + Math.round(scan.eta) + "s verbleibend";
                    document.querySelector(".scan-ongoing-found").textContent = "Projekte gefunden: " + scan.found.length;
                    document.querySelector("#scan-progress").style.width = scan.progress + "%";
                }
            } else {
                alert(data.content);
            }
        });
    }, 2000);
}

// ── Templates ─────────────────────────────────────────────────────────────────

function addTemplate() {
    const name = document.querySelector("#template-add-name").value;
    const description = document.querySelector("#template-add-des").value;
    const cmd = document.querySelector("#template-add-cmd").value;
    const icon = document.querySelector("#template-icon").value;
    if (name.length > 3 && description.length > 5) {
        fetch("/templates/create", {
            method: "POST",
            body: JSON.stringify({ name, des: description, icon, cmd }),
            headers: { "Content-Type": "application/json" }
        }).then(r => r.json()).then(data => {
            if (data.success) setTimeout(() => window.location.reload(), 200);
            else alert("Template konnte nicht erstellt werden! " + data.content);
        });
    } else {
        alert("Name/Beschreibung ist zu kurz!");
    }
}

let _templates = [];
let templateSelected = "none";

async function templateSelect() {
    await fetch("/templates").then(r => r.json()).then(data => {
        if (data.success) _templates = data.content;
        else alert("Templates konnten nicht geladen werden!: " + data.content);
    });
    const sel = document.querySelector(".project-template");
    const prefab = sel.querySelector(".option");
    _templates.forEach(el => {
        const clone = prefab.cloneNode(true);
        clone.querySelector("h4").textContent = el.title;
        if (el.info.icon) clone.querySelector("img").src = el.info.icon;
        sel.querySelector(".dropdown").appendChild(clone);
    });
    sel.addEventListener("click", ev => {
        if (ev.target.classList.contains("active-option")) {
            sel.querySelector(".dropdown").style.display = "flex";
            sel.style.userSelect = "none";
        }
    });
    sel.querySelectorAll(".option").forEach(opt => {
        const text = opt.querySelector("h4").textContent;
        opt.addEventListener("click", () => {
            templateSelected = text;
            sel.querySelector(".dropdown").style.display = "none";
            sel.style.userSelect = "";
            sel.querySelector(".active-option h4").textContent = templateSelected;
            sel.querySelector(".active-option img").src = opt.querySelector("img").src;
        });
    });
}

function templateUI() {
    const prefab = document.querySelector(".template-card.prefab");
    document.querySelector(".templates-grid").replaceChildren();
    _templates.forEach(template => {
        const clone = prefab.cloneNode(true);
        clone.addEventListener("click", () => { templateView(template); overlay("template-view-modal"); });
        clone.querySelector(".template-info h3").textContent = template.title;
        clone.querySelector(".template-info .ide-badge").textContent = "Template";
        clone.querySelector(".template-info .ide-badge").classList.add("template");
        const iconUrl = template.info.icon ?? "https://cdn-icons-png.flaticon.com/128/15236/15236867.png";
        clone.querySelector(".template-icon img").src = iconUrl;
        clone.classList.remove("prefab");
        document.querySelector(".templates-grid").appendChild(clone);
    });
}

async function templateView(template) {
    const panel = document.querySelector(".template-view-modal");
    panel.querySelector(".view-template-name").textContent = template.title;
    panel.querySelector(".view-template-detail").textContent = template.info.description;
    panel.querySelector(".template-icon").src = template.info.icon;
    panel.querySelector("#template-command").value = template.info.command ?? "";
    panel.querySelector("#template-image").value = template.info.icon ?? "";
    panel.querySelector("#template-command").onchange = ev => { template.info.command = ev.target.value; updateTemplate(template); };
    panel.querySelector("#template-image").onchange = ev => { template.info.icon = ev.target.value; updateTemplate(template); };
    panel.querySelector(".view-template-open").onclick = () => fetch("/explorer?path=" + template.path);
    panel.querySelector(".view-template-delete").onclick = () => {
        _templates = _templates.filter(t => t.title !== template.title);
        fetch("/templates/delete?path=" + template.path).then(r => r.json()).then(data => {
            if (data.success) { templateUI(); overlay(""); }
            else alert(data.content);
        });
    };
}

function updateTemplate(template) {
    fetch("/templates/edit?path=" + template.path, {
        method: "POST",
        body: JSON.stringify(template.info),
        headers: { "Content-Type": "application/json" }
    }).then(r => r.json());
}

// ── Sort ──────────────────────────────────────────────────────────────────────

let sortAfter = "Datum";

async function sortSelect() {
    const sel = document.querySelector(".sort-after");
    sel.addEventListener("click", ev => {
        if (ev.target.classList.contains("active-option")) {
            sel.querySelector(".dropdown").style.display = "flex";
            sel.style.userSelect = "none";
        }
    });
    sel.querySelector(".active-option h4").textContent = "Sortieren nach: " + sortAfter;
    sel.querySelectorAll(".option").forEach(opt => {
        const text = opt.querySelector("h4").textContent;
        opt.addEventListener("click", () => {
            sortAfter = text;
            sel.querySelector(".dropdown").style.display = "none";
            sel.style.userSelect = "";
            sel.querySelector(".active-option h4").textContent = "Sortieren nach: " + sortAfter;
            projectUi();
        });
    });
}

// ── Project View ──────────────────────────────────────────────────────────────

async function projectView(project) {
    document.querySelector(".view-project-name").textContent = project.name;
    document.querySelector(".view-project-ide").textContent = Projects.ideString(project.ide);
    const panel = document.querySelector(".project-view-modal");
    currentPath = project.path.replace(/\\/g, "/");

    // Files loading
    const loadingIcon = panel.querySelector(".files-loading");
    loadingIcon.style.display = "flex";
    const fileList = document.querySelector(".file-container");
    fileList.replaceChildren(loadingIcon);

    fetch("/projects/files?path=" + project.path).then(r => r.json()).then(data => {
        if (data.success) renderFiles(data.content, currentPath, project);
        else alert("Files couldn't be loaded!");
    });

    // Entfernen
    document.querySelector(".view-project-remove").onclick = () => {
        Projects.removeProject(project.id);
        saveProjects();
        setTimeout(() => window.location.reload(), 100);
    };

    // Zip
    document.querySelector(".view-project-zip").onclick = async () => {
        const zipIcon = document.querySelector("#zip-icon");
        const zipWait = document.querySelector("#zip-wait");
        zipIcon.style.display = "none";
        zipWait.style.display = "inline-block";
        fetch("/projects/zip?path=" + project.path).then(r => r.json()).then(() => {
            zipIcon.style.display = "inline-block";
            zipWait.style.display = "none";
        });
    };

    // Teilen
    document.querySelector(".view-project-share").onclick = async () => {
        const shareIcon = document.querySelector("#share-icon");
        const shareWait = document.querySelector("#share-wait");
        shareIcon.style.display = "none";
        shareWait.style.display = "inline-block";
        fetch("/projects/share?path=" + project.path).then(r => r.json()).then(data => {
            shareIcon.style.display = "inline-block";
            shareWait.style.display = "none";
            if (data.success) {
                overlay("project-share-modal");
                document.querySelector("#project-share-link").value = data.content;
                document.querySelector(".open-project-link").onclick = () => fetch("/browser?url=" + data.content);
            }
        });
    };

    // Löschen
    document.querySelector(".view-project-delete").onclick = () => {
        overlay("project-delete-modal");
        document.querySelector("#project-delete-info").textContent = project.name;
        document.querySelector(".project-delete-confirm").onclick = () => {
            if (document.querySelector("#project-delete-name").value === project.name) {
                deleteProject(project);
                saveProjects();
                setTimeout(() => window.location.reload(), 200);
            } else {
                alert("Namen stimmen nicht überein!");
            }
        };
    };

    panel.querySelector(".last-edited-detail").textContent = "Zuletzt bearbeitet: " + new Date(project.last_edited).toLocaleString();
    panel.querySelector(".created-at-detail").textContent = "Erstellt: " + new Date(project.created_at).toLocaleString();
    panel.querySelector(".ide-badge").textContent = Projects.ideString(project.ide);
    panel.querySelector(".ide-badge").className = "ide-badge view-project-ide " + Projects.ideString(project.ide).toLowerCase();

    let iconUrl = icons.find(v => v.title === Projects.ideString(project.ide).toLowerCase())?.link ?? "";
    if (project.icon) iconUrl = project.icon;
    panel.querySelector(".current-icon img").src = iconUrl;
    panel.querySelector(".path-value").textContent = project.path;
    panel.querySelector(".path-card").onclick = () => fetch("/explorer?path=" + project.path);
    panel.querySelector(".btn-project-edit").onclick = () => { overlay("project-edit-modal"); editProject(project); };
    document.querySelector(".view-project-open").onclick = () => openProject(project);

    // Stats
    const langList = document.querySelector(".language-bars");
    langList.replaceChildren();
    panel.querySelector(".active-time").textContent = "–";
    panel.querySelector(".file-count").textContent = "–";
    panel.querySelector(".code-lines").textContent = "–";

    const fetched = await fetchInfo(project.path);
    const info = fetched ?? { lines: 0, files: 0, activeFor: 0, languages: [], approximate: false };

    // Cache top-2 languages for project card tags
    if (info.languages.length > 0) {
        localStorage.setItem("lang_" + project.path, JSON.stringify(info.languages.slice(0, 2)));
    }

    extras.animateTextNumber(panel.querySelector(".active-time"), info.activeFor, 1, true);
    extras.animateTextNumber(panel.querySelector(".file-count"), info.files, 1, true);
    extras.animateTextNumber(panel.querySelector(".code-lines"), info.lines, 1, true);
    document.querySelector(".view-project-name").textContent = project.name + (info.approximate ? " (ca.)" : "");

    const prefab = document.querySelector(".language-item.prefab");
    info.languages.forEach((language, i) => {
        setTimeout(() => {
            const clone = prefab.cloneNode(true);
            clone.querySelector(".language-percent").textContent = language.percent + "%";
            clone.querySelector(".language-name").textContent = language.title;
            const fill = clone.querySelector(".progress-fill");
            if (fill) {
                fill.style.width = "0%";
                setTimeout(() => {
                    fill.style.width = language.percent + "%";
                    fill.style.backgroundColor = extras.getLanguageColor(language.title);
                }, 100);
            }
            clone.classList.remove("prefab");
            langList.appendChild(clone);
        }, 100 * (i + 1));
    });
}

let currentPath;

async function renderFiles(files, basePath, project) {
    const filePrefab = document.querySelector(".file-entry.prefab");
    const fileList = document.querySelector(".file-container");
    const loadingIcon = fileList.querySelector(".files-loading");
    fileList.replaceChildren(loadingIcon);
    loadingIcon.style.display = "none";

    if (currentPath !== basePath) {
        const clone = filePrefab.cloneNode(true);
        clone.classList.remove("prefab");
        clone.querySelector(".file-name").textContent = "Back";
        clone.querySelector(".file-size").textContent = currentPath.replace(basePath, "");
        clone.onclick = () => {
            const parts = currentPath.split("/");
            currentPath = parts.slice(0, parts.length - 1).join("/");
            renderFiles(files, basePath, project);
        };
        fileList.appendChild(clone);
    }

    files.filter(v => v.root === currentPath).slice(0, 100).forEach(file => {
        const clone = filePrefab.cloneNode(true);
        clone.classList.remove("prefab");
        clone.querySelector(".file-name").textContent = file.name;
        if (file.type === "file") {
            clone.path = file.path;
            clone.querySelector(".file-size").textContent = extras.formatBytes(file.size);
            clone.querySelector("#file-icon").style.display = "flex";
            if (file.code) clone.querySelector("#file-icon").style.color = extras.getLanguageColor(file.code);
            clone.onclick = () => fetch("/projects/open?path=" + clone.path + "&ide=" + Projects.ideString(project.ide)).then(r => r.json());
        } else if (file.type === "folder") {
            clone.path = file.mypath;
            clone.querySelector(".file-size").textContent = file.size + " Dateien";
            clone.querySelector("#folder-icon").style.display = "flex";
            clone.onclick = () => { currentPath = clone.path.replace(/\\/g, "/"); renderFiles(files, basePath, project); };
        }
        fileList.appendChild(clone);
    });
}

// ── Options (IDE radio) ───────────────────────────────────────────────────────

function options() {
    const createOpts = document.querySelectorAll(".ide-option.create");
    createOpts.forEach(el => el.addEventListener("click", () => {
        createOpts.forEach(e => e.classList.remove("selected"));
        el.classList.add("selected");
    }));
    const editOpts = document.querySelectorAll(".ide-option.edit");
    editOpts.forEach(el => el.addEventListener("click", () => {
        editOpts.forEach(e => e.classList.remove("selected"));
        el.classList.add("selected");
    }));
}

// ── Create / Add / Open / Delete project ──────────────────────────────────────

async function createProject() {
    const projectInput = document.querySelector("#project-name");
    const projectName = projectInput?.value;
    if (!projectName || projectName.length < 3) { alert("Name muss mehr als 3 Zeichen haben!"); return; }
    const ideNum = parseInt(document.querySelector(".ide-option.create.selected").dataset.value) + 1;
    const defaultPath = settings.get("projectsFolder");
    const path = defaultPath + "/" + projectName;
    const category = settings.get("categories") === true ? templateSelected : null;
    await fetch("/projects/new?path=" + path + "&template=" + templateSelected + "&category=" + category)
        .then(r => r.json()).then(data => {
            if (data.success) {
                const info = data.content.templateInfo;
                let icon = null;
                icons.forEach(el => { if (el.title === Projects.ideString(ideNum)) icon = el.link; });
                if (info?.icon) icon = info.icon;
                Projects.addProject(projectName, ideNum, path, icon, selectedCreateFolderId);
                saveProjects();
                setTimeout(() => window.location.reload(), 300);
            }
        });
}

async function openProject(project) {
    await fetch("/projects/open?path=" + project.path + "&ide=" + Projects.ideString(project.ide)).then(r => r.json());
}

function deleteProject(project) {
    fetch("/projects/delete?path=" + project.path).then(r => r.json()).then(data => {
        if (!data.success) alert("Fehler beim löschen: " + data.content);
    });
}

function settingsView() {
    const panel = document.querySelector(".settings-modal");
    panel.querySelector("#projects-folder").value = settings.get("projectsFolder");
    panel.querySelector("#use-categories").checked = settings.get("categories");
}

function saveSettings() {
    const panel = document.querySelector(".settings-modal");
    settings.set("projectsFolder", panel.querySelector("#projects-folder").value);
    settings.set("categories", panel.querySelector("#use-categories").checked);
    settings.save();
    overlay("");
}

async function addProject() {
    const pathInput = document.querySelector("#project-add-path");
    const cleanPath = pathInput.value.replace(/[/\\]$/, "");
    const name = cleanPath.split(/[/\\]/).pop();
    let info = await fetch("/projects/add/evaluate?path=" + pathInput.value).then(r => r.json());
    info = info.success ? info.content : {};
    let ide = Projects.ide.VSCODE;
    if (info["ide"] === "sln") ide = Projects.ide.VSSTUDIO;
    if (info["ide"] === "idea") ide = Projects.ide.INTELLIJ;
    if (Projects.addProject(name, ide, pathInput.value)) {
        saveProjects();
        setTimeout(() => window.location.reload(), 200);
    }
}

function updateProjects() {
    fetch("/projects", {
        method: "POST",
        body: JSON.stringify(Projects.projects),
        headers: { "Content-Type": "application/json" }
    }).then(r => r.json());
}

async function fetchProjects() {
    return fetch("/projects").then(r => r.json()).then(data => {
        if (data.success) return data.content;
        alert("Error fetching projects");
    });
}

async function fetchInfo(path) {
    return fetch("/projects/info?path=" + path).then(r => r.json()).then(data => {
        if (data.success) return data.content;
        return null;
    });
}

// ── Emoji icon picker ─────────────────────────────────────────────────────────

const EMOJI_ICONS = [
    "🚀","💡","🔥","⚡","🛠️","🎯","📦","🧩","🌐","🔒",
    "🎮","🤖","🧠","📊","🗃️","🔬","🎨","🌙","☁️","🏗️",
    "🧪","📡","🔑","🛡️","🐍","⚙️","📱","💻","🖥️","🌍"
];

let _iconPickerValue = "";

function renderProjectIcon(imgEl, emojiEl, value) {
    if (!value) { imgEl.style.display = "none"; emojiEl.style.display = "none"; return; }
    if (value.startsWith("http") || value.startsWith("data:")) {
        imgEl.src = value;
        imgEl.style.display = "block";
        emojiEl.style.display = "none";
    } else {
        emojiEl.textContent = value;
        emojiEl.style.display = "block";
        imgEl.style.display = "none";
    }
}

function initIconPicker(currentValue) {
    _iconPickerValue = currentValue ?? "";
    const grid = document.getElementById("emoji-grid");
    const previewImg = document.getElementById("icon-picker-preview-img");
    const previewEmoji = document.getElementById("icon-picker-preview-emoji");
    const urlInput = document.getElementById("project-edit-icon");
    const fileInput = document.getElementById("icon-file-input");

    grid.replaceChildren();
    EMOJI_ICONS.forEach(em => {
        const btn = document.createElement("div");
        btn.className = "emoji-icon" + (_iconPickerValue === em ? " selected" : "");
        btn.textContent = em;
        btn.onclick = () => {
            _iconPickerValue = em;
            urlInput.value = "";
            grid.querySelectorAll(".emoji-icon").forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");
            renderProjectIcon(previewImg, previewEmoji, em);
        };
        grid.appendChild(btn);
    });

    urlInput.value = (currentValue && (currentValue.startsWith("http") || currentValue.startsWith("data:"))) ? currentValue : "";
    urlInput.oninput = () => {
        _iconPickerValue = urlInput.value.trim();
        grid.querySelectorAll(".emoji-icon").forEach(b => b.classList.remove("selected"));
        renderProjectIcon(previewImg, previewEmoji, _iconPickerValue);
    };

    fileInput.onchange = () => {
        const file = fileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            _iconPickerValue = e.target.result;
            urlInput.value = "";
            grid.querySelectorAll(".emoji-icon").forEach(b => b.classList.remove("selected"));
            renderProjectIcon(previewImg, previewEmoji, _iconPickerValue);
        };
        reader.readAsDataURL(file);
    };

    renderProjectIcon(previewImg, previewEmoji, currentValue ?? "");
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const icons = [
    { title: "vsstudio", link: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Visual_Studio_Icon_2022.svg/960px-Visual_Studio_Icon_2022.svg.png" },
    { title: "vscode", link: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Visual_Studio_Code_1.35_icon.svg/3840px-Visual_Studio_Code_1.35_icon.svg.png" },
    { title: "intellij", link: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/IntelliJ_IDEA_Icon.svg/960px-IntelliJ_IDEA_Icon.svg.png" }
];

// ── Project UI ────────────────────────────────────────────────────────────────

function projectUi() {
    const prefab = document.querySelector(".project-card.prefab");
    const folderPrefab = document.querySelector(".folder-card.prefab");
    const grid = document.querySelector(".projects-grid");
    grid.replaceChildren();

    // Folders (only shown when not inside a folder)
    if (currentFolderId === null) {
        folders.forEach(folder => {
            const count = Projects.projects.filter(p => p.folder_id === folder.id).length;
            const clone = folderPrefab.cloneNode(true);
            clone.classList.remove("prefab");
            clone.querySelector(".folder-card-name").textContent = folder.name;
            clone.querySelector(".folder-card-count").textContent = count + " Projekt" + (count !== 1 ? "e" : "");
            clone.style.setProperty("--folder-color", folder.color);
            clone.querySelector(".folder-card-icon").style.color = folder.color;
            clone.querySelector(".folder-card-icon").style.borderColor = folder.color + "40";

            // Edit button
            clone.querySelector(".folder-card-edit").onclick = ev => {
                ev.stopPropagation();
                editFolder(folder);
            };

            // Delete button
            clone.querySelector(".folder-card-delete").onclick = ev => {
                ev.stopPropagation();
                if (confirm(`Ordner "${folder.name}" löschen? Projekte bleiben erhalten.`)) deleteFolder(folder.id);
            };

            // Drag & drop target
            clone.addEventListener("dragover", ev => { ev.preventDefault(); clone.classList.add("drag-over"); });
            clone.addEventListener("dragleave", () => clone.classList.remove("drag-over"));
            clone.addEventListener("drop", ev => {
                ev.preventDefault();
                clone.classList.remove("drag-over");
                const name = ev.dataTransfer.getData("text/plain");
                if (name) moveProjectsToFolder([name], folder.id);
            });

            clone.onclick = ev => {
                if (ev.target.closest(".folder-card-delete") || ev.target.closest(".folder-card-edit")) return;
                currentFolderId = folder.id;
                showBreadcrumb(folder);
                projectUi();
            };

            grid.appendChild(clone);
        });
    }

    // Projects
    let filtered = Projects.projects;

    if (currentFolderId !== null) {
        filtered = filtered.filter(p => p.folder_id === currentFolderId);
    } else {
        filtered = filtered.filter(p => !p.folder_id);
    }

    if (filterIndex !== null) {
        if (filterIndex === 3) filtered = Projects.filterProjects({ favourite: true }, filtered);
        else filtered = Projects.filterProjects({ ide: filterIndex }, filtered);
    }
    if (filterSearch !== null) filtered = Projects.filterProjects({ name: filterSearch }, filtered);

    if (sortAfter === "Datum") filtered = filtered.sort((a, b) => new Date(b.last_edited) - new Date(a.last_edited));
    if (sortAfter === "Datum absteigend") filtered = filtered.sort((a, b) => new Date(a.last_edited) - new Date(b.last_edited));
    else if (sortAfter === "Name") filtered = filtered.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    else if (sortAfter === "Ide") filtered = filtered.sort((a, b) => a.ide - b.ide);

    filtered.forEach(project => {
        const clone = prefab.cloneNode(true);
        clone.classList.remove("prefab");

        // Selection state
        if (selectionMode) {
            clone.classList.add("selection-active");
            clone.setAttribute("draggable", "false");
            if (selectedProjects.has(project.name)) clone.classList.add("selected");
        } else {
            clone.setAttribute("draggable", "true");
        }

        clone.addEventListener("click", ev => {
            if (ev.target.classList.contains("override")) return;
            if (selectionMode) {
                toggleProjectSelection(project.name);
            } else {
                projectView(project);
                overlay("project-view-modal");
            }
        });

        // Drag
        clone.addEventListener("dragstart", ev => {
            ev.dataTransfer.setData("text/plain", project.name);
            clone.classList.add("dragging");
        });
        clone.addEventListener("dragend", () => clone.classList.remove("dragging"));

        // Lang tags from cache
        const langCache = localStorage.getItem("lang_" + project.path);
        const langTagsEl = clone.querySelector(".project-lang-tags");
        langTagsEl.replaceChildren();
        if (langCache) {
            JSON.parse(langCache).forEach(lang => {
                const tag = document.createElement("span");
                tag.className = "lang-tag";
                tag.textContent = lang.title;
                const color = extras.getLanguageColor(lang.title);
                tag.style.background = color + "33";
                tag.style.color = color;
                tag.style.border = "1px solid " + color + "55";
                langTagsEl.appendChild(tag);
            });
        }

        clone.querySelector(".project-info h3").textContent = project.name;
        clone.querySelector(".project-info .last-edited").textContent = "Zuletzt: " + extras.relativeTimeFrom(new Date(project.last_edited));
        clone.querySelector(".project-info .ide-badge").textContent = Projects.ideString(project.ide);
        clone.querySelector(".project-info .ide-badge").classList.add(Projects.ideString(project.ide).toLowerCase());

        let iconUrl = icons.find(v => v.title === Projects.ideString(project.ide).toLowerCase())?.link ?? "";
        if (project.icon) iconUrl = project.icon;
        clone.querySelector(".project-icon img").src = iconUrl;

        if (project.favourite) {
            clone.classList.add("favourite");
            clone.querySelector(".project-favourite").textContent = "❌";
        }

        clone.querySelector(".project-favourite").onclick = ev => {
            ev.stopPropagation();
            if (Projects.favouriteProject(project.name)) { updateProjects(); projectUi(); }
            else alert("Error with favouriting the project!");
        };

        grid.appendChild(clone);
    });
}
