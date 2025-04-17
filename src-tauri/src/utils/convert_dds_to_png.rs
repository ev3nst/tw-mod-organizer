use ddsfile::{Dds, DxgiFormat, FourCC, PixelFormatFlags};
use image::{DynamicImage, ImageBuffer, Rgba};

pub fn convert_dds_to_png(dds_data: &[u8]) -> Result<Vec<u8>, String> {
    let dds = Dds::read(dds_data).map_err(|e| format!("Failed to parse DDS: {:?}", e))?;

    let width = dds.get_width() as usize;
    let height = dds.get_height() as usize;

    let mut rgba_data: Vec<u32> = vec![0; width * height];

    if let Some(ref fourcc) = dds.header.spf.fourcc {
        if fourcc.0 == FourCC::DX10 {
            if let Some(dxgi_format) = dds.get_dxgi_format() {
                match dxgi_format {
                    DxgiFormat::BC1_UNorm
                    | DxgiFormat::BC1_UNorm_sRGB
                    | DxgiFormat::BC1_Typeless => {
                        let dxt_data = dds
                            .get_data(0)
                            .map_err(|e| format!("Failed to get BC1 data: {:?}", e))?;
                        texture2ddecoder::decode_bc1(dxt_data, width, height, &mut rgba_data)
                            .map_err(|e| format!("Failed to decode BC1: {}", e))?;
                    }
                    DxgiFormat::BC2_UNorm
                    | DxgiFormat::BC2_UNorm_sRGB
                    | DxgiFormat::BC2_Typeless => {
                        let dxt_data = dds
                            .get_data(0)
                            .map_err(|e| format!("Failed to get BC2 data: {:?}", e))?;
                        texture2ddecoder::decode_bc2(dxt_data, width, height, &mut rgba_data)
                            .map_err(|e| format!("Failed to decode BC2: {}", e))?;
                    }
                    DxgiFormat::BC3_UNorm
                    | DxgiFormat::BC3_UNorm_sRGB
                    | DxgiFormat::BC3_Typeless => {
                        let dxt_data = dds
                            .get_data(0)
                            .map_err(|e| format!("Failed to get BC3 data: {:?}", e))?;
                        texture2ddecoder::decode_bc3(dxt_data, width, height, &mut rgba_data)
                            .map_err(|e| format!("Failed to decode BC3: {}", e))?;
                    }
                    DxgiFormat::BC4_UNorm | DxgiFormat::BC4_SNorm | DxgiFormat::BC4_Typeless => {
                        let bc_data = dds
                            .get_data(0)
                            .map_err(|e| format!("Failed to get BC4 data: {:?}", e))?;
                        texture2ddecoder::decode_bc4(bc_data, width, height, &mut rgba_data)
                            .map_err(|e| format!("Failed to decode BC4: {}", e))?;
                    }
                    DxgiFormat::BC5_UNorm | DxgiFormat::BC5_SNorm | DxgiFormat::BC5_Typeless => {
                        let bc_data = dds
                            .get_data(0)
                            .map_err(|e| format!("Failed to get BC5 data: {:?}", e))?;
                        texture2ddecoder::decode_bc5(bc_data, width, height, &mut rgba_data)
                            .map_err(|e| format!("Failed to decode BC5: {}", e))?;
                    }
                    DxgiFormat::BC7_UNorm
                    | DxgiFormat::BC7_UNorm_sRGB
                    | DxgiFormat::BC7_Typeless => {
                        let bc_data = dds
                            .get_data(0)
                            .map_err(|e| format!("Failed to get BC7 data: {:?}", e))?;
                        texture2ddecoder::decode_bc7(bc_data, width, height, &mut rgba_data)
                            .map_err(|e| format!("Failed to decode BC7: {}", e))?;
                    }
                    DxgiFormat::R8G8B8A8_UNorm | DxgiFormat::R8G8B8A8_UNorm_sRGB => {
                        let rgba_bytes = dds
                            .get_data(0)
                            .map_err(|e| format!("Failed to get RGBA data: {:?}", e))?;
                        if rgba_bytes.len() != width * height * 4 {
                            return Err(format!("Unexpected data size for R8G8B8A8 format"));
                        }

                        for i in 0..width * height {
                            let offset = i * 4;
                            let r = rgba_bytes[offset] as u32;
                            let g = rgba_bytes[offset + 1] as u32;
                            let b = rgba_bytes[offset + 2] as u32;
                            let a = rgba_bytes[offset + 3] as u32;

                            rgba_data[i] = b | (g << 8) | (r << 16) | (a << 24);
                        }
                    }
                    DxgiFormat::B8G8R8A8_UNorm | DxgiFormat::B8G8R8A8_UNorm_sRGB => {
                        let bgra_bytes = dds
                            .get_data(0)
                            .map_err(|e| format!("Failed to get BGRA data: {:?}", e))?;
                        if bgra_bytes.len() != width * height * 4 {
                            return Err(format!("Unexpected data size for B8G8R8A8 format"));
                        }

                        for i in 0..width * height {
                            let offset = i * 4;
                            let b = bgra_bytes[offset] as u32;
                            let g = bgra_bytes[offset + 1] as u32;
                            let r = bgra_bytes[offset + 2] as u32;
                            let a = bgra_bytes[offset + 3] as u32;

                            rgba_data[i] = b | (g << 8) | (r << 16) | (a << 24);
                        }
                    }
                    unsupported_format => {
                        return Err(format!(
                            "Unsupported DXGI format in DX10 header: {:?}",
                            unsupported_format
                        ));
                    }
                }
            } else {
                return Err("DX10 format specified but no DXGI format found".to_string());
            }
        } else {
            match fourcc.0 {
                FourCC::DXT1 => {
                    let dxt_data = dds
                        .get_data(0)
                        .map_err(|e| format!("Failed to get DXT1 data: {:?}", e))?;
                    texture2ddecoder::decode_bc1(dxt_data, width, height, &mut rgba_data)
                        .map_err(|e| format!("Failed to decode DXT1: {}", e))?;
                }
                FourCC::DXT3 => {
                    let dxt_data = dds
                        .get_data(0)
                        .map_err(|e| format!("Failed to get DXT3 data: {:?}", e))?;
                    texture2ddecoder::decode_bc2(dxt_data, width, height, &mut rgba_data)
                        .map_err(|e| format!("Failed to decode DXT3: {}", e))?;
                }
                FourCC::DXT5 => {
                    let dxt_data = dds
                        .get_data(0)
                        .map_err(|e| format!("Failed to get DXT5 data: {:?}", e))?;
                    texture2ddecoder::decode_bc3(dxt_data, width, height, &mut rgba_data)
                        .map_err(|e| format!("Failed to decode DXT5: {}", e))?;
                }
                FourCC::BC4_UNORM | FourCC::ATI1 => {
                    let bc_data = dds
                        .get_data(0)
                        .map_err(|e| format!("Failed to get BC4/ATI1 data: {:?}", e))?;
                    texture2ddecoder::decode_bc4(bc_data, width, height, &mut rgba_data)
                        .map_err(|e| format!("Failed to decode BC4/ATI1: {}", e))?;
                }
                FourCC::BC5_UNORM => {
                    let bc_data = dds
                        .get_data(0)
                        .map_err(|e| format!("Failed to get BC5/ATI2 data: {:?}", e))?;
                    texture2ddecoder::decode_bc5(bc_data, width, height, &mut rgba_data)
                        .map_err(|e| format!("Failed to decode BC5/ATI2: {}", e))?;
                }
                fourcc_value => {
                    return Err(format!("Unsupported FourCC format: 0x{:08X}", fourcc_value));
                }
            }
        }
    } else if dds.header.spf.flags.contains(PixelFormatFlags::RGB) {
        return Err("Uncompressed RGB DDS formats are not yet supported".to_string());
    } else {
        if let Some(d3d_format) = dds.get_d3d_format() {
            return Err(format!("Unsupported D3D format: {:?}", d3d_format));
        } else if let Some(dxgi_format) = dds.get_dxgi_format() {
            return Err(format!("Unsupported DXGI format: {:?}", dxgi_format));
        } else {
            return Err("Unknown or unsupported DDS format".to_string());
        }
    }

    let mut rgba_bytes: Vec<u8> = Vec::with_capacity(width * height * 4);
    for pixel in rgba_data {
        let b = ((pixel >> 0) & 0xFF) as u8;
        let g = ((pixel >> 8) & 0xFF) as u8;
        let r = ((pixel >> 16) & 0xFF) as u8;
        let a = ((pixel >> 24) & 0xFF) as u8;

        rgba_bytes.push(r);
        rgba_bytes.push(g);
        rgba_bytes.push(b);
        rgba_bytes.push(a);
    }

    let rgba_image =
        ImageBuffer::<Rgba<u8>, Vec<u8>>::from_raw(width as u32, height as u32, rgba_bytes)
            .ok_or_else(|| "Failed to create image from decoded data".to_string())?;

    let dynamic_image = DynamicImage::ImageRgba8(rgba_image);
    let mut png_data = Vec::new();

    dynamic_image
        .write_to(
            &mut std::io::Cursor::new(&mut png_data),
            image::ImageFormat::Png,
        )
        .map_err(|e| format!("Failed to encode PNG: {:?}", e))?;

    Ok(png_data)
}
