export function listeners(){
    document.addEventListener("keydown" , (ev) => {
        keyPress(ev.key)
    })
}

function keyPress(key){
    switch(key)
    {
        case "Escape":
            window.overlay("")
            break
    }
}