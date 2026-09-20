//! A short-lived renderer/settings bridge, before the GUI/single-instance startup.
//! Adapters never pass shell commands or write the document. Each invocation has
//! its own document authorization, independent of the open reader session.
use crate::{
    appearance::{self, Appearance},
    documents::DocumentStore,
};
use std::{
    io::{Read, Write},
    path::Path,
};

fn html(path: &Path) -> Result<String, String> {
    let mut store = DocumentStore::default();
    let document = store.open(path)?;
    let settings = appearance::load(&appearance::config_dir()?, appearance::is_omarchy())?;
    page(document, settings)
}
fn page(document: crate::documents::Document, settings: Appearance) -> Result<String, String> {
    let payload =
        serde_json::to_string(&serde_json::json!({"document": document, "appearance": settings}))
            .map_err(|e| e.to_string())?
            .replace('<', "\\u003c")
            .replace('>', "\\u003e")
            .replace('&', "\\u0026");
    Ok(include_str!("../../dist-preview/preview.html").replacen(
        "__SLAYDOWN_PAYLOAD__",
        &payload,
        1,
    ))
}
fn execute(args: &[String]) -> Result<String, String> {
    match args.first().map(String::as_str) {
        Some("--preview-version") if args.len() == 1 => Ok(env!("CARGO_PKG_VERSION").into()),
        Some("--preview-html") if args.len() == 2 => html(Path::new(&args[1])),
        Some("--preview-appearance") if args.len() == 1 => serde_json::to_string(
            &appearance::load(&appearance::config_dir()?, appearance::is_omarchy())?,
        )
        .map_err(|e| e.to_string()),
        Some("--preview-save") if args.len() == 1 => {
            let mut bytes = Vec::new();
            std::io::stdin()
                .take(16385)
                .read_to_end(&mut bytes)
                .map_err(|e| e.to_string())?;
            if bytes.len() > 16384 {
                return Err("Appearance settings are too large.".into());
            }
            let settings: Appearance = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
            appearance::save(&appearance::config_dir()?, &settings)?;
            Ok("null".into())
        }
        Some("--preview-image") if args.len() == 3 => {
            let mut store = DocumentStore::default();
            let doc = store.open(Path::new(&args[1]))?;
            serde_json::to_string(&store.read_image(Path::new(&doc.path), &args[2])?)
                .map_err(|e| e.to_string())
        }
        _ => Err("Invalid SlayDown preview command.".into()),
    }
}
pub fn run_cli() -> bool {
    let args: Vec<_> = std::env::args().skip(1).collect();
    if !args.first().is_some_and(|s| s.starts_with("--preview-")) {
        return false;
    }
    match execute(&args) {
        Ok(value) => {
            if std::io::stdout().write_all(value.as_bytes()).is_err() {
                std::process::exit(1);
            }
        }
        Err(error) => {
            eprintln!("{error}");
            std::process::exit(1);
        }
    }
    true
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn markdown_cannot_terminate_the_payload_script() {
        let document = crate::documents::Document {
            name: "x.md".into(),
            path: "/x.md".into(),
            content: "</script><script>alert(1)</script> Ω".into(),
        };
        let html = page(document, Appearance::defaults(true)).unwrap();
        assert!(!html.contains("</script><script>alert(1)"));
        assert!(html.contains("\\u003c/script\\u003e"));
        assert!(html.contains("Ω"));
        assert!(!html.contains("__SLAYDOWN_PAYLOAD__"));
    }
    #[test]
    fn invalid_commands_do_not_fall_through_to_the_reader() {
        assert!(execute(&["--preview-unknown".into()]).is_err());
        assert!(execute(&["--preview-html".into()]).is_err());
    }
}
