document.addEventListener("DOMContentLoaded", displayIslands);

function displayIslands() {
  chrome.storage.local.get("tabIslands", (data) => {
    let container = document.getElementById("tabIslandsContainer");
    container.innerHTML = ""; // Clear previous entries

    (data.tabIslands || []).forEach((island) => {
      let div = document.createElement("div");
      div.classList.add("islandContainer"); //  Add class for correct selection

      div.innerHTML = `
                <strong>${island.tabs.length} tabs</strong>
                <br>
                <span> Created: (${island.date} ${island.name}) </span>   
                <br>
                <button class="maximizeButton" data-id="${
                  island.id
                }">Restore All</button>
                <button class="copyButton" data-id="${
                  island.id
                }" style="cursor: pointer;">Copy Links to Clipboard</button>
                <br>
                <button class="deleteButton" data-id="${
                  island.id
                }">Delete this</button>
                <button class="minimizeButton">Minimize</button>
                <div class="content" style="display: block;">
                    <ul>
                        ${island.tabs
                          .map((tab, index) => {
                            const urlObj = new URL(tab.url);
                            return `
                              <li class="url-item" style="display: flex; align-items: center; margin-bottom: 5px; position: relative;">
                                <span class="delete-url" 
                                      data-island-id="${island.id}" 
                                      data-tab-index="${index}"
                                      style="display: none; cursor: pointer; color: #ff4747; margin-right: 8px;">
                                  ✕
                                </span>
                                <img src="https://www.google.com/s2/favicons?sz=32&domain=${urlObj.hostname}" 
                                  alt="Favicon" width="16" height="16" style="margin-right: 8px;">
                                <a href="${tab.url}" target="_blank" style="text-decoration: none; color: inherit;">
                                  ${tab.title || urlObj.hostname}
                                </a>
                              </li>
                            `;
                          })
                          .join("")}
                    </ul>
                </div>
            `;

      container.appendChild(div);
    });

    attachMinimizeEvent(); // Attach event after elements exist
    attachMaximizeEvent();

    attachClearContainerEvent();

    attachUrlEvents();
  });
}

function attachUrlEvents() {
  // Handle hover events
  document.querySelectorAll('.url-item').forEach(item => {
    item.addEventListener('mouseenter', () => {
      const deleteBtn = item.querySelector('.delete-url');
      if (deleteBtn) deleteBtn.style.display = 'block';
    });
    
    item.addEventListener('mouseleave', () => {
      const deleteBtn = item.querySelector('.delete-url');
      if (deleteBtn) deleteBtn.style.display = 'none';
    });
  });

  // Handle delete clicks
  document.querySelectorAll('.delete-url').forEach(deleteBtn => {
    deleteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const islandId = parseInt(deleteBtn.dataset.islandId);
      const tabIndex = parseInt(deleteBtn.dataset.tabIndex);
      
      chrome.storage.local.get("tabIslands", (data) => {
        let islands = data.tabIslands || [];
        let island = islands.find(i => i.id === islandId);
        
        if (island && island.tabs) {
          // Remove the specific URL
          island.tabs.splice(tabIndex, 1);
          
          // If no tabs left, remove the entire island
          if (island.tabs.length === 0) {
            islands = islands.filter(i => i.id !== islandId);
          }
          
          // Update storage and refresh display
          chrome.storage.local.set({ tabIslands: islands }, () => {
            displayIslands();
          });
        }
      });
    });
  });
}

// deleting urls from specific tabs-list
function attachClearContainerEvent() {
  document.querySelectorAll('.deleteButton').forEach(button => {
    button.addEventListener('click', () => {
      console.log("this is being pressed");
      const islandId = parseInt(button.getAttribute('data-id'));
      
      // Show confirmation dialog
      if (confirm('Are you sure you want to clear this container?')) {
        chrome.storage.local.get("tabIslands", (data) => {
          let islands = data.tabIslands || [];
          // Remove the specific island
          let updatedIslands = islands.filter(i => i.id !== islandId);
          
          chrome.storage.local.set({ tabIslands: updatedIslands }, () => {
            console.log("Container cleared:", islandId);
            displayIslands(); // Refresh the display
          });
        });
      }
    });
  });
}

//minimize 
function attachMinimizeEvent() {
  document.querySelectorAll(".minimizeButton").forEach((button) => {
    button.addEventListener("click", function () {
      let parentDiv = this.closest(".islandContainer"); // Find the correct parent
      if (!parentDiv) return; //  Prevent errors

      let contentDiv = parentDiv.querySelector(".content"); // Find the correct content div
      if (!contentDiv) return; // Prevent errors

      if (contentDiv.style.display === "none") {
        contentDiv.style.display = "block";
        this.innerText = "Minimize";
      } else {
        contentDiv.style.display = "none";
        this.innerText = "Maximize";
      }
    });
  });
}

//maximize
function attachMaximizeEvent() {
  document.querySelectorAll(".maximizeButton").forEach((button) => {
    button.addEventListener("click", () => {
      let islandId = parseInt(button.getAttribute("data-id"));
      restoreIsland(islandId);
    });
  });
}

//restoring urls to browser
function restoreIsland(islandId) {
  chrome.storage.local.get("tabIslands", (data) => {
    let islands = data.tabIslands || [];
    let island = islands.find((i) => i.id === islandId);

    if (!island) {
      console.warn("Island not found for ID!", islandId);
      return;
    }

    if (!island.tabs || !Array.isArray(island.tabs)) {
      console.warn("Island.tabs is undefined or not an array!", island);
      return;
    }

    console.log("Restoring Island:", island.tabs);
    island.tabs.forEach((tab) => {
      chrome.tabs.create({ url: tab.url });
    });

    let updatedIslands = islands.filter((i) => i.id !== islandId);
    chrome.storage.local.set({ tabIslands: updatedIslands }, displayIslands);
  });
}

//clearing all tabs-lists
function clearAll() {
  document.querySelector("#clearAll").addEventListener("click", () => {
    chrome.storage.local.clear();
    displayIslands();
  });
}

//saving all tabs to specific island/tabs-list
function saveAll() {
  document.querySelector("#saveAll").addEventListener("click", () => {
    chrome.storage.local.get("tabIslands", (data) => {
      let islands = data.tabIslands || [];
      let island = {
        id: Date.now(),
        date: `${new Date(Date.now()).toLocaleString().split(",")[0]}`,
        name: `${new Date().toLocaleTimeString()}`,
        tabs: [],
      };
      chrome.tabs.query({}, (tabs) => {
        island.tabs = tabs.map((tab) => ({ title: tab.title, url: tab.url }));
        let updatedIslands = [...islands, island];
        chrome.storage.local.set({ tabIslands: updatedIslands }, () => {
          console.log("Island saved:", updatedIslands);
          displayIslands();
        });
      });
    });
  });
}

//copying links of specific island/tabs-list  to clipboard
document.addEventListener("click", (event) => {
  if (event.target.classList.contains("copyButton")) {
    let islandId = parseInt(event.target.getAttribute("data-id"));
    copyLinksToClipboard(islandId, event);
  }
});

function copyLinksToClipboard(islandId, event) {
  chrome.storage.local.get("tabIslands", (data) => {
    let islands = data.tabIslands || [];
    let island = islands.find((i) => i.id === islandId);

    if (!island) {
      console.warn("Island not found for ID:", islandId);
      return;
    }

    if (!island.tabs || !Array.isArray(island.tabs)) {
      console.error("Island.tabs is undefined or not an array:", island);
      return;
    }

    console.log("Copying links to clipboard:", island.tabs.length);
    const copyButton = event.target;

    let links = island.tabs.map((tab) => tab.url).join("\n"); // Safe .map() usage
    navigator.clipboard
      .writeText(links)
      .then(() => {
        copyButton.innerText = "Copied! ✅";
        setTimeout(() => {
          copyButton.innerText = "Copy Links to Clipboard";
        }, 3000);
        console.log("Links copied to clipboard!");
      })
      .catch((err) => {
        alert("Failed to copy:", err);
      });
  });
}

// Theme Toggle
document.addEventListener("DOMContentLoaded", () => {
  displayIslands();
  clearAll();
  saveAll();

  const themeToggle = document.getElementById("themeToggle");
  const body = document.body;

  // Load theme from localStorage
  if (localStorage.getItem("theme") === "dark") {
    body.classList.add("dark-mode");
    themeToggle.textContent = "☀️";
  }

  themeToggle.addEventListener("click", () => {
    body.classList.toggle("dark-mode");
    const isDarkMode = body.classList.contains("dark-mode");

    // Save theme preference
    localStorage.setItem("theme", isDarkMode ? "dark" : "light");

    // Change button icon
    themeToggle.textContent = isDarkMode ? "☀️" : "🌙";
  });
});
