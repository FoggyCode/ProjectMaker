export function getLanguageColor(language) {
    var _a;
    let colors = {
        javascript: "#f7df1e",
        typescript: "#3178c6",
        python: "#3776ab",
        java: "#007396",
        c: "#555555",
        cpp: "#00599c",
        csharp: "#512bd4",
        go: "#00add8",
        rust: "#dea584",
        php: "#777bb4",
        ruby: "#cc342d",
        swift: "#fa7343",
        kotlin: "#7f52ff",
        dart: "#0175c2",
        html: "#e34c26",
        css: "#1572b6",
        shell: "#89e051",
    };
    return (_a = colors[language.toLowerCase()]) !== null && _a !== void 0 ? _a : "#999999"; // Fallback
}

export function animateTextNumber(text , number , time = 1 , int = false){
    for (let i = 1 ; i < 20 ; i ++){
        setTimeout(() => {
            if (int){
                text.textContent = Math.floor(number/(20-i))
            }else{
                text.textContent = number/(20-i)
            }

        }, (time * 20) * i)
    }
}
