(function () {
    // Wait for body
    function init() {
        if (!document.body) {
            setTimeout(init, 100);
            return;
        }

        // Create styles for floating widget
        const style = document.createElement('style');
        style.innerHTML = `
            #tauri-donate-footer {
                position: fixed;
                bottom: 20px;
                left: 20px;
                width: auto;
                height: auto;
                background: white;
                border: 1px solid #ddd;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify_content: center;
                z-index: 999999;
                font-family: system-ui, -apple-system, sans-serif;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                padding: 10px;
                transition: transform 0.2s, opacity 0.2s;
            }
            #tauri-donate-footer:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 24px rgba(0,0,0,0.2);
            }
            #tauri-donate-btn {
                background: #0084ff;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: 600;
                cursor: pointer;
                font-size: 13px;
                text-decoration: none;
                white-space: nowrap;
            }
            #tauri-donate-btn:hover {
                background: #0073e6;
            }
            /* Optional: Add a close button if needed, but keeping it simple for now */
        `;
        document.head.appendChild(style);

        // Create footer container
        const footer = document.createElement('div');
        footer.id = 'tauri-donate-footer';

        const btn = document.createElement('button');
        btn.id = 'tauri-donate-btn';
        btn.textContent = 'Donate $5 (Support Development)';
        btn.onclick = function () {
            // Invoke Rust command
            window.__TAURI__.core.invoke('donate');
        };

        footer.appendChild(btn);
        document.body.appendChild(footer);
    }

    init();
})();
