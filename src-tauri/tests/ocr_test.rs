use app_lib::ocr::{extract_text_with, MAX_OCR_BYTES};

#[tokio::test]
async fn supported_images_are_forwarded_to_a_mock_runner_with_the_exact_path() {
    let directory = tempfile::tempdir().unwrap();
    for name in ["scan.JPG", "scan.jpeg", "scan.webp", "scan with spaces.png"] {
        let path = directory.path().join(name);
        std::fs::write(&path, b"image fixture").unwrap();
        let text = extract_text_with(&path, |selected| {
            assert_eq!(selected, path);
            async { Ok("extracted text".to_owned()) }
        })
        .await
        .unwrap();
        assert_eq!(text, "extracted text");
    }
}

#[tokio::test]
async fn invalid_files_never_launch_the_runner() {
    let directory = tempfile::tempdir().unwrap();
    let unsupported = directory.path().join("notes.txt");
    std::fs::write(&unsupported, b"text").unwrap();
    let oversized = directory.path().join("large.png");
    std::fs::File::create(&oversized)
        .unwrap()
        .set_len(MAX_OCR_BYTES + 1)
        .unwrap();
    for path in [
        directory.path().join("missing.png"),
        directory.path().to_path_buf(),
        unsupported,
        oversized,
    ] {
        let error = extract_text_with(&path, |_| async {
            panic!("invalid input reached the sidecar")
        })
        .await
        .unwrap_err();
        assert_eq!(error.code, "INVALID_INPUT");
    }
}

#[tokio::test]
async fn preserves_runner_failures() {
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("scan.png");
    std::fs::write(&path, b"fixture").unwrap();
    let error = extract_text_with(&path, |_| async {
        Err(app_lib::CommandError::new("OCR_TIMEOUT", "Timed out."))
    })
    .await
    .unwrap_err();
    assert_eq!(error.code, "OCR_TIMEOUT");
}

fn pdf_fixture() -> String {
    let stream = "BT /F1 12 Tf 10 10 Td (Hello PDF) Tj ET";
    let objects = [
        "<< /Type /Catalog /Pages 2 0 R >>".to_owned(),
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>".to_owned(),
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>".to_owned(),
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>".to_owned(),
        format!("<< /Length {} >>\nstream\n{stream}\nendstream", stream.len()),
    ];
    let mut pdf = "%PDF-1.4\n".to_owned();
    let mut offsets = Vec::new();
    for (index, object) in objects.iter().enumerate() {
        offsets.push(pdf.len());
        pdf.push_str(&format!("{} 0 obj\n{object}\nendobj\n", index + 1));
    }
    let xref = pdf.len();
    pdf.push_str("xref\n0 6\n0000000000 65535 f \n");
    for offset in offsets {
        pdf.push_str(&format!("{offset:010} 00000 n \n"));
    }
    pdf.push_str(&format!(
        "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n"
    ));
    pdf
}

#[tokio::test]
async fn extracts_pdf_text_and_rejects_corrupt_pdfs_without_a_sidecar() {
    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("paper.PDF");
    std::fs::write(&path, pdf_fixture()).unwrap();
    let text = extract_text_with(&path, |_| async {
        panic!("PDF extraction must not launch Tesseract")
    })
    .await
    .unwrap();
    assert!(text.contains("Hello PDF"), "{text}");
    std::fs::write(&path, b"not a PDF").unwrap();
    assert!(extract_text_with(&path, |_| async {
        panic!("corrupt PDF reached the sidecar")
    })
    .await
    .is_err());
}
