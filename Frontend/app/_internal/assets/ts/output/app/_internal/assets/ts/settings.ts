let settings = {}

let defaultSettings = {
    projectsFolder : "C:/",
    categories : true
}


export function init(){
    // load
    fetch("/settings").then(resp => resp.json()).then(data => {
        
        if (data.success){
            settings = data.content
        }else{
            settings = defaultSettings
            save()
        }
    })
    
}

export function set(key : string , value){
    settings[key] = value
}

export function save(){
    fetch("/settings" , {
        method : "POST",
        body: JSON.stringify(settings),
        headers: {"Content-Type" : "application/json"}
    }).then(resp => resp.json()).then(data => {
        
    })
}

export function get(key : string , defaultValue = null){
    if (settings[key]){
        return settings[key]
    }else{
        return defaultValue
    }
}