document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("saveTabs").addEventListener("click", saveTabs);
    document.getElementById("viewIslands").addEventListener("click", () => {
        chrome.tabs.create({ url: "islands.html" }); // Opens the new page
    });
    displayIslands();   
});

async function saveTabs() {
    let tabs = await chrome.tabs.query({ currentWindow: true });
    console.log("Retrieved Tabs:", tabs);

    let island = {
        id: Date.now(),
        date:`${new Date(Date.now()).toLocaleString().split(',')[0]}`,
        name: `${new Date().toLocaleTimeString()}`,
        tabs: tabs.map(tab => ({ title: tab.title, url: tab.url }))
    };

    chrome.storage.local.get({ tabIslands: [] }, data => {
        let updatedIslands = [...data.tabIslands, island];
        chrome.storage.local.set({ tabIslands: updatedIslands }, () => {
            console.log("Island saved:", updatedIslands);
            displayIslands();
        });
    });
}

function displayIslands() {
    chrome.storage.local.get("tabIslands", data => {
        let container = document.getElementById("tabIslandsContainer");
        container.innerHTML = "";

        (data.tabIslands || []).forEach(island => {
            let div = document.createElement("div");
            div.innerHTML = `
                <strong>${island.name}</strong> (${island.tabs.length} tabs)
                <button class="restoreButton" data-id="${island.id}">Restore</button>
            `;
            container.appendChild(div);
        });

        // Attach event listeners AFTER adding buttons dynamically
        document.querySelectorAll(".restoreButton").forEach(button => {
            button.addEventListener("click", () => {
                let islandId = parseInt(button.getAttribute("data-id"));
                restoreIsland(islandId);
            });
        });
    });
}

function restoreIsland(islandId) {  
    chrome.storage.local.get("tabIslands", data => {
        let islands = data.tabIslands || [];
        let island = islands.find(i => i.id === islandId);

        if (!island) {
            console.warn("Island not found!");
            return;
        }

        console.log("Restoring Island:", island);
        island.tabs.forEach(tab => {
            chrome.tabs.create({ url: tab.url });
        });

        let updatedIslands = islands.filter(i => i.id !== islandId);
        chrome.storage.local.set({ tabIslands: updatedIslands }, displayIslands);
    });
}
