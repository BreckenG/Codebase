use std::{fs::OpenOptions, io::{Cursor, Write}, path::Path};
use tauri::{AppHandle, Manager, WebviewWindow};

fn validated_png(bytes: &[u8]) -> Result<Vec<u8>, String> {
    if bytes.len() > 5 * 1024 * 1024 || !bytes.starts_with(b"\x89PNG\r\n\x1a\n") { return Err("Choose a valid player card image.".into()); }
    let mut decoder = png::Decoder::new(Cursor::new(bytes));
    decoder.set_limits(png::Limits { bytes: 16 * 1024 * 1024 });
    let mut reader = decoder.read_info().map_err(|_| "The card image is invalid.")?;
    let info = reader.info();
    if info.width != 1800 || info.height != 900 || info.bit_depth != png::BitDepth::Eight || !matches!(info.color_type, png::ColorType::Rgb | png::ColorType::Rgba) || info.animation_control.is_some() { return Err("The player card image has an unsupported format.".into()); }
    let mut pixels = vec![0; reader.output_buffer_size()];
    let frame = reader.next_frame(&mut pixels).map_err(|_| "The card image is incomplete.")?;
    let mut output = Vec::new();
    {
        let mut encoder = png::Encoder::new(&mut output, 1800, 900);
        encoder.set_color(frame.color_type);
        encoder.set_depth(png::BitDepth::Eight);
        let mut writer = encoder.write_header().map_err(|_| "Could not prepare the card image.")?;
        writer.write_image_data(&pixels[..frame.buffer_size()]).map_err(|_| "Could not prepare the card image.")?;
    }
    Ok(output)
}

fn write_new(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let mut file = OpenOptions::new().write(true).create_new(true).open(path).map_err(|_| "Could not create a new card in your Downloads folder.")?;
    file.write_all(bytes).map_err(|_| "Could not finish saving your card.".into())
}

#[tauri::command]
pub fn save_profile_card(window: WebviewWindow, app: AppHandle, png: Vec<u8>) -> Result<String, String> {
    super::local_window(&window)?;
    let bytes = validated_png(&png)?;
    let folder = app.path().download_dir().map_err(|_| "Your Downloads folder is unavailable.")?;
    let path = folder.join(format!("RankedWorld-Card-{}.png", uuid::Uuid::new_v4()));
    write_new(&path, &bytes)?;
    Ok(path.to_string_lossy().into_owned())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn image(width: u32, height: u32) -> Vec<u8> {
        let mut bytes = Vec::new();
        {
            let mut encoder = png::Encoder::new(&mut bytes, width, height);
            encoder.set_color(png::ColorType::Rgba);
            encoder.set_depth(png::BitDepth::Eight);
            let mut writer = encoder.write_header().unwrap();
            writer.write_image_data(&vec![128; (width * height * 4) as usize]).unwrap();
        }
        bytes
    }
    #[test]
    fn rejects_invalid_oversized_and_wrong_dimensions() {
        assert!(validated_png(b"not an image").is_err());
        assert!(validated_png(&vec![0; 5 * 1024 * 1024 + 1]).is_err());
        assert!(validated_png(&image(1, 1)).is_err());
    }
    #[test]
    fn decodes_and_reencodes_card_without_appended_payload() {
        let mut input = image(1800, 900);
        input.extend_from_slice(b"UNTRUSTED_TRAILER");
        let output = validated_png(&input).unwrap();
        assert!(!output.windows(17).any(|part| part == b"UNTRUSTED_TRAILER"));
        assert!(validated_png(&output).is_ok());
    }
    #[test]
    fn never_overwrites_existing_files() {
        let path = std::env::temp_dir().join(format!("ranked-card-test-{}.png", uuid::Uuid::new_v4()));
        write_new(&path, b"original").unwrap();
        assert!(write_new(&path, b"replacement").is_err());
        assert_eq!(std::fs::read(&path).unwrap(), b"original");
        std::fs::remove_file(path).unwrap();
    }
}
