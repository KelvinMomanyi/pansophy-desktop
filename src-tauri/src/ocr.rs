use std::{
    future::Future,
    io::Read,
    path::{Path, PathBuf},
};

use crate::{CommandError, CommandResult};

pub const MAX_OCR_BYTES: u64 = 25 * 1024 * 1024;
const MAX_OUTPUT_BYTES: usize = 4 * 1024 * 1024;

fn input_error(message: &str) -> CommandError {
    CommandError::new("INVALID_INPUT", message)
}

/// Validate before crossing the sidecar boundary. The runner is supplied by the desktop adapter.
pub async fn extract_text_with<F, Fut>(path: &Path, run_image: F) -> CommandResult<String>
where
    F: FnOnce(PathBuf) -> Fut,
    Fut: Future<Output = CommandResult<String>>,
{
    let metadata =
        std::fs::metadata(path).map_err(|_| input_error("The selected file does not exist."))?;
    if !metadata.is_file() {
        return Err(input_error("Select a file, not a directory."));
    }
    if metadata.len() > MAX_OCR_BYTES {
        return Err(input_error("The selected file exceeds the 25 MB limit."));
    }
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase();
    match extension.as_str() {
        "png" | "jpg" | "jpeg" | "webp" => run_image(path.to_path_buf()).await,
        "pdf" => {
            let mut bytes = Vec::new();
            std::fs::File::open(path)
                .and_then(|file| file.take(MAX_OCR_BYTES + 1).read_to_end(&mut bytes))
                .map_err(|error| CommandError::internal("Could not read the PDF.", error))?;
            if bytes.len() as u64 > MAX_OCR_BYTES {
                return Err(input_error("The selected file exceeds the 25 MB limit."));
            }
            pdf_extract::extract_text_from_mem(&bytes).map_err(|error| {
                CommandError::internal("Could not extract text from the PDF.", error)
            })
        }
        _ => Err(input_error(
            "Only PNG, JPEG, WebP, and PDF files are supported.",
        )),
    }
}

/// Accumulate bounded, UTF-8 output and require an explicit successful process exit.
#[derive(Default)]
pub struct OcrOutput {
    bytes: Vec<u8>,
}

impl OcrOutput {
    pub fn push(&mut self, data: &[u8]) -> CommandResult<()> {
        if self.bytes.len().saturating_add(data.len()) > MAX_OUTPUT_BYTES {
            return Err(CommandError::new(
                "OCR_FAILED",
                "The OCR output exceeded its size limit.",
            ));
        }
        self.bytes.extend_from_slice(data);
        Ok(())
    }

    pub fn finish(self, exit_code: Option<i32>) -> CommandResult<String> {
        if exit_code != Some(0) {
            return Err(CommandError::new(
                "OCR_FAILED",
                "Text extraction did not complete successfully.",
            ));
        }
        String::from_utf8(self.bytes)
            .map(|text| text.trim().to_owned())
            .map_err(|_| CommandError::new("OCR_FAILED", "The OCR process returned invalid UTF-8."))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn combines_partial_utf8_and_requires_a_successful_exit() {
        let mut output = OcrOutput::default();
        output.push(&[b' ', 0xc3]).unwrap();
        output.push(&[0xa9, b'\n']).unwrap();
        assert_eq!(output.finish(Some(0)).unwrap(), "\u{e9}");
        for code in [None, Some(1)] {
            assert_eq!(
                OcrOutput::default().finish(code).unwrap_err().code,
                "OCR_FAILED"
            );
        }
    }

    #[test]
    fn rejects_oversized_and_invalid_utf8_output() {
        assert!(OcrOutput::default()
            .push(&vec![b'a'; MAX_OUTPUT_BYTES + 1])
            .is_err());
        let mut output = OcrOutput::default();
        output.push(&[0xff]).unwrap();
        assert!(output.finish(Some(0)).is_err());
    }
}
