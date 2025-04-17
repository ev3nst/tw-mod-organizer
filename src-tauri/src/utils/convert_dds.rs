use ddsfile::{Dds, DxgiFormat, FourCC, PixelFormatFlags};
use image::{DynamicImage, ImageBuffer, Rgba};
use rayon::prelude::*;
use std::io::Cursor;

#[allow(dead_code)]
pub enum DDSOutputFormat {
    Png,
    Jpeg(u8),
}

pub fn convert_dds(dds_data: &[u8], format: DDSOutputFormat) -> Result<Vec<u8>, String> {
    let dds = Dds::read(dds_data).map_err(|e| format!("Failed to parse DDS: {:?}", e))?;

    let width = dds.get_width() as usize;
    let height = dds.get_height() as usize;

    let mut rgba_bytes = vec![0u8; width * height * 4];
    decode_dds_to_rgba(&dds, width, height, &mut rgba_bytes)?;

    match format {
        DDSOutputFormat::Png => encode_to_png(&rgba_bytes, width, height),
        DDSOutputFormat::Jpeg(quality) => encode_to_jpeg(&rgba_bytes, width, height, quality),
    }
}

fn decode_dds_to_rgba(
    dds: &Dds,
    width: usize,
    height: usize,
    rgba_bytes: &mut [u8],
) -> Result<(), String> {
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
                        let rgba_src = dds
                            .get_data(0)
                            .map_err(|e| format!("Failed to get RGBA data: {:?}", e))?;
                        if rgba_src.len() != width * height * 4 {
                            return Err(format!("Unexpected data size for R8G8B8A8 format"));
                        }

                        rgba_data
                            .par_chunks_mut(width.min(1024))
                            .enumerate()
                            .for_each(|(chunk_idx, chunk)| {
                                let start_idx = chunk_idx * width.min(1024);
                                for (i, pixel) in chunk.iter_mut().enumerate() {
                                    let idx = start_idx + i;
                                    if idx < width * height {
                                        let offset = idx * 4;
                                        let r = rgba_src[offset] as u32;
                                        let g = rgba_src[offset + 1] as u32;
                                        let b = rgba_src[offset + 2] as u32;
                                        let a = rgba_src[offset + 3] as u32;

                                        *pixel = b | (g << 8) | (r << 16) | (a << 24);
                                    }
                                }
                            });
                    }
                    DxgiFormat::B8G8R8A8_UNorm | DxgiFormat::B8G8R8A8_UNorm_sRGB => {
                        let bgra_src = dds
                            .get_data(0)
                            .map_err(|e| format!("Failed to get BGRA data: {:?}", e))?;
                        if bgra_src.len() != width * height * 4 {
                            return Err(format!("Unexpected data size for B8G8R8A8 format"));
                        }

                        rgba_data
                            .par_chunks_mut(width.min(1024))
                            .enumerate()
                            .for_each(|(chunk_idx, chunk)| {
                                let start_idx = chunk_idx * width.min(1024);
                                for (i, pixel) in chunk.iter_mut().enumerate() {
                                    let idx = start_idx + i;
                                    if idx < width * height {
                                        let offset = idx * 4;
                                        *pixel = u32::from_le_bytes([
                                            bgra_src[offset],
                                            bgra_src[offset + 1],
                                            bgra_src[offset + 2],
                                            bgra_src[offset + 3],
                                        ]);
                                    }
                                }
                            });
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
        let raw_data = dds
            .get_data(0)
            .map_err(|e| format!("Failed to get uncompressed RGB data: {:?}", e))?;

        let bpp = dds.header.spf.rgb_bit_count;
        let r_mask = dds.header.spf.r_bit_mask;
        let g_mask = dds.header.spf.g_bit_mask;
        let b_mask = dds.header.spf.b_bit_mask;
        let a_mask = dds.header.spf.a_bit_mask;

        // Precompute shifts and masks for better performance
        let r_shift = calculate_shift(r_mask.unwrap_or(0));
        let g_shift = calculate_shift(g_mask.unwrap_or(0));
        let b_shift = calculate_shift(b_mask.unwrap_or(0));
        let a_shift = calculate_shift(a_mask.unwrap_or(0));

        // Precompute bit count for color expansion
        let r_bits = count_bits(r_mask.unwrap_or(0));
        let g_bits = count_bits(g_mask.unwrap_or(0));
        let b_bits = count_bits(b_mask.unwrap_or(0));
        let a_bits = count_bits(a_mask.unwrap_or(0));

        match bpp {
            Some(32) => {
                if raw_data.len() != width * height * 4 {
                    return Err(format!("Unexpected data size for 32-bit RGB format"));
                }

                rgba_data
                    .par_chunks_mut(width.min(1024))
                    .enumerate()
                    .for_each(|(chunk_idx, chunk)| {
                        let start_idx = chunk_idx * width.min(1024);
                        for (i, pixel) in chunk.iter_mut().enumerate() {
                            let idx = start_idx + i;
                            if idx < width * height {
                                let offset = idx * 4;
                                let pixel_value = u32::from_le_bytes([
                                    raw_data[offset],
                                    raw_data[offset + 1],
                                    raw_data[offset + 2],
                                    raw_data[offset + 3],
                                ]);

                                let r = if let Some(r_mask) = r_mask {
                                    ((pixel_value & r_mask) >> r_shift) as u8
                                } else {
                                    0
                                };

                                let g = if let Some(g_mask) = g_mask {
                                    ((pixel_value & g_mask) >> g_shift) as u8
                                } else {
                                    0
                                };

                                let b = if let Some(b_mask) = b_mask {
                                    ((pixel_value & b_mask) >> b_shift) as u8
                                } else {
                                    0
                                };

                                let a = if let Some(a_mask) = a_mask {
                                    ((pixel_value & a_mask) >> a_shift) as u8
                                } else {
                                    255
                                };

                                *pixel = (b as u32)
                                    | ((g as u32) << 8)
                                    | ((r as u32) << 16)
                                    | ((a as u32) << 24);
                            }
                        }
                    });
            }
            Some(24) => {
                if raw_data.len() != width * height * 3 {
                    return Err(format!("Unexpected data size for 24-bit RGB format"));
                }

                rgba_data
                    .par_chunks_mut(width.min(1024))
                    .enumerate()
                    .for_each(|(chunk_idx, chunk)| {
                        let start_idx = chunk_idx * width.min(1024);
                        for (i, pixel) in chunk.iter_mut().enumerate() {
                            let idx = start_idx + i;
                            if idx < width * height {
                                let offset = idx * 3;
                                let pixel_value = u32::from_le_bytes([
                                    raw_data[offset],
                                    raw_data[offset + 1],
                                    raw_data[offset + 2],
                                    0,
                                ]);

                                let r = if let Some(r_mask) = r_mask {
                                    ((pixel_value & r_mask) >> r_shift) as u8
                                } else {
                                    0
                                };

                                let g = if let Some(g_mask) = g_mask {
                                    ((pixel_value & g_mask) >> g_shift) as u8
                                } else {
                                    0
                                };

                                let b = if let Some(b_mask) = b_mask {
                                    ((pixel_value & b_mask) >> b_shift) as u8
                                } else {
                                    0
                                };

                                *pixel = (b as u32)
                                    | ((g as u32) << 8)
                                    | ((r as u32) << 16)
                                    | (255 << 24);
                            }
                        }
                    });
            }
            Some(16) => {
                if raw_data.len() != width * height * 2 {
                    return Err(format!("Unexpected data size for 16-bit RGB format"));
                }

                let r_table = create_expansion_table(r_bits);
                let g_table = create_expansion_table(g_bits);
                let b_table = create_expansion_table(b_bits);
                let a_table = if a_mask.is_some() {
                    create_expansion_table(a_bits)
                } else {
                    vec![255; 256]
                };

                rgba_data
                    .par_chunks_mut(width.min(1024))
                    .enumerate()
                    .for_each(|(chunk_idx, chunk)| {
                        let start_idx = chunk_idx * width.min(1024);
                        for (i, pixel) in chunk.iter_mut().enumerate() {
                            let idx = start_idx + i;
                            if idx < width * height {
                                let offset = idx * 2;
                                let pixel_value =
                                    u16::from_le_bytes([raw_data[offset], raw_data[offset + 1]])
                                        as u32;

                                let r = if let Some(r_mask) = r_mask {
                                    ((pixel_value & r_mask) >> r_shift) as u8
                                } else {
                                    0
                                };

                                let g = if let Some(g_mask) = g_mask {
                                    ((pixel_value & g_mask) >> g_shift) as u8
                                } else {
                                    0
                                };

                                let b = if let Some(b_mask) = b_mask {
                                    ((pixel_value & b_mask) >> b_shift) as u8
                                } else {
                                    0
                                };

                                let a = if let Some(a_mask) = a_mask {
                                    ((pixel_value & a_mask) >> a_shift) as u8
                                } else {
                                    0
                                };

                                let r_expanded = r_table[r as usize];
                                let g_expanded = g_table[g as usize];
                                let b_expanded = b_table[b as usize];
                                let a_expanded = if a_mask.is_some() {
                                    a_table[a as usize]
                                } else {
                                    255
                                };

                                *pixel = (b_expanded as u32)
                                    | ((g_expanded as u32) << 8)
                                    | ((r_expanded as u32) << 16)
                                    | ((a_expanded as u32) << 24);
                            }
                        }
                    });
            }
            Some(8) => {
                return Err("8-bit RGB formats are not supported yet".to_string());
            }
            _ => {
                return Err(format!("Unsupported RGB bit depth: {:?}", bpp));
            }
        }
    } else {
        if let Some(d3d_format) = dds.get_d3d_format() {
            return Err(format!("Unsupported D3D format: {:?}", d3d_format));
        } else if let Some(dxgi_format) = dds.get_dxgi_format() {
            return Err(format!("Unsupported DXGI format: {:?}", dxgi_format));
        } else {
            return Err("Unknown or unsupported DDS format".to_string());
        }
    }

    rgba_bytes
        .par_chunks_mut(4 * width.min(1024))
        .enumerate()
        .for_each(|(chunk_idx, bytes_chunk)| {
            let start_idx = chunk_idx * width.min(1024);
            for i in 0..width.min(1024) {
                let pixel_idx = start_idx + i;
                if pixel_idx < width * height {
                    let pixel = rgba_data[pixel_idx];
                    let byte_idx = i * 4;

                    bytes_chunk[byte_idx] = ((pixel >> 16) & 0xFF) as u8; // R
                    bytes_chunk[byte_idx + 1] = ((pixel >> 8) & 0xFF) as u8; // G
                    bytes_chunk[byte_idx + 2] = (pixel & 0xFF) as u8; // B
                    bytes_chunk[byte_idx + 3] = ((pixel >> 24) & 0xFF) as u8; // A
                }
            }
        });

    Ok(())
}

fn encode_to_png(rgba_bytes: &[u8], width: usize, height: usize) -> Result<Vec<u8>, String> {
    let rgba_image = ImageBuffer::<Rgba<u8>, Vec<u8>>::from_raw(
        width as u32,
        height as u32,
        rgba_bytes.to_vec(),
    )
    .ok_or_else(|| "Failed to create image from decoded data".to_string())?;

    let dynamic_image = DynamicImage::ImageRgba8(rgba_image);
    let mut png_data = Vec::new();

    dynamic_image
        .write_to(&mut Cursor::new(&mut png_data), image::ImageFormat::Png)
        .map_err(|e| format!("Failed to encode PNG: {:?}", e))?;

    Ok(png_data)
}

fn encode_to_jpeg(
    rgba_bytes: &[u8],
    width: usize,
    height: usize,
    quality: u8,
) -> Result<Vec<u8>, String> {
    let rgba_image = ImageBuffer::<Rgba<u8>, Vec<u8>>::from_raw(
        width as u32,
        height as u32,
        rgba_bytes.to_vec(),
    )
    .ok_or_else(|| "Failed to create image from decoded data".to_string())?;

    let dynamic_image = DynamicImage::ImageRgba8(rgba_image);
    let mut jpeg_data = Vec::new();

    let mut encoder =
        image::codecs::jpeg::JpegEncoder::new_with_quality(Cursor::new(&mut jpeg_data), quality);

    encoder
        .encode_image(&dynamic_image)
        .map_err(|e| format!("Failed to encode JPEG: {:?}", e))?;

    Ok(jpeg_data)
}

fn calculate_shift(mask: u32) -> u32 {
    if mask == 0 {
        return 0;
    }

    mask.trailing_zeros()
}

fn count_bits(mask: u32) -> u32 {
    if mask == 0 {
        return 0;
    }

    mask.count_ones()
}

fn create_expansion_table(bit_count: u32) -> Vec<u8> {
    let mut table = vec![0u8; 256];

    if bit_count == 0 || bit_count >= 8 {
        for i in 0..256 {
            table[i] = i as u8;
        }
        return table;
    }

    let max_value = (1 << bit_count) - 1;

    for i in 0..=max_value {
        let value = ((i as f32 / max_value as f32) * 255.0) as u8;
        table[i as usize] = value;
    }

    table
}
