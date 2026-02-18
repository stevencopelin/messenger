use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager, WebviewUrl, WebviewWindowBuilder,
};

#[tauri::command]
fn donate() {
    let _ = open::that("https://www.paypal.com/donate/?hosted_button_id=HN7Y5376ZLLDQ");
}

#[tauri::command]
fn credits() {
    let _ = open::that("https://www.portfoxdesign.com");
}

#[tauri::command]
fn send_notification(app: tauri::AppHandle, title: String, body: String) {
    use tauri_plugin_notification::NotificationExt;
    let _ = app.notification().builder()
        .title(title)
        .body(body)
        .show();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Force refresh of donate script
    let donate_script = include_str!("../src/scripts/donate.js");

    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![donate, credits, send_notification])
        .setup(move |app| {
            #[cfg(target_os = "macos")]
            {
                use objc2_foundation::{NSActivityOptions, NSProcessInfo, NSString};
                
                let process_info = NSProcessInfo::processInfo();
                let reason = NSString::from_str("Keep socket alive for Messenger");
                // NSActivityBackground (0x000000FF) | NSActivityLatencyCritical (0xFF00000000)
                // We use the impressive power of the raw values or just the constants if available.
                // To be safe with the crate versions, let's use the constants from the crate.
                let options = NSActivityOptions::Background | NSActivityOptions::LatencyCritical;
                
                let activity = process_info.beginActivityWithOptions_reason(options, &reason);
                // We must keep this token alive. Since we want it for the lifetime of the app,
                // and we are in setup, we can just leak it.
                std::mem::forget(activity);
            }

            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let hide_i = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &hide_i, &quit_i])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .show_menu_on_left_click(true)
                .icon(app.default_window_icon().unwrap().clone())
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "hide" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.hide();
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            let win_builder = WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::External("https://www.facebook.com/messages/".parse().unwrap()),
            )
            .title("Messenger")
            .inner_size(1100.0, 800.0)
            .resizable(true)
            .visible(true)
            .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36")
            .initialization_script(donate_script);

            let _window = win_builder.build().unwrap();

            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                window.hide().unwrap();
                api.prevent_close();
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
