export function getLanguageColor(language) {
    var _a;
    let colors = {
        // Sprachen & Core
        javascript: "#f7df1e",
        typescript: "#3178c6",
        python: "#3776ab",
        java: "#007396",
        c: "#a8b9cc", 
        cpp: "#00599c",
        csharp: "#512bd4",
        go: "#00add8",
        rust: "#dea584",
        php: "#777bb4",
        ruby: "#cc342d",
        swift: "#fa7343",
        kotlin: "#7f52ff",
        dart: "#0175c2",
        lua: "#000080",
        perl: "#0298c3",
        r: "#276dc3",


        html: "#e34c26",
        css: "#1572b6",
        sass: "#cf649a", 
        vue: "#42b883",
        react: "#61dafb", 

       
        json: "#889701",
        xml: "#0060ac",
        yaml: "#cb171e",
        toml: "#9c4221",
        csv: "#217346",
        env: "#ffad00",
        ini: "#4d4d4d",
        markdown: "#083fa1",
        text: "#607d8b",

        
        shell: "#89e051",
        powershell: "#012456",
        batch: "#c1f12e",
        sql: "#e38c00",
        docker: "#2496ed"
    };
    return (_a = colors[language.toLowerCase()]) !== null && _a !== void 0 ? _a : "#999999"; 
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

/**
 * Formatiert Bytes in eine menschenlesbare Form (z.B. 1024 -> 1 KB)
 * @param {number} bytes - Die Anzahl der Bytes
 * @param {number} decimals - Anzahl der Nachkommastellen (Standard: 2)
 * @returns {string} Formatiert als "Wert Einheit"
 */
export function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    // Berechnet den Index für das 'sizes' Array
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    // Falls die Zahl größer ist als unsere Einheiten-Liste
    const index = Math.min(i, sizes.length - 1);

    return `${parseFloat((bytes / Math.pow(k, index)).toFixed(dm))} ${sizes[index]}`;
}