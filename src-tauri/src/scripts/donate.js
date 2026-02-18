// Production Version: Signal Handling & Link Fixes
(function () {
    try {
        console.log("Messenger Script Starting...");

        // Wait for body
        function init() {
            if (!document.body) {
                setTimeout(init, 100);
                return;
            }
            console.log("Body found, initializing UI...");

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

        // Link Interceptor: Forces external links to open in system browser
        function initLinkInterceptor() {
            document.addEventListener('click', function (e) {
                // Find closest anchor tag
                const target = e.target.closest('a');
                if (target && target.href) {
                    // Check if it's an external link
                    // 1. Hostname is different from current Facebook/Messenger host
                    // 2. OR it explicitly has target="_blank"
                    const currentHost = window.location.hostname;
                    const linkHost = target.hostname;

                    // Facebook wrapper often keeps you on facebook.com or messenger.com
                    // If the link goes to youtube, google, etc., open externally.
                    if (linkHost !== currentHost && linkHost !== '') {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log("Opening external link:", target.href);
                        window.__TAURI__.core.invoke('open_external_link', { url: target.href });
                    }
                }
            }, true); // Capture phase to ensure we get it first
        }

        // Polyfill Notification API to use Tauri's native notification
        function initNotificationPolyfill() {
            if (!window.__TAURI__) return;

            class TauriNotification {
                constructor(title, options) {
                    this.title = title;
                    this.body = options?.body || '';

                    // Invoke Rust command
                    window.__TAURI__.core.invoke('send_notification', {
                        title: this.title,
                        body: this.body
                    })
                        .catch(e => console.error("Failed to send notification:", e));
                }

                static requestPermission() {
                    return Promise.resolve('granted');
                }

                static get permission() {
                    return 'granted';
                }
            }

            window.Notification = TauriNotification;
            console.log("Messenger: Notification API Polyfilled");
        }

        // Keep-Alive Mechanism
        function initKeepAlive() {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) return;

                const context = new AudioContext();
                const oscillator = context.createOscillator();
                const gainNode = context.createGain();

                oscillator.type = 'sine';
                oscillator.frequency.value = 0.01;
                gainNode.gain.value = 0.001;

                oscillator.connect(gainNode);
                gainNode.connect(context.destination);
                oscillator.start();

                const resume = () => {
                    if (context.state === 'suspended') {
                        context.resume();
                    }
                };

                document.addEventListener('click', resume, { once: true });
                document.addEventListener('keydown', resume, { once: true });
            } catch (e) { }
        }

        initNotificationPolyfill();
        initLinkInterceptor();
        init();

        // Badge Updater: Title-based only (Safe Mode)
        function initBadgeUpdater() {
            if (!window.__TAURI__) return;

            let lastCount = 0;

            const updateBadge = () => {
                const title = document.title;
                const match = title.match(/^\((\d+)\)/);
                const count = match ? parseInt(match[1], 10) : 0;

                if (count !== lastCount) {
                    lastCount = count;
                    window.__TAURI__.core.invoke('update_badge', { count: count })
                        .catch(e => console.error("Badge verification failed", e));
                }
            };

            const observer = new MutationObserver(updateBadge);
            const titleElement = document.querySelector('title');

            if (titleElement) {
                observer.observe(titleElement, { childList: true, characterData: true, subtree: true });
            } else {
                setInterval(updateBadge, 2000);
            }
            updateBadge();
        }

        initBadgeUpdater();
        setTimeout(initKeepAlive, 2000);
    } catch (e) {
        console.error("Messenger Init Failed", e);
    }
})();
