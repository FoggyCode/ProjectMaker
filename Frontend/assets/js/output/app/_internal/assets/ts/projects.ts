export enum ide {
    NONE,
    INTELLIJ,
    VSCODE,
    VSSTUDIO
}

export class Project {
    name : string = "";
    id : number = 0;
    ide : ide | null = null
    path : string = ""
    icon : string = ""
    last_edited : Date = new Date()
    constructor(name : string , ide : ide , path : string , icon :string){
        this.name = name
        this.ide = ide
        this.path = path
        this.id= projects.length
        this.icon = icon
    }

    update(params : Partial<Project>) {
        Object.assign(this , params)
    }
}

export function ideString(idex : number) : string{
    return Object.keys(ide)[(idex + 1) + Object.keys(ide).length/2]
}


export let projects : Project[] = [ ]


export function setProjects(list : Project[]){
    projects = list.map(p =>
        Object.assign(new Project(p.name, p.ide, p.path, p.icon), p)
    )

}
export function addProject(name : string , ide : ide , path: string , icon : string = null) : boolean{
    if (getProject(name) != null){ return false }
    projects.push(new Project(name , ide - 1 , path , icon))
    return true
}

export function getProject(name : string) : Project{
    return projects.filter(value => {
        if (value.name == name){
            return value
        }
    })[0]
}

export function removeProject(id : number){
    projects = projects.filter(value => {
        if (value.id != id){
            return value
        }
    })
}

export function filterProjects(args : Partial<Project> , projectsX : Project[] = null) : Project[]{
    if (projectsX == null){
        projectsX = projects
    }
    return projectsX.filter(value => {
        let endvalue : Project | null = null

        if (args.id != null){
            endvalue = value.id == args.id ? value : null
        }
        if (args.name != null){
            endvalue = value.name.includes(args.name) ? value : null
        }
        if (args.ide != null){
            endvalue = value.ide == args.ide ? value : null
        }
        return endvalue
    })
}

export function openProject(name : string){
    let project : Project = getProject(name)
    switch(project.ide){
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