const windows = ["projects" , "templates"]

export function setView(name){
    let exists = windows.filter(v => v.name == name) != null
    if (!exists) return
    
    windows.forEach(element => { 
        document.querySelector("#" + element + "-section").style.display =  "none"

        if (element == name){
             document.querySelector("#" + element + "-section").style.display =  "block"
        }
       

    });

}