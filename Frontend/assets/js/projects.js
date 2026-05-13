export var ide;
(function (ide) {
    ide[ide["NONE"] = 0] = "NONE";
    ide[ide["INTELLIJ"] = 1] = "INTELLIJ";
    ide[ide["VSCODE"] = 2] = "VSCODE";
    ide[ide["VSSTUDIO"] = 3] = "VSSTUDIO";
})(ide || (ide = {}));
export class Project {
    constructor(name, ide, path, icon, favourite, folder_id) {
        this.name = "";
        this.id = 0;
        this.ide = null;
        this.path = "";
        this.icon = "";
        this.favourite = favourite;
        this.folder_id = folder_id ?? null;
        this.last_edited = new Date();
        this.created_at = new Date();
        this.name = name;
        this.ide = ide;
        this.path = path;
        this.id = projects.length;
        this.icon = icon;
    }
    update(params) {
        Object.assign(this, params);
    }
}
export function ideString(idex) {
    return Object.keys(ide)[(idex + 1) + Object.keys(ide).length / 2];
}
export let projects = [];
export function setProjects(list) {
    projects = list.map(p => Object.assign(new Project(p.name, p.ide, p.path, p.icon, p.favourite, p.folder_id), p));
}
export function addProject(name, ide, path, icon = null, folder_id = null) {
    if (getProject(name) != null) {
        return false;
    }
    projects.push(new Project(name, ide - 1, path, icon, false, folder_id));
    return true;
}
export function getProject(name) {
    return projects.filter(value => {
        if (value.name == name) {
            console.log(value)
            return value;
        }
    })[0];
}
export function removeProject(id) {
    projects = projects.filter(value => {
        if (value.id != id) {
            return value;
        }
    });
}

export function favouriteProject(name){
    let project = getProject(name)
    if (project){
        
        project.favourite = !project.favourite ?? false
        return true
    }else{
        return false
    }
}
export function filterProjects(args, projectsX = null) {
    if (projectsX == null) {
        projectsX = projects;
    }
    return projectsX.filter(value => {
        let endvalue = null;
        if (args.id != null) {
            endvalue = value.id == args.id ? value : null;
        }
        if (args.name != null) {
            endvalue = value.name.toLowerCase().includes(args.name.toLowerCase()) ? value : null;
        }
        if (args.ide != null) {
            endvalue = value.ide == args.ide ? value : null;
        }
        if (args.favourite != null) {
            endvalue = value.favourite == args.favourite ? value : null;
        }
        return endvalue;
    });
}
export function openProject(name) {
    let project = getProject(name);
    switch (project.ide) {
        case ide.INTELLIJ:
            // Open
            break;
        case ide.VSCODE:
            // Open
            break;
        case ide.VSSTUDIO:
            // Open
            break;
    }
}
