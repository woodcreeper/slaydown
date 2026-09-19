use serde::{Deserialize, Serialize};
use std::{
    fs,
    io::{Read, Write},
    path::{Path, PathBuf},
    sync::atomic::{AtomicU64, Ordering},
};

const LIMIT: u64 = 16384;
const APP_ID: &str = "dev.mdquickviewer.folio";
static NEXT: AtomicU64 = AtomicU64::new(0);

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Appearance {
    pub theme: String,
    pub reading_style: String,
    pub tint: Option<String>,
    pub font_size: f64,
}
impl Appearance {
    pub fn defaults(omarchy: bool) -> Self {
        Self {
            theme: "system".into(),
            reading_style: if omarchy { "omarchy" } else { "folio" }.into(),
            tint: None,
            font_size: 17.0,
        }
    }
    pub fn validate(&self) -> Result<(), String> {
        if !["light", "dark", "system"].contains(&self.theme.as_str())
            || !["folio", "code", "writer", "github", "omarchy"]
                .contains(&self.reading_style.as_str())
            || !self.font_size.is_finite()
            || !(14.0..=23.0).contains(&self.font_size)
            || self.tint.as_ref().is_some_and(|s| {
                s.len() != 7
                    || !s.starts_with('#')
                    || !s[1..].bytes().all(|c| c.is_ascii_hexdigit())
            })
        {
            return Err("The appearance settings are invalid.".into());
        }
        Ok(())
    }
}
pub fn config_dir() -> Result<PathBuf, String> {
    #[cfg(target_os = "windows")]
    let root = std::env::var_os("APPDATA").map(PathBuf::from);
    #[cfg(target_os = "macos")]
    let root =
        std::env::var_os("HOME").map(|p| PathBuf::from(p).join("Library/Application Support"));
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    let root = std::env::var_os("XDG_CONFIG_HOME")
        .filter(|p| Path::new(p).is_absolute())
        .map(PathBuf::from)
        .or_else(|| std::env::var_os("HOME").map(|p| PathBuf::from(p).join(".config")));
    root.map(|p| p.join(APP_ID))
        .ok_or_else(|| "Your settings folder could not be located.".into())
}
pub fn is_omarchy() -> bool {
    if !cfg!(target_os = "linux") {
        return false;
    }
    std::env::var_os("OMARCHY_PATH").is_some_and(|p| Path::new(&p).is_dir())
        || std::env::var_os("HOME")
            .is_some_and(|p| PathBuf::from(p).join(".local/share/omarchy").is_dir())
}
pub fn load(dir: &Path, omarchy: bool) -> Result<Appearance, String> {
    let path = dir.join("appearance.json");
    let file = match fs::File::open(path) {
        Ok(file) => file,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
            return Ok(Appearance::defaults(omarchy))
        }
        Err(e) => return Err(format!("Could not read appearance settings: {e}")),
    };
    let mut bytes = Vec::new();
    file.take(LIMIT + 1)
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())?;
    if bytes.len() as u64 > LIMIT {
        return Err("Appearance settings are too large.".into());
    }
    let settings: Appearance = serde_json::from_slice(&bytes)
        .map_err(|e| format!("Could not read appearance settings: {e}"))?;
    settings.validate()?;
    Ok(settings)
}
pub fn save(dir: &Path, settings: &Appearance) -> Result<(), String> {
    settings.validate()?;
    fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    let temporary = dir.join(format!(
        ".appearance-{}-{}.tmp",
        std::process::id(),
        NEXT.fetch_add(1, Ordering::Relaxed)
    ));
    let result = (|| -> std::io::Result<()> {
        let mut options = fs::OpenOptions::new();
        options.write(true).create_new(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            options.mode(0o600);
        }
        let mut file = options.open(&temporary)?;
        file.write_all(&serde_json::to_vec(settings)?)?;
        file.sync_all()?;
        drop(file);
        fs::rename(&temporary, dir.join("appearance.json"))
    })();
    if result.is_err() {
        let _ = fs::remove_file(temporary);
    }
    result.map_err(|e| format!("Appearance changed, but could not be saved: {e}"))
}
#[tauri::command]
pub fn get_appearance(legacy: Option<Appearance>) -> Result<Appearance, String> {
    let dir = config_dir()?;
    // Only the full reader supplies legacy webview preferences, and only once.
    if !dir.join("appearance.json").exists() {
        if let Some(settings) = legacy {
            save(&dir, &settings)?;
        }
    }
    load(&dir, is_omarchy())
}
#[tauri::command]
pub fn set_appearance(settings: Appearance) -> Result<(), String> {
    save(&config_dir()?, &settings)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn defaults_are_specific_to_omarchy_and_existing_choices_survive() {
        let dir = tempfile::tempdir().unwrap();
        assert_eq!(load(dir.path(), true).unwrap().reading_style, "omarchy");
        assert_eq!(load(dir.path(), false).unwrap().reading_style, "folio");
        let mut chosen = Appearance::defaults(false);
        chosen.reading_style = "github".into();
        chosen.tint = Some("#123abc".into());
        chosen.font_size = 21.0;
        save(dir.path(), &chosen).unwrap();
        assert_eq!(load(dir.path(), true).unwrap(), chosen);
        chosen.reading_style = "code".into();
        save(dir.path(), &chosen).unwrap();
        assert_eq!(load(dir.path(), true).unwrap(), chosen);
    }
    #[test]
    fn readers_never_observe_a_partially_written_settings_file() {
        let dir = tempfile::tempdir().unwrap();
        save(dir.path(), &Appearance::defaults(false)).unwrap();
        std::thread::scope(|scope| {
            for theme in ["light", "dark"] {
                let path = dir.path();
                scope.spawn(move || {
                    let mut chosen = Appearance::defaults(true);
                    chosen.theme = theme.into();
                    for _ in 0..12 {
                        save(path, &chosen).unwrap();
                        load(path, true).unwrap().validate().unwrap();
                    }
                });
            }
        });
    }
    #[test]
    fn corrupt_or_invalid_preferences_are_reported_and_never_overwritten_on_read() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(dir.path().join("appearance.json"), "broken").unwrap();
        assert!(load(dir.path(), true).is_err());
        let mut invalid = Appearance::defaults(false);
        invalid.tint = Some("red".into());
        assert!(save(dir.path(), &invalid).is_err());
        assert_eq!(
            fs::read_to_string(dir.path().join("appearance.json")).unwrap(),
            "broken"
        );
    }
}
