#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  use tauri::Manager;
  use window_vibrancy::{apply_acrylic};

  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      
      let window = app.get_webview_window("main").unwrap();

      #[cfg(target_os = "windows")]
      apply_acrylic(&window, Some((0, 0, 0, 125))).expect("Unsupported platform! 'apply_blur' is only supported on Windows");

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
