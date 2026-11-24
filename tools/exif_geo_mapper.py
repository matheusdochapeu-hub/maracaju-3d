#!/usr/bin/env python3
"""
Extrator Georreferenciado de Fotos (EXIF GPS + Bússola) — Casa Maracaju 88
Lê todas as fotos em capturas/ (ex.: capturas/muro/), extrai Latitude, Longitude,
Direção da Bússola (GPSImgDirection) e Data, calcula distância e posição local (metros)
em relação à Casa Maracaju 88 (-21.1742° S, -47.8339° W) e grava capturas/geo_manifest.json.

Zero dependências externas (usa apenas biblioteca padrão do Python 3)!
"""

import json
import math
import struct
from pathlib import Path

# Origem geodésica da Casa Maracaju 88 (Vila Tibério, Ribeirão Preto - SP)
HOME_LAT = -21.1742
HOME_LNG = -47.8339
LOT_AZIMUTH_DEG = 40.0  # Eixo Frente (SO) -> Fundo (NE)

ROOT_DIR = Path(__file__).resolve().parent.parent
CAPTURAS_DIR = ROOT_DIR / "capturas"
MANIFEST_OUT = CAPTURAS_DIR / "geo_manifest.json"
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def _read_u16(data: bytes, offset: int, little: bool) -> int:
    return struct.unpack_from("<H" if little else ">H", data, offset)[0]


def _read_u32(data: bytes, offset: int, little: bool) -> int:
    return struct.unpack_from("<I" if little else ">I", data, offset)[0]


def _read_ifd(data: bytes, tiff_start: int, dir_start: int, little: bool) -> dict:
    tags = {}
    if dir_start + 2 > len(data):
        return tags
    count_entries = _read_u16(data, dir_start, little)
    for i in range(count_entries):
        entry = dir_start + 2 + i * 12
        if entry + 12 > len(data):
            break
        tag = _read_u16(data, entry, little)
        typ = _read_u16(data, entry + 2, little)
        cnt = _read_u32(data, entry + 4, little)
        val_field = entry + 8

        if typ == 2:  # ASCII
            start = val_field if cnt <= 4 else tiff_start + _read_u32(data, val_field, little)
            if start + cnt <= len(data):
                raw = data[start : start + cnt].split(b"\x00", 1)[0]
                tags[tag] = raw.decode("ascii", errors="ignore").strip()
        elif typ == 4 and cnt == 1:  # LONG
            tags[tag] = _read_u32(data, val_field, little)
        elif typ == 5:  # RATIONAL
            rstart = tiff_start + _read_u32(data, val_field, little)
            if rstart + cnt * 8 <= len(data):
                vals = []
                for r in range(cnt):
                    num = _read_u32(data, rstart + r * 8, little)
                    den = _read_u32(data, rstart + r * 8 + 4, little)
                    vals.append(num / den if den else 0.0)
                tags[tag] = vals[0] if cnt == 1 else vals
    return tags


def _dms_to_deg(dms, ref: str):
    if not isinstance(dms, list) or len(dms) < 3:
        return None
    val = dms[0] + dms[1] / 60.0 + dms[2] / 3600.0
    if ref in ("S", "W"):
        val = -val
    return round(val, 6)


def extract_jpeg_exif(path: Path) -> dict:
    res = {"lat": None, "lng": None, "compass": None, "date": None}
    try:
        data = path.read_bytes()
    except Exception:
        return res
    if len(data) < 12 or data[0:2] != b"\xff\xd8":
        return res

    offset = 2
    while offset + 4 < len(data):
        marker = struct.unpack_from(">H", data, offset)[0]
        offset += 2
        if marker == 0xFFE1:
            seg_len = struct.unpack_from(">H", data, offset)[0]
            if data[offset + 2 : offset + 8] == b"Exif\x00\x00":
                tiff_start = offset + 8
                little = data[tiff_start : tiff_start + 2] == b"II"
                first_ifd = _read_u32(data, tiff_start + 4, little)
                ifd0 = _read_ifd(data, tiff_start, tiff_start + first_ifd, little)
                if 0x0132 in ifd0:
                    res["date"] = ifd0[0x0132]
                if 0x8769 in ifd0 and isinstance(ifd0[0x8769], int):
                    exif_ifd = _read_ifd(data, tiff_start, tiff_start + ifd0[0x8769], little)
                    if 0x9003 in exif_ifd:
                        res["date"] = exif_ifd[0x9003]
                if 0x8825 in ifd0 and isinstance(ifd0[0x8825], int):
                    gps = _read_ifd(data, tiff_start, tiff_start + ifd0[0x8825], little)
                    if 0x0002 in gps and 0x0001 in gps:
                        res["lat"] = _dms_to_deg(gps[0x0002], str(gps[0x0001]))
                    if 0x0004 in gps and 0x0003 in gps:
                        res["lng"] = _dms_to_deg(gps[0x0004], str(gps[0x0003]))
                    if 0x0011 in gps and isinstance(gps[0x0011], (int, float)):
                        res["compass"] = round(float(gps[0x0011]), 1)
                return res
            offset += seg_len
        elif (marker & 0xFF00) != 0xFF00:
            break
        else:
            seg_len = struct.unpack_from(">H", data, offset)[0]
            offset += seg_len
    return res


def latlng_to_local_meters(lat: float, lng: float):
    """Converte GPS para coordenadas locais (Leste, Norte) em metros e distância da Casa Maracaju 88."""
    r_earth = 6378137.0
    d_lat = math.radians(lat - HOME_LAT)
    d_lng = math.radians(lng - HOME_LNG)
    north_m = d_lat * r_earth
    east_m = d_lng * r_earth * math.cos(math.radians(HOME_LAT))
    dist_m = math.hypot(east_m, north_m)

    # Rotaciona para o eixo do lote (40° NE)
    az = math.radians(LOT_AZIMUTH_DEG)
    lot_x = east_m * math.cos(az) - north_m * math.sin(az)
    lot_z = -(east_m * math.sin(az) + north_m * math.cos(az))
    return round(dist_m, 1), round(lot_x, 2), round(lot_z, 2)


def main():
    CAPTURAS_DIR.mkdir(parents=True, exist_ok=True)
    photos = []
    geotagged = 0

    for path in sorted(CAPTURAS_DIR.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in IMAGE_EXTS:
            continue
        rel = path.relative_to(CAPTURAS_DIR).as_posix()
        meta = extract_jpeg_exif(path) if path.suffix.lower() in {".jpg", ".jpeg"} else {}
        lat = meta.get("lat")
        lng = meta.get("lng")
        dist_m = lot_x = lot_z = None
        if lat is not None and lng is not None:
            geotagged += 1
            dist_m, lot_x, lot_z = latlng_to_local_meters(lat, lng)

        photos.append(
            {
                "name": path.name,
                "rel_path": rel,
                "lat": lat,
                "lng": lng,
                "compass": meta.get("compass"),
                "date": meta.get("date"),
                "dist_m": dist_m,
                "lot_x_m": lot_x,
                "lot_z_m": lot_z,
            }
        )

    manifest = {
        "origin": {"name": "Casa Maracaju 88", "lat": HOME_LAT, "lng": HOME_LNG, "lot_azimuth_deg": LOT_AZIMUTH_DEG},
        "total_photos": len(photos),
        "geotagged_photos": geotagged,
        "photos": photos,
    }
    MANIFEST_OUT.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"[Maracaju 3D] Mapeamento concluído: {len(photos)} foto(s) ({geotagged} com GPS EXIF).")
    print(f"Manifesto salvo em: {MANIFEST_OUT}")
    if len(photos) == 0:
        print("Dica: copie as fotos do celular para capturas/muro/ e rode novamente este script.")


if __name__ == "__main__":
    main()
