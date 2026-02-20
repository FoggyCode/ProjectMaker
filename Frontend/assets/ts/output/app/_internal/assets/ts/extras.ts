export function getLanguageColor(language: string): string {
  let colors: Record<string, string> = {
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

  return colors[language.toLowerCase()] ?? "#999999"; // Fallback
}
