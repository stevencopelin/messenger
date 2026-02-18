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
                flex-direction: column;
                align-items: center;
                gap: 5px;
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
            #tauri-credits {
                font-size: 10px;
                color: #888;
                cursor: pointer;
                text-decoration: none;
                transition: color 0.2s;
            }
            #tauri-credits:hover {
                color: #0084ff;
                text-decoration: underline;
            }
        `;
        document.head.appendChild(style);

        // Create footer container
        const footer = document.createElement('div');
        footer.id = 'tauri-donate-footer';

        const btn = document.createElement('button');
        btn.id = 'tauri-donate-btn';
        btn.textContent = 'Donate $5 (Support Development)';
        btn.onclick = function () {
            window.__TAURI__.core.invoke('donate');
        };

        const credits = document.createElement('div');
        credits.id = 'tauri-credits';
        credits.textContent = 'Created by Portfox Design';
        credits.onclick = function () {
            window.__TAURI__.core.invoke('credits');
        };

        footer.appendChild(btn);
        footer.appendChild(credits);
        document.body.appendChild(footer);
    }

    // Polyfill Notification API to use Tauri's native notification
    function initNotificationPolyfill() {
        // Only polyfill if we are in Tauri
        if (!window.__TAURI__) return;

        class TauriNotification {
            constructor(title, options) {
                this.title = title;
                this.body = options?.body || '';

                // Invoke Rust command
                window.__TAURI__.core.invoke('send_notification', {
                    title: this.title,
                    body: this.body
                }).catch(e => console.error("Failed to send notification:", e));
            }

            static requestPermission() {
                return Promise.resolve('granted');
            }

            static get permission() {
                return 'granted';
            }
        }

        // Overwrite standard Notification API
        window.Notification = TauriNotification;
        console.log("Messenger: Notification API Polyfilled");
    }

    // Keep-Alive Mechanism: Silent Audio Loop
    // This prevents macOS from suspending the WebView when in background.
    function initKeepAlive() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;

            const context = new AudioContext();

            // Create a silent oscillator
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.value = 0.01; // Almost zero frequency
            gainNode.gain.value = 0.001; // Effectively silent but active

            oscillator.connect(gainNode);
            gainNode.connect(context.destination);

            oscillator.start();

            // Resume context if suspended (e.g. by autoplay policy)
            const resume = () => {
                if (context.state === 'suspended') {
                    context.resume();
                }
            };

            document.addEventListener('click', resume, { once: true });
            document.addEventListener('keydown', resume, { once: true });

            console.log("Messenger: Background Keep-Alive Active");
        } catch (e) {
            console.error("Messenger: Keep-Alive failed", e);
        }
    }

    initNotificationPolyfill();
    init();

    // Badge Updater: Syncs unread count from title to Dock icon
    function initBadgeUpdater() {
        if (!window.__TAURI__) return;

        let lastCount = 0;

        const updateBadge = () => {
            const title = document.title;
            // Facebook title format: "(1) Messenger" or "Messenger"
            const match = title.match(/^\((\d+)\)/);
            const count = match ? parseInt(match[1], 10) : 0;

            if (count !== lastCount) {
                lastCount = count;
                window.__TAURI__.core.invoke('update_badge', { count: count })
                    .catch(e => console.error("Failed to update badge:", e));
                console.log(`Messenger: Badge updated to ${count}`);
            }
        };

        // Observe title changes
        const observer = new MutationObserver(updateBadge);
        const titleElement = document.querySelector('title');

        if (titleElement) {
            observer.observe(titleElement, { childList: true, characterData: true, subtree: true });
        } else {
            // Fallback if <title> tag recreation happens (rare but possible in SPAs)
            setInterval(updateBadge, 2000);
        }

        // Initial check
        updateBadge();
    }

    initBadgeUpdater();
    setTimeout(initKeepAlive, 2000); // Start after initial load
})();
