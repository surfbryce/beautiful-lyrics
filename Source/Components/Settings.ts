// Source/Components/Settings.ts

const createSettingsPanel = (): { panel: HTMLDivElement, saveButton: HTMLButtonElement, closeButton: HTMLButtonElement, titleInput: HTMLInputElement, artistInput: HTMLInputElement, lyricsInput: HTMLTextAreaElement } => {
    const panel = document.createElement("div");
    panel.id = "custom-lyrics-settings-panel";
    panel.style.display = "none";
    panel.style.position = "fixed";
    panel.style.top = "50%";
    panel.style.left = "50%";
    panel.style.transform = "translate(-50%, -50%)";
    panel.style.backgroundColor = "var(--spice-card)";
    panel.style.padding = "20px";
    panel.style.borderRadius = "8px";
    panel.style.zIndex = "1000";
    panel.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
    panel.style.color = "var(--spice-text)"; // Ensure text is visible

    const title = document.createElement("h2");
    title.textContent = "Custom Lyrics Settings";
    title.style.textAlign = "center";
    title.style.color = "var(--spice-text)";
    panel.appendChild(title);

    const createInput = (labelText: string, inputType: string = "text"): [HTMLLabelElement, HTMLInputElement | HTMLTextAreaElement] => {
        const label = document.createElement("label");
        label.textContent = labelText;
        label.style.display = "block";
        label.style.marginBottom = "5px";
        label.style.color = "var(--spice-text)";

        const input = document.createElement(inputType === "textarea" ? "textarea" : "input") as HTMLInputElement | HTMLTextAreaElement;
        if (inputType !== "textarea") {
            (input as HTMLInputElement).type = inputType;
        }
        input.style.width = "calc(100% - 22px)"; // Account for padding and border
        input.style.padding = "10px";
        input.style.marginBottom = "15px";
        input.style.borderRadius = "4px";
        input.style.border = "1px solid var(--spice-misc)";
        input.style.backgroundColor = "var(--spice-main-elevated)";
        input.style.color = "var(--spice-text)";
        if (inputType === "textarea") {
            (input as HTMLTextAreaElement).rows = 6;
        }
        panel.appendChild(label);
        panel.appendChild(input);
        return [label, input];
    };

    const [, titleInput] = createInput("Song Title:") as [HTMLLabelElement, HTMLInputElement];
    const [, artistInput] = createInput("Artist:") as [HTMLLabelElement, HTMLInputElement];
    const [, lyricsInput] = createInput("Lyrics Text:", "textarea") as [HTMLLabelElement, HTMLTextAreaElement];

    const buttonContainer = document.createElement("div");
    buttonContainer.style.textAlign = "right";
    buttonContainer.style.marginTop = "20px";

    const saveButton = document.createElement("button");
    saveButton.textContent = "Save";
    saveButton.style.padding = "10px 20px";
    saveButton.style.marginRight = "10px";
    saveButton.style.borderRadius = "4px";
    saveButton.style.border = "none";
    saveButton.style.backgroundColor = "var(--spice-button)";
    saveButton.style.color = "var(--spice-text)";
    saveButton.style.cursor = "pointer";
    buttonContainer.appendChild(saveButton);

    const closeButton = document.createElement("button");
    closeButton.textContent = "Close";
    closeButton.style.padding = "10px 20px";
    closeButton.style.borderRadius = "4px";
    closeButton.style.border = "none";
    closeButton.style.backgroundColor = "var(--spice-button-disabled)";
    closeButton.style.color = "var(--spice-text)";
    closeButton.style.cursor = "pointer";
    buttonContainer.appendChild(closeButton);

    panel.appendChild(buttonContainer);
    document.body.appendChild(panel);

    return { panel, saveButton, closeButton, titleInput, artistInput, lyricsInput };
};

const { panel, saveButton, closeButton, titleInput, artistInput, lyricsInput } = createSettingsPanel();

const CUSTOM_LYRICS_STORAGE_KEY = "beautiful-lyrics-custom";

interface CustomLyricEntry {
    title: string;
    artist: string;
    lyricsText: string;
}

// Updated save functionality
saveButton.addEventListener("click", () => {
    const songTitle = titleInput.value.trim();
    const artistName = artistInput.value.trim();
    const lyricsValue = lyricsInput.value.trim();

    if (!songTitle || !artistName || !lyricsValue) {
        if (globalThis.Spicetify && globalThis.Spicetify.showNotification) {
            globalThis.Spicetify.showNotification("Title, Artist, and Lyrics cannot be empty.", true);
        } else {
            alert("Title, Artist, and Lyrics cannot be empty.");
        }
        return;
    }

    try {
        const SpicetifyLocalStorage = globalThis.Spicetify?.LocalStorage;
        if (!SpicetifyLocalStorage) {
            console.error("Spicetify.LocalStorage not available.");
            alert("Error: Spicetify.LocalStorage not available. Cannot save settings.");
            return;
        }

        let customLyrics: CustomLyricEntry[] = [];
        const storedLyrics = SpicetifyLocalStorage.get(CUSTOM_LYRICS_STORAGE_KEY);

        if (storedLyrics) {
            try {
                customLyrics = JSON.parse(storedLyrics);
                if (!Array.isArray(customLyrics)) { // Basic validation
                    console.warn("Stored custom lyrics data is not an array. Initializing to empty array.");
                    customLyrics = [];
                }
            } catch (e) {
                console.error("Error parsing stored custom lyrics, initializing to empty array:", e);
                customLyrics = [];
            }
        }

        const existingEntryIndex = customLyrics.findIndex(
            (entry) =>
                entry.title.toLowerCase() === songTitle.toLowerCase() &&
                entry.artist.toLowerCase() === artistName.toLowerCase()
        );

        if (existingEntryIndex > -1) {
            // Update existing entry
            customLyrics[existingEntryIndex].lyricsText = lyricsValue;
            console.log("Updated existing lyrics for:", { songTitle, artistName });
        } else {
            // Add new entry
            customLyrics.push({ title: songTitle, artist: artistName, lyricsText: lyricsValue });
            console.log("Added new custom lyrics for:", { songTitle, artistName });
        }

        SpicetifyLocalStorage.set(CUSTOM_LYRICS_STORAGE_KEY, JSON.stringify(customLyrics));

        // Clear input fields
        titleInput.value = "";
        artistInput.value = "";
        lyricsInput.value = "";

        if (globalThis.Spicetify && globalThis.Spicetify.showNotification) {
            globalThis.Spicetify.showNotification("Custom lyrics saved!", false);
        } else {
            alert("Custom lyrics saved!");
        }
        hidePanel();

    } catch (error) {
        console.error("Error saving custom lyrics to LocalStorage:", error);
        if (globalThis.Spicetify && globalThis.Spicetify.showNotification) {
            globalThis.Spicetify.showNotification("Error saving lyrics. Check console.", true);
        } else {
            alert("Error saving lyrics. Check console for details.");
        }
    }
});

closeButton.addEventListener("click", () => {
    hidePanel();
});

const showPanel = () => {
    panel.style.display = "block";
};

const hidePanel = () => {
    panel.style.display = "none";
};

export const getCustomLyric = (songTitle: string, artistName: string): CustomLyricEntry | undefined => {
    if (!songTitle || !artistName) {
        return undefined;
    }

    try {
        const SpicetifyLocalStorage = globalThis.Spicetify?.LocalStorage;
        if (!SpicetifyLocalStorage) {
            console.error("Spicetify.LocalStorage not available. Cannot fetch custom lyrics.");
            return undefined;
        }

        const storedLyrics = SpicetifyLocalStorage.get(CUSTOM_LYRICS_STORAGE_KEY);
        if (!storedLyrics) {
            return undefined;
        }

        let customLyrics: CustomLyricEntry[] = [];
        try {
            customLyrics = JSON.parse(storedLyrics);
            if (!Array.isArray(customLyrics)) {
                console.warn("Stored custom lyrics data is not an array. Cannot fetch custom lyrics.");
                return undefined;
            }
        } catch (e) {
            console.error("Error parsing stored custom lyrics:", e);
            return undefined;
        }

        const entry = customLyrics.find(
            (lyric) =>
                lyric.title.toLowerCase() === songTitle.toLowerCase() &&
                lyric.artist.toLowerCase() === artistName.toLowerCase()
        );

        return entry;

    } catch (error) {
        console.error("Error fetching custom lyrics from LocalStorage:", error);
        return undefined;
    }
};


// This is what will be imported by main.ts
export const CustomLyricsSettings = {
    showPanel,
    hidePanel,
    getCustomLyric, // Expose the new function
    // Potentially expose other elements or functions if needed later
};

// Also export constants and types needed by other modules
export { CUSTOM_LYRICS_STORAGE_KEY, CustomLyricEntry };
