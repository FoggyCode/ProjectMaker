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

export function relativeTimeFrom(date) {
    const now = new Date();
    const diffMs = now - new Date(date);
    
    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 10) return "gerade eben";
    if (seconds < 60) return `vor ${seconds} Sekunden`;
    if (minutes < 60) return `vor ${minutes} ${minutes === 1 ? "Minute" : "Minuten"}`;
    if (hours < 24) return `vor ${hours} ${hours === 1 ? "Stunde" : "Stunden"}`;
    if (days < 30) return `vor ${days} ${days === 1 ? "Tag" : "Tagen"}`;
    if (months < 12) return `vor ${months} ${months === 1 ? "Monat" : "Monaten"}`;
    return `vor ${years} ${years === 1 ? "Jahr" : "Jahren"}`;
}